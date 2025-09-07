'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { getCurrentUser } from '@/lib/auth/email-auth'
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

export default function OrdersPage() {
  const params = useParams()
  const router = useRouter()
  const tableCode = params?.tableCode as string

  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [userEmail, setUserEmail] = useState<string | null>(null)

  useEffect(() => {
    fetchUserAndOrders()
  }, [tableCode])

  const fetchUserAndOrders = async () => {
    try {
      // Get current authenticated user
      const user = await getCurrentUser()
      if (!user) {
        setError('Please authenticate to view your orders')
        setLoading(false)
        return
      }

      setUserEmail(user.email || null)

      // Fetch orders for this user at this table
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
        .eq('customer_email', user.email || '')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching orders:', error)
        setError('Failed to load your orders')
        return
      }

      // Filter orders for this table if available
      const filteredOrders = data?.filter(order => 
        order.restaurant_tables?.table_code === tableCode
      ) || []

      setOrders(filteredOrders as Order[])
    } catch (error) {
      console.error('Error:', error)
      setError('Failed to load your orders')
    } finally {
      setLoading(false)
    }
  }

  const getStatusMessage = (status: string) => {
    switch (status) {
      case 'placed': return 'Order Placed'
      case 'preparing': return 'Being Prepared'
      case 'served': return 'Served'
      case 'completed': return 'Completed'
      default: return 'Unknown Status'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'placed': return 'bg-blue-100 text-blue-800'
      case 'preparing': return 'bg-yellow-100 text-yellow-800'
      case 'served': return 'bg-green-100 text-green-800'
      case 'completed': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <GuestLayout>
        <div className="min-h-screen flex items-center justify-center">
          <LoadingSpinner text="Loading your orders..." />
        </div>
      </GuestLayout>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">⚠️ {error}</div>
          <button
            onClick={() => router.push(`/t/${tableCode}`)}
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
          <h1 className="text-xl font-bold text-gray-900">My Orders</h1>
          <p className="text-sm text-gray-600">View your order history</p>
        </div>
      </div>

      <div className="px-4 py-6">
        {userEmail && (
          <div className="mb-6 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              Showing orders for: <span className="font-medium">{userEmail}</span>
            </p>
          </div>
        )}

        {orders.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-500 mb-4">
              <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p className="text-xl mb-2">No orders found</p>
              <p>You haven't placed any orders at this table yet.</p>
            </div>
            <button
              onClick={() => router.push(`/t/${tableCode}`)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold"
            >
              Browse Menu & Order
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <div key={order.id} className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold">Order #{order.id.slice(-8).toUpperCase()}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status || 'placed')}`}>
                        {getStatusMessage(order.status || 'placed')}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">
                      {new Date(order.created_at || '').toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold text-green-600">
                      ₹{order.total_amount.toFixed(2)}
                    </div>
                    <div className="text-sm text-gray-500">
                      {order.order_items.length} item{order.order_items.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  {order.order_items.map((item) => (
                    <div key={item.id} className="flex justify-between items-center text-sm">
                      <div className="flex items-center gap-2">
                        <span className={item.menu_items?.is_veg ? 'text-green-600' : 'text-red-600'}>
                          {item.menu_items?.is_veg ? '🟢' : '🔴'}
                        </span>
                        <span>{item.menu_items?.name || 'Unknown Item'}</span>
                        <span className="text-gray-500">x{item.quantity}</span>
                      </div>
                      <span>₹{item.total_price.toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                {order.notes && (
                  <div className="p-3 bg-yellow-50 rounded-lg mb-4">
                    <div className="text-sm">
                      <span className="font-medium text-yellow-800">Notes: </span>
                      <span className="text-yellow-700">{order.notes}</span>
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={() => router.push(`/t/${tableCode}/success?orderId=${order.id}`)}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg text-sm font-medium"
                  >
                    View Details
                  </button>
                  {(order.status === 'placed' || order.status === 'preparing') && (
                    <button
                      onClick={() => window.location.reload()}
                      className="bg-gray-200 hover:bg-gray-300 text-gray-700 py-2 px-4 rounded-lg text-sm font-medium"
                    >
                      Refresh Status
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Quick Actions */}
        <div className="mt-8 space-y-3">
          <button
            onClick={() => router.push(`/t/${tableCode}`)}
            className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-semibold"
          >
            Order More Items
          </button>
        </div>

        {/* Help Section */}
        <div className="mt-8 text-center text-sm text-gray-600">
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="font-medium text-blue-800 mb-1">Need help with your orders?</p>
            <p className="text-blue-700">Please contact our staff at your table</p>
            <p className="text-blue-600 mt-2">Orders are automatically tracked and updated in real-time</p>
          </div>
        </div>
      </div>
    </GuestLayout>
  )
}