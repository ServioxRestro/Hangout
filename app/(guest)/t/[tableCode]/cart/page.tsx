'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { GuestLayout } from '@/components/guest/GuestLayout'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import type { Tables } from '@/types/database.types'

type RestaurantTable = Tables<'restaurant_tables'>

interface CartItem {
  id: string
  name: string
  price: number
  quantity: number
  is_veg: boolean
  description?: string | null
}

export default function CartPage() {
  const params = useParams()
  const router = useRouter()
  const tableCode = params?.tableCode as string

  const [cart, setCart] = useState<CartItem[]>([])
  const [table, setTable] = useState<RestaurantTable | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (tableCode) {
      fetchTableAndCart()
    }
  }, [tableCode])

  const fetchTableAndCart = async () => {
    try {
      // Fetch table details
      const { data: tableData, error: tableError } = await supabase
        .from('restaurant_tables')
        .select('*')
        .eq('table_code', tableCode)
        .eq('is_active', true)
        .single()

      if (!tableError && tableData) {
        setTable(tableData)
      }

      // Load cart from localStorage
      const savedCart = localStorage.getItem(`cart_${tableCode}`)
      if (savedCart) {
        setCart(JSON.parse(savedCart))
      }
    } catch (error) {
      console.error('Error fetching cart:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateCartInStorage = (newCart: CartItem[]) => {
    if (newCart.length > 0) {
      localStorage.setItem(`cart_${tableCode}`, JSON.stringify(newCart))
    } else {
      localStorage.removeItem(`cart_${tableCode}`)
    }
    // Trigger storage event for layout updates
    window.dispatchEvent(new Event('storage'))
  }

  const addToCart = (itemId: string) => {
    const newCart = cart.map(item =>
      item.id === itemId
        ? { ...item, quantity: item.quantity + 1 }
        : item
    )
    setCart(newCart)
    updateCartInStorage(newCart)
  }

  const removeFromCart = (itemId: string) => {
    const newCart = cart.map(item =>
      item.id === itemId
        ? { ...item, quantity: Math.max(0, item.quantity - 1) }
        : item
    ).filter(item => item.quantity > 0)
    
    setCart(newCart)
    updateCartInStorage(newCart)
  }

  const removeItemCompletely = (itemId: string) => {
    const newCart = cart.filter(item => item.id !== itemId)
    setCart(newCart)
    updateCartInStorage(newCart)
  }

  const clearCart = () => {
    setCart([])
    localStorage.removeItem(`cart_${tableCode}`)
    window.dispatchEvent(new Event('storage'))
  }

  const getCartTotal = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0)
  }

  const getCartItemCount = () => {
    return cart.reduce((total, item) => total + item.quantity, 0)
  }

  if (loading) {
    return (
      <GuestLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </GuestLayout>
    )
  }

  return (
    <GuestLayout>
      {/* Page Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="text-center">
          <h1 className="text-xl font-bold text-gray-900">My Cart</h1>
          <p className="text-sm text-gray-600">
            Table {table?.table_number} • {getCartItemCount()} item{getCartItemCount() !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Cart Content */}
      <div className="px-4 py-6">
        {cart.length === 0 ? (
          /* Empty Cart State */
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-4xl">🛒</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Your cart is empty</h2>
            <p className="text-gray-600 mb-8">Browse our menu and add items to get started</p>
            <Button
              variant="primary"
              size="lg"
              onClick={() => router.push(`/t/${tableCode}`)}
            >
              🍽️ Browse Menu
            </Button>
          </div>
        ) : (
          /* Cart Items */
          <>
            {/* Items List */}
            <div className="space-y-4 mb-6">
              {cart.map((item) => (
                <div key={item.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                  <div className="flex items-start justify-between">
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
                      <h3 className="font-bold text-lg text-gray-900 mb-1">{item.name}</h3>
                      {item.description && (
                        <p className="text-gray-600 text-sm mb-3 line-clamp-2">{item.description}</p>
                      )}
                      <div className="flex items-center justify-between">
                        <div className="text-xl font-bold text-green-600">
                          ₹{item.price.toFixed(2)} <span className="text-sm text-gray-500">each</span>
                        </div>
                        <div className="text-lg font-bold text-gray-900">
                          ₹{(item.price * item.quantity).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Quantity Controls & Remove */}
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                    <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-1">
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => removeFromCart(item.id)}
                        className="w-10 h-10 rounded-full p-0"
                      >
                        −
                      </Button>
                      <span className="font-bold text-lg min-w-[3rem] text-center">
                        {item.quantity}
                      </span>
                      <Button
                        variant="success"
                        size="sm"
                        onClick={() => addToCart(item.id)}
                        className="w-10 h-10 rounded-full p-0"
                      >
                        +
                      </Button>
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeItemCompletely(item.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      🗑️ Remove
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Cart Summary */}
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 mb-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-900">Order Summary</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearCart}
                  className="text-red-600 hover:text-red-700"
                >
                  Clear Cart
                </Button>
              </div>
              
              <div className="space-y-2 mb-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Items ({getCartItemCount()})</span>
                  <span className="font-medium">₹{getCartTotal().toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Taxes & Charges</span>
                  <span className="font-medium text-green-600">₹0.00</span>
                </div>
              </div>
              
              <div className="border-t border-gray-200 pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-xl font-bold text-gray-900">Total</span>
                  <span className="text-2xl font-bold text-green-600">₹{getCartTotal().toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <Button
                variant="secondary"
                size="lg"
                fullWidth
                onClick={() => router.push(`/t/${tableCode}`)}
              >
                🍽️ Add More Items
              </Button>
              <Button
                variant="primary"
                size="lg"
                fullWidth
                onClick={() => router.push(`/t/${tableCode}/checkout`)}
                className="font-bold"
              >
                Proceed to Checkout →
              </Button>
            </div>

            {/* Help Text */}
            <div className="text-center text-sm text-gray-600">
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="font-medium text-blue-800 mb-1">💡 Tip</p>
                <p className="text-blue-700">You can modify quantities or remove items before checkout</p>
              </div>
            </div>
          </>
        )}
      </div>
    </GuestLayout>
  )
}