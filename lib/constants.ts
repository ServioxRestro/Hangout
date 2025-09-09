// Currency configuration for Indian market
export const CURRENCY = {
  symbol: '₹',
  code: 'INR',
  name: 'Indian Rupee'
} as const

// Format currency with proper Indian formatting
export const formatCurrency = (amount: number): string => {
  return `${CURRENCY.symbol}${amount.toLocaleString('en-IN', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  })}`
}

// Format currency without decimals for whole numbers
export const formatCurrencyCompact = (amount: number): string => {
  const isWholeNumber = amount % 1 === 0
  return `${CURRENCY.symbol}${amount.toLocaleString('en-IN', { 
    minimumFractionDigits: isWholeNumber ? 0 : 2, 
    maximumFractionDigits: 2 
  })}`
}

// Restaurant configuration
export const RESTAURANT_CONFIG = {
  name: process.env.NEXT_PUBLIC_RESTAURANT_NAME || 'Hangout Restaurant',
  tagline: 'Delicious Food, Digital Experience',
  supportPhone: '+91-9876543210',
  supportEmail: 'support@hangout.com'
} as const