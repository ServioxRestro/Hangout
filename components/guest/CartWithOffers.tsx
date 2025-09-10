"use client";

import { useState, useEffect } from "react";
import { OfferCalculator, type CartItem, type OfferCalculationResult } from "@/lib/offers/calculator";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatCurrency } from "@/lib/constants";

interface CartWithOffersProps {
  cart: CartItem[];
  customerEmail?: string;
  customerPhone?: string;
  tableCode?: string;
  onUpdateTotal?: (result: OfferCalculationResult) => void;
}

export default function CartWithOffers({
  cart,
  customerEmail,
  customerPhone,
  tableCode,
  onUpdateTotal
}: CartWithOffersProps) {
  const [offerResult, setOfferResult] = useState<OfferCalculationResult>({
    original_amount: 0,
    discount_amount: 0,
    final_amount: 0,
    applied_offers: [],
    free_items: []
  });
  
  const [promoCode, setPromoCode] = useState("");
  const [promoCodeApplied, setPromoCodeApplied] = useState(false);
  const [promoError, setPromoError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (cart.length > 0) {
      calculateOffers();
    }
  }, [cart, customerEmail, customerPhone]);

  const calculateOffers = async (codeToApply?: string) => {
    setLoading(true);
    try {
      const calculator = new OfferCalculator(cart, {
        email: customerEmail,
        phone: customerPhone,
        tableCode
      });

      const result = await calculator.calculateOffers(codeToApply);
      setOfferResult(result);
      
      if (onUpdateTotal) {
        onUpdateTotal(result);
      }

      // If we successfully applied a promo code
      if (codeToApply && result.applied_offers.some(offer => offer.offer_type === 'promo_code')) {
        setPromoCodeApplied(true);
        setPromoError("");
      } else if (codeToApply) {
        setPromoError("Invalid or expired promo code");
      }
    } catch (error) {
      console.error('Error calculating offers:', error);
      if (codeToApply) {
        setPromoError("Failed to apply promo code");
      }
    } finally {
      setLoading(false);
    }
  };

  const applyPromoCode = () => {
    if (!promoCode.trim()) return;
    calculateOffers(promoCode.toUpperCase());
  };

  const removePromoCode = () => {
    setPromoCode("");
    setPromoCodeApplied(false);
    setPromoError("");
    calculateOffers();
  };

  const getCartItemCount = () => {
    return cart.reduce((total, item) => total + item.quantity, 0);
  };

  if (cart.length === 0) return null;

  return (
    <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 mb-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold text-gray-900">Order Summary</h3>
      </div>

      {/* Applied Offers */}
      {offerResult.applied_offers.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-semibold text-green-800 mb-2">🎉 Applied Offers:</h4>
          <div className="space-y-2">
            {offerResult.applied_offers.map((offer, index) => (
              <div key={index} className="bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium text-green-800">{offer.name}</span>
                    <Badge variant="success" size="xs" className="ml-2">
                      {offer.offer_type.replace('_', ' ').toUpperCase()}
                    </Badge>
                  </div>
                  {offer.discount_amount > 0 && (
                    <span className="text-sm font-bold text-green-600">
                      -₹{offer.discount_amount.toFixed(2)}
                    </span>
                  )}
                </div>
                {offer.free_items.length > 0 && (
                  <div className="mt-2 text-xs text-green-700">
                    Free items: {offer.free_items.map(item => {
                      if (item.item_name) {
                        return `${item.item_name} x ${item.quantity || 1}`;
                      } else if (item.message) {
                        return item.message;
                      } else if (item.category) {
                        return item.category;
                      }
                      return 'Free item available';
                    }).join(", ")}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Promo Code Section */}
      <div className="mb-4">
        {!promoCodeApplied ? (
          <div className="flex gap-2">
            <input
              type="text"
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
              placeholder="Enter promo code"
              className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
            <Button
              variant="secondary"
              size="sm"
              onClick={applyPromoCode}
              disabled={loading || !promoCode.trim()}
            >
              {loading ? "Applying..." : "Apply"}
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-md px-3 py-2">
            <span className="text-sm font-medium text-green-800">
              Promo code "{promoCode}" applied ✓
            </span>
            <Button
              variant="ghost"
              size="xs"
              onClick={removePromoCode}
              className="text-red-600 hover:text-red-700"
            >
              Remove
            </Button>
          </div>
        )}
        {promoError && (
          <p className="text-red-600 text-xs mt-1">{promoError}</p>
        )}
      </div>

      {/* Order Breakdown */}
      <div className="space-y-2 mb-4">
        <div className="flex justify-between items-center">
          <span className="text-gray-600">
            Items ({getCartItemCount()})
          </span>
          <span className="font-medium">
            ₹{offerResult.original_amount.toFixed(2)}
          </span>
        </div>
        
        {offerResult.discount_amount > 0 && (
          <div className="flex justify-between items-center">
            <span className="text-green-600">Offer Discount</span>
            <span className="font-medium text-green-600">
              -₹{offerResult.discount_amount.toFixed(2)}
            </span>
          </div>
        )}
        
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Taxes & Charges</span>
          <span className="font-medium text-green-600">₹0.00</span>
        </div>

        {offerResult.free_items.length > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-md p-2">
            <div className="text-sm font-medium text-orange-800 mb-1">🎁 Free Items:</div>
            {offerResult.free_items.map((item, index) => (
              <div key={index} className="text-xs text-orange-700">
                • {item.item_name ? (
                    `${item.item_name} x ${item.quantity || 1}${item.unit_price ? ` (₹${item.unit_price} each)` : ''}`
                  ) : item.message ? (
                    item.message
                  ) : item.category ? (
                    `${item.category}${item.quantity ? ` x ${item.quantity}` : ''}`
                  ) : (
                    'Free item available'
                  )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-gray-200 pt-4">
        <div className="flex justify-between items-center mb-2">
          {offerResult.discount_amount > 0 ? (
            <>
              <div>
                <div className="text-sm text-gray-500 line-through">
                  ₹{offerResult.original_amount.toFixed(2)}
                </div>
                <div className="text-xl font-bold text-gray-900">Final Total</div>
              </div>
              <div>
                <div className="text-sm text-green-600 font-medium">
                  You Save ₹{offerResult.discount_amount.toFixed(2)}!
                </div>
                <div className="text-2xl font-bold text-green-600">
                  ₹{offerResult.final_amount.toFixed(2)}
                </div>
              </div>
            </>
          ) : (
            <>
              <span className="text-xl font-bold text-gray-900">Total</span>
              <span className="text-2xl font-bold text-green-600">
                ₹{offerResult.final_amount.toFixed(2)}
              </span>
            </>
          )}
        </div>
        
        {offerResult.discount_amount > 0 && (
          <div className="text-center">
            <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
              💰 Total Savings: ₹{offerResult.discount_amount.toFixed(2)}
            </div>
          </div>
        )}
      </div>

      {/* Available Offers Hint */}
      {offerResult.applied_offers.length === 0 && (
        <div className="mt-4 text-center text-sm text-gray-600 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <div className="text-yellow-800 font-medium mb-1">💡 Available Offers</div>
          <div className="text-yellow-700">
            {offerResult.original_amount < 300 ? (
              `Add ₹${(300 - offerResult.original_amount).toFixed(2)} more for potential discounts!`
            ) : (
              "Try entering a promo code above for additional savings!"
            )}
          </div>
        </div>
      )}
    </div>
  );
}