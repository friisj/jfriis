import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { verifyRegistration } from '@/lib/webauthn/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const body = await request.json()
    const { response, name } = body

    if (!response) {
      return NextResponse.json(
        { error: 'Missing registration response' },
        { status: 400 }
      )
    }

    const credential = await verifyRegistration(user.id, response, name)

    return NextResponse.json({
      success: true,
      credential,
    })
  } catch (error) {
    console.error('[passkey:register:verify]', error)
    const message =
      error instanceof Error ? error.message : 'Registration failed'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
