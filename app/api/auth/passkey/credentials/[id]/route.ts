import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { deleteCredential, renameCredential } from '@/lib/webauthn/server'

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { id } = await params
    await deleteCredential(user.id, decodeURIComponent(id))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[passkey:credentials:delete]', error)
    const message =
      error instanceof Error ? error.message : 'Failed to delete credential'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { name } = body

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    await renameCredential(user.id, decodeURIComponent(id), name.trim())

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[passkey:credentials:rename]', error)
    const message =
      error instanceof Error ? error.message : 'Failed to rename credential'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
