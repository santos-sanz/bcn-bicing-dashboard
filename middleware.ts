import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  const {
    data: { session },
  } = await supabase.auth.getSession()

  // Check if the route is protected (analytics or tasks)
  const isProtectedRoute = req.nextUrl.pathname.startsWith('/analytics') || 
                          req.nextUrl.pathname.startsWith('/tasks')

  // If accessing a protected route and not authenticated, redirect to home page
  if (isProtectedRoute && !session) {
    const redirectUrl = new URL('/', req.url)
    return NextResponse.redirect(redirectUrl)
  }

  return res
}

// Specify which routes this middleware should run for
export const config = {
  matcher: ['/analytics/:path*', '/tasks/:path*']
} 