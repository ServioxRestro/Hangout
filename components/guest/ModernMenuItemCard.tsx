"use client";

import { useState } from 'react';
import { Plus, Minus, Star, Clock, Leaf } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { formatCurrency } from '@/lib/constants';

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  hasDiscount?: boolean;
  discountPercentage?: number;
  image?: string;
  isVeg: boolean;
  isAvailable: boolean;
  prepTime?: number;
  rating?: number;
  tags?: string[];
}

interface ModernMenuItemCardProps {
  item: MenuItem;
}

export default function ModernMenuItemCard({ item }: ModernMenuItemCardProps) {
  const { state, addItem, updateQuantity } = useCart();
  const [imageError, setImageError] = useState(false);

  const cartItem = state.items.find(cartItem => cartItem.id === item.id);
  const quantity = cartItem?.quantity || 0;

  const handleAddToCart = () => {
    addItem({
      id: item.id,
      name: item.name,
      price: item.price,
      originalPrice: item.originalPrice,
      hasDiscount: item.hasDiscount,
      image: item.image,
      isVeg: item.isVeg,
    });
  };

  const handleQuantityChange = (newQuantity: number) => {
    updateQuantity(item.id, newQuantity);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all duration-300 hover:-translate-y-1">
      <div className="flex">
        {/* Content Section */}
        <div className="flex-1 p-4 md:p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              {/* Veg/Non-veg Indicator */}
              <div className={`w-4 h-4 border-2 flex items-center justify-center ${
                item.isVeg
                  ? 'border-green-600'
                  : 'border-red-600'
              }`}>
                <div className={`w-2 h-2 rounded-full ${
                  item.isVeg ? 'bg-green-600' : 'bg-red-600'
                }`} />
              </div>

              {/* Bestseller Tag */}
              {item.rating && item.rating > 4.2 && (
                <div className="flex items-center gap-1 bg-orange-100 text-orange-700 px-2 py-1 rounded-full text-xs font-medium">
                  <Star className="w-3 h-3 fill-current" />
                  <span>Bestseller</span>
                </div>
              )}
            </div>

            {/* Rating & Prep Time */}
            <div className="flex items-center gap-3 text-xs text-gray-500">
              {item.rating && (
                <div className="flex items-center gap-1">
                  <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                  <span>{item.rating}</span>
                </div>
              )}
              {item.prepTime && (
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>{item.prepTime}m</span>
                </div>
              )}
            </div>
          </div>

          {/* Name and Description */}
          <div className="mb-4">
            <h3 className="font-semibold text-gray-900 text-lg mb-2 line-clamp-2">
              {item.name}
            </h3>
            <p className="text-gray-600 text-sm line-clamp-2 leading-relaxed">
              {item.description}
            </p>
          </div>

          {/* Tags */}
          {item.tags && item.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-4">
              {item.tags.slice(0, 3).map((tag, index) => (
                <span
                  key={index}
                  className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Price and Actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg text-gray-900">
                {formatCurrency(item.price)}
              </span>
              {item.hasDiscount && item.originalPrice && (
                <>
                  <span className="text-gray-500 line-through text-sm">
                    {formatCurrency(item.originalPrice)}
                  </span>
                  <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-medium">
                    {item.discountPercentage}% OFF
                  </span>
                </>
              )}
            </div>

            {/* Add to Cart Controls */}
            {!item.isAvailable ? (
              <div className="bg-gray-100 text-gray-500 px-4 py-2 rounded-lg text-sm font-medium">
                Not Available
              </div>
            ) : quantity === 0 ? (
              <button
                onClick={handleAddToCart}
                className="bg-white border-2 border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white px-6 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 group"
              >
                <Plus className="w-4 h-4" />
                <span>ADD</span>
              </button>
            ) : (
              <div className="flex items-center border-2 border-orange-500 rounded-lg overflow-hidden">
                <button
                  onClick={() => handleQuantityChange(quantity - 1)}
                  className="bg-orange-500 text-white hover:bg-orange-600 p-2 transition-colors"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="px-4 py-2 font-semibold text-orange-500 min-w-[3rem] text-center">
                  {quantity}
                </span>
                <button
                  onClick={() => handleQuantityChange(quantity + 1)}
                  className="bg-orange-500 text-white hover:bg-orange-600 p-2 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Image Section */}
        <div className="w-32 md:w-40 relative">
          {item.image && !imageError ? (
            <div className="relative h-full">
              <img
                src={item.image}
                alt={item.name}
                onError={() => setImageError(true)}
                className="w-full h-full object-cover"
              />
              {/* Gradient Overlay for better text readability */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
            </div>
          ) : (
            <div className="w-full h-full bg-gray-100 flex items-center justify-center">
              {item.isVeg ? (
                <Leaf className="w-8 h-8 text-green-500" />
              ) : (
                <div className="w-8 h-8 bg-red-500 rounded-full" />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}