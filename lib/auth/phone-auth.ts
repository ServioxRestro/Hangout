import { supabase } from '@/lib/supabase/client'

export interface PhoneAuthResult {
  success: boolean
  error?: string
  session?: any
  user?: any
}

// Send OTP to phone number
export async function sendPhoneOTP(phone: string): Promise<PhoneAuthResult> {
  try {
    // Ensure phone number is in proper format
    const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`
    
    const { data, error } = await supabase.auth.signInWithOtp({
      phone: formattedPhone,
      options: {
        // Custom data to identify restaurant guests
        data: {
          user_type: 'guest',
          source: 'restaurant_qr'
        }
      }
    })

    if (error) {
      console.error('Phone OTP send error:', error)
      return {
        success: false,
        error: error.message || 'Failed to send OTP'
      }
    }

    return {
      success: true
    }
  } catch (error: any) {
    console.error('Phone OTP send error:', error)
    return {
      success: false,
      error: error.message || 'Failed to send OTP'
    }
  }
}

// Verify OTP and sign in
export async function verifyPhoneOTP(phone: string, token: string): Promise<PhoneAuthResult> {
  try {
    // Ensure phone number is in proper format
    const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`
    
    const { data, error } = await supabase.auth.verifyOtp({
      phone: formattedPhone,
      token: token,
      type: 'sms' // or 'whatsapp' if configured
    })

    if (error) {
      console.error('Phone OTP verify error:', error)
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
    console.error('Phone OTP verify error:', error)
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