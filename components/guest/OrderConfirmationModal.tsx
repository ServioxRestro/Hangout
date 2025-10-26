"use client";

import { useState, useEffect } from "react";
import { Check, X } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  is_veg: boolean;
}

interface OrderConfirmationModalProps {
  isOpen: boolean;
  cartItems: CartItem[];
  totalAmount: number;
  discount: number;
  finalAmount: number;
  onConfirm: () => void;
  onCancel: () => void;
  countdownSeconds?: number;
  isPlacingOrder?: boolean;
}

export default function OrderConfirmationModal({
  isOpen,
  cartItems,
  totalAmount,
  discount,
  finalAmount,
  onConfirm,
  onCancel,
  countdownSeconds = 30,
  isPlacingOrder = false,
}: OrderConfirmationModalProps) {
  const [timeLeft, setTimeLeft] = useState(countdownSeconds);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!isOpen) {
      setTimeLeft(countdownSeconds);
      setProgress(0);
      return;
    }

    // Countdown timer
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onConfirm(); // Auto-submit when countdown ends
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Progress bar animation
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        const increment = 100 / countdownSeconds;
        const newProgress = prev + increment;
        if (newProgress >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return newProgress;
      });
    }, 1000);

    return () => {
      clearInterval(interval);
      clearInterval(progressInterval);
    };
  }, [isOpen, countdownSeconds, onConfirm]);

  if (!isOpen) return null;

  const getTotalItems = () => {
    return cartItems.reduce((total, item) => total + item.quantity, 0);
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        {/* Modal */}
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-6 rounded-t-2xl">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-2xl font-bold">Confirming Your Order</h2>
              <button
                onClick={onCancel}
                className="p-1 hover:bg-white/20 rounded-full transition-colors"
                aria-label="Close"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <p className="text-green-50 text-sm">
              Your order will be sent to the kitchen in {timeLeft} seconds
            </p>
          </div>

          <div className="p-6 space-y-6">
            {/* Place Order Now Button with Progress Bar */}
            <div className="relative">
              <button
                onClick={onConfirm}
                className="relative w-full overflow-hidden font-bold py-5 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 group border-2 border-green-600 bg-green-100"
              >
                {/* Progress Bar Background (dark green, fills from left to right) */}
                <div
                  className="absolute inset-0 bg-gradient-to-r from-green-600 to-green-700 transition-all duration-1000 ease-linear z-0"
                  style={{ width: `${progress}%` }}
                />

                {/* Button Content - Always white text */}
                <div className="relative z-10 flex items-center justify-center gap-3">
                  <Check className="w-6 h-6 text-white group-hover:scale-110 transition-transform" />
                  <span className="text-lg text-white">Place Order Now</span>
                  <span className="ml-2 font-mono text-sm text-white opacity-95">({timeLeft}s)</span>
                </div>
              </button>
            </div>

            {/* Small Cancel Button */}
            <button
              onClick={onCancel}
              disabled={isPlacingOrder}
              className={`w-full text-sm font-semibold py-2 px-4 rounded-lg transition-colors ${
                isPlacingOrder
                  ? 'text-gray-400 cursor-not-allowed bg-gray-100'
                  : 'text-red-500 hover:text-red-700 hover:bg-red-50'
              }`}
            >
              {isPlacingOrder ? 'Processing order...' : 'Cancel Order'}
            </button>

            {/* Order Summary */}
            <div className="border-t border-gray-200 pt-6">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span>Order Summary</span>
                <span className="text-sm font-normal text-gray-500">
                  ({getTotalItems()} items)
                </span>
              </h3>

              {/* Cart Items */}
              <div className="space-y-3 mb-4 max-h-48 overflow-y-auto">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex items-start gap-3 text-sm">
                    <span className={`text-xs mt-0.5 ${item.is_veg ? 'text-green-600' : 'text-red-600'}`}>
                      {item.is_veg ? '🟢' : '🔴'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 truncate">
                        {item.name}
                      </div>
                      <div className="text-gray-500 text-xs">
                        {formatCurrency(item.price)} × {item.quantity}
                      </div>
                    </div>
                    <div className="font-semibold text-gray-900 whitespace-nowrap">
                      {formatCurrency(item.price * item.quantity)}
                    </div>
                  </div>
                ))}
              </div>

              {/* Price Breakdown */}
              <div className="space-y-2 border-t border-gray-200 pt-4">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Subtotal</span>
                  <span>{formatCurrency(totalAmount)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Discount</span>
                    <span>-{formatCurrency(discount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Taxes & Fees</span>
                  <span>Included</span>
                </div>
                <div className="border-t border-gray-200 pt-2 flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span className="text-green-600">{formatCurrency(finalAmount)}</span>
                </div>
              </div>
            </div>

            {/* Info Message */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <span className="font-semibold">Review your order:</span> You can cancel within {countdownSeconds} seconds or click "Place Order Now" to send it immediately.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
