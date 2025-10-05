"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import type { Tables } from "@/types/database.types";
import { GuestLayout } from "@/components/guest/GuestLayout";
import { OffersCarousel } from "@/components/guest/OffersCarousel";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Button } from "@/components/ui/Button";
import { formatCurrency } from "@/lib/utils";
import {
  Gift,
  Percent,
  Clock,
  Users,
  Tag,
  Calendar,
  Star,
  ArrowRight
} from "lucide-react";

type Offer = Tables<"offers"> & {
  offer_items?: Array<
    Tables<"offer_items"> & {
      menu_items: Tables<"menu_items"> | null;
      menu_categories: Tables<"menu_categories"> | null;
    }
  >;
  combo_meals?: Array<Tables<"combo_meals">>;
};

const getOfferIcon = (offerType: string) => {
  switch (offerType) {
    case "cart_percentage":
    case "item_percentage":
      return <Percent className="w-6 h-6 text-green-600" />;
    case "cart_flat_amount":
      return <Tag className="w-6 h-6 text-blue-600" />;
    case "item_buy_get_free":
      return <Gift className="w-6 h-6 text-purple-600" />;
    case "time_based":
      return <Clock className="w-6 h-6 text-orange-600" />;
    case "customer_based":
      return <Users className="w-6 h-6 text-indigo-600" />;
    case "combo_meal":
      return <Star className="w-6 h-6 text-yellow-600" />;
    default:
      return <Gift className="w-6 h-6 text-gray-600" />;
  }
};

const getOfferColor = (offerType: string) => {
  switch (offerType) {
    case "cart_percentage":
    case "item_percentage":
      return "bg-green-50 border-green-200";
    case "cart_flat_amount":
      return "bg-blue-50 border-blue-200";
    case "item_buy_get_free":
      return "bg-purple-50 border-purple-200";
    case "time_based":
      return "bg-orange-50 border-orange-200";
    case "customer_based":
      return "bg-indigo-50 border-indigo-200";
    case "combo_meal":
      return "bg-yellow-50 border-yellow-200";
    default:
      return "bg-gray-50 border-gray-200";
  }
};

const formatOfferDescription = (offer: Offer) => {
  const benefits = offer.benefits as any;

  switch (offer.offer_type) {
    case "cart_percentage":
      return `Get ${benefits.discount_percentage || 0}% off your entire order`;
    case "cart_flat_amount":
      return `Get ${formatCurrency(benefits.discount_amount || 0)} off your order`;
    case "item_percentage":
      return `Get ${benefits.discount_percentage || 0}% off selected items`;
    case "item_buy_get_free":
      return `Buy ${benefits.buy_quantity || 1}, Get ${benefits.free_quantity || 1} Free`;
    case "combo_meal":
      return "Special combo meal offer";
    case "time_based":
      return "Limited time offer";
    case "customer_based":
      return "Exclusive customer offer";
    default:
      return offer.description || "Special offer available";
  }
};

const isOfferValid = (offer: Offer) => {
  const now = new Date();

  // Check date validity
  if (offer.start_date && new Date(offer.start_date) > now) return false;
  if (offer.end_date && new Date(offer.end_date) < now) return false;

  // Check time validity
  if (offer.valid_hours_start && offer.valid_hours_end) {
    const currentTime = now.toTimeString().slice(0, 5);
    if (currentTime < offer.valid_hours_start || currentTime > offer.valid_hours_end) {
      return false;
    }
  }

  // Check day validity
  if (offer.valid_days && offer.valid_days.length > 0) {
    const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    if (!offer.valid_days.includes(currentDay)) return false;
  }

  return true;
};

