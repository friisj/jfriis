import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { verifyAuthentication } from '@/lib/webauthn/server'
import { generateSessionToken } from '@/lib/webauthn/session'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { response } = body

    if (!response) {
      return NextResponse.json(
        { error: 'Missing authentication response' },
        { status: 400 }
      )
    }

    // Verify the passkey assertion
    const { email } = await verifyAuthentication(response)

    // Generate a server-side magic link token
    const tokenHash = await generateSessionToken(email)

    // Exchange the token for a Supabase session (sets cookies)
    const supabase = await createClient()
    const { error: otpError } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: 'magiclink',
    })

    if (otpError) {
      console.error('[passkey:authenticate:verify] OTP error:', otpError)
      return NextResponse.json(
        { error: 'Failed to establish session' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      redirectTo: '/admin',
    })
  } catch (error) {
    console.error('[passkey:authenticate:verify]', error)
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 401 }
    )
  }
}
