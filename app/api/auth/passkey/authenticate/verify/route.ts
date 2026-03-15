import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { verifyAuthentication } from '@/lib/webauthn/server'
import { generateSessionToken } from '@/lib/webauthn/session'

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  const { response } = body

  if (!response) {
    return NextResponse.json(
      { error: 'Missing authentication response' },
      { status: 400 }
    )
  }

  // Step 1: Verify the passkey assertion (WebAuthn ceremony)
  let email: string
  try {
    const result = await verifyAuthentication(response)
    email = result.email
  } catch (error) {
    console.error('[passkey:verify] WebAuthn verification failed:', error)
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 401 }
    )
  }

  // Step 2: Generate a session token and set auth cookies
  try {
    const tokenHash = await generateSessionToken(email)

    const supabase = await createClient()
    const { error: otpError } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: 'magiclink',
    })

    if (otpError) {
      console.error('[passkey:verify] OTP exchange failed:', otpError)
      return NextResponse.json(
        { error: 'Failed to establish session' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('[passkey:verify] Session creation failed:', error)
    return NextResponse.json(
      { error: 'Failed to establish session' },
      { status: 500 }
    )
  }

  return NextResponse.json({
    success: true,
    redirectTo: '/admin',
  })
}
