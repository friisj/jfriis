/**
 * Auth Callback Handler
 *
 * Handles OAuth and magic link callbacks from Supabase
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (code) {
    await supabase.auth.exchangeCodeForSession(code)
  }

  // Redirect to admin after successful auth
  return NextResponse.redirect(new URL('/admin', request.url))
}
