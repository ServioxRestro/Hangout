import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    console.log('Verify API: Checking session...');
    const sessionCookie = request.cookies.get('admin-session')

    if (!sessionCookie || !sessionCookie.value) {
      console.log('Verify API: No session cookie found');
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    console.log('Verify API: Session cookie exists, decoding...');
    try {
      const sessionData = JSON.parse(atob(sessionCookie.value))
      console.log('Verify API: Session data:', {
        email: sessionData.email,
        role: sessionData.role,
        expired: Date.now() > sessionData.exp
      });
      
      // Check if session is expired
      if (Date.now() > sessionData.exp) {
        console.log('Verify API: Session expired');
        return NextResponse.json(
          { error: 'Session expired' },
          { status: 401 }
        )
      }

      // Allow super_admin, waiter, and manager roles
      const allowedRoles = ['super_admin', 'waiter', 'manager']
      if (!allowedRoles.includes(sessionData.role)) {
        console.log('Verify API: Role not allowed:', sessionData.role);
        return NextResponse.json(
          { error: 'Insufficient permissions' },
          { status: 403 }
        )
      }

      console.log('Verify API: Session valid, returning user data');
      return NextResponse.json({
        success: true,
        user: {
          id: sessionData.id,
          email: sessionData.email,
          role: sessionData.role,
          name: sessionData.name || null
        }
      })
    } catch {
      return NextResponse.json(
        { error: 'Invalid session' },
        { status: 401 }
      )
    }
  } catch (error) {
    return NextResponse.json(
      { error: 'Verification failed' },
      { status: 500 }
    )
  }
}
