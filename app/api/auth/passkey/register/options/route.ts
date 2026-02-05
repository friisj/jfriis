import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createRegistrationOptions } from '@/lib/webauthn/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user?.email) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const options = await createRegistrationOptions(user.id, user.email)
    return NextResponse.json(options)
  } catch (error) {
    console.error('[passkey:register:options]', error)
    return NextResponse.json(
      { error: 'Failed to generate registration options' },
      { status: 500 }
    )
  }
}
