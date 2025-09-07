'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth/email-auth'
import { supabase } from '@/lib/supabase/client'
import { GuestNavigation } from './GuestNavigation'

interface GuestLayoutProps {
  children: React.ReactNode
  showNavigation?: boolean
}

export function GuestLayout({ children, showNavigation = true }: GuestLayoutProps) {
  const params = useParams()
  const tableCode = params?.tableCode as string
  
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [activeOrdersCount, setActiveOrdersCount] = useState(0)
  const [cartItemCount, setCartItemCount] = useState(0)
  const [tableNumber, setTableNumber] = useState<number | undefined>(undefined)

  useEffect(() => {
    if (tableCode) {
      fetchUserData()
      fetchCartCount()
      fetchTableInfo()
      
      // Set up real-time subscriptions for orders
      const subscription = supabase
        .channel('guest-layout')
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'orders'
        }, () => {
          fetchActiveOrders()
        })
        .subscribe()

      return () => {
        subscription.unsubscribe()
      }
    }
  }, [tableCode])

  useEffect(() => {
    // Listen for cart changes in localStorage
    const handleStorageChange = () => {
      fetchCartCount()
    }
    
    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [tableCode])

  const fetchTableInfo = async () => {
    try {
      const { data: table, error } = await supabase
        .from('restaurant_tables')
        .select('table_number')
        .eq('table_code', tableCode)
        .eq('is_active', true)
        .single()

      if (!error && table) {
        setTableNumber(table.table_number)
      }
    } catch (error) {
      console.error('Error fetching table info:', error)
    }
  }

  const fetchUserData = async () => {
    try {
      const user = await getCurrentUser()
      if (user) {
        setUserEmail(user.email || null)
        await fetchActiveOrders(user.email)
      }
    } catch (error) {
      console.error('Error fetching user data:', error)
    }
  }

  const fetchActiveOrders = async (email?: string) => {
    try {
      if (!email) {
        const user = await getCurrentUser()
        email = user?.email
      }
      
      if (email) {
        const { data, error } = await supabase
          .from('orders')
          .select('id, restaurant_tables!inner(table_code)')
          .eq('customer_email', email)
          .eq('restaurant_tables.table_code', tableCode)
          .in('status', ['placed', 'preparing', 'served'])

        if (!error && data) {
          setActiveOrdersCount(data.length)
        }
      }
    } catch (error) {
      console.error('Error fetching active orders:', error)
    }
  }

  const fetchCartCount = () => {
    try {
      const savedCart = localStorage.getItem(`cart_${tableCode}`)
      if (savedCart) {
        const cart = JSON.parse(savedCart)
        const totalItems = cart.reduce((sum: number, item: any) => sum + item.quantity, 0)
        setCartItemCount(totalItems)
      } else {
        setCartItemCount(0)
      }
    } catch (error) {
      console.error('Error fetching cart count:', error)
      setCartItemCount(0)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {showNavigation && (
        <GuestNavigation
          tableCode={tableCode}
          tableNumber={tableNumber}
          activeOrdersCount={activeOrdersCount}
          cartItemCount={cartItemCount}
          userEmail={userEmail}
        />
      )}
      
      {/* Main content with proper spacing for navigation */}
      <main className={showNavigation ? 'pt-0 md:pt-16 pb-20 md:pb-0' : ''}>
        {children}
      </main>
    </div>
  )
}