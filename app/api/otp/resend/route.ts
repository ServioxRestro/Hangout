import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { phone, requestId, retrytype = 'text' } = await request.json();

    if (!phone || !requestId) {
      return NextResponse.json(
        { success: false, message: 'Phone number and request ID are required' },
        { status: 400 }
      );
    }

    const widgetId = process.env.MSG91_WIDGET_ID;
    const tokenAuth = process.env.MSG91_TOKEN_AUTH;

    if (!widgetId || !tokenAuth) {
      return NextResponse.json(
        { success: false, message: 'MSG91 widget configuration missing' },
        { status: 500 }
      );
    }

    // Format phone number to include country code
    const cleaned = phone.replace(/\D/g, '');
    const formattedPhone = cleaned.startsWith('91') && cleaned.length === 12
      ? cleaned
      : cleaned.length === 10
      ? `91${cleaned}`
      : cleaned;

    // Call MSG91 retry API (using standard endpoint with widget auth)
    const msg91Response = await fetch('https://control.msg91.com/api/v5/otp/retry', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'widgetId': widgetId,
        'authkey': tokenAuth
      },
      body: JSON.stringify({
        mobile: formattedPhone,
        requestId: requestId,
        retrytype: retrytype // 'text', 'voice'
      })
    });

    const data = await msg91Response.json();

    if (!msg91Response.ok) {
      return NextResponse.json(
        {
          success: false,
          message: data.message || 'Failed to resend OTP',
          error: data.type
        },
        { status: msg91Response.status }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'OTP resent successfully',
      data: {
        phone: formattedPhone
      }
    });

  } catch (error) {
    console.error('Error in resend OTP API:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
