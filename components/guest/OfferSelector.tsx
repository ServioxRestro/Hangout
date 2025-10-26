"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import type { Tables } from "@/types/database.types";
import { formatCurrency } from "@/lib/utils";
import {
  Gift,
  Percent,
  Tag,
  Clock,
  Users,
  ChevronRight,
  CheckCircle,
  AlertCircle,
  Info,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/Button";

type Offer = Tables<"offers"> & {
  offer_items?: Array<
    Tables<"offer_items"> & {
      menu_items: Tables<"menu_items"> | null;
      menu_categories: Tables<"menu_categories"> | null;
    }
  >;
};

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  category_id?: string;
}

interface OfferSelectorProps {
  cartItems: CartItem[];
  cartTotal: number;
  customerPhone?: string;
  tableId?: string;
  onOfferSelect: (offer: Offer | null) => void;
  selectedOffer: Offer | null;
}

interface OfferValidation {
  isValid: boolean;
  reason?: string;
  discount?: number;
}

export function OfferSelector({
  cartItems,
  cartTotal,
  customerPhone,
  tableId,
  onOfferSelect,
  selectedOffer,
}: OfferSelectorProps) {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showOfferList, setShowOfferList] = useState(false);
  const [validationCache, setValidationCache] = useState<
    Record<string, OfferValidation>
  >({});

  useEffect(() => {
    fetchOffers();
  }, []);

  useEffect(() => {
    // Revalidate selected offer when cart changes
    if (selectedOffer) {
      validateOffer(selectedOffer).then((validation) => {
        if (!validation.isValid) {
          onOfferSelect(null); // Auto-deselect if no longer valid
        }
      });
    }
  }, [cartTotal, cartItems]);

  const fetchOffers = async () => {
    try {
      // Fetch active session-level offers (applied at billing)
      const { data: offersData, error: offersError } = await supabase
        .from("offers")
        .select(
          `
          *,
          offer_items (
            *,
            menu_items (*),
            menu_categories (*)
          )
        `
        )
        .eq("is_active", true)
        .eq("application_type", "session_level") // Only session-level offers
        .order("priority", { ascending: false });

      if (offersError) throw offersError;

      const validOffers = (offersData as Offer[]) || [];
      setOffers(validOffers);

      // Validate all offers
      const validations: Record<string, OfferValidation> = {};
      for (const offer of validOffers) {
        validations[offer.id] = await validateOffer(offer);
      }
      setValidationCache(validations);
    } catch (error: any) {
      console.error("Error fetching offers:", error);
    } finally {
      setLoading(false);
    }
  };

  const validateOffer = async (offer: Offer): Promise<OfferValidation> => {
    const benefits = offer.benefits as any;
    const conditions = offer.conditions as any;

    // 1. Check date validity
    const now = new Date();
    if (offer.start_date && new Date(offer.start_date) > now) {
      return { isValid: false, reason: "Offer not started yet" };
    }
    if (offer.end_date && new Date(offer.end_date) < now) {
      return { isValid: false, reason: "Offer has expired" };
    }

    // 2. Check time validity
    if (offer.valid_hours_start && offer.valid_hours_end) {
      const currentTime = now.toTimeString().slice(0, 5);
      if (
        currentTime < offer.valid_hours_start ||
        currentTime > offer.valid_hours_end
      ) {
        return {
          isValid: false,
          reason: `Valid only between ${offer.valid_hours_start} - ${offer.valid_hours_end}`,
        };
      }
    }

    // 3. Check day validity
    if (offer.valid_days && offer.valid_days.length > 0) {
      const currentDay = now
        .toLocaleDateString("en-US", { weekday: "long" })
        .toLowerCase();
      if (!offer.valid_days.includes(currentDay)) {
        const validDaysStr = offer.valid_days
          .map((day) => day.charAt(0).toUpperCase() + day.slice(1))
          .join(", ");
        return {
          isValid: false,
          reason: `Valid only on ${validDaysStr}`,
        };
      }
    }

    // 4. Check minimum amount
    if (conditions?.min_amount && cartTotal < conditions.min_amount) {
      return {
        isValid: false,
        reason: `Minimum order amount: ${formatCurrency(conditions.min_amount)}`,
      };
    }

    // 5. Check customer type (if phone available)
    if (offer.target_customer_type !== "all" && customerPhone) {
      const { data: guestUser } = await supabase
        .from("guest_users")
        .select("visit_count")
        .eq("phone", customerPhone)
        .maybeSingle();

      const visitCount = guestUser?.visit_count || 0;

      if (offer.target_customer_type === "new" && visitCount > 0) {
        return { isValid: false, reason: "Only for new customers" };
      }
      if (offer.target_customer_type === "returning" && visitCount === 0) {
        return { isValid: false, reason: "Only for returning customers" };
      }
      if (offer.target_customer_type === "loyalty") {
        const minOrders = (offer.conditions as any)?.min_orders_count || 5;
        if (visitCount < minOrders) {
          return { isValid: false, reason: `Requires ${minOrders}+ previous orders` };
        }
      }
    }

    // 6. Check usage limit
    if (offer.usage_limit && offer.usage_count) {
      if (offer.usage_count >= offer.usage_limit) {
        return { isValid: false, reason: "Usage limit reached" };
      }
    }

    // 7. Calculate discount
    let discount = 0;
    switch (offer.offer_type) {
      case "cart_percentage":
        discount = (cartTotal * (benefits.discount_percentage || 0)) / 100;
        if (benefits.max_discount_amount) {
          discount = Math.min(discount, benefits.max_discount_amount);
        }
        break;
      case "cart_flat_amount":
        discount = benefits.discount_amount || 0;
        break;
      case "min_order_discount":
        if (conditions?.threshold_amount && cartTotal >= conditions.threshold_amount) {
          discount = benefits.discount_amount || 0;
        } else {
          return {
            isValid: false,
            reason: `Spend ${formatCurrency(conditions?.threshold_amount || 0)} to unlock`,
          };
        }
        break;
      case "promo_code":
        // Promo codes can have percentage or flat discount
        if (benefits.discount_percentage) {
          discount = (cartTotal * benefits.discount_percentage) / 100;
          if (benefits.max_discount_amount) {
            discount = Math.min(discount, benefits.max_discount_amount);
          }
        } else if (benefits.discount_amount) {
          discount = benefits.discount_amount;
        }
        break;
      default:
        // For time_based, customer_based - check if they have discount
        if (benefits.discount_percentage) {
          discount = (cartTotal * benefits.discount_percentage) / 100;
          if (benefits.max_discount_amount) {
            discount = Math.min(discount, benefits.max_discount_amount);
          }
        } else if (benefits.discount_amount) {
          discount = benefits.discount_amount;
        }
    }

    return { isValid: true, discount };
  };

  const getOfferIcon = (offerType: string) => {
    switch (offerType) {
      case "cart_percentage":
      case "min_order_discount":
        return <Percent className="w-5 h-5" />;
      case "cart_flat_amount":
        return <Tag className="w-5 h-5" />;
      case "time_based":
        return <Clock className="w-5 h-5" />;
      case "customer_based":
        return <Users className="w-5 h-5" />;
      case "promo_code":
        return <Tag className="w-5 h-5" />;
      default:
        return <Gift className="w-5 h-5" />;
    }
  };

  const formatOfferSummary = (offer: Offer, validation: OfferValidation) => {
    const benefits = offer.benefits as any;
    const conditions = offer.conditions as any;

    let summary = "";
    switch (offer.offer_type) {
      case "cart_percentage":
        summary = `${benefits.discount_percentage}% off`;
        if (benefits.max_discount_amount) {
          summary += ` (max ${formatCurrency(benefits.max_discount_amount)})`;
        }
        break;
      case "cart_flat_amount":
        summary = `${formatCurrency(benefits.discount_amount)} off`;
        break;
      case "min_order_discount":
        summary = `${formatCurrency(benefits.discount_amount)} off on orders above ${formatCurrency(conditions.threshold_amount)}`;
        break;
      case "promo_code":
        if (benefits.discount_percentage) {
          summary = `${benefits.discount_percentage}% off`;
          if (benefits.max_discount_amount) {
            summary += ` (max ${formatCurrency(benefits.max_discount_amount)})`;
          }
        } else {
          summary = `${formatCurrency(benefits.discount_amount)} off`;
        }
        break;
      default:
        summary = offer.description || "Special offer";
    }

    if (validation.isValid && validation.discount) {
      summary += ` • Save ${formatCurrency(validation.discount)}`;
    }

    return summary;
  };

  const handleOfferSelect = (offer: Offer | null) => {
    onOfferSelect(offer);
    setShowOfferList(false);
  };

  if (loading) {
    return null; // Don't show while loading
  }

  const applicableOffers = offers.filter((o) => validationCache[o.id]?.isValid);
  const inapplicableOffers = offers.filter(
    (o) => !validationCache[o.id]?.isValid
  );

  return (
    <div className="space-y-3">
      {/* Selected Offer Display */}
      {selectedOffer ? (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1">
              <div className="p-2 bg-white rounded-lg shadow-sm text-green-600">
                {getOfferIcon(selectedOffer.offer_type)}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="font-semibold text-green-900">
                    Offer Applied
                  </span>
                </div>
                <div className="text-sm font-medium text-green-800">
                  {selectedOffer.name}
                </div>
                <div className="text-xs text-green-700 mt-1">
                  {formatOfferSummary(
                    selectedOffer,
                    validationCache[selectedOffer.id]
                  )}
                </div>
                {selectedOffer.promo_code && (
                  <div className="mt-2">
                    <span className="text-xs text-green-600">Code: </span>
                    <span className="font-mono font-bold text-xs bg-white px-2 py-1 rounded border border-green-200">
                      {selectedOffer.promo_code}
                    </span>
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={() => handleOfferSelect(null)}
              className="p-1 hover:bg-green-100 rounded-lg text-green-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Offer Selection Button */}
          <button
            onClick={() => setShowOfferList(!showOfferList)}
            className="w-full bg-white border-2 border-dashed border-blue-300 rounded-lg p-4 hover:border-blue-500 hover:bg-blue-50 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                  <Gift className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <div className="font-semibold text-gray-900">
                    Apply Offer
                  </div>
                  <div className="text-sm text-gray-600">
                    {applicableOffers.length > 0
                      ? `${applicableOffers.length} offer${applicableOffers.length !== 1 ? "s" : ""} available`
                      : "View available offers"}
                  </div>
                </div>
              </div>
              <ChevronRight
                className={`w-5 h-5 text-gray-400 transition-transform ${
                  showOfferList ? "rotate-90" : ""
                }`}
              />
            </div>
          </button>

          {/* Offer List */}
          {showOfferList && (
            <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
              {/* Applicable Offers */}
              {applicableOffers.length > 0 && (
                <div>
                  <div className="text-sm font-semibold text-gray-900 mb-3">
                    Available Now
                  </div>
                  <div className="space-y-2">
                    {applicableOffers.map((offer) => {
                      const validation = validationCache[offer.id];
                      return (
                        <button
                          key={offer.id}
                          onClick={() => handleOfferSelect(offer)}
                          className="w-full text-left bg-blue-50 border border-blue-200 rounded-lg p-3 hover:bg-blue-100 transition-colors"
                        >
                          <div className="flex items-start gap-3">
                            <div className="p-2 bg-white rounded-lg shadow-sm text-blue-600">
                              {getOfferIcon(offer.offer_type)}
                            </div>
                            <div className="flex-1">
                              <div className="font-semibold text-gray-900 text-sm">
                                {offer.name}
                              </div>
                              <div className="text-xs text-gray-700 mt-1">
                                {formatOfferSummary(offer, validation)}
                              </div>
                              {offer.promo_code && (
                                <div className="mt-2">
                                  <span className="text-xs text-gray-600">
                                    Code:{" "}
                                  </span>
                                  <span className="font-mono font-bold text-xs bg-white px-2 py-1 rounded border">
                                    {offer.promo_code}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Inapplicable Offers */}
              {inapplicableOffers.length > 0 && (
                <div>
                  <div className="text-sm font-semibold text-gray-500 mb-3">
                    Not Eligible
                  </div>
                  <div className="space-y-2">
                    {inapplicableOffers.map((offer) => {
                      const validation = validationCache[offer.id];
                      return (
                        <div
                          key={offer.id}
                          className="bg-gray-50 border border-gray-200 rounded-lg p-3 opacity-60"
                        >
                          <div className="flex items-start gap-3">
                            <div className="p-2 bg-white rounded-lg shadow-sm text-gray-400">
                              {getOfferIcon(offer.offer_type)}
                            </div>
                            <div className="flex-1">
                              <div className="font-semibold text-gray-700 text-sm">
                                {offer.name}
                              </div>
                              <div className="flex items-center gap-1 mt-1">
                                <Info className="w-3 h-3 text-gray-500" />
                                <div className="text-xs text-gray-600">
                                  {validation.reason}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {offers.length === 0 && (
                <div className="text-center py-4 text-gray-500 text-sm">
                  No offers available at the moment
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
