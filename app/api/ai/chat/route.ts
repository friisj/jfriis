/**
 * AI Chat API Route
 *
 * POST /api/ai/chat
 * Simple chat completion endpoint for studio spike prototypes.
 * Returns the full text response (non-streaming) as JSON.
 *
 * Security:
 * - Requires authentication via Supabase session
 */

import { NextResponse } from 'next/server'
import { generateText } from 'ai'
import { getModel } from '@/lib/ai/models'
import { requireAuth } from '@/lib/ai/auth'

export async function POST(request: Request) {
  const { user, error: authError } = await requireAuth()
  if (!user) {
    return NextResponse.json({ error: authError }, { status: 401 })
  }

  try {
    const { messages, modelKey = 'claude-sonnet' } = await request.json()

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'messages array is required' }, { status: 400 })
    }

    const result = await generateText({
      model: getModel(modelKey),
      messages,
    })

    return NextResponse.json({ content: result.text })
  } catch (error) {
    console.error('AI chat error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'AI chat failed' },
      { status: 500 }
    )
  }
}
