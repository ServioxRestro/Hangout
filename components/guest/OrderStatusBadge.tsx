import { Badge } from '@/components/ui/Badge'

interface OrderStatusBadgeProps {
  status: string
  className?: string
}

export function OrderStatusBadge({ status, className = '' }: OrderStatusBadgeProps) {
  const getStatusConfig = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'placed':
        return {
          variant: 'primary' as const,
          text: 'Order Placed',
          icon: '📝'
        }
      case 'preparing':
        return {
          variant: 'warning' as const,
          text: 'Preparing',
          icon: '👨‍🍳'
        }
      case 'served':
        return {
          variant: 'success' as const,
          text: 'Served',
          icon: '✅'
        }
      case 'completed':
        return {
          variant: 'default' as const,
          text: 'Completed',
          icon: '🎉'
        }
      default:
        return {
          variant: 'default' as const,
          text: 'Unknown',
          icon: '❓'
        }
    }
  }
  
  const config = getStatusConfig(status)
  
  return (
    <Badge 
      variant={config.variant} 
      className={`inline-flex items-center gap-1 ${className}`}
    >
      <span>{config.icon}</span>
      {config.text}
    </Badge>
  )
}