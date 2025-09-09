'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'

interface GuestHeaderProps {
  tableCode: string
  tableNumber?: number
  showBackButton?: boolean
  title?: string
  subtitle?: string
  userEmail?: string | null
  activeOrdersCount?: number
  actions?: React.ReactNode
}

export function GuestHeader({
  tableCode,
  tableNumber,
  showBackButton = false,
  title,
  subtitle,
  userEmail,
  activeOrdersCount = 0,
  actions
}: GuestHeaderProps) {
  const router = useRouter()
  
  return (
    <header className="bg-white shadow-sm sticky top-0 z-40">
      <div className="max-w-4xl mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            {showBackButton && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.back()}
                className="text-blue-600 hover:text-blue-800"
              >
                ← Back
              </Button>
            )}
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                {title || (process.env.NEXT_PUBLIC_RESTAURANT_NAME || 'Hangout Restaurant')}
              </h1>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                {tableNumber && <span>Table {tableNumber}</span>}
                {subtitle && <span>{subtitle}</span>}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {actions}
            {activeOrdersCount > 0 && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => router.push(`/t/${tableCode}/orders`)}
                className="relative"
              >
                <span className="mr-1">📋</span>
                {activeOrdersCount} Active
                <Badge variant="warning" size="sm" className="ml-2">
                  {activeOrdersCount}
                </Badge>
              </Button>
            )}
          </div>
        </div>
        
        {/* Quick Navigation Bar */}
        {(userEmail || activeOrdersCount > 0) && (
          <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-100">
            <div className="flex items-center gap-2">
              {userEmail && (
                <Badge variant="default" size="sm">
                  👤 {userEmail.split('@')[0]}
                </Badge>
              )}
              {activeOrdersCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push(`/t/${tableCode}/orders`)}
                >
                  View My Orders ({activeOrdersCount})
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push(`/t/${tableCode}`)}
              >
                🍽️ Menu
              </Button>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}