import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export function useAdminAuth() {
  const router = useRouter()

  useEffect(() => {
    // This is a client-side check for additional security
    // The real protection is in middleware.ts
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/admin/verify', {
          method: 'GET',
          credentials: 'include',
        })

        if (!response.ok) {
          router.push('/admin/login')
        }
      } catch (error) {
        console.error('Auth check failed:', error)
        router.push('/admin/login')
      }
    }

    checkAuth()
  }, [router])
}
