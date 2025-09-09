import { ReactNode } from 'react'

interface StatsCardProps {
  title: string
  value: string | number
  change?: {
    value: string
    trend: 'up' | 'down' | 'neutral'
  }
  icon?: ReactNode
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple'
}

export default function StatsCard({ 
  title, 
  value, 
  change, 
  icon,
  color = 'blue' 
}: StatsCardProps) {
  const colorClasses = {
    blue: {
      bg: 'bg-blue-50',
      icon: 'text-blue-500',
      trend: 'text-blue-600'
    },
    green: {
      bg: 'bg-green-50',
      icon: 'text-green-500',
      trend: 'text-green-600'
    },
    yellow: {
      bg: 'bg-yellow-50',
      icon: 'text-yellow-500',
      trend: 'text-yellow-600'
    },
    red: {
      bg: 'bg-red-50',
      icon: 'text-red-500',
      trend: 'text-red-600'
    },
    purple: {
      bg: 'bg-purple-50',
      icon: 'text-purple-500',
      trend: 'text-purple-600'
    }
  }

  const trendIcons = {
    up: '↗',
    down: '↘',
    neutral: '→'
  }

  const trendColors = {
    up: 'text-green-500',
    down: 'text-red-500',
    neutral: 'text-gray-500'
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
          {change && (
            <div className="flex items-center mt-2">
              <span className={`inline-flex items-center text-sm font-medium ${trendColors[change.trend]}`}>
                <span className="mr-1">{trendIcons[change.trend]}</span>
                {change.value}
              </span>
              <span className="ml-1 text-sm text-gray-500">from last week</span>
            </div>
          )}
        </div>
        {icon && (
          <div className={`flex-shrink-0 ${colorClasses[color].bg} p-3 rounded-lg`}>
            <div className={`w-6 h-6 ${colorClasses[color].icon}`}>
              {icon}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}