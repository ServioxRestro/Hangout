/**
 * MSG91 Phone OTP Authentication
 * Handles phone-based OTP authentication using MSG91 API
 */

export interface PhoneAuthResult {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
}

interface MSG91SendOTPResponse {
  type: string;
  message: string;
  request_id?: string;
}

interface MSG91VerifyOTPResponse {
  type: string;
  message: string;
  data?: {
    access_token?: string;
  };
}

const MSG91_BASE_URL = 'https://control.msg91.com/api/v5';

/**
 * Format phone number to include country code
 * @param phone - Phone number with or without country code
 * @returns Formatted phone number with country code
 */
function formatPhoneNumber(phone: string): string {
  // Remove any spaces, dashes, or special characters
  const cleaned = phone.replace(/\D/g, '');

  // If already has country code (starts with 91 and is 12 digits)
  if (cleaned.startsWith('91') && cleaned.length === 12) {
    return cleaned;
  }

  // If it's a 10-digit Indian number, add country code
  if (cleaned.length === 10) {
    return `91${cleaned}`;
  }

  // Return as is if format is unclear
  return cleaned;
}

/**
 * Send OTP to phone number using MSG91 via API route
 * @param phone - Phone number (with or without +91)
 * @returns PhoneAuthResult with success status
 */
export async function sendPhoneOTP(phone: string): Promise<PhoneAuthResult> {
  try {
    const cleaned = phone.replace(/\D/g, '');

    if (cleaned.length !== 10) {
      return {
        success: false,
        message: 'Invalid phone number format',
        error: 'INVALID_PHONE'
      };
    }

    // Send OTP via Next.js API route
    const response = await fetch('/api/otp/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        phone: cleaned
      })
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      return {
        success: false,
        message: data.message || 'Failed to send OTP',
        error: data.error
      };
    }

    // Store request_id in session storage for verification
    if (typeof window !== 'undefined') {
      const requestId = data.data?.request_id || data.data?.requestId || data.requestId;
      if (requestId) {
        sessionStorage.setItem('msg91_request_id', requestId);
        sessionStorage.setItem('msg91_phone', data.data.phone || cleaned);
      }
    }

    return {
      success: true,
      message: 'OTP sent successfully',
      data: {
        ...data.data,
        requestId: data.data?.request_id || data.data?.requestId || data.requestId
      }
    };
  } catch (error) {
    console.error('Error sending OTP:', error);
    return {
      success: false,
      message: 'Failed to send OTP. Please try again.',
      error: 'NETWORK_ERROR'
    };
  }
}

/**
 * Verify OTP using MSG91 via API route
 * @param phone - Phone number used for OTP
 * @param otp - OTP code entered by user
 * @returns PhoneAuthResult with verification status
 */
export async function verifyPhoneOTP(phone: string, otp: string): Promise<PhoneAuthResult> {
  try {
    const cleaned = phone.replace(/\D/g, '');

    // Get requestId from session storage
    const requestId = typeof window !== 'undefined'
      ? sessionStorage.getItem('msg91_request_id')
      : null;

    // Verify OTP via Next.js API route
    const response = await fetch('/api/otp/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        phone: cleaned,
        otp: otp,
        ...(requestId && { requestId })
      })
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      return {
        success: false,
        message: data.message || 'Invalid OTP',
        error: data.error
      };
    }

    // Clear stored request_id after successful verification
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('msg91_request_id');
      sessionStorage.removeItem('msg91_phone');
    }

    // Store phone number in localStorage for guest session
    if (typeof window !== 'undefined' && data.data?.phone) {
      localStorage.setItem('guest_phone', data.data.phone);
      localStorage.setItem('guest_auth_token', data.data.access_token || `guest_${Date.now()}`);
      localStorage.setItem('guest_login_time', new Date().toISOString());
    }

    return {
      success: true,
      message: 'Phone verified successfully',
      data: data.data
    };
  } catch (error) {
    console.error('Error verifying OTP:', error);
    return {
      success: false,
      message: 'Failed to verify OTP. Please try again.',
      error: 'NETWORK_ERROR'
    };
  }
}

/**
 * Resend OTP using MSG91 via API route
 * @param phone - Phone number to resend OTP to
 * @returns PhoneAuthResult with resend status
 */
export async function resendPhoneOTP(phone: string): Promise<PhoneAuthResult> {
  try {
    const cleaned = phone.replace(/\D/g, '');

    // Get requestId from session storage
    const requestId = typeof window !== 'undefined'
      ? sessionStorage.getItem('msg91_request_id')
      : null;

    if (!requestId) {
      return {
        success: false,
        message: 'No active OTP request found. Please request a new OTP.',
        error: 'MISSING_REQUEST_ID'
      };
    }

    // Resend OTP via Next.js API route
    const response = await fetch('/api/otp/resend', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        phone: cleaned,
        requestId: requestId,
        retrytype: 'SMS' // Can be 'SMS', 'VOICE', 'WHATSAPP', 'EMAIL'
      })
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      return {
        success: false,
        message: data.message || 'Failed to resend OTP',
        error: data.error
      };
    }

    return {
      success: true,
      message: 'OTP resent successfully',
      data: data.data
    };
  } catch (error) {
    console.error('Error resending OTP:', error);
    return {
      success: false,
      message: 'Failed to resend OTP. Please try again.',
      error: 'NETWORK_ERROR'
    };
  }
}

/**
 * Get current guest session from localStorage
 */
export function getGuestSession() {
  if (typeof window === 'undefined') return null;

  const phone = localStorage.getItem('guest_phone');
  const authToken = localStorage.getItem('guest_auth_token');
  const loginTime = localStorage.getItem('guest_login_time');

  if (!phone || !authToken) return null;

  return {
    phone,
    authToken,
    loginTime
  };
}

/**
 * Clear guest session
 */
export function clearGuestSession() {
  if (typeof window === 'undefined') return;

  localStorage.removeItem('guest_phone');
  localStorage.removeItem('guest_auth_token');
  localStorage.removeItem('guest_login_time');
  sessionStorage.removeItem('msg91_request_id');
  sessionStorage.removeItem('msg91_phone');
}

/**
 * Check if guest is authenticated
 */
export function isGuestAuthenticated(): boolean {
  const session = getGuestSession();
  return session !== null;
}

/**
 * Get current authenticated guest user
 */
export async function getCurrentUser(): Promise<{ phone: string } | null> {
  const session = getGuestSession();
  if (!session) return null;

  return {
    phone: session.phone
  };
}

/**
 * Sign out the current guest user
 */
export async function signOut(): Promise<{ success: boolean; message: string }> {
  try {
    clearGuestSession();
    return {
      success: true,
      message: 'Signed out successfully'
    };
  } catch (error) {
    console.error('Error signing out:', error);
    return {
      success: false,
      message: 'Failed to sign out'
    };
  }
}
