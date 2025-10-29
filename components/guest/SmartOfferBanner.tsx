"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import type { Tables } from "@/types/database.types";
import { formatCurrency } from "@/lib/utils";
import { TrendingUp, Gift, Zap, ArrowRight } from "lucide-react";

type Offer = Tables<"offers">;

interface CartItem {
  id: string;
  price: number;
  quantity: number;
}

interface SmartOfferBannerProps {
  cartItems: CartItem[];
  cartTotal: number;
  onViewOffers?: () => void;
}

interface OfferSuggestion {
  offer: Offer;
  type: "almost_there" | "unlocked" | "available";
  amountNeeded?: number;
  savings?: number;
  message: string;
}

export function SmartOfferBanner({
  cartItems,
  cartTotal,
  onViewOffers,
}: SmartOfferBannerProps) {
  const [suggestion, setSuggestion] = useState<OfferSuggestion | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    findBestSuggestion();
  }, [cartTotal, cartItems]);

  const findBestSuggestion = async () => {
    try {
      // Fetch all active offers (both session-level and order-level)
      const { data: offers, error } = await supabase
        .from("offers")
        .select(
          `
          *,
          offer_items (
            *,
            menu_items (*),
            menu_categories (*)
          ),
          combo_meals (
            id,
            combo_price,
            is_customizable,
            combo_meal_items (
              id,
              menu_item_id,
              is_required,
              quantity,
              menu_items (
                id,
                name,
                price
              )
            )
          )
        `
        )
        .eq("is_active", true)
        .in("application_type", ["session_level", "order_level"])
        .order("priority", { ascending: false });

      if (error || !offers || offers.length === 0) {
        setSuggestion(null);
        setLoading(false);
        return;
      }

      const now = new Date();
      const currentTime = now.toTimeString().slice(0, 5);
      const currentDay = now
        .toLocaleDateString("en-US", { weekday: "long" })
        .toLowerCase();

      // Filter valid offers (time/date)
      const validOffers = offers.filter((offer) => {
        // Check date validity
        if (offer.start_date && new Date(offer.start_date) > now) return false;
        if (offer.end_date && new Date(offer.end_date) < now) return false;

        // Check time validity
        if (offer.valid_hours_start && offer.valid_hours_end) {
          if (
            currentTime < offer.valid_hours_start ||
            currentTime > offer.valid_hours_end
          )
            return false;
        }

        // Check day validity
        if (offer.valid_days && offer.valid_days.length > 0) {
          if (!offer.valid_days.includes(currentDay)) return false;
        }

        return true;
      });

      let bestSuggestion: OfferSuggestion | null = null;

      // Find "almost there" offers (within 20% of threshold)
      for (const offer of validOffers) {
        const conditions = offer.conditions as any;
        const benefits = offer.benefits as any;

        if (offer.offer_type === "min_order_discount") {
          const threshold = conditions?.threshold_amount || 0;
          const discount = benefits?.discount_amount || 0;

          if (cartTotal < threshold) {
            const amountNeeded = threshold - cartTotal;
            const percentageToThreshold = (cartTotal / threshold) * 100;

            // Show if within 80% of threshold
            if (percentageToThreshold >= 60) {
              bestSuggestion = {
                offer,
                type: "almost_there",
                amountNeeded,
                savings: discount,
                message: `Add ${formatCurrency(
                  amountNeeded
                )} more to save ${formatCurrency(discount)}!`,
              };
              break; // Prioritize closest threshold
            }
          } else if (cartTotal >= threshold) {
            // Already unlocked
            bestSuggestion = {
              offer,
              type: "unlocked",
              savings: discount,
              message: `You've unlocked ${formatCurrency(
                discount
              )} off! Apply this offer.`,
            };
            break;
          }
        } else if (offer.offer_type === "cart_percentage") {
          const minAmount = conditions?.min_amount || 0;
          const discountPercentage = benefits?.discount_percentage || 0;
          const maxDiscount = benefits?.max_discount_amount;

          if (cartTotal >= minAmount) {
            let savings = (cartTotal * discountPercentage) / 100;
            if (maxDiscount) {
              savings = Math.min(savings, maxDiscount);
            }

            bestSuggestion = {
              offer,
              type: "available",
              savings,
              message: `Save ${formatCurrency(
                savings
              )} with ${discountPercentage}% off!`,
            };
            break;
          } else if (minAmount > 0) {
            const amountNeeded = minAmount - cartTotal;
            const percentageToMin = (cartTotal / minAmount) * 100;

            if (percentageToMin >= 60) {
              const potentialSavings = (minAmount * discountPercentage) / 100;
              bestSuggestion = {
                offer,
                type: "almost_there",
                amountNeeded,
                savings: maxDiscount
                  ? Math.min(potentialSavings, maxDiscount)
                  : potentialSavings,
                message: `Add ${formatCurrency(
                  amountNeeded
                )} more to unlock ${discountPercentage}% off!`,
              };
              break;
            }
          }
        } else if (offer.offer_type === "cart_threshold_item") {
          // Free item when cart reaches threshold
          const threshold = conditions?.threshold_amount || 0;

          if (cartTotal >= threshold) {
            bestSuggestion = {
              offer,
              type: "unlocked",
              message: `You've unlocked a free item! Check available offers.`,
            };
            break;
          } else {
            const amountNeeded = threshold - cartTotal;
            const percentageToThreshold = (cartTotal / threshold) * 100;

            if (percentageToThreshold >= 60) {
              bestSuggestion = {
                offer,
                type: "almost_there",
                amountNeeded,
                message: `Add ${formatCurrency(
                  amountNeeded
                )} more to get a free item!`,
              };
              break;
            }
          }
        } else if (offer.offer_type === "item_buy_get_free") {
          // BOGO offer - check if qualifying items are in cart
          const buyQuantity = benefits?.buy_quantity || 0;
          const offerItems = (offer as any).offer_items || [];
          const buyItems = offerItems.filter(
            (oi: any) => oi.item_type === "buy"
          );
          const getItems = offerItems.filter(
            (oi: any) => oi.item_type === "get"
          );

          if (buyItems.length > 0) {
            // Count qualifying items in cart
            const qualifyingCount = cartItems.reduce((count, cartItem) => {
              const isBuyItem = buyItems.some(
                (buyItem: any) => buyItem.menu_item_id === cartItem.id
              );
              return isBuyItem ? count + cartItem.quantity : count;
            }, 0);

            // Get item names for better messaging
            const buyItemNames = buyItems
              .map((item: any) => item.menu_items?.name)
              .filter(Boolean);
            const getItemNames = getItems
              .map((item: any) => item.menu_items?.name)
              .filter(Boolean);

            if (qualifyingCount >= buyQuantity) {
              const freeItemName =
                getItemNames.length > 0 ? getItemNames[0] : "item";
              bestSuggestion = {
                offer,
                type: "unlocked",
                message: `Get free ${freeItemName}! Apply this offer now.`,
              };
              break;
            } else if (qualifyingCount > 0) {
              const itemsNeeded = buyQuantity - qualifyingCount;
              const buyItemName =
                buyItemNames.length > 0 ? buyItemNames[0] : "item";
              const freeItemName =
                getItemNames.length > 0 ? getItemNames[0] : "item";

              bestSuggestion = {
                offer,
                type: "almost_there",
                message: `Add ${itemsNeeded} more ${buyItemName} to get free ${freeItemName}!`,
              };
              break;
            }
          }
        } else if (offer.offer_type === "combo_meal") {
          // Combo meal offer - check if user has some/all required items
          const comboPrice = benefits?.combo_price || 0;
          const comboMeals = (offer as any).combo_meals || [];

          if (comboMeals.length > 0) {
            const comboMeal = comboMeals[0];
            const comboItems = comboMeal.combo_meal_items || [];
            const requiredItems = comboItems.filter(
              (ci: any) => ci.is_required
            );

            if (requiredItems.length > 0) {
              // Count how many required items are in cart
              const itemsInCart = requiredItems.filter((reqItem: any) =>
                cartItems.some(
                  (cartItem) => cartItem.id === reqItem.menu_item_id
                )
              );

              const totalRequiredItems = requiredItems.length;
              const itemsInCartCount = itemsInCart.length;

              if (itemsInCartCount === totalRequiredItems) {
                // All items in cart - ready to apply
                const regularPrice = requiredItems.reduce(
                  (sum: number, item: any) =>
                    sum +
                    parseFloat(item.menu_items?.price || 0) * item.quantity,
                  0
                );
                const savings = regularPrice - comboPrice;

                bestSuggestion = {
                  offer,
                  type: "unlocked",
                  savings,
                  message: `Combo unlocked! Save ${formatCurrency(
                    savings
                  )} - Apply this offer.`,
                };
                break;
              } else if (itemsInCartCount > 0) {
                // Some items in cart - show what's needed with item names
                const missingItems = requiredItems.filter(
                  (reqItem: any) =>
                    !cartItems.some(
                      (cartItem) => cartItem.id === reqItem.menu_item_id
                    )
                );

                // Get missing item names
                const missingItemNames = missingItems
                  .map((item: any) => item.menu_items?.name)
                  .filter(Boolean);

                const itemsNeeded = missingItems.length;
                const itemList =
                  missingItemNames.length > 0
                    ? missingItemNames.join(", ")
                    : `${itemsNeeded} more ${
                        itemsNeeded === 1 ? "item" : "items"
                      }`;

                bestSuggestion = {
                  offer,
                  type: "almost_there",
                  message: `Add ${itemList} to unlock combo for ${formatCurrency(
                    comboPrice
                  )}!`,
                };
                break;
              } else {
                // No items in cart yet - show all required items
                const itemNames = requiredItems
                  .map((item: any) => item.menu_items?.name)
                  .filter(Boolean);

                const itemList =
                  itemNames.length > 0
                    ? itemNames.join(" + ")
                    : `${totalRequiredItems} items`;

                bestSuggestion = {
                  offer,
                  type: "available",
                  message: `Get ${itemList} combo for ${formatCurrency(
                    comboPrice
                  )}!`,
                };
                break;
              }
            }
          }
        } else if (offer.offer_type === "item_free_addon") {
          // Free addon with item purchase
          const offerItems = (offer as any).offer_items || [];
          const buyItems = offerItems.filter(
            (oi: any) => oi.item_type === "buy"
          );

          if (buyItems.length > 0) {
            // Check if qualifying items are in cart
            const hasBuyItem = cartItems.some((cartItem) =>
              buyItems.some(
                (buyItem: any) => buyItem.menu_item_id === cartItem.id
              )
            );

            if (hasBuyItem) {
              bestSuggestion = {
                offer,
                type: "unlocked",
                message: `Get a free addon with your purchase! Apply this offer.`,
              };
              break;
            }
          }
        }
      }

      setSuggestion(bestSuggestion);
    } catch (error) {
      console.error("Error finding offer suggestions:", error);
      setSuggestion(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !suggestion || cartItems.length === 0) return null;

  const getBannerStyle = () => {
    switch (suggestion.type) {
      case "almost_there":
        return {
          bg: "bg-gradient-to-r from-orange-50 to-yellow-50",
          border: "border-orange-200",
          icon: <TrendingUp className="w-5 h-5 text-orange-600" />,
          iconBg: "bg-orange-100",
          textColor: "text-orange-900",
          subTextColor: "text-orange-700",
        };
      case "unlocked":
        return {
          bg: "bg-gradient-to-r from-green-50 to-emerald-50",
          border: "border-green-200",
          icon: <Gift className="w-5 h-5 text-green-600" />,
          iconBg: "bg-green-100",
          textColor: "text-green-900",
          subTextColor: "text-green-700",
        };
      case "available":
        return {
          bg: "bg-gradient-to-r from-blue-50 to-indigo-50",
          border: "border-blue-200",
          icon: <Zap className="w-5 h-5 text-blue-600" />,
          iconBg: "bg-blue-100",
          textColor: "text-blue-900",
          subTextColor: "text-blue-700",
        };
    }
  };

  const style = getBannerStyle();

  // Only make "unlocked" and "available" offers clickable
  // "almost_there" should not redirect (bad UX - user is still adding items)
  const isClickable =
    suggestion.type === "unlocked" || suggestion.type === "available";
  const handleClick = () => {
    if (isClickable && onViewOffers) {
      onViewOffers();
    }
  };

  return (
    <div
      className={`${style.bg} border-2 ${
        style.border
      } rounded-lg p-4 mb-4 shadow-sm ${
        isClickable ? "hover:shadow-md cursor-pointer" : ""
      } transition-shadow`}
      onClick={handleClick}
    >
      <div className="flex items-start gap-3">
        <div className={`p-2 ${style.iconBg} rounded-lg flex-shrink-0`}>
          {style.icon}
        </div>
        <div className="flex-1">
          <div className={`font-semibold ${style.textColor} mb-1`}>
            {suggestion.type === "almost_there" && "💡 Almost There!"}
            {suggestion.type === "unlocked" && "🎉 Offer Unlocked!"}
            {suggestion.type === "available" && "✨ Save More!"}
          </div>
          <div className={`text-sm ${style.subTextColor} font-medium`}>
            {suggestion.message}
          </div>
          <div className="text-xs text-gray-600 mt-1">
            {suggestion.offer.name}
          </div>
        </div>
        {onViewOffers && isClickable && (
          <button className="p-1 hover:bg-white/50 rounded-lg transition-colors">
            <ArrowRight className="w-4 h-4 text-gray-600" />
          </button>
        )}
      </div>
    </div>
  );
}
