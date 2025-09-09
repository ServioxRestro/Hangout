'use client'

import { useState } from 'react'
import { Plus, Minus, Leaf, Clock } from 'lucide-react'
import Button from '@/components/admin/Button'
import { formatCurrency } from '@/lib/constants'
import type { Tables } from '@/types/database.types'

type MenuItem = Tables<'menu_items'> & {
  menu_categories: Tables<'menu_categories'> | null
}

interface ModernMenuItemCardProps {
  item: MenuItem
  cartQuantity: number
  onAdd: () => void
  onRemove: () => void
  userAuthenticated: boolean
  onAuthRequired: () => void
}

export default function ModernMenuItemCard({
  item,
  cartQuantity,
  onAdd,
  onRemove,
  userAuthenticated,
  onAuthRequired
}: ModernMenuItemCardProps) {
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)

  const handleAddClick = () => {
    onAdd()
  }

  const handleRemoveClick = () => {
    onRemove()
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all duration-200 hover:scale-[1.01]">
      <div className="p-4">
        <div className="flex gap-4">
          {/* Image */}
          <div className="flex-shrink-0 w-20 h-20 sm:w-24 sm:h-24 relative">
            {item.image_url && !imageError ? (
              <>
                {!imageLoaded && (
                  <div className="w-full h-full bg-gray-100 rounded-lg flex items-center justify-center animate-pulse">
                    <Clock className="w-6 h-6 text-gray-400" />
                  </div>
                )}
                <img
                  src={item.image_url}
                  alt={item.name}
                  className={`w-full h-full object-cover rounded-lg ${
                    imageLoaded ? 'opacity-100' : 'opacity-0'
                  } transition-opacity duration-200`}
                  onLoad={() => setImageLoaded(true)}
                  onError={() => setImageError(true)}
                />
              </>
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg flex items-center justify-center">
                <div className="text-2xl">
                  {item.is_veg ? '🟢' : '🔴'}
                </div>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-base font-semibold text-gray-900 truncate">
                    {item.name}
                  </h3>
                  <div className="flex-shrink-0">
                    {item.is_veg ? (
                      <div className="w-4 h-4 border-2 border-green-500 rounded flex items-center justify-center">
                        <div className="w-2 h-2 bg-green-500 rounded-full" />
                      </div>
                    ) : (
                      <div className="w-4 h-4 border-2 border-red-500 rounded flex items-center justify-center">
                        <div className="w-2 h-2 bg-red-500 rounded-full" />
                      </div>
                    )}
                  </div>
                </div>

                {item.description && (
                  <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                    {item.description}
                  </p>
                )}

                <div className="flex items-center justify-between">
                  <div className="text-lg font-bold text-green-600">
                    {formatCurrency(item.price)}
                  </div>

                  {/* Add/Remove Controls */}
                  <div className="flex items-center gap-2">
                    {cartQuantity === 0 ? (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={handleAddClick}
                        leftIcon={<Plus className="w-3 h-3" />}
                        className="text-xs px-3 py-1.5 rounded-full"
                      >
                        Add
                      </Button>
                    ) : (
                      <div className="flex items-center gap-2 bg-green-50 rounded-full px-2 py-1 border border-green-200">
                        <button
                          onClick={handleRemoveClick}
                          className="w-6 h-6 flex items-center justify-center text-green-600 hover:bg-green-100 rounded-full transition-colors"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        
                        <span className="text-sm font-semibold text-green-700 min-w-[1rem] text-center">
                          {cartQuantity}
                        </span>
                        
                        <button
                          onClick={handleAddClick}
                          className="w-6 h-6 flex items-center justify-center text-green-600 hover:bg-green-100 rounded-full transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}