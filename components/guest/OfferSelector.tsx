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
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  checkOfferEligibility,
  type OfferEligibility,
  type CartItem as EligibilityCartItem,
} from "@/lib/offers/eligibility";
import { FreeItemSelector } from "@/components/guest/FreeItemSelector";

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
  isFree?: boolean;
  linkedOfferId?: string;
}

interface OfferSelectorProps {
  cartItems: CartItem[];
  cartTotal: number;
  customerPhone?: string;
  tableId?: string;
  orderType?: "dine-in" | "takeaway";
  onOfferSelect: (offer: Offer | null) => void;
  selectedOffer: Offer | null;
  onFreeItemAdd?: (items: CartItem[]) => void;
}

export function OfferSelector({
  cartItems,
  cartTotal,
  customerPhone,
  tableId,
  orderType = "dine-in",
  onOfferSelect,
  selectedOffer,
  onFreeItemAdd,
}: OfferSelectorProps) {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showOfferList, setShowOfferList] = useState(false);
  const [eligibilityCache, setEligibilityCache] = useState<
    Record<string, OfferEligibility>
  >({});
  const [showFreeItemModal, setShowFreeItemModal] = useState(false);
  const [pendingOfferForFreeItem, setPendingOfferForFreeItem] =
    useState<Offer | null>(null);
  const [availableFreeItems, setAvailableFreeItems] = useState<
    Array<{
      id: string;
      name: string;
      price: number;
      type: "item" | "category";
    }>
  >([]);
  const [maxFreeItemPrice, setMaxFreeItemPrice] = useState<number>(0);

  useEffect(() => {
    fetchOffers();
  }, [orderType]);

  useEffect(() => {
    // Revalidate all offers when cart changes
    if (offers.length > 0) {
      validateAllOffers();
    }
  }, [cartTotal, cartItems, customerPhone]);

  const fetchOffers = async () => {
    try {
      // Determine the filter field based on order type
      const filterField =
        orderType === "dine-in" ? "enabled_for_dinein" : "enabled_for_takeaway";

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
        .eq(filterField, true) // Filter by order type
        .eq("application_type", "session_level") // Only session-level offers
        .order("priority", { ascending: false });

      if (offersError) throw offersError;

      const validOffers = (offersData as Offer[]) || [];
      setOffers(validOffers);

      // Validate all offers
      await validateAllOffers(validOffers);
    } catch (error: any) {
      console.error("Error fetching offers:", error);
    } finally {
      setLoading(false);
    }
  };

  const validateAllOffers = async (offersList = offers) => {
    const eligibilities: Record<string, OfferEligibility> = {};

    for (const offer of offersList) {
      const cartItemsForCheck: EligibilityCartItem[] = cartItems.map(
        (item) => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          category_id: item.category_id,
        })
      );

      const eligibility = await checkOfferEligibility(
        offer,
        cartItemsForCheck,
        cartTotal,
        customerPhone,
        offer.offer_items
      );

      eligibilities[offer.id] = eligibility;
    }

    setEligibilityCache(eligibilities);

    // Auto-deselect if selected offer is no longer eligible
    if (
      selectedOffer &&
      eligibilities[selectedOffer.id] &&
      !eligibilities[selectedOffer.id].isEligible
    ) {
      onOfferSelect(null);
    }
  };

  const handleOfferClick = async (offer: Offer) => {
    const eligibility = eligibilityCache[offer.id];

    if (!eligibility || !eligibility.isEligible) {
      return; // Can't select ineligible offers
    }

    // Check if this offer requires user action (free item selection)
    if (eligibility.requiresUserAction && eligibility.availableFreeItems) {
      setPendingOfferForFreeItem(offer);
      setAvailableFreeItems(eligibility.availableFreeItems);

      // Get max price from offer benefits
      const benefits = offer.benefits as any;
      setMaxFreeItemPrice(benefits.max_free_item_price || 0);

      setShowFreeItemModal(true);
      setShowOfferList(false);
    } else {
      // Directly apply offer with auto-added free items if any
      onOfferSelect(offer);

      if (
        eligibility.freeItems &&
        eligibility.freeItems.length > 0 &&
        onFreeItemAdd
      ) {
        onFreeItemAdd(eligibility.freeItems);
      }

      setShowOfferList(false);
    }
  };

  const handleFreeItemSelect = (selectedItem: {
    id: string;
    name: string;
    price: number;
  }) => {
    if (!pendingOfferForFreeItem) return;

    // Create free item for cart
    const freeItem: CartItem = {
      id: selectedItem.id,
      name: selectedItem.name,
      price: selectedItem.price,
      quantity: 1,
      isFree: true,
      linkedOfferId: pendingOfferForFreeItem.id,
    };

    // Apply the offer
    onOfferSelect(pendingOfferForFreeItem);

    // Add free item to cart
    if (onFreeItemAdd) {
      onFreeItemAdd([freeItem]);
    }

    // Clean up
    setShowFreeItemModal(false);
    setPendingOfferForFreeItem(null);
    setAvailableFreeItems([]);
  };

  const getOfferIcon = (offerType: string) => {
    switch (offerType) {
      case "cart_percentage":
      case "min_order_discount":
      case "item_percentage":
        return <Percent className="w-5 h-5" />;
      case "cart_flat_amount":
      case "item_free_addon":
      case "item_buy_get_free":
      case "cart_threshold_item":
        return <Gift className="w-5 h-5" />;
      case "time_based":
        return <Clock className="w-5 h-5" />;
      case "customer_based":
        return <Users className="w-5 h-5" />;
      case "promo_code":
      case "combo_meal":
        return <Tag className="w-5 h-5" />;
      default:
        return <Gift className="w-5 h-5" />;
    }
  };

  const formatOfferSummary = (offer: Offer, eligibility: OfferEligibility) => {
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
        summary = `${formatCurrency(
          benefits.discount_amount
        )} off on orders above ${formatCurrency(conditions.threshold_amount)}`;
        break;
      case "cart_threshold_item":
        summary = `Free item on orders above ${formatCurrency(
          conditions.threshold_amount
        )}`;
        break;
      case "item_buy_get_free":
        summary = `Buy ${benefits.buy_quantity}, Get 1 free`;
        break;
      case "item_free_addon":
        summary = `Free item with purchase`;
        break;
      case "item_percentage":
        summary = `${benefits.discount_percentage}% off on selected items`;
        break;
      case "combo_meal":
        summary = `Combo deal - ${formatCurrency(benefits.combo_price)}`;
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

    if (eligibility.isEligible && eligibility.discount > 0) {
      summary += ` • Save ${formatCurrency(eligibility.discount)}`;
    }

    if (eligibility.freeItems && eligibility.freeItems.length > 0) {
      summary += ` • ${eligibility.freeItems.length} free item${
        eligibility.freeItems.length > 1 ? "s" : ""
      }`;
    }

    return summary;
  };

  const handleOfferDeselect = () => {
    onOfferSelect(null);
    setShowOfferList(false);
  };

  if (loading) {
    return null; // Don't show while loading
  }

  // Categorize offers into 3 sections
  const applicableOffers = offers.filter(
    (o) => eligibilityCache[o.id]?.isEligible
  );
  const almostThereOffers = offers.filter((o) => {
    const elig = eligibilityCache[o.id];
    return !elig?.isEligible && elig?.reason?.includes("Add ₹");
  });
  const notEligibleOffers = offers.filter((o) => {
    const elig = eligibilityCache[o.id];
    return !elig?.isEligible && !elig?.reason?.includes("Add ₹");
  });

  return (
    <>
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
                      eligibilityCache[selectedOffer.id]
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
                onClick={handleOfferDeselect}
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
                        ? `${applicableOffers.length} offer${
                            applicableOffers.length !== 1 ? "s" : ""
                          } available`
                        : almostThereOffers.length > 0
                        ? `${almostThereOffers.length} offer${
                            almostThereOffers.length !== 1 ? "s" : ""
                          } almost there`
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
              <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
                {/* Section 1: Applicable Offers (Green) */}
                {applicableOffers.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 text-sm font-semibold text-green-700 mb-3">
                      <CheckCircle className="w-4 h-4" />
                      Available Now
                    </div>
                    <div className="space-y-2">
                      {applicableOffers.map((offer) => {
                        const eligibility = eligibilityCache[offer.id];
                        return (
                          <button
                            key={offer.id}
                            onClick={() => handleOfferClick(offer)}
                            className="w-full text-left bg-green-50 border-2 border-green-200 rounded-lg p-3 hover:bg-green-100 hover:border-green-300 transition-colors"
                          >
                            <div className="flex items-start gap-3">
                              <div className="p-2 bg-white rounded-lg shadow-sm text-green-600">
                                {getOfferIcon(offer.offer_type)}
                              </div>
                              <div className="flex-1">
                                <div className="font-semibold text-gray-900 text-sm">
                                  {offer.name}
                                </div>
                                <div className="text-xs text-gray-700 mt-1">
                                  {formatOfferSummary(offer, eligibility)}
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
                              <ChevronRight className="w-4 h-4 text-green-600 mt-1" />
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Section 2: Almost There (Amber) */}
                {almostThereOffers.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 text-sm font-semibold text-amber-700 mb-3">
                      <TrendingUp className="w-4 h-4" />
                      Almost There
                    </div>
                    <div className="space-y-2">
                      {almostThereOffers.map((offer) => {
                        const eligibility = eligibilityCache[offer.id];
                        return (
                          <div
                            key={offer.id}
                            className="bg-amber-50 border border-amber-200 rounded-lg p-3"
                          >
                            <div className="flex items-start gap-3">
                              <div className="p-2 bg-white rounded-lg shadow-sm text-amber-600">
                                {getOfferIcon(offer.offer_type)}
                              </div>
                              <div className="flex-1">
                                <div className="font-semibold text-gray-900 text-sm">
                                  {offer.name}
                                </div>
                                <div className="flex items-center gap-1 mt-1">
                                  <TrendingUp className="w-3 h-3 text-amber-600" />
                                  <div className="text-xs text-amber-700 font-medium">
                                    {eligibility.reason}
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

                {/* Section 3: Not Eligible (Grey) */}
                {notEligibleOffers.length > 0 && (
                  <div>
                    <div className="text-sm font-semibold text-gray-500 mb-3">
                      Not Eligible
                    </div>
                    <div className="space-y-2">
                      {notEligibleOffers.map((offer) => {
                        const eligibility = eligibilityCache[offer.id];
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
                                    {eligibility.reason}
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

      {/* Free Item Selection Modal */}
      <FreeItemSelector
        isOpen={showFreeItemModal}
        onClose={() => {
          setShowFreeItemModal(false);
          setPendingOfferForFreeItem(null);
          setAvailableFreeItems([]);
        }}
        availableItems={availableFreeItems}
        maxPrice={maxFreeItemPrice}
        offerName={pendingOfferForFreeItem?.name || ""}
        onSelect={handleFreeItemSelect}
      />
    </>
  );
}
