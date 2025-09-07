import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const host = request.headers.get('host') || ''
  
  // Handle admin subdomain routing
  if (host.includes('admin') || request.nextUrl.pathname.startsWith('/admin')) {
    // In production, restrict admin access to admin subdomain only
    if (process.env.NODE_ENV === 'production' && !host.includes('admin')) {
      return NextResponse.json(
        { error: 'Unauthorized: Admin access restricted to admin subdomain' },
        { status: 403 }
      )
    }

    // Check if accessing admin routes (except login)
    if (request.nextUrl.pathname.startsWith('/admin') && 
        !request.nextUrl.pathname.startsWith('/admin/login')) {
      
      const sessionCookie = request.cookies.get('admin-session')
      
      if (!sessionCookie || !sessionCookie.value) {
        return NextResponse.redirect(new URL('/admin/login', request.url))
      }

      try {
        const sessionData = JSON.parse(atob(sessionCookie.value))
        
        // Check if session is expired
        if (Date.now() > sessionData.exp) {
          const response = NextResponse.redirect(new URL('/admin/login', request.url))
          response.cookies.delete('admin-session')
          return response
        }

        // Ensure only super_admin can access
        if (sessionData.role !== 'super_admin') {
          const response = NextResponse.redirect(new URL('/admin/login', request.url))
          response.cookies.delete('admin-session')
          return response
        }
      } catch {
        const response = NextResponse.redirect(new URL('/admin/login', request.url))
        response.cookies.delete('admin-session')
        return response
      }
    }

    // Redirect to admin login if accessing /admin without session
    if (request.nextUrl.pathname === '/admin') {
      const sessionCookie = request.cookies.get('admin-session')
      
      if (!sessionCookie || !sessionCookie.value) {
        return NextResponse.redirect(new URL('/admin/login', request.url))
      }
      
      return NextResponse.redirect(new URL('/admin/dashboard', request.url))
    }
  } 
  // Block admin routes on non-admin domains in production
  else if (request.nextUrl.pathname.startsWith('/admin') && process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Not Found' },
      { status: 404 }
    )
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
