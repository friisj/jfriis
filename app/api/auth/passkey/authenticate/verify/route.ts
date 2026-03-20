import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { verifyAuthentication } from '@/lib/webauthn/server'
import { generateSessionToken } from '@/lib/webauthn/session'

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  const { response } = body

  if (!response) {
    return NextResponse.json(
      { error: 'Missing authentication response', step: 'parse' },
      { status: 400 }
    )
  }

  // Step 1: Verify the passkey assertion (WebAuthn ceremony)
  let email: string
  try {
    const result = await verifyAuthentication(response)
    email = result.email
    console.log('[passkey:verify] WebAuthn OK for', email)
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[passkey:verify] WebAuthn failed:', msg)
    return NextResponse.json(
      { error: `WebAuthn verification failed: ${msg}`, step: 'webauthn' },
      { status: 401 }
    )
  }

  // Step 2: Generate a session token and exchange for cookies
  const successResponse = NextResponse.json({
    success: true,
    redirectTo: '/admin',
  })

  let tokenHash: string
  try {
    tokenHash = await generateSessionToken(email)
    console.log('[passkey:verify] Token generated for', email)
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[passkey:verify] Token generation failed:', msg)
    return NextResponse.json(
      { error: `Session token generation failed: ${msg}`, step: 'token' },
      { status: 500 }
    )
  }

  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            console.log('[passkey:verify] Setting', cookiesToSet.length, 'cookies')
            cookiesToSet.forEach(({ name, value, options }) => {
              successResponse.cookies.set(name, value, options)
            })
          },
        },
      }
    )

    const { error: otpError } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: 'magiclink',
    })

    if (otpError) {
      console.error('[passkey:verify] OTP exchange failed:', otpError.message, otpError.status)
      return NextResponse.json(
        { error: `OTP exchange failed: ${otpError.message}`, step: 'otp', code: otpError.status },
        { status: 500 }
      )
    }

    console.log('[passkey:verify] Session established for', email)
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[passkey:verify] Session creation failed:', msg)
    return NextResponse.json(
      { error: `Session creation failed: ${msg}`, step: 'session' },
      { status: 500 }
    )
  }

  return successResponse
}
