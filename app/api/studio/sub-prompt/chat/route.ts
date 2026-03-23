/**
 * Sub-Prompt Streaming Chat API
 *
 * POST /api/studio/sub-prompt/chat
 * Full chat flow: parse latest message for sub-prompts → resolve → expand → stream parent response.
 * Used by E6 (full integration) spike.
 */

import { NextResponse } from 'next/server'
import { streamText, convertToModelMessages, type UIMessage } from 'ai'
import { requireAuth } from '@/lib/ai/auth'
import { getModel } from '@/lib/ai/models'
import { parseSubPrompts, replaceExpressions } from '@/lib/studio/sub-prompt/parser'
import { resolveAll } from '@/lib/studio/sub-prompt/resolver'
import { getAgentMap } from '@/lib/studio/sub-prompt/agents'
import type { ResolutionTrace } from '@/lib/studio/sub-prompt/types'

export async function POST(request: Request) {
  const { user, error: authError } = await requireAuth()
  if (!user) {
    return NextResponse.json({ error: authError }, { status: 401 })
  }

  try {
    const body = await request.json()
    const {
      messages,
      modelKey = 'claude-sonnet',
    } = body as {
      messages: UIMessage[]
      modelKey?: string
    }

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: 'messages array is required' },
        { status: 400 },
      )
    }

    // Extract latest user message text
    const lastMessage = messages[messages.length - 1]
    const lastUserText = lastMessage?.parts
      ?.filter((p): p is { type: 'text'; text: string } => p.type === 'text')
      .map(p => p.text)
      .join('') ?? ''

    // Parse sub-prompts from the latest message
    const expressions = parseSubPrompts(lastUserText, 'bracket', true)

    let expandedText = lastUserText
    let trace: ResolutionTrace | null = null

    if (expressions.length > 0) {
      const startTime = performance.now()
      const agentMap = getAgentMap()

      // Flatten nested expressions for resolution (resolve innermost first)
      const flatExpressions = flattenExpressions(expressions)
      const resolutions = await resolveAll(flatExpressions, 'claude-haiku', agentMap, true)

      // Build resolution map and replace
      const resolutionMap = new Map(
        resolutions.map(r => [r.expressionId, r.resolvedValue]),
      )
      expandedText = replaceExpressions(lastUserText, flatExpressions, resolutionMap)

      trace = {
        id: `trace-${Date.now()}`,
        originalPrompt: lastUserText,
        expandedPrompt: expandedText,
        expressions,
        resolutions,
        parentModelKey: modelKey,
        totalLatencyMs: Math.round(performance.now() - startTime),
        timestamp: Date.now(),
      }
    }

    // Build messages for parent model with expanded text
    const expandedUIMessages: UIMessage[] = [
      ...messages.slice(0, -1),
      {
        ...lastMessage,
        parts: [{ type: 'text' as const, text: expandedText }],
      },
    ]

    // Convert UI messages to model messages for streamText
    const modelMessages = await convertToModelMessages(expandedUIMessages)

    const result = streamText({
      model: getModel(modelKey),
      messages: modelMessages,
    })

    // Return streaming response with trace as a custom header
    const response = result.toUIMessageStreamResponse()

    // Attach trace as a custom header (JSON-encoded) for the client to read
    if (trace) {
      response.headers.set('x-sub-prompt-trace', JSON.stringify(trace))
    }

    return response
  } catch (error) {
    console.error('Sub-prompt chat error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Chat failed' },
      { status: 500 },
    )
  }
}

/** Flatten nested expressions depth-first (innermost first for resolution) */
function flattenExpressions(
  expressions: import('@/lib/studio/sub-prompt/types').SubPromptExpression[],
): import('@/lib/studio/sub-prompt/types').SubPromptExpression[] {
  const result: import('@/lib/studio/sub-prompt/types').SubPromptExpression[] = []
  for (const expr of expressions) {
    if (expr.children) {
      result.push(...flattenExpressions(expr.children))
    }
    result.push(expr)
  }
  return result
}
