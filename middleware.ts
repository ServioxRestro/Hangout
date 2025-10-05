import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const host = request.headers.get('host') || ''
  
  // Handle admin routes
  if (request.nextUrl.pathname.startsWith('/admin')) {

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

        // Allow super_admin, manager, and waiter roles
        const allowedRoles = ['super_admin', 'manager', 'waiter']
        if (!allowedRoles.includes(sessionData.role)) {
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
