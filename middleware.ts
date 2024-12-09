import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  const {
    data: { session },
  } = await supabase.auth.getSession()

  // Check if the route is protected (analytics, tasks, or protected APIs)
  const isProtectedRoute = req.nextUrl.pathname.startsWith('/analytics') || 
                          req.nextUrl.pathname.startsWith('/tasks') ||
                          req.nextUrl.pathname.startsWith('/api/flow') ||
                          req.nextUrl.pathname.startsWith('/api/stats') ||
                          req.nextUrl.pathname.startsWith('/api/timeframe')

  // If accessing a protected route and not authenticated, redirect to home page for pages
  // or return 401 for API routes
  if (isProtectedRoute && !session) {
    if (req.nextUrl.pathname.startsWith('/api/')) {
      return new NextResponse(
        JSON.stringify({ error: 'Authentication required' }),
        { 
          status: 401, 
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }
    const redirectUrl = new URL('/', req.url)
    return NextResponse.redirect(redirectUrl)
  }

  return res
}

// Specify which routes this middleware should run for
export const config = {
  matcher: [
    '/analytics/:path*', 
    '/tasks/:path*',
    '/api/flow/:path*',
    '/api/stats/:path*',
    '/api/timeframe/:path*'
  ]
} 