export default function OffersPage() {
  const params = useParams();
  const tableCode = params?.tableCode as string;

  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchOffers();
  }, []);

  const fetchOffers = async () => {
    try {
      const { data: offersData, error: offersError } = await supabase
        .from("offers")
        .select(`
          *,
          offer_items (
            *,
            menu_items (*),
            menu_categories (*)
          ),
          combo_meals (*)
        `)
        .eq("is_active", true)
        .order("priority", { ascending: false });

      if (offersError) {
        throw new Error(offersError.message);
      }

      // Filter valid offers
      const validOffers = (offersData as Offer[])?.filter(isOfferValid) || [];
      setOffers(validOffers);
    } catch (error: any) {
      console.error("Error fetching offers:", error);
      setError(error.message || "Failed to load offers");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <GuestLayout showNavigation={false}>
        <div className="min-h-screen flex items-center justify-center">
          <LoadingSpinner text="Loading offers..." />
        </div>
      </GuestLayout>
    );
  }

  return (
    <GuestLayout>
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4 sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <Gift className="w-6 h-6 text-blue-600" />
          <div>
            <h1 className="text-lg font-bold text-gray-900">Special Offers</h1>
            <p className="text-sm text-gray-600">
              Great deals just for you
            </p>
          </div>
        </div>
      </div>

      <div className="p-4">
        {/* Offers Carousel */}
        {!error && offers.length > 0 && (
          <OffersCarousel offers={offers} />
        )}

        {error ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Gift className="w-10 h-10 text-red-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Failed to load offers</h3>
            <p className="text-gray-500 mb-6">{error}</p>
            <Button variant="primary" onClick={fetchOffers}>
              Try Again
            </Button>
          </div>
        ) : offers.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Gift className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No offers available</h3>
            <p className="text-gray-500 mb-6">
              Check back later for exciting deals and promotions
            </p>
            <Button
              variant="primary"
              onClick={() => window.location.href = `/t/${tableCode}`}
            >
              Browse Menu
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {offers.map((offer) => (
              <div
                key={offer.id}
                className={`rounded-lg border p-4 ${getOfferColor(offer.offer_type)}`}
              >
                {/* Offer Header */}
                <div className="flex items-start gap-3 mb-3">
                  <div className="flex-shrink-0 p-2 bg-white rounded-lg shadow-sm">
                    {getOfferIcon(offer.offer_type)}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-900 mb-1">{offer.name}</h3>
                    <p className="text-sm text-gray-700 mb-2">
                      {formatOfferDescription(offer)}
                    </p>
                    {offer.description && offer.description !== formatOfferDescription(offer) && (
                      <p className="text-xs text-gray-600">{offer.description}</p>
                    )}
                  </div>
                </div>

                {/* Offer Details */}
                <div className="space-y-2 mb-4">
                  {/* Promo Code */}
                  {offer.promo_code && (
                    <div className="flex items-center gap-2">
                      <Tag className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-gray-600">Use code:</span>
                      <span className="font-mono font-bold text-sm bg-white px-2 py-1 rounded border">
                        {offer.promo_code}
                      </span>
                    </div>
                  )}

                  {/* Time Restrictions */}
                  {(offer.valid_hours_start || offer.valid_hours_end || offer.valid_days) && (
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-500" />
                      <div className="text-sm text-gray-600">
                        {offer.valid_hours_start && offer.valid_hours_end && (
                          <span>Valid {offer.valid_hours_start} - {offer.valid_hours_end}</span>
                        )}
                        {offer.valid_days && offer.valid_days.length > 0 && (
                          <span className="ml-2">
                            ({offer.valid_days.map(day => day.charAt(0).toUpperCase() + day.slice(1)).join(", ")})
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Date Range */}
                  {(offer.start_date || offer.end_date) && (
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-gray-600">
                        {offer.start_date && `From ${new Date(offer.start_date).toLocaleDateString()}`}
                        {offer.start_date && offer.end_date && " "}
                        {offer.end_date && `Until ${new Date(offer.end_date).toLocaleDateString()}`}
                      </span>
                    </div>
                  )}

                  {/* Usage Limit */}
                  {offer.usage_limit && (
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-gray-600">
                        Limited to {offer.usage_limit} uses
                        {offer.usage_count && ` (${offer.usage_limit - offer.usage_count} remaining)`}
                      </span>
                    </div>
                  )}
                </div>

                {/* Applicable Items */}
                {offer.offer_items && offer.offer_items.length > 0 && (
                  <div className="mb-4">
                    <div className="text-sm font-medium text-gray-900 mb-2">Applicable to:</div>
                    <div className="space-y-1">
                      {offer.offer_items.slice(0, 3).map((item) => (
                        <div key={item.id} className="text-sm text-gray-600 flex items-center gap-2">
                          <ArrowRight className="w-3 h-3" />
                          {item.menu_items?.name || item.menu_categories?.name || "Selected items"}
                        </div>
                      ))}
                      {offer.offer_items.length > 3 && (
                        <div className="text-sm text-gray-500">
                          +{offer.offer_items.length - 3} more items
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Combo Meals */}
                {offer.combo_meals && offer.combo_meals.length > 0 && (
                  <div className="mb-4">
                    <div className="text-sm font-medium text-gray-900 mb-2">Combo Meals:</div>
                    <div className="space-y-2">
                      {offer.combo_meals.map((combo) => (
                        <div key={combo.id} className="bg-white rounded-lg p-3 border">
                          <div className="font-medium text-sm">{combo.name}</div>
                          {combo.description && (
                            <div className="text-xs text-gray-600 mt-1">{combo.description}</div>
                          )}
                          <div className="font-bold text-sm text-green-600 mt-1">
                            {formatCurrency(combo.combo_price)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Button */}
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => window.location.href = `/t/${tableCode}`}
                  className="w-full"
                >
                  Order Now
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </GuestLayout>
  );
}