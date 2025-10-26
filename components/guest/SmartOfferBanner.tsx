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
      // Fetch all active session-level offers
      const { data: offers, error } = await supabase
        .from("offers")
        .select("*")
        .eq("is_active", true)
        .eq("application_type", "session_level")
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
                message: `Add ${formatCurrency(amountNeeded)} more to save ${formatCurrency(discount)}!`,
              };
              break; // Prioritize closest threshold
            }
          } else if (cartTotal >= threshold) {
            // Already unlocked
            bestSuggestion = {
              offer,
              type: "unlocked",
              savings: discount,
              message: `You've unlocked ${formatCurrency(discount)} off! Apply this offer.`,
            };
            break;
          }
        } else if (offer.offer_type === "cart_percentage") {
          const minAmount = conditions?.min_amount || 0;
          const discountPercentage = benefits?.discount_percentage || 0;
          const maxDiscount = benefits?.max_discount_amount;

          if (cartTotal >= minAmount) {
            let savings =
              (cartTotal * discountPercentage) / 100;
            if (maxDiscount) {
              savings = Math.min(savings, maxDiscount);
            }

            bestSuggestion = {
              offer,
              type: "available",
              savings,
              message: `Save ${formatCurrency(savings)} with ${discountPercentage}% off!`,
            };
            break;
          } else if (minAmount > 0) {
            const amountNeeded = minAmount - cartTotal;
            const percentageToMin = (cartTotal / minAmount) * 100;

            if (percentageToMin >= 60) {
              const potentialSavings =
                (minAmount * discountPercentage) / 100;
              bestSuggestion = {
                offer,
                type: "almost_there",
                amountNeeded,
                savings: maxDiscount
                  ? Math.min(potentialSavings, maxDiscount)
                  : potentialSavings,
                message: `Add ${formatCurrency(amountNeeded)} more to unlock ${discountPercentage}% off!`,
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

  return (
    <div
      className={`${style.bg} border-2 ${style.border} rounded-lg p-4 mb-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer`}
      onClick={onViewOffers}
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
          <div className="text-xs text-gray-600 mt-1">{suggestion.offer.name}</div>
        </div>
        {onViewOffers && (
          <button className="p-1 hover:bg-white/50 rounded-lg transition-colors">
            <ArrowRight className="w-4 h-4 text-gray-600" />
          </button>
        )}
      </div>
    </div>
  );
}
