import bcrypt from 'bcryptjs'
import { supabase } from '@/lib/supabase/client'
import type { Tables } from '@/types/database.types'

export type UserRole = 'super_admin' | 'waiter' | 'manager'

export interface AuthUser {
  id: string
  email: string
  role: UserRole
  name?: string
}

export async function loginAdmin(email: string, password: string) {
  try {
    const { data: admin, error } = await supabase
      .from('admin')
      .select('*')
      .eq('email', email)
      .single()

    if (error || !admin) {
      return { success: false, error: 'Invalid credentials' }
    }

    const isValidPassword = await bcrypt.compare(password, admin.password_hash)

    if (!isValidPassword) {
      return { success: false, error: 'Invalid credentials' }
    }

    return {
      success: true,
      user: {
        id: admin.id,
        email: admin.email,
        role: 'super_admin' as UserRole
      }
    }
  } catch (error) {
    return { success: false, error: 'Login failed' }
  }
}

export async function loginStaff(email: string, password: string) {
  try {
    const { data: staff, error } = await supabase
      .from('staff')
      .select('*')
      .eq('email', email)
      .eq('is_active', true)
      .single()

    if (error || !staff) {
      return { success: false, error: 'Invalid credentials' }
    }

    const isValidPassword = await bcrypt.compare(password, staff.password_hash)

    if (!isValidPassword) {
      return { success: false, error: 'Invalid credentials' }
    }

    return {
      success: true,
      user: {
        id: staff.id,
        email: staff.email,
        role: staff.role as UserRole,
        name: staff.name
      }
    }
  } catch (error) {
    return { success: false, error: 'Login failed' }
  }
}

export async function createAdminHash(password: string): Promise<string> {
  const saltRounds = 10
  return await bcrypt.hash(password, saltRounds)
}

// Simple role-based access control
export function canAccessRoute(userRole: UserRole, route: string): boolean {
  // Super admin can access everything
  if (userRole === 'super_admin') return true

  // Define what each role can access
  const roleAccess = {
    waiter: [
      '/admin/orders',
      '/admin/orders/create',
      '/admin/orders/history',
      '/admin/tables',           // Can view table sessions (NOT table management)
      '/admin/tables/sessions'   // Can process bills from tables
      // NOTE: Waiters CANNOT access /admin/billing (bills & payment - manager only)
      // NOTE: Waiters CANNOT access /admin/tables/management (table management - admin only)
    ],
    manager: [
      '/admin/dashboard',
      '/admin/orders',
      '/admin/orders/create',
      '/admin/orders/history',
      '/admin/tables',            // Can view table sessions
      '/admin/tables/sessions',   // Can view table sessions
      '/admin/menu',
      '/admin/offers',
      '/admin/billing',           // Can confirm payments and print bills
      '/admin/settings'
      // NOTE: Managers CANNOT access /admin/tables/management (admin only)
    ]
  }

  const allowedRoutes = roleAccess[userRole] || []
  return allowedRoutes.includes(route)
}