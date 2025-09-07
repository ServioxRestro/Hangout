'use client'

import { useState, useEffect } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import type { Tables } from '@/types/database.types'
import { GuestLayout } from '@/components/guest/GuestLayout'
import { OrderStatusBadge } from '@/components/guest/OrderStatusBadge'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Badge } from '@/components/ui/Badge'

type Order = Tables<'orders'> & {
  restaurant_tables: Tables<'restaurant_tables'> | null
  order_items: Array<
    Tables<'order_items'> & {
      menu_items: Tables<'menu_items'> | null
    }
  >
}

export default function SuccessPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const tableCode = params?.tableCode as string
  const orderId = searchParams?.get('orderId')

  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (orderId) {
      fetchOrder()
      // Set up real-time order status updates
      const subscription = supabase
        .channel(`order-${orderId}`)
        .on('postgres_changes', { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'orders',
          filter: `id=eq.${orderId}`
        }, (payload) => {
          setOrder(prev => prev ? { ...prev, status: payload.new.status } : null)
        })
        .subscribe()

      return () => {
        subscription.unsubscribe()
      }
    }
  }, [orderId])

  const fetchOrder = async () => {
    if (!orderId) {
      setError('Order ID not found')
      setLoading(false)
      return
    }

    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          restaurant_tables (*),
          order_items (
            *,
            menu_items (*)
          )
        `)
        .eq('id', orderId)
        .single()

      if (error) {
        console.error('Error fetching order:', error)
        setError('Order not found')
        return
      }

      setOrder(data as Order)
    } catch (error) {
      console.error('Error:', error)
      setError('Failed to load order details')
    } finally {
      setLoading(false)
    }
  }

  const getStatusMessage = (status: string) => {
    switch (status) {
      case 'placed':
        return 'Your order has been placed and is being prepared'
      case 'preparing':
        return 'Your order is being prepared'
      case 'served':
        return 'Your order is ready and served'
      case 'completed':
        return 'Your order is completed'
      default:
        return 'Your order has been placed'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'placed': return 'text-blue-600'
      case 'preparing': return 'text-yellow-600'
      case 'served': return 'text-green-600'
      case 'completed': return 'text-gray-600'
      default: return 'text-blue-600'
    }
  }

  if (loading) {
    return (
      <GuestLayout>
        <div className="min-h-screen flex items-center justify-center">
          <LoadingSpinner text="Loading order details..." />
        </div>
      </GuestLayout>
    )
  }

  if (error || !order) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">⚠️ {error || 'Order not found'}</div>
          <button
            onClick={() => window.location.href = `/t/${tableCode}`}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
          >
            Browse Menu
          </button>
        </div>
      </div>
    )
  }

  return (
    <GuestLayout>
      {/* Page Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="text-center">
          <h1 className="text-xl font-bold text-gray-900">Order Confirmation</h1>
          <p className="text-sm text-gray-600">Table {order?.restaurant_tables?.table_number}</p>
        </div>
      </div>
      
      <div className="px-4 py-8">
        {/* Success Message */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-green-600 mb-2">Order Placed Successfully!</h1>
          <p className="text-gray-600">Thank you for your order</p>
        </div>

        {/* Order Details */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-lg font-semibold">Order Details</h2>
              <p className="text-sm text-gray-600">
                Table {order.restaurant_tables?.table_number} • {new Date(order.created_at || '').toLocaleString()}
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-600">Order ID</div>
              <div className="font-mono text-sm">{order.id.slice(-8).toUpperCase()}</div>
            </div>
          </div>

          <div className="border-t border-b py-4 my-4">
            <div className={`font-semibold ${getStatusColor(order.status || 'placed')}`}>
              {getStatusMessage(order.status || 'placed')}
            </div>
            <div className="text-sm text-gray-600 mt-1">
              {order.customer_email && <div>Email: {order.customer_email}</div>}
              {order.customer_phone && <div>Phone: {order.customer_phone}</div>}
            </div>
          </div>

          <h3 className="font-semibold mb-3">Order Items</h3>
          <div className="space-y-3">
            {order.order_items.map((item) => (
              <div key={item.id} className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className={item.menu_items?.is_veg ? 'text-green-600' : 'text-red-600'}>
                    {item.menu_items?.is_veg ? '🟢' : '🔴'}
                  </span>
                  <span>{item.menu_items?.name || 'Unknown Item'}</span>
                  <span className="text-gray-500">x{item.quantity}</span>
                </div>
                <span className="font-semibold">₹{item.total_price.toFixed(2)}</span>
              </div>
            ))}
          </div>

          <div className="border-t mt-4 pt-4">
            <div className="flex justify-between items-center text-xl font-bold">
              <span>Total:</span>
              <span className="text-green-600">₹{order.total_amount.toFixed(2)}</span>
            </div>
          </div>

          {order.notes && (
            <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
              <div className="text-sm font-medium text-yellow-800">Special Instructions:</div>
              <div className="text-sm text-yellow-700">{order.notes}</div>
            </div>
          )}
        </div>

        {/* Order Status Timeline */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h3 className="font-semibold mb-4">Order Progress</h3>
          <div className="space-y-4">
            {[
              { status: 'placed', label: 'Order Placed', time: order.created_at },
              { status: 'preparing', label: 'Being Prepared', time: null },
              { status: 'served', label: 'Served', time: null },
              { status: 'completed', label: 'Completed', time: null }
            ].map((step, index) => {
              const isCompleted = ['placed', 'preparing', 'served', 'completed'].indexOf(order.status || 'placed') >= index
              const isCurrent = order.status === step.status
              
              return (
                <div key={step.status} className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
                    isCompleted 
                      ? 'bg-green-600' 
                      : isCurrent 
                        ? 'bg-blue-600 animate-pulse'
                        : 'bg-gray-300'
                  }`}>
                    {isCompleted && (
                      <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <div className={`flex-1 ${isCompleted ? 'text-green-600' : isCurrent ? 'text-blue-600 font-medium' : 'text-gray-400'}`}>
                    {step.label}
                    {step.time && (
                      <div className="text-xs text-gray-500">
                        {new Date(step.time).toLocaleTimeString()}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={() => router.push(`/t/${tableCode}`)}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-semibold"
          >
            Order More Items
          </button>
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-semibold"
          >
            Refresh Order Status
          </button>
          <button
            onClick={() => router.push(`/t/${tableCode}/orders`)}
            className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 py-3 rounded-lg font-semibold"
          >
            View All My Orders
          </button>
        </div>

        {/* Customer Service Info */}
        <div className="mt-8 text-center text-sm text-gray-600">
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="font-medium text-blue-800 mb-1">Need help with your order?</p>
            <p className="text-blue-700">Please contact our staff at Table {order.restaurant_tables?.table_number}</p>
            <p className="text-blue-600 mt-2">Your order will be delivered to your table when ready</p>
          </div>
        </div>
      </div>
    </GuestLayout>
  )
}