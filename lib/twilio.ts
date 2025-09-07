import twilio from 'twilio'

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
)

const VERIFY_SERVICE_SID = process.env.TWILIO_VERIFY_SERVICE_SID

export interface VerificationResult {
  success: boolean
  error?: string
  sid?: string
}

export interface VerificationCheckResult {
  success: boolean
  error?: string
  valid?: boolean
}

// Send OTP via Twilio Verify (supports SMS and WhatsApp)
export async function sendVerification(phone: string, channel: 'sms' | 'whatsapp' = 'sms'): Promise<VerificationResult> {
  try {
    if (!VERIFY_SERVICE_SID) {
      throw new Error('Twilio Verify Service SID not configured')
    }

    // Format phone for WhatsApp if needed
    const formattedPhone = channel === 'whatsapp' ? `whatsapp:${phone}` : phone

    const verification = await client.verify.v2
      .services(VERIFY_SERVICE_SID)
      .verifications
      .create({
        to: formattedPhone,
        channel: channel
      })

    return {
      success: true,
      sid: verification.sid
    }
  } catch (error: any) {
    console.error('Twilio verification error:', error)
    return {
      success: false,
      error: error.message || 'Failed to send verification code'
    }
  }
}

// Verify OTP code
export async function checkVerification(phone: string, code: string, channel: 'sms' | 'whatsapp' = 'sms'): Promise<VerificationCheckResult> {
  try {
    if (!VERIFY_SERVICE_SID) {
      throw new Error('Twilio Verify Service SID not configured')
    }

    // Format phone for WhatsApp if needed
    const formattedPhone = channel === 'whatsapp' ? `whatsapp:${phone}` : phone

    const verificationCheck = await client.verify.v2
      .services(VERIFY_SERVICE_SID)
      .verificationChecks
      .create({
        to: formattedPhone,
        code: code
      })

    return {
      success: verificationCheck.status === 'approved',
      valid: verificationCheck.status === 'approved'
    }
  } catch (error: any) {
    console.error('Twilio verification check error:', error)
    return {
      success: false,
      error: error.message || 'Failed to verify code'
    }
  }
}

// Alternative: Send WhatsApp message directly (for custom OTP messages)
export async function sendWhatsAppMessage(to: string, body: string): Promise<VerificationResult> {
  try {
    const message = await client.messages.create({
      from: 'whatsapp:+14155238886', // Your Twilio WhatsApp number
      to: `whatsapp:${to}`,
      body: body
    })

    return {
      success: true,
      sid: message.sid
    }
  } catch (error: any) {
    console.error('WhatsApp message error:', error)
    return {
      success: false,
      error: error.message || 'Failed to send WhatsApp message'
    }
  }
}