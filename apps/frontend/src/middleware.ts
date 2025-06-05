import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, extractTokenFromRequest } from './lib/auth'

export function middleware(request: NextRequest) {
  // Protected routes
  const protectedPaths = ['/api/user', '/api/workspaces', '/api/projects', '/api/tasks']
  const isProtectedRoute = protectedPaths.some(path => request.nextUrl.pathname.startsWith(path))

  if (isProtectedRoute) {
    const token = extractTokenFromRequest(request)
    console.log('Token extracted:', token)
    if (!token) {
      return NextResponse.json(
        { error: 'Access denied. No token provided.' },
        { status: 401 }
      )
    }

    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json(
        { error: 'Access denied. Invalid token.' },
        { status: 401 }
      )
    }

    // Add user info to headers for use in API routes
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-user-id', payload.userId)
    requestHeaders.set('x-user-email', payload.email)

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    })
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/api/:path*']
}