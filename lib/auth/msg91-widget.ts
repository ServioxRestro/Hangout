/**
 * MSG91 OTP Widget Client-Side Integration
 * Uses MSG91's JavaScript SDK for OTP verification
 */

export interface PhoneAuthResult {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
}

// Extend Window interface to include MSG91 methods
declare global {
  interface Window {
    sendOtp: (identifier: string, successCallback?: (data: any) => void, errorCallback?: (error: any) => void) => void;
    verifyOtp: (otp: string | number, successCallback?: (data: any) => void, errorCallback?: (error: any) => void, requestId?: string) => void;
    retryOtp: (channel: string, successCallback?: (data: any) => void, errorCallback?: (error: any) => void) => void;
    getWidgetData: () => any;
    initSendOTP: (config: any) => void;
  }
}

let isWidgetInitialized = false;
let widgetScriptLoaded = false;

/**
 * Initialize MSG91 Widget
 */
export function initializeWidget(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (isWidgetInitialized) {
      console.log('Widget already initialized');
      resolve();
      return;
    }

    if (typeof window === 'undefined') {
      reject(new Error('Window is not defined'));
      return;
    }

    console.log('Starting widget initialization...');

    // Load widget script if not already loaded
    if (!widgetScriptLoaded) {
      console.log('Loading widget script...');
      const script = document.createElement('script');
      script.src = 'https://verify.msg91.com/otp-provider.js';
      script.async = true;

      script.onload = () => {
        console.log('Widget script loaded successfully');
        widgetScriptLoaded = true;

        // Wait for widget to be initialized
        const checkInitialized = setInterval(() => {
          if (isWidgetInitialized) {
            clearInterval(checkInitialized);
            resolve();
          }
        }, 100);

        // Timeout after 5 seconds
        setTimeout(() => {
          clearInterval(checkInitialized);
          if (!isWidgetInitialized) {
            reject(new Error('Widget initialization timeout'));
          }
        }, 5000);

        initializeWidgetConfig();
      };

      script.onerror = () => {
        console.error('Failed to load widget script');
        reject(new Error('Failed to load MSG91 widget script'));
      };

      document.body.appendChild(script);
    } else {
      console.log('Widget script already loaded, initializing config...');
      initializeWidgetConfig();

      // Wait for initialization
      const checkInitialized = setInterval(() => {
        if (isWidgetInitialized) {
          clearInterval(checkInitialized);
          resolve();
        }
      }, 100);

      setTimeout(() => {
        clearInterval(checkInitialized);
        if (!isWidgetInitialized) {
          reject(new Error('Widget initialization timeout'));
        }
      }, 5000);
    }
  });
}

function initializeWidgetConfig() {
  const widgetId = process.env.NEXT_PUBLIC_MSG91_WIDGET_ID;
  const tokenAuth = process.env.NEXT_PUBLIC_MSG91_TOKEN_AUTH;

  console.log('Initializing MSG91 widget...');
  console.log('Widget ID:', widgetId);
  console.log('Token Auth exists:', !!tokenAuth);
  console.log('initSendOTP function exists:', typeof window.initSendOTP);

  if (!widgetId || !tokenAuth) {
    console.error('MSG91 widget credentials missing in environment variables');
    return;
  }

  const configuration = {
    widgetId: widgetId,
    tokenAuth: tokenAuth,
    exposeMethods: true, // Expose sendOtp, verifyOtp, retryOtp methods
    success: (data: any) => {
      console.log('Widget success:', data);
    },
    failure: (error: any) => {
      console.error('Widget failure:', error);
    }
  };

  // Wait for initSendOTP to be available
  const maxAttempts = 20;
  let attempts = 0;

  const tryInitialize = () => {
    attempts++;
    console.log(`Attempt ${attempts} to initialize widget...`);

    if (typeof window.initSendOTP === 'function') {
      console.log('initSendOTP found, initializing...');
      window.initSendOTP(configuration);
      isWidgetInitialized = true;
      console.log('Widget initialized successfully');
    } else if (attempts < maxAttempts) {
      console.log('initSendOTP not ready, retrying...');
      setTimeout(tryInitialize, 100);
    } else {
      console.error('Failed to initialize widget after', maxAttempts, 'attempts');
    }
  };

  tryInitialize();
}

/**
 * Send OTP to phone number using MSG91 Widget
 */
export async function sendPhoneOTP(phone: string): Promise<PhoneAuthResult> {
  try {
    // Ensure widget is initialized
    if (!isWidgetInitialized) {
      await initializeWidget();
    }

    // Format phone number (remove spaces, add country code)
    const cleaned = phone.replace(/\D/g, '');
    const formattedPhone = cleaned.startsWith('91') && cleaned.length === 12
      ? cleaned
      : cleaned.length === 10
      ? `91${cleaned}`
      : cleaned;

    return new Promise((resolve) => {
      if (typeof window.sendOtp !== 'function') {
        resolve({
          success: false,
          message: 'MSG91 widget not initialized',
          error: 'WIDGET_NOT_INITIALIZED'
        });
        return;
      }

      window.sendOtp(
        formattedPhone,
        (data) => {
          console.log('OTP sent successfully:', data);

          // Store phone for later use
          if (typeof window !== 'undefined') {
            sessionStorage.setItem('msg91_phone', formattedPhone);
          }

          resolve({
            success: true,
            message: 'OTP sent successfully',
            data: data
          });
        },
        (error) => {
          console.error('Failed to send OTP:', error);
          resolve({
            success: false,
            message: error?.message || 'Failed to send OTP',
            error: error?.type || 'SEND_OTP_FAILED'
          });
        }
      );
    });
  } catch (error) {
    console.error('Error in sendPhoneOTP:', error);
    return {
      success: false,
      message: 'Failed to send OTP. Please try again.',
      error: 'NETWORK_ERROR'
    };
  }
}

