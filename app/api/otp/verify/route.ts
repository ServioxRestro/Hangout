import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { phone, otp, requestId } = await request.json();

    if (!phone || !otp) {
      return NextResponse.json(
        { success: false, message: 'Phone number and OTP are required' },
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

    // Call MSG91 verify API (using standard endpoint with widget auth)
    const msg91Response = await fetch('https://control.msg91.com/api/v5/otp/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'widgetId': widgetId,
        'authkey': tokenAuth
      },
      body: JSON.stringify({
        mobile: formattedPhone,
        otp: otp,
        ...(requestId && { requestId })
      })
    });

    const data = await msg91Response.json();

    if (!msg91Response.ok || data.type === 'error') {
      return NextResponse.json(
        {
          success: false,
          message: data.message || 'Invalid OTP',
          error: data.type
        },
        { status: msg91Response.ok ? 400 : msg91Response.status }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Phone verified successfully',
      data: {
        phone: formattedPhone,
        access_token: data.data?.access_token
      }
    });

  } catch (error) {
    console.error('Error in verify OTP API:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
