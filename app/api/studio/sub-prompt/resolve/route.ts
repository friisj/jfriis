/**
 * Sub-Prompt Resolution API
 *
 * POST /api/studio/sub-prompt/resolve
 * Resolves sub-prompt expressions server-side via LLM calls.
 * Used by E1-E5 spikes for non-streaming resolution.
 */

import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/ai/auth'
import { resolveAll } from '@/lib/studio/sub-prompt/resolver'
import { getAgentMap } from '@/lib/studio/sub-prompt/agents'
import type { SubPromptExpression } from '@/lib/studio/sub-prompt/types'

export async function POST(request: Request) {
  const { user, error: authError } = await requireAuth()
  if (!user) {
    return NextResponse.json({ error: authError }, { status: 401 })
  }

  try {
    const body = await request.json()
    const {
      expressions,
      defaultModelKey = 'claude-haiku',
    } = body as {
      expressions: SubPromptExpression[]
      defaultModelKey?: string
    }

    if (!expressions || !Array.isArray(expressions) || expressions.length === 0) {
      return NextResponse.json(
        { error: 'expressions array is required' },
        { status: 400 },
      )
    }

    if (expressions.length > 10) {
      return NextResponse.json(
        { error: 'Maximum 10 sub-prompts per request' },
        { status: 400 },
      )
    }

    const agentMap = getAgentMap()
    const resolutions = await resolveAll(expressions, defaultModelKey, agentMap, true)

    return NextResponse.json({ resolutions })
  } catch (error) {
    console.error('Sub-prompt resolution error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Resolution failed' },
      { status: 500 },
    )
  }
}
