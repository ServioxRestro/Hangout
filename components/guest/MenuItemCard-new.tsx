"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { formatCurrency } from "@/lib/constants";

interface MenuItem {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  image_url?: string | null;
  is_veg?: boolean | null;
}

interface MenuItemCardProps {
  item: MenuItem;
  cartQuantity?: number;
  onAdd: () => void;
  onRemove: () => void;
}

const icons = {
  veg: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="12" r="10" className="text-green-500" />
      <circle cx="12" cy="12" r="6" className="text-green-600" />
    </svg>
  ),
  nonVeg: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
      <rect
        x="2"
        y="2"
        width="20"
        height="20"
        rx="2"
        className="text-red-500"
      />
      <rect
        x="6"
        y="6"
        width="12"
        height="12"
        rx="1"
        className="text-red-600"
      />
    </svg>
  ),
  plus: (
    <svg
      className="w-4 h-4"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 4v16m8-8H4"
      />
    </svg>
  ),
  minus: (
    <svg
      className="w-4 h-4"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M20 12H4"
      />
    </svg>
  ),
  image: (
    <svg
      className="w-8 h-8"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
      />
    </svg>
  ),
};

export function MenuItemCard({
  item,
  cartQuantity = 0,
  onAdd,
  onRemove,
}: MenuItemCardProps) {
  const [imageError, setImageError] = useState(false);

  return (
    <Card
      variant="interactive"
      padding="none"
      className="group overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
    >
      <div className="flex h-full">
        {/* Content Section */}
        <div className="flex-1 p-5">
          {/* Header with type badge */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              {item.is_veg ? icons.veg : icons.nonVeg}
              <Badge
                variant={item.is_veg ? "success" : "danger"}
                size="xs"
                className="font-medium"
              >
                {item.is_veg ? "VEG" : "NON-VEG"}
              </Badge>
            </div>

            {/* Price */}
            <div className="text-lg font-bold text-brand-primary">
              {formatCurrency(item.price)}
            </div>
          </div>

          {/* Item Name */}
          <h3 className="font-semibold text-lg text-text-primary mb-2 leading-tight group-hover:text-brand-primary transition-colors">
            {item.name}
          </h3>

          {/* Description */}
          {item.description && (
            <p className="text-text-secondary text-sm leading-relaxed mb-4 line-clamp-2">
              {item.description}
            </p>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between">
            <div className="flex-1">
              {cartQuantity === 0 ? (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={onAdd}
                  leftIcon={icons.plus}
                  className="shadow-md"
                >
                  Add to Cart
                </Button>
              ) : (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="xs"
                    onClick={onRemove}
                    className="w-8 h-8 p-0 flex items-center justify-center"
                  >
                    {icons.minus}
                  </Button>
                  <span className="font-medium text-text-primary px-2 py-1 bg-brand-primary-light rounded-md min-w-[2rem] text-center">
                    {cartQuantity}
                  </span>
                  <Button
                    variant="primary"
                    size="xs"
                    onClick={onAdd}
                    className="w-8 h-8 p-0 flex items-center justify-center"
                  >
                    {icons.plus}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Image Section */}
        {item.image_url && !imageError && (
          <div className="w-24 h-full relative overflow-hidden">
            <img
              src={item.image_url}
              alt={item.name}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
              onError={() => setImageError(true)}
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-l from-transparent to-black/5 group-hover:to-black/10 transition-all duration-300" />
          </div>
        )}

        {/* Fallback when no image */}
        {(!item.image_url || imageError) && (
          <div className="w-24 h-full bg-surface border-l border-border-light flex items-center justify-center text-text-tertiary">
            {icons.image}
          </div>
        )}
      </div>
    </Card>
  );
}
