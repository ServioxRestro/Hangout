import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('admin-session')
    
    if (!sessionCookie || !sessionCookie.value) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    try {
      const sessionData = JSON.parse(atob(sessionCookie.value))
      
      // Check if session is expired
      if (Date.now() > sessionData.exp) {
        return NextResponse.json(
          { error: 'Session expired' },
          { status: 401 }
        )
      }

      // Ensure only super_admin can access
      if (sessionData.role !== 'super_admin') {
        return NextResponse.json(
          { error: 'Insufficient permissions' },
          { status: 403 }
        )
      }

      return NextResponse.json({ 
        success: true, 
        admin: { 
          id: sessionData.id, 
          email: sessionData.email,
          role: sessionData.role 
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
