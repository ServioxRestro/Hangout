import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { userId, email, role, name } = await request.json()
    console.log('Creating session for:', { userId, email, role, name });

    if (!userId || !email || !role) {
      console.log('Missing required fields for session creation');
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Create session data
    const sessionData = {
      id: userId,
      email,
      role,
      name: name || null,
      exp: Date.now() + (24 * 60 * 60 * 1000) // 24 hours expiration
    }

    console.log('Session data created:', sessionData);

    const sessionCookie = btoa(JSON.stringify(sessionData))

    const response = NextResponse.json({ success: true })

    // Set httpOnly cookie
    response.cookies.set({
      name: 'admin-session',
      value: sessionCookie,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60, // 24 hours
      path: '/'
    })

    console.log('Session cookie set successfully for:', email);
    return response
  } catch (error) {
    return NextResponse.json(
      { error: 'Session creation failed' },
      { status: 500 }
    )
  }
}