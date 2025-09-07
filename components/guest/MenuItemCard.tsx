'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'

interface MenuItem {
  id: string
  name: string
  description?: string | null
  price: number
  image_url?: string | null
  is_veg?: boolean | null
}

interface MenuItemCardProps {
  item: MenuItem
  cartQuantity?: number
  onAdd: () => void
  onRemove: () => void
}

export function MenuItemCard({ 
  item, 
  cartQuantity = 0, 
  onAdd, 
  onRemove 
}: MenuItemCardProps) {
  const [imageError, setImageError] = useState(false)
  
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden menu-item-card fade-in-up">
      <div className="flex">
        {/* Content */}
        <div className="flex-1 p-6">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Badge 
                  variant={item.is_veg ? 'success' : 'danger'} 
                  size="sm"
                  className="flex items-center gap-1"
                >
                  <span>{item.is_veg ? '🟢' : '🔴'}</span>
                  {item.is_veg ? 'VEG' : 'NON-VEG'}
                </Badge>
              </div>
              <h3 className="font-bold text-lg text-gray-900 leading-tight">
                {item.name}
              </h3>
              {item.description && (
                <p className="text-gray-600 text-sm mt-2 line-clamp-2">
                  {item.description}
                </p>
              )}
            </div>
          </div>
          
          <div className="flex items-center justify-between mt-4">
            <div className="text-2xl font-bold text-green-600">
              ₹{item.price.toFixed(2)}
            </div>
            
            <div className="flex items-center gap-2">
              {cartQuantity > 0 ? (
                <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-1">
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={onRemove}
                    className="w-8 h-8 rounded-full p-0"
                  >
                    −
                  </Button>
                  <span className="font-bold text-lg min-w-[2rem] text-center">
                    {cartQuantity}
                  </span>
                  <Button
                    variant="success"
                    size="sm"
                    onClick={onAdd}
                    className="w-8 h-8 rounded-full p-0"
                  >
                    +
                  </Button>
                </div>
              ) : (
                <Button
                  variant="primary"
                  size="md"
                  onClick={onAdd}
                  className="font-semibold"
                >
                  Add to Cart
                </Button>
              )}
            </div>
          </div>
        </div>
        
        {/* Image */}
        {item.image_url && !imageError && (
          <div className="w-32 h-32 flex-shrink-0">
            <img
              src={item.image_url}
              alt={item.name}
              className="w-full h-full object-cover"
              onError={() => setImageError(true)}
            />
          </div>
        )}
      </div>
    </div>
  )
}