import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/ai/auth'
import { createStrudelConversation } from '@/lib/strudel/strudel-server'

export async function POST(request: Request) {
  const { user, error } = await requireAuth()
  if (!user) return NextResponse.json({ error }, { status: 401 })

  const body = await request.json()
  const { model = 'claude-sonnet' } = body as { model?: string }

  const conv = await createStrudelConversation({ model })
  return NextResponse.json(conv)
}
