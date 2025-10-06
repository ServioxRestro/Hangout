import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { phone } = await request.json();

    if (!phone) {
      return NextResponse.json(
        { success: false, message: 'Phone number is required' },
        { status: 400 }
      );
    }

    const widgetId = process.env.MSG91_WIDGET_ID;
    const tokenAuth = process.env.MSG91_TOKEN_AUTH;

    console.log('MSG91 Widget ID exists:', !!widgetId);
    console.log('MSG91 Token Auth exists:', !!tokenAuth);

    if (!widgetId || !tokenAuth) {
      return NextResponse.json(
        { success: false, message: 'MSG91 widget configuration missing. Please add MSG91_WIDGET_ID and MSG91_TOKEN_AUTH to .env.local and restart the server.' },
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

    // Call MSG91 Widget API (using standard OTP endpoint with widget auth)
    const msg91Response = await fetch('https://control.msg91.com/api/v5/otp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'widgetId': widgetId,
        'authkey': tokenAuth
      },
      body: JSON.stringify({
        mobile: formattedPhone
      })
    });

    const data = await msg91Response.json();

    // Log the full response for debugging
    console.log('MSG91 Response Status:', msg91Response.status);
    console.log('MSG91 Response Data:', JSON.stringify(data, null, 2));
    console.log('Phone number sent to MSG91:', formattedPhone);
    console.log('All response headers:', Object.fromEntries(msg91Response.headers.entries()));

    if (!msg91Response.ok) {
      return NextResponse.json(
        {
          success: false,
          message: data.message || 'Failed to send OTP',
          error: data.type,
          details: data
        },
        { status: msg91Response.status }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'OTP sent successfully',
      data: {
        request_id: data.request_id,
        phone: formattedPhone
      }
    });

  } catch (error) {
    console.error('Error in send OTP API:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
