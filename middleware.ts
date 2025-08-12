import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Define protected paths that require authentication
const protectedPaths = [
  '/dashboard',
  '/direct-hire',
  '/job-fairs',
  '/gov-to-gov',
  '/balik-manggagawa',
  '/information-sheet',
  '/user-management',
  '/profile'
] as const

// Define public paths that don't require authentication
const publicPaths = ['/login', '/register', '/forgot-password'] as const

type ProtectedPath = typeof protectedPaths[number]
type PublicPath = typeof publicPaths[number]

export function middleware(request: NextRequest) {
  const authToken = request.cookies.get('bb_auth_token')
  const userCookie = request.cookies.get('bb_user')
  const { pathname } = request.nextUrl

  // Check if the path is protected
  const isProtectedPath = protectedPaths.some(path => pathname.startsWith(path))
  const isPublicPath = publicPaths.some(path => pathname === path)

  // Check if user is authenticated (both token and user data must exist)
  const isAuthenticated = authToken && userCookie

  // If path is protected and user is not authenticated, redirect to login
  if (isProtectedPath && !isAuthenticated) {
    const url = new URL('/login', request.url)
    url.searchParams.set('from', pathname)
    return NextResponse.redirect(url)
  }

  // If user is authenticated and tries to access public pages, redirect to dashboard
  if (isPublicPath && isAuthenticated) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
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
     * - public folder
     */
    '/((?!api|_next/static|_next/image|favicon.ico|public).*)',
  ],
} 