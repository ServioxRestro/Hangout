import { supabase } from '@/lib/supabase/client'

export interface EmailAuthResult {
  success: boolean
  error?: string
  session?: any
  user?: any
}

// Send OTP to email address
export async function sendEmailOTP(email: string): Promise<EmailAuthResult> {
  try {
    const { data, error } = await supabase.auth.signInWithOtp({
      email: email,
      options: {
        shouldCreateUser: true,
        // Custom data to identify restaurant guests
        data: {
          user_type: 'guest',
          source: 'restaurant_qr'
        }
      }
    })

    if (error) {
      console.error('Email OTP send error:', error)
      return {
        success: false,
        error: error.message || 'Failed to send OTP'
      }
    }

    return {
      success: true
    }
  } catch (error: any) {
    console.error('Email OTP send error:', error)
    return {
      success: false,
      error: error.message || 'Failed to send OTP'
    }
  }
}

// Verify OTP and sign in
export async function verifyEmailOTP(email: string, token: string): Promise<EmailAuthResult> {
  try {
    const { data, error } = await supabase.auth.verifyOtp({
      email: email,
      token: token,
      type: 'email'
    })

    if (error) {
      console.error('Email OTP verify error:', error)
      return {
        success: false,
        error: error.message || 'Invalid or expired OTP'
      }
    }

    if (data.session && data.user) {
      return {
        success: true,
        session: data.session,
        user: data.user
      }
    }

    return {
      success: false,
      error: 'Verification failed'
    }
  } catch (error: any) {
    console.error('Email OTP verify error:', error)
    return {
      success: false,
      error: error.message || 'Failed to verify OTP'
    }
  }
}

// Check if user is authenticated
export async function getCurrentUser() {
  try {
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error) {
      console.error('Get user error:', error)
      return null
    }

    return user
  } catch (error) {
    console.error('Get user error:', error)
    return null
  }
}

// Sign out user
export async function signOut() {
  try {
    const { error } = await supabase.auth.signOut()
    
    if (error) {
      console.error('Sign out error:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error: any) {
    console.error('Sign out error:', error)
    return { success: false, error: error.message }
  }
}

// Get current session
export async function getCurrentSession() {
  try {
    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (error) {
      console.error('Get session error:', error)
      return null
    }

    return session
  } catch (error) {
    console.error('Get session error:', error)
    return null
  }
}