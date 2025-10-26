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
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-gray-200 shadow-2xl z-50">
      <div className="px-4 py-4 sm:px-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="relative flex-shrink-0">
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center shadow-lg">
                <ShoppingCart className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
              </div>
              <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center shadow-md ring-2 ring-white">
                {totalItems}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-bold text-gray-900 text-sm sm:text-base truncate">
                {totalItems} item{totalItems !== 1 ? 's' : ''}
              </div>
              <div className="text-xs sm:text-sm text-gray-600 font-semibold">
                {formatCurrency(totalAmount)}
              </div>
            </div>
          </div>

          <button
            onClick={disabled ? undefined : onCheckout}
            disabled={disabled}
            className={`px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl font-bold text-sm sm:text-base transition-all shadow-lg flex-shrink-0 ${
              disabled
                ? "bg-gray-400 text-gray-200 cursor-not-allowed"
                : "bg-gradient-to-r from-orange-600 to-orange-500 text-white hover:from-orange-700 hover:to-orange-600 hover:shadow-xl active:scale-95"
            }`}
            title={disabled ? disabledMessage : undefined}
          >
            {disabled ? "Unavailable" : "View Cart"}
          </button>
        </div>
      </div>
    </div>
  );
}