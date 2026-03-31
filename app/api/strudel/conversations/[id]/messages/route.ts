import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/ai/auth'
import { getStrudelMessages } from '@/lib/strudel/strudel-server'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireAuth()
  if (!user) return NextResponse.json({ error }, { status: 401 })

  const { id } = await params
  const messages = await getStrudelMessages(id)
  return NextResponse.json(messages)
}
