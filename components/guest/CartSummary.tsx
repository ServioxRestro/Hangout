'use client'

import { Button } from '@/components/ui/Button'

interface CartItem {
  id: string
  name: string
  price: number
  quantity: number
  is_veg: boolean
}

interface CartSummaryProps {
  cart: CartItem[]
  onCheckout: () => void
  onViewCart?: () => void
  className?: string
}

export function CartSummary({ cart, onCheckout, onViewCart, className = '' }: CartSummaryProps) {
  if (cart.length === 0) return null
  
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0)
  const totalAmount = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0)
  
  return (
    <div className={`fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg z-50 ${className}`}>
      <div className="max-w-4xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <button 
            onClick={onViewCart}
            className="flex-1 text-left hover:bg-gray-50 rounded-lg p-2 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                {totalItems} item{totalItems !== 1 ? 's' : ''}
              </div>
              <div className="text-2xl font-bold text-green-600">
                ₹{totalAmount.toFixed(2)}
              </div>
            </div>
            <div className="text-sm text-gray-600 mt-1">
              🛒 View cart • {cart.length} unique item{cart.length !== 1 ? 's' : ''}
            </div>
          </button>
          
          <Button
            variant="success"
            size="lg"
            onClick={onCheckout}
            className="font-bold shadow-lg ml-4"
          >
            Place Order →
          </Button>
        </div>
      </div>
    </div>
  )
}