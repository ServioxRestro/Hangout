import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { adminId, email } = await request.json()

    if (!adminId || !email) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Create session data
    const sessionData = {
      id: adminId,
      email,
      role: 'super_admin',
      exp: Date.now() + (24 * 60 * 60 * 1000) // 24 hours expiration
    }

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

    return response
  } catch (error) {
    return NextResponse.json(
      { error: 'Session creation failed' },
      { status: 500 }
    )
  }
}