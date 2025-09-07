'use client'

import { useRouter, usePathname } from 'next/navigation'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'

interface GuestNavigationProps {
  tableCode: string
  tableNumber?: number
  activeOrdersCount?: number
  cartItemCount?: number
  userEmail?: string | null
}

export function GuestNavigation({ 
  tableCode, 
  tableNumber,
  activeOrdersCount = 0, 
  cartItemCount = 0, 
  userEmail 
}: GuestNavigationProps) {
  const router = useRouter()
  const pathname = usePathname()
  
  const navItems = [
    {
      id: 'menu',
      label: 'Menu',
      icon: '🍽️',
      path: `/t/${tableCode}`,
      badge: null,
      badgeVariant: 'default' as const
    },
    {
      id: 'cart',
      label: 'Cart',
      icon: '🛒',
      path: `/t/${tableCode}/cart`,
      badge: cartItemCount > 0 ? cartItemCount : null,
      badgeVariant: 'success' as const
    },
    {
      id: 'orders',
      label: 'Orders',
      icon: '📋',
      path: `/t/${tableCode}/orders`,
      badge: activeOrdersCount > 0 ? activeOrdersCount : null,
      badgeVariant: 'primary' as const
    }
  ]

  const isActive = (path: string) => {
    if (path === `/t/${tableCode}`) {
      return pathname === path
    }
    return pathname?.startsWith(path)
  }

  return (
    <>
      {/* Desktop Navigation - Top Bar */}
      <nav className="hidden md:block bg-white/95 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Left - Restaurant Info */}
            <div className="flex items-center space-x-4">
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  {process.env.NEXT_PUBLIC_RESTAURANT_NAME || 'Hangout Restaurant'}
                </h1>
                <p className="text-sm text-gray-600">Table {tableNumber || tableCode}</p>
              </div>
            </div>

            {/* Center - Navigation Items */}
            <div className="flex items-center space-x-1">
              {navItems.map((item) => (
                <Button
                  key={item.id}
                  variant={isActive(item.path) ? 'primary' : 'ghost'}
                  size="md"
                  onClick={() => router.push(item.path)}
                  className="relative"
                >
                  <span className="mr-2">{item.icon}</span>
                  {item.label}
                  {item.badge && (
                    <Badge 
                      variant={item.badgeVariant} 
                      size="sm" 
                      className="ml-2"
                    >
                      {item.badge}
                    </Badge>
                  )}
                </Button>
              ))}
            </div>

            {/* Right - User Info */}
            <div className="flex items-center space-x-3">
              {userEmail && (
                <Badge variant="default" size="md" className="hidden lg:flex">
                  👤 {userEmail.split('@')[0]}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Navigation - Bottom Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-200 z-50">
        <div className="flex items-center justify-around py-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => router.push(item.path)}
              className={`flex flex-col items-center justify-center p-3 rounded-lg transition-all duration-200 ${
                isActive(item.path)
                  ? 'bg-blue-100 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <div className="relative">
                <span className="text-2xl mb-1 block">{item.icon}</span>
                {item.badge && (
                  <Badge 
                    variant={item.badgeVariant} 
                    size="sm" 
                    className="absolute -top-2 -right-2 min-w-[20px] h-5 flex items-center justify-center text-xs"
                  >
                    {item.badge}
                  </Badge>
                )}
              </div>
              <span className={`text-xs font-medium ${
                isActive(item.path) ? 'text-blue-600' : 'text-gray-600'
              }`}>
                {item.label}
              </span>
            </button>
          ))}
        </div>
      </nav>

      {/* Mobile spacing to prevent content from being hidden behind nav */}
      <div className="md:hidden h-20" />
    </>
  )
}