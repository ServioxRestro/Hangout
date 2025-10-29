"use client";

import { formatCurrency } from "@/lib/utils";
import {
  Gift,
  Percent,
  Clock,
  Users,
  Tag,
  Calendar,
  Star,
  ArrowRight,
  ShoppingCart,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import type { Tables } from "@/types/database.types";

type Offer = Tables<"offers"> & {
  offer_items?: Array<
    Tables<"offer_items"> & {
      menu_items: Tables<"menu_items"> | null;
      menu_categories: Tables<"menu_categories"> | null;
    }
  >;
  combo_meals?: Array<
    Tables<"combo_meals"> & {
      combo_meal_items?: Array<
        Tables<"combo_meal_items"> & {
          menu_items: Tables<"menu_items"> | null;
          menu_categories: Tables<"menu_categories"> | null;
        }
      >;
    }
  >;
};

interface OfferDetailCardProps {
  offer: Offer;
  onOrderNow: () => void;
}

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

export function OfferDetailCard({ offer, onOrderNow }: OfferDetailCardProps) {
  const benefits = offer.benefits as any;
  const conditions = offer.conditions as any;

  // Get minimum order amount - support multiple field names
  const minOrderAmount =
    conditions?.min_cart_amount ||
    conditions?.min_amount ||
    conditions?.min_order_amount;

  // Separate items by type
  const buyItems = offer.offer_items?.filter((item) =>
    ["buy", "required"].includes(item.item_type || "")
  );
  const getFreeItems = offer.offer_items?.filter((item) =>
    ["get", "get_free", "free_addon"].includes(item.item_type || "")
  );
  const discountItems = offer.offer_items?.filter(
    (item) => item.item_type === "discount"
  );

  const renderOfferBenefit = () => {
    switch (offer.offer_type) {
      case "cart_percentage":
        return (
          <div className="bg-white rounded-lg p-4 border-2 border-green-500">
            <div className="flex items-center gap-3">
              <Percent className="w-8 h-8 text-green-600" />
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {benefits.discount_percentage}% OFF
                </div>
                <div className="text-sm text-gray-600">
                  On your entire order
                </div>
                {minOrderAmount && (
                  <div className="text-xs text-gray-500 mt-1">
                    Min order: {formatCurrency(minOrderAmount)}
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case "cart_flat_amount":
        return (
          <div className="bg-white rounded-lg p-4 border-2 border-blue-500">
            <div className="flex items-center gap-3">
              <Tag className="w-8 h-8 text-blue-600" />
              <div>
                <div className="text-2xl font-bold text-blue-600">
                  {formatCurrency(benefits.discount_amount)} OFF
                </div>
                <div className="text-sm text-gray-600">On your total bill</div>
                {minOrderAmount && (
                  <div className="text-xs text-gray-500 mt-1">
                    Min order: {formatCurrency(minOrderAmount)}
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case "item_buy_get_free":
        return (
          <div className="space-y-3">
            {/* Minimum Order Requirement */}
            {minOrderAmount && (
              <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-blue-600" />
                  <div className="text-sm">
                    <span className="font-semibold text-blue-900">
                      Minimum Order:{" "}
                    </span>
                    <span className="text-blue-700 font-bold">
                      {formatCurrency(minOrderAmount)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Buy Section */}
            {buyItems && buyItems.length > 0 && (
              <div className="bg-white rounded-lg p-4 border-2 border-purple-300">
                <div className="flex items-start gap-3">
                  <ShoppingCart className="w-6 h-6 text-purple-600 flex-shrink-0 mt-1" />
                  <div className="flex-1">
                    <div className="font-bold text-purple-900 mb-2">
                      Buy {benefits.buy_quantity || 1}:
                    </div>
                    <div className="space-y-1">
                      {buyItems.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center gap-2 text-sm"
                        >
                          <CheckCircle2 className="w-4 h-4 text-purple-600" />
                          <span className="font-medium">
                            {item.menu_items?.name ||
                              `Any item from ${item.menu_categories?.name}`}
                          </span>
                          {item.quantity && item.quantity > 1 && (
                            <span className="text-gray-600">
                              (×{item.quantity})
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Get Free Section */}
            {getFreeItems && getFreeItems.length > 0 && (
              <div className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-lg p-4 border-2 border-purple-500">
                <div className="flex items-start gap-3">
                  <Gift className="w-6 h-6 text-purple-600 flex-shrink-0 mt-1" />
                  <div className="flex-1">
                    <div className="font-bold text-purple-900 mb-2 flex items-center gap-2">
                      Get {benefits.free_quantity || 1} FREE
                      <Sparkles className="w-4 h-4 text-yellow-500" />
                    </div>
                    <div className="space-y-1">
                      {getFreeItems.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center gap-2 text-sm"
                        >
                          <CheckCircle2 className="w-4 h-4 text-purple-600" />
                          <span className="font-medium text-purple-900">
                            {item.menu_items?.name ||
                              `Any item from ${item.menu_categories?.name}`}
                          </span>
                          {item.quantity && item.quantity > 1 && (
                            <span className="text-purple-700">
                              (×{item.quantity})
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      case "combo_meal":
        return (
          <div className="space-y-3">
            {/* Minimum Order Requirement */}
            {minOrderAmount && (
              <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-blue-600" />
                  <div className="text-sm">
                    <span className="font-semibold text-blue-900">
                      Minimum Order:{" "}
                    </span>
                    <span className="text-blue-700 font-bold">
                      {formatCurrency(minOrderAmount)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {offer.combo_meals?.map((combo) => (
              <div
                key={combo.id}
                className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-lg p-4 border-2 border-yellow-400"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-start gap-3">
                    <Star className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-1" />
                    <div>
                      <div className="font-bold text-lg text-gray-900">
                        {combo.name}
                      </div>
                      {combo.description && (
                        <div className="text-sm text-gray-600 mt-1">
                          {combo.description}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-yellow-700">
                      {formatCurrency(combo.combo_price)}
                    </div>
                    <div className="text-xs text-gray-600">Combo Price</div>
                  </div>
                </div>

                {/* Combo Items */}
                {combo.combo_meal_items &&
                  combo.combo_meal_items.length > 0 && (
                    <div className="bg-white/60 rounded-lg p-3 space-y-2">
                      <div className="text-sm font-semibold text-gray-700 mb-2">
                        Includes:
                      </div>
                      {combo.combo_meal_items.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-2 text-sm"
                        >
                          <CheckCircle2 className="w-4 h-4 text-yellow-600" />
                          <span>
                            {item.quantity &&
                              item.quantity > 1 &&
                              `${item.quantity}× `}
                            {item.menu_items?.name ||
                              `Choice from ${item.menu_categories?.name}`}
                          </span>
                          {item.is_required === false && (
                            <span className="text-xs text-gray-500">
                              (Optional)
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
              </div>
            ))}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div
      className={`rounded-lg border-2 p-4 ${getOfferColor(offer.offer_type)}`}
    >
      {/* Header */}
      <div className="flex items-start gap-3 mb-4">
        <div className="flex-shrink-0 p-2 bg-white rounded-lg shadow-sm">
          {getOfferIcon(offer.offer_type)}
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-lg text-gray-900 mb-1">{offer.name}</h3>
          {offer.description && (
            <p className="text-sm text-gray-700">{offer.description}</p>
          )}
        </div>
      </div>

      {/* Offer Benefit Display */}
      <div className="mb-4">{renderOfferBenefit()}</div>

      {/* Applicable Items (for percentage/discount offers) */}
      {offer.offer_type === "item_percentage" &&
        discountItems &&
        discountItems.length > 0 && (
          <div className="mb-4 bg-white/60 rounded-lg p-3">
            <div className="text-sm font-semibold text-gray-700 mb-2">
              Applicable on:
            </div>
            <div className="space-y-1">
              {discountItems.slice(0, 5).map((item) => (
                <div key={item.id} className="flex items-center gap-2 text-sm">
                  <ArrowRight className="w-3 h-3 text-gray-500" />
                  <span>
                    {item.menu_items?.name ||
                      `All items in ${item.menu_categories?.name}`}
                  </span>
                </div>
              ))}
              {discountItems.length > 5 && (
                <div className="text-sm text-gray-500 italic">
                  +{discountItems.length - 5} more items
                </div>
              )}
            </div>
          </div>
        )}

      {/* Additional Info */}
      <div className="space-y-2 mb-4">
        {/* Promo Code */}
        {offer.promo_code && (
          <div className="flex items-center gap-2 bg-white/60 rounded p-2">
            <Tag className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-600">Use code:</span>
            <span className="font-mono font-bold text-sm bg-white px-2 py-1 rounded border border-gray-300">
              {offer.promo_code}
            </span>
          </div>
        )}

        {/* Time Restrictions */}
        {(offer.valid_hours_start || offer.valid_hours_end) && (
          <div className="flex items-center gap-2 text-sm text-gray-600 bg-white/40 rounded p-2">
            <Clock className="w-4 h-4" />
            <span>
              Valid {offer.valid_hours_start} - {offer.valid_hours_end}
              {offer.valid_days &&
                offer.valid_days.length > 0 &&
                offer.valid_days.length < 7 && (
                  <span className="ml-2">
                    (
                    {offer.valid_days
                      .map((day) => day.charAt(0).toUpperCase())
                      .join(", ")}
                    )
                  </span>
                )}
            </span>
          </div>
        )}

        {/* Date Range */}
        {offer.end_date && (
          <div className="flex items-center gap-2 text-sm text-gray-600 bg-white/40 rounded p-2">
            <Calendar className="w-4 h-4" />
            <span>
              Valid until {new Date(offer.end_date).toLocaleDateString()}
            </span>
          </div>
        )}

        {/* Usage Limit */}
        {offer.usage_limit && offer.usage_count !== null && (
          <div className="flex items-center gap-2 text-sm text-gray-600 bg-white/40 rounded p-2">
            <Users className="w-4 h-4" />
            <span>{offer.usage_limit - offer.usage_count} uses remaining</span>
          </div>
        )}
      </div>

      {/* Action Button */}
      <button
        onClick={onOrderNow}
        className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center gap-2"
      >
        <ShoppingCart className="w-5 h-5" />
        Order Now
      </button>
    </div>
  );
}
