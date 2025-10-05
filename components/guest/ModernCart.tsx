"use client";

import { useState } from 'react';
import { X, Plus, Minus, ShoppingBag, Trash2, ArrowRight } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { formatCurrency } from '@/lib/constants';

interface ModernCartProps {
  onCheckout?: () => void;
}

export default function ModernCart({ onCheckout }: ModernCartProps) {
  const { state, updateQuantity, removeItem, closeCart } = useCart();
  const [isAnimating, setIsAnimating] = useState(false);

  const handleQuantityChange = (id: string, newQuantity: number) => {
    setIsAnimating(true);
    updateQuantity(id, newQuantity);
    setTimeout(() => setIsAnimating(false), 200);
  };

  const handleRemoveItem = (id: string) => {
    setIsAnimating(true);
    removeItem(id);
    setTimeout(() => setIsAnimating(false), 200);
  };

  const handleCheckout = () => {
    if (onCheckout) {
      onCheckout();
    }
    closeCart();
  };

  if (!state.isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 transition-opacity duration-300"
        onClick={closeCart}
      />

      {/* Cart Sidebar */}
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-out">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-white sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="bg-orange-100 p-2 rounded-lg">
              <ShoppingBag className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h2 className="font-semibold text-lg text-gray-900">Your Cart</h2>
              <p className="text-sm text-gray-500">
                {state.totalItems} {state.totalItems === 1 ? 'item' : 'items'}
              </p>
            </div>
          </div>
          <button
            onClick={closeCart}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cart Content */}
        <div className="flex-1 overflow-y-auto max-h-[calc(100vh-180px)]">
          {state.items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
              <ShoppingBag className="w-16 h-16 mb-4 text-gray-300" />
              <h3 className="text-lg font-medium mb-2">Your cart is empty</h3>
              <p className="text-sm text-center px-4">
                Browse our delicious menu and add items to get started!
              </p>
            </div>
          ) : (
            <div className="p-4 space-y-4">
              {state.items.map((item) => (
                <div
                  key={item.id}
                  className={`bg-gray-50 rounded-xl p-4 transition-all duration-200 ${
                    isAnimating ? 'scale-95 opacity-80' : 'scale-100 opacity-100'
                  }`}
                >
                  <div className="flex gap-3">
                    {/* Item Image */}
                    <div className="w-16 h-16 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-300 flex items-center justify-center">
                          <div className={`w-3 h-3 rounded-full ${
                            item.isVeg ? 'bg-green-500' : 'bg-red-500'
                          }`} />
                        </div>
                      )}
                    </div>

                    {/* Item Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-medium text-gray-900 text-sm line-clamp-2">
                          {item.name}
                        </h3>
                        <button
                          onClick={() => handleRemoveItem(item.id)}
                          className="p-1 hover:bg-red-100 rounded-lg text-red-500 ml-2 flex-shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className="font-semibold text-gray-900">
                            {formatCurrency(item.price)}
                          </span>
                          {item.hasDiscount && item.originalPrice && (
                            <span className="text-xs text-gray-500 line-through">
                              {formatCurrency(item.originalPrice)}
                            </span>
                          )}
                        </div>

                        {/* Quantity Controls */}
                        <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
                          <button
                            onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                            className="p-2 hover:bg-gray-100 transition-colors"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="px-3 py-2 text-sm font-medium min-w-[2.5rem] text-center">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                            className="p-2 hover:bg-gray-100 transition-colors"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      {/* Item Total */}
                      <div className="mt-2 text-right">
                        <span className="text-sm font-semibold text-gray-900">
                          {formatCurrency(item.price * item.quantity)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer with Total and Checkout */}
        {state.items.length > 0 && (
          <div className="border-t border-gray-200 bg-white p-6 space-y-4">
            {/* Bill Summary */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-medium">{formatCurrency(state.totalAmount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Delivery Fee</span>
                <span className="font-medium text-green-600">FREE</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Taxes & Charges</span>
                <span className="font-medium">{formatCurrency(state.totalAmount * 0.05)}</span>
              </div>
              <div className="border-t border-gray-200 pt-2">
                <div className="flex justify-between">
                  <span className="font-semibold text-gray-900">Total</span>
                  <span className="font-bold text-lg text-gray-900">
                    {formatCurrency(state.totalAmount * 1.05)}
                  </span>
                </div>
              </div>
            </div>

            {/* Checkout Button */}
            <button
              onClick={handleCheckout}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 hover:shadow-lg transform hover:-translate-y-0.5"
            >
              <span>Proceed to Checkout</span>
              <ArrowRight className="w-5 h-5" />
            </button>

            <p className="text-xs text-gray-500 text-center">
              Review your order and proceed to payment
            </p>
          </div>
        )}
      </div>
    </>
  );
}