/**
 * Verify OTP using MSG91 Widget
 */
export async function verifyPhoneOTP(phone: string, otp: string): Promise<PhoneAuthResult> {
  try {
    if (!isWidgetInitialized) {
      return {
        success: false,
        message: 'Widget not initialized. Please request OTP first.',
        error: 'WIDGET_NOT_INITIALIZED'
      };
    }

    return new Promise((resolve) => {
      if (typeof window.verifyOtp !== 'function') {
        resolve({
          success: false,
          message: 'MSG91 widget not initialized',
          error: 'WIDGET_NOT_INITIALIZED'
        });
        return;
      }

      window.verifyOtp(
        otp,
        async (data) => {
          console.log('OTP verified successfully:', data);

          // Format phone number
          const cleaned = phone.replace(/\D/g, '');
          const formattedPhone = cleaned.startsWith('91') && cleaned.length === 12
            ? cleaned
            : cleaned.length === 10
            ? `91${cleaned}`
            : cleaned;

          // Create or update guest user in database
          try {
            const { createOrUpdateGuestUser } = await import('@/lib/guest-user');
            await createOrUpdateGuestUser(formattedPhone);
          } catch (error) {
            console.error('Failed to save guest user:', error);
            // Don't fail the login if guest user creation fails
          }

          // Store guest session
          if (typeof window !== 'undefined') {
            localStorage.setItem('guest_phone', formattedPhone);
            localStorage.setItem('guest_auth_token', data?.access_token || `guest_${Date.now()}`);
            localStorage.setItem('guest_login_time', new Date().toISOString());
            sessionStorage.removeItem('msg91_phone');
          }

          resolve({
            success: true,
            message: 'Phone verified successfully',
            data: {
              phone: formattedPhone,
              access_token: data?.access_token
            }
          });
        },
        (error) => {
          console.error('Failed to verify OTP:', error);
          resolve({
            success: false,
            message: error?.message || 'Invalid OTP',
            error: error?.type || 'VERIFY_OTP_FAILED'
          });
        }
      );
    });
  } catch (error) {
    console.error('Error in verifyPhoneOTP:', error);
    return {
      success: false,
      message: 'Failed to verify OTP. Please try again.',
      error: 'NETWORK_ERROR'
    };
  }
}

/**
 * Resend OTP using MSG91 Widget
 */
export async function resendPhoneOTP(channel: string = 'SMS'): Promise<PhoneAuthResult> {
  try {
    if (!isWidgetInitialized) {
      return {
        success: false,
        message: 'Widget not initialized. Please request OTP first.',
        error: 'WIDGET_NOT_INITIALIZED'
      };
    }

    return new Promise((resolve) => {
      if (typeof window.retryOtp !== 'function') {
        resolve({
          success: false,
          message: 'MSG91 widget not initialized',
          error: 'WIDGET_NOT_INITIALIZED'
        });
        return;
      }

      window.retryOtp(
        channel, // 'SMS', 'VOICE', 'WHATSAPP', 'EMAIL'
        (data) => {
          console.log('OTP resent successfully:', data);
          resolve({
            success: true,
            message: 'OTP resent successfully',
            data: data
          });
        },
        (error) => {
          console.error('Failed to resend OTP:', error);
          resolve({
            success: false,
            message: error?.message || 'Failed to resend OTP',
            error: error?.type || 'RETRY_OTP_FAILED'
          });
        }
      );
    });
  } catch (error) {
    console.error('Error in resendPhoneOTP:', error);
    return {
      success: false,
      message: 'Failed to resend OTP. Please try again.',
      error: 'NETWORK_ERROR'
    };
  }
}

/**
 * Get current guest session
 */
export function getGuestSession() {
  if (typeof window === 'undefined') return null;

  const phone = localStorage.getItem('guest_phone');
  const authToken = localStorage.getItem('guest_auth_token');
  const loginTime = localStorage.getItem('guest_login_time');

  if (!phone || !authToken) return null;

  return { phone, authToken, loginTime };
}

/**
 * Get current authenticated user
 */
export async function getCurrentUser(): Promise<{ phone: string } | null> {
  const session = getGuestSession();
  if (!session) return null;

  return { phone: session.phone };
}

/**
 * Sign out guest user
 */
export async function signOut(): Promise<{ success: boolean; message: string }> {
  try {
    if (typeof window === 'undefined') {
      return { success: false, message: 'Window not available' };
    }

    localStorage.removeItem('guest_phone');
    localStorage.removeItem('guest_auth_token');
    localStorage.removeItem('guest_login_time');
    sessionStorage.removeItem('msg91_phone');

    return { success: true, message: 'Signed out successfully' };
  } catch (error) {
    console.error('Error signing out:', error);
    return { success: false, message: 'Failed to sign out' };
  }
}

/**
 * Check if guest is authenticated
 */
export function isGuestAuthenticated(): boolean {
  const session = getGuestSession();
  return session !== null;
}
