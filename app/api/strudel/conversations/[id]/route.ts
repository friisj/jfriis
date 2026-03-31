import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/ai/auth'
import { getStrudelConversation } from '@/lib/strudel/strudel-server'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireAuth()
  if (!user) return NextResponse.json({ error }, { status: 401 })

  const { id } = await params
  const conv = await getStrudelConversation(id)
  return NextResponse.json(conv)
}
