"use client";

import { useState } from "react";
import { Plus, Minus } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { getAddButtonStyles } from "@/lib/guest-colors";

interface MenuItem {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  original_price?: number | null;
  discount_percentage?: number | null;
  has_discount?: boolean | null;
  image_url?: string | null;
  is_veg?: boolean | null;
}

interface MenuItemCardProps {
  item: MenuItem;
  cartQuantity: number;
  onAdd: () => void;
  onRemove: () => void;
}

export function MenuItemCard({
  item,
  cartQuantity,
  onAdd,
  onRemove
}: MenuItemCardProps) {
  const hasDiscount = item.has_discount && item.original_price && item.original_price > item.price;

  return (
    <div className="bg-white rounded-2xl border-2 border-gray-100 overflow-hidden shadow-lg hover:shadow-2xl hover:border-orange-300 transition-all duration-300 hover:-translate-y-1 mb-1">
      <div className="flex flex-col sm:flex-row">
        {/* Item Image */}
        {item.image_url && (
          <div className="relative w-full sm:w-36 h-48 sm:h-36 flex-shrink-0">
            <img
              src={item.image_url}
              alt={item.name}
              className="w-full h-full object-cover rounded-tl-xl sm:rounded-l-xl sm:rounded-tr-none"
            />
            {hasDiscount && item.discount_percentage && (
              <div className="absolute top-2 left-2 bg-gradient-to-r from-red-600 to-red-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg">
                {item.discount_percentage}% OFF
              </div>
            )}
            {item.is_veg !== undefined && (
              <div className="absolute top-2 right-2 bg-white rounded-lg p-1.5 shadow-lg border border-gray-200">
                <span className={`text-lg ${item.is_veg ? 'text-green-600' : 'text-red-600'}`}>
                  {item.is_veg ? '🟢' : '🔴'}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Item Details */}
        <div className="flex-1 p-4 sm:p-5 flex flex-col">
          {/* Header */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                {!item.image_url && item.is_veg !== undefined && (
                  <span className={`text-base flex-shrink-0 ${item.is_veg ? 'text-green-600' : 'text-red-600'}`}>
                    {item.is_veg ? '🟢' : '🔴'}
                  </span>
                )}
                <h3 className="font-bold text-gray-900 text-base sm:text-lg leading-tight">
                  {item.name}
                </h3>
              </div>
            </div>
          </div>

          {/* Description */}
          {item.description && (
            <p className="text-sm text-gray-600 mb-3 line-clamp-2 leading-relaxed">
              {item.description}
            </p>
          )}

          {/* Price and Add Button */}
          <div className="flex items-end justify-between gap-3 mt-auto">
            {/* Pricing */}
            <div className="flex flex-col gap-1">
              {hasDiscount ? (
                <>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-green-600 text-xl">
                      {formatCurrency(item.price)}
                    </span>
                    <span className="text-sm text-gray-400 line-through font-medium">
                      {formatCurrency(item.original_price!)}
                    </span>
                  </div>
                  {!item.image_url && item.discount_percentage && (
                    <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-semibold inline-block w-fit">
                      Save {item.discount_percentage}%
                    </span>
                  )}
                </>
              ) : (
                <span className="font-bold text-gray-900 text-xl">
                  {formatCurrency(item.price)}
                </span>
              )}
            </div>

            {/* Add/Remove Controls */}
            <div className="flex-shrink-0">
              {cartQuantity === 0 ? (
                <button
                  onClick={onAdd}
                  className="px-6 py-3 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 text-white rounded-xl text-sm font-bold transition-all duration-200 shadow-lg hover:shadow-xl active:scale-95 whitespace-nowrap"
                >
                  Add
                </button>
              ) : (
                <div className="flex items-center gap-2 bg-gradient-to-r from-orange-50 to-orange-100 border-2 border-orange-500 rounded-xl p-1.5 shadow-md">
                  <button
                    onClick={onRemove}
                    className="w-8 h-8 rounded-lg bg-white flex items-center justify-center hover:bg-orange-100 transition-colors shadow-sm active:scale-90 border border-orange-200"
                  >
                    <Minus className="w-4 h-4 text-orange-600" />
                  </button>

                  <span className="min-w-[2rem] text-center font-bold text-base text-orange-700 px-1">
                    {cartQuantity}
                  </span>

                  <button
                    onClick={onAdd}
                    className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-600 to-orange-500 flex items-center justify-center hover:from-orange-700 hover:to-orange-600 transition-all shadow-md hover:shadow-lg active:scale-90"
                  >
                    <Plus className="w-4 h-4 text-white" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
