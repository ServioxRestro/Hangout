"use client";

import { ShoppingCart } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  is_veg: boolean;
}

interface CartSummaryProps {
  cart: CartItem[];
  onCheckout: () => void;
  onViewCart: () => void;
  disabled?: boolean;
  disabledMessage?: string;
}

export function CartSummary({ cart, onCheckout, onViewCart, disabled = false, disabledMessage }: CartSummaryProps) {
  if (cart.length === 0) return null;

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalAmount = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-50">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <ShoppingCart className="w-6 h-6 text-blue-600" />
            <span className="absolute -top-2 -right-2 bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {totalItems}
            </span>
          </div>
          <div>
            <div className="font-semibold text-gray-900">
              {totalItems} item{totalItems !== 1 ? 's' : ''}
            </div>
            <div className="text-sm text-gray-600">
              {formatCurrency(totalAmount)}
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onViewCart}
            disabled={disabled}
            className={`px-4 py-2 border rounded-lg font-medium transition-colors ${
              disabled
                ? "border-gray-300 text-gray-400 cursor-not-allowed"
                : "border-orange-600 text-orange-600 hover:bg-orange-50"
            }`}
          >
            View Cart
          </button>
          <button
            onClick={disabled ? undefined : onCheckout}
            disabled={disabled}
            className={`px-6 py-2 rounded-lg font-medium transition-colors ${
              disabled
                ? "bg-gray-400 text-gray-200 cursor-not-allowed"
                : "bg-orange-600 text-white hover:bg-orange-700"
            }`}
            title={disabled ? disabledMessage : undefined}
          >
            {disabled ? "Unavailable" : "Place Order"}
          </button>
        </div>
      </div>
    </div>
  );
}