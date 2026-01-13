/**
 * Next.js Middleware
 *
 * Handles:
 * 1. Supabase auth session refresh
 * 2. MCP POST rewriting
 */

import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // Claude's connector POSTs directly to the base URL
  // Rewrite to our MCP messages endpoint
  if (request.method === 'POST' && request.nextUrl.pathname === '/') {
    console.log('Middleware: Rewriting POST / to /api/mcp/v1/messages')
    const url = request.nextUrl.clone()
    url.pathname = '/api/mcp/v1/messages'
    return NextResponse.rewrite(url)
  }

  // Create response to pass through
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // Create Supabase client for middleware
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  // Refresh session - this updates the cookies if needed
  await supabase.auth.getUser()

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
