import { NextResponse } from 'next/server'
import { createAuthenticationOptions } from '@/lib/webauthn/server'

export async function GET() {
  try {
    const options = await createAuthenticationOptions()
    return NextResponse.json(options)
  } catch (error) {
    console.error('[passkey:authenticate:options]', error)
    return NextResponse.json(
      { error: 'Failed to generate authentication options' },
      { status: 500 }
    )
  }
}
