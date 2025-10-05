import { UserRole, AuthUser } from './auth'

export function getSessionFromCookie(cookieValue: string | undefined): AuthUser | null {
  if (!cookieValue) return null

  try {
    const sessionData = JSON.parse(atob(cookieValue))

    // Check if session is expired
    if (sessionData.exp && Date.now() > sessionData.exp) {
      return null
    }

    return {
      id: sessionData.id,
      email: sessionData.email,
      role: sessionData.role as UserRole,
      name: sessionData.name
    }
  } catch (error) {
    return null
  }
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const response = await fetch('/api/admin/verify', {
      method: 'GET',
      credentials: 'include'
    })

    if (!response.ok) return null

    const data = await response.json()
    return data.user || null
  } catch (error) {
    return null
  }
}