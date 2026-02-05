import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { listCredentials } from '@/lib/webauthn/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const credentials = await listCredentials(user.id)
    return NextResponse.json({ credentials })
  } catch (error) {
    console.error('[passkey:credentials]', error)
    return NextResponse.json(
      { error: 'Failed to list credentials' },
      { status: 500 }
    )
  }
}
