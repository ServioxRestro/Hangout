"use client";

import { ShoppingBag } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { formatCurrency } from '@/lib/constants';

export default function FloatingCartButton() {
  const { state, openCart } = useCart();

  if (state.totalItems === 0) return null;

  return (
    <button
      onClick={openCart}
      className="fixed bottom-6 right-6 bg-orange-500 hover:bg-orange-600 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 z-40 group"
    >
      <div className="flex items-center gap-3">
        <div className="relative">
          <ShoppingBag className="w-6 h-6" />
          <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-semibold">
            {state.totalItems}
          </div>
        </div>

        <div className="hidden md:block">
          <div className="text-sm font-medium">
            {state.totalItems} {state.totalItems === 1 ? 'item' : 'items'}
          </div>
          <div className="text-xs opacity-90">
            {formatCurrency(state.totalAmount)}
          </div>
        </div>
      </div>
    </button>
  );
}