import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') ?? '/admin'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Successful auth - redirect to intended destination
      return NextResponse.redirect(new URL(next, requestUrl.origin))
    }

    console.error('Auth callback error:', error.message)
  }

  // Auth failed - redirect to login with error
  return NextResponse.redirect(new URL('/login?error=auth_failed', requestUrl.origin))
}
