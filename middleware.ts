/**
 * Next.js Middleware
 *
 * Handles routing logic that needs to run before requests hit route handlers.
 * Specifically, rewrites POST requests to / to the MCP endpoint.
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Claude's connector POSTs directly to the base URL
  // Rewrite to our MCP messages endpoint
  if (request.method === 'POST' && request.nextUrl.pathname === '/') {
    console.log('Middleware: Rewriting POST / to /api/mcp/v1/messages')
    const url = request.nextUrl.clone()
    url.pathname = '/api/mcp/v1/messages'
    return NextResponse.rewrite(url)
  }

  return NextResponse.next()
}

// Only run middleware on the root path
export const config = {
  matcher: '/',
}
