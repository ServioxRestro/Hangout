'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'

export default function CheckoutRedirect() {
  const params = useParams()
  const router = useRouter()
  const tableCode = params?.tableCode as string

  useEffect(() => {
    // Redirect to the unified cart page
    router.replace(`/t/${tableCode}/cart`)
  }, [router, tableCode])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Redirecting to cart...</p>
      </div>
    </div>
  )
}