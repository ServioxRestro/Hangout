'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import type { Tables } from '@/types/database.types'

type Order = Tables<'orders'> & {
  restaurant_tables: Tables<'restaurant_tables'> | null
  order_items: Array<
    Tables<'order_items'> & {
      menu_items: Tables<'menu_items'> | null
    }
  >
}

export default function AdminDashboard() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchOrders()
  }, [])

  const fetchOrders = async () => {
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
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching orders:', error)
        return
      }

      setOrders(data as Order[])
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateOrderStatus = async (orderId: string, status: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status })
        .eq('id', orderId)

      if (error) {
        console.error('Error updating order:', error)
        return
      }

      // Refresh orders
      fetchOrders()
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'placed': return 'bg-blue-100 text-blue-800'
      case 'preparing': return 'bg-yellow-100 text-yellow-800'
      case 'served': return 'bg-green-100 text-green-800'
      case 'completed': return 'bg-gray-100 text-gray-800'
      case 'paid': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <h1 className="text-3xl font-bold text-gray-900">
              {process.env.NEXT_PUBLIC_RESTAURANT_NAME || 'Restaurant'} - Admin Dashboard
            </h1>
            <div className="flex space-x-4">
              <button
                onClick={() => window.location.href = '/admin/tables'}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
              >
                Manage Tables
              </button>
              <button
                onClick={() => window.location.href = '/admin/menu'}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md"
              >
                Manage Menu
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">Recent Orders</h2>
          
          {orders.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-500">No orders yet</div>
            </div>
          ) : (
            <div className="grid gap-6">
              {orders.map((order) => (
                <div key={order.id} className="bg-white shadow rounded-lg p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold">
                        Table {order.restaurant_tables?.table_number || 'Unknown'}
                      </h3>
                      <p className="text-gray-600">
                        Phone: {order.customer_phone}
                      </p>
                      <p className="text-gray-600">
                        Order Time: {new Date(order.created_at || '').toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center space-x-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status || 'placed')}`}>
                        {order.status || 'placed'}
                      </span>
                      <select
                        value={order.status || 'placed'}
                        onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                        className="border border-gray-300 rounded-md px-2 py-1 text-sm"
                      >
                        <option value="placed">Placed</option>
                        <option value="preparing">Preparing</option>
                        <option value="served">Served</option>
                        <option value="completed">Completed</option>
                        <option value="paid">Paid</option>
                      </select>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <h4 className="font-semibold mb-2">Order Items:</h4>
                    <ul className="space-y-2">
                      {order.order_items.map((item) => (
                        <li key={item.id} className="flex justify-between">
                          <span>
                            {item.quantity}x {item.menu_items?.name || 'Unknown Item'}
                          </span>
                          <span>₹{item.total_price.toFixed(2)}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="border-t mt-2 pt-2 flex justify-between font-semibold">
                      <span>Total:</span>
                      <span>₹{order.total_amount.toFixed(2)}</span>
                    </div>
                  </div>

                  {order.notes && (
                    <div className="mt-4 p-3 bg-yellow-50 rounded">
                      <p className="text-sm text-yellow-800">
                        <strong>Note:</strong> {order.notes}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}