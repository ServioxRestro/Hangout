import bcrypt from 'bcryptjs'
import { supabase } from '@/lib/supabase/client'
import type { Tables } from '@/types/database.types'

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

    return { success: true, admin: { id: admin.id, email: admin.email } }
  } catch (error) {
    return { success: false, error: 'Login failed' }
  }
}

export async function createAdminHash(password: string): Promise<string> {
  const saltRounds = 10
  return await bcrypt.hash(password, saltRounds)
}