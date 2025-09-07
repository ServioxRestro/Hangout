'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { sendEmailOTP, verifyEmailOTP } from '@/lib/auth/email-auth'
import type { Tables } from '@/types/database.types'
import { GuestLayout } from '@/components/guest/GuestLayout'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Badge } from '@/components/ui/Badge'

type RestaurantTable = Tables<'restaurant_tables'>

interface CartItem {
  id: string
  name: string
  price: number
  quantity: number
  is_veg: boolean
}

export default function CheckoutPage() {
  const params = useParams()
  const router = useRouter()
  const tableCode = params?.tableCode as string

  const [table, setTable] = useState<RestaurantTable | null>(null)
  const [cart, setCart] = useState<CartItem[]>([])
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [step, setStep] = useState<'email' | 'otp' | 'placing'>('email')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    // Get cart from localStorage or sessionStorage
    const savedCart = localStorage.getItem(`cart_${tableCode}`)
    if (savedCart) {
      setCart(JSON.parse(savedCart))
    }
    
    fetchTable()
  }, [tableCode])

  const fetchTable = async () => {
    try {
      const { data: tableData, error: tableError } = await supabase
        .from('restaurant_tables')
        .select('*')
        .eq('table_code', tableCode)
        .eq('is_active', true)
        .single()

      if (tableError || !tableData) {
        setError('Table not found')
        return
      }

      setTable(tableData)
    } catch (error) {
      console.error('Error:', error)
      setError('Failed to load table information')
    } finally {
      setLoading(false)
    }
  }

  const sendOTP = async () => {
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address')
      return
    }

    setLoading(true)
    setError('')

    try {
      const result = await sendEmailOTP(email)

      if (result.success) {
        setStep('otp')
        console.log('OTP sent via Supabase Auth to:', email)
      } else {
        setError(result.error || 'Failed to send OTP')
      }
    } catch (error) {
      console.error('Error:', error)
      setError('Failed to send OTP. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const verifyOTPAndPlaceOrder = async () => {
    if (!otp || otp.length !== 6) {
      setError('Please enter a valid 6-digit OTP')
      return
    }

    setLoading(true)
    setError('')
    setStep('placing')

    try {
      // Verify OTP with Supabase Auth
      const verifyResult = await verifyEmailOTP(email, otp)

      if (!verifyResult.success) {
        setError(verifyResult.error || 'Invalid OTP')
        setStep('otp')
        setLoading(false)
        return
      }

      // User is now authenticated with Supabase
      console.log('User authenticated:', verifyResult.user)

      // Calculate total
      const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0)

      // Create order with authenticated user
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
          table_id: table?.id,
          customer_email: email,
          total_amount: total,
          notes: notes || null,
          status: 'placed'
        })
        .select()
        .single()

      if (orderError) {
        console.error('Error creating order:', orderError)
        setError('Failed to place order')
        setStep('otp')
        setLoading(false)
        return
      }

      // Create order items
      const orderItems = cart.map(item => ({
        order_id: orderData.id,
        menu_item_id: item.id,
        quantity: item.quantity,
        unit_price: item.price,
        total_price: item.price * item.quantity
      }))

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems)

      if (itemsError) {
        console.error('Error creating order items:', itemsError)
        setError('Failed to save order items')
        setStep('otp')
        setLoading(false)
        return
      }

      // Clear cart
      localStorage.removeItem(`cart_${tableCode}`)

      // Redirect to success page
      router.push(`/t/${tableCode}/success?orderId=${orderData.id}`)

    } catch (error) {
      console.error('Error:', error)
      setError('Failed to place order. Please try again.')
      setStep('otp')
      setLoading(false)
    }
  }

  const getCartTotal = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0)
  }

  if (loading && !table) {
    return (
      <GuestLayout>
        <div className="min-h-screen flex items-center justify-center">
          <LoadingSpinner text="Loading checkout..." />
        </div>
      </GuestLayout>
    )
  }

  if (error && !table) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">⚠️ {error}</div>
          <button
            onClick={() => router.back()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  if (cart.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-xl mb-4">Your cart is empty</div>
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
          <h1 className="text-xl font-bold text-gray-900">Checkout</h1>
          <p className="text-sm text-gray-600">Table {table?.table_number}</p>
        </div>
      </div>

      <div className="px-4 py-6">
        {/* Order Summary */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Order Summary</h2>
          <div className="space-y-3">
            {cart.map((item) => (
              <div key={item.id} className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className={item.is_veg ? 'text-green-600' : 'text-red-600'}>
                    {item.is_veg ? '🟢' : '🔴'}
                  </span>
                  <span>{item.name}</span>
                  <span className="text-gray-500">x{item.quantity}</span>
                </div>
                <span className="font-semibold">₹{(item.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>
          <div className="border-t mt-4 pt-4">
            <div className="flex justify-between items-center text-xl font-bold">
              <span>Total:</span>
              <span className="text-green-600">₹{getCartTotal().toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Special Instructions */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h3 className="text-lg font-semibold mb-3">Special Instructions (Optional)</h3>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any special requests or dietary requirements..."
            rows={3}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Email Address Step */}
        {step === 'email' && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold mb-4">Enter Your Email Address</h3>
            <p className="text-gray-600 text-sm mb-4">
              We'll send you a verification code via email to confirm your order
            </p>
            <div className="space-y-4">

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email address"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              {error && (
                <div className="text-red-600 text-sm">{error}</div>
              )}
              
              <button
                onClick={sendOTP}
                disabled={loading || !email.includes('@')}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white py-3 rounded-lg font-semibold"
              >
                {loading ? 'Sending OTP...' : 'Send Verification Code'}
              </button>
            </div>
          </div>
        )}

        {/* OTP Verification Step */}
        {step === 'otp' && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold mb-4">Verify OTP</h3>
            <p className="text-gray-600 text-sm mb-4">
              Enter the 6-digit OTP sent to {email}
            </p>
            <div className="space-y-4">
              <div>
                <label htmlFor="otp" className="block text-sm font-medium text-gray-700 mb-2">
                  OTP Code
                </label>
                <input
                  type="text"
                  id="otp"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="Enter 6-digit OTP"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-center text-2xl tracking-widest"
                  maxLength={6}
                />
              </div>
              
              {error && (
                <div className="text-red-600 text-sm">{error}</div>
              )}
              
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setStep('email')
                    setOtp('')
                    setError('')
                  }}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-3 rounded-lg font-semibold"
                >
                  Change Email
                </button>
                <button
                  onClick={verifyOTPAndPlaceOrder}
                  disabled={loading || otp.length !== 6}
                  className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white py-3 rounded-lg font-semibold"
                >
                  {loading ? 'Placing Order...' : 'Place Order'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Placing Order Step */}
        {step === 'placing' && (
          <div className="bg-white rounded-lg shadow-sm p-6 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h3 className="text-lg font-semibold mb-2">Placing Your Order...</h3>
            <p className="text-gray-600">Please wait while we process your order</p>
          </div>
        )}
      </div>
    </GuestLayout>
  )
}