import { NextRequest, NextResponse } from 'next/server'
import { loginAdmin, loginStaff } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Try admin login first
    const adminResult = await loginAdmin(email, password)
    if (adminResult.success) {
      return NextResponse.json({
        success: true,
        user: adminResult.user
      })
    }

    // Try staff login
    const staffResult = await loginStaff(email, password)
    if (staffResult.success) {
      return NextResponse.json({
        success: true,
        user: staffResult.user
      })
    }

    return NextResponse.json(
      { error: 'Invalid email or password' },
      { status: 401 }
    )
  } catch (error) {
    console.error('Authentication error:', error)
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    )
  }
}