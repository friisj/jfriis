import { NextResponse } from 'next/server'
import {
  streamText,
  convertToModelMessages,
  stepCountIs,
  type UIMessage,
  type ToolSet,
} from 'ai'
import { requireAuth } from '@/lib/ai/auth'
import { checkAIRateLimit, getAIRateLimitHeaders } from '@/lib/ai/rate-limit'
import { getModel } from '@/lib/ai/models'
import { composeStrudelSystemPrompt } from '@/lib/strudel/strudel-prompt'
import {
  getStrudelConversation,
  getStrudelMessages,
  createStrudelMessage,
  incrementStrudelTurnCount,
} from '@/lib/strudel/strudel-server'
import { createStrudelTools } from '@/lib/strudel/strudel-tools'

export async function POST(request: Request) {
  const { user, error } = await requireAuth()
  if (!user) {
    return NextResponse.json({ error }, { status: 401 })
  }

  const rateLimit = await checkAIRateLimit(user.id)
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429, headers: getAIRateLimitHeaders(rateLimit) }
    )
  }

  try {
    const body = await request.json()
    const {
      chatId,
      latestMessage,
      modelKey = 'claude-sonnet',
      currentCode = '',
      patternSummary = '',
      lastError = null,
    } = body as {
      chatId?: string
      latestMessage?: UIMessage
      modelKey?: string
      currentCode?: string
      patternSummary?: string
      lastError?: string | null
    }

    if (!chatId || !latestMessage) {
      return NextResponse.json(
        { error: 'chatId and latestMessage required' },
        { status: 400 }
      )
    }

    // Load conversation history from DB
    const [, dbMessages] = await Promise.all([
      getStrudelConversation(chatId),
      getStrudelMessages(chatId),
    ])

    // Persist user message (skip if last DB message is already a user message — dedup)
    const lastDbMessage = dbMessages[dbMessages.length - 1]
    if (!lastDbMessage || lastDbMessage.role !== 'user') {
      await createStrudelMessage({
        conversation_id: chatId,
        role: latestMessage.role,
        content:
          latestMessage.parts
            ?.filter(
              (p): p is { type: 'text'; text: string } => p.type === 'text'
            )
            .map((p) => p.text)
            .join('\n') || '',
      })
    }

    await incrementStrudelTurnCount(chatId)

    // Reconstruct message history, collapsing consecutive same-role messages
    const historicalMessages: UIMessage[] = dbMessages
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({
        id: m.id,
        role: m.role as 'user' | 'assistant',
        parts: m.parts
          ? (m.parts as Array<{ type: string; text?: string }>)
              .filter(
                (p): p is { type: 'text'; text: string } =>
                  p.type === 'text' && !!p.text
              )
              .map((p) => ({ type: 'text' as const, text: p.text }))
          : [{ type: 'text' as const, text: m.content }],
        createdAt: new Date(m.created_at),
      }))
      .filter((m, i, arr) => {
        const next = arr[i + 1]
        return !next || next.role !== m.role
      })

    const messages: UIMessage[] = [...historicalMessages, latestMessage]

    // Compose system prompt with current editor state
    const systemPrompt = composeStrudelSystemPrompt({
      currentCode,
      patternSummary,
      lastError,
    })

    // Convert to model messages
    let modelMessages
    try {
      modelMessages = await convertToModelMessages(messages)
    } catch {
      // Fallback: text-only parts
      const textOnly: UIMessage[] = messages
        .map((m) => ({
          ...m,
          parts: m.parts
            .filter(
              (p): p is { type: 'text'; text: string } => p.type === 'text'
            )
            .map((p) => ({ type: 'text' as const, text: p.text })),
        }))
        .filter((m) => m.parts.length > 0)
      modelMessages = await convertToModelMessages(textOnly)
    }

    // Build tools with conversation context
    const tools = createStrudelTools(chatId)

    const isClaudeModel = modelKey.startsWith('claude-')
    const providerOptions = isClaudeModel
      ? {
          anthropic: {
            contextManagement: {
              edits: [
                {
                  type: 'clear_tool_uses_20250919' as const,
                  trigger: { type: 'input_tokens' as const, value: 60000 },
                  keep: { type: 'tool_uses' as const, value: 3 },
                  clearAtLeast: { type: 'input_tokens' as const, value: 5000 },
                },
              ],
            },
          },
        }
      : undefined

    const result = streamText({
      model: getModel(modelKey),
      system: systemPrompt,
      messages: modelMessages,
      tools: tools as unknown as ToolSet,
      stopWhen: stepCountIs(10),
      providerOptions,
      onFinish: async (event) => {
        try {
          await createStrudelMessage({
            conversation_id: chatId,
            role: 'assistant',
            content: event.text,
            parts: event.steps.flatMap((step) => {
              const parts: object[] = []
              if (step.text) {
                parts.push({ type: 'text', text: step.text })
              }
              for (const tc of step.toolCalls) {
                const call = tc as Record<string, unknown>
                parts.push({
                  type: `tool-${call.toolName}`,
                  toolCallId: call.toolCallId,
                  toolName: call.toolName,
                  args: call.args,
                })
              }
              for (const tr of step.toolResults) {
                const res = tr as Record<string, unknown>
                parts.push({
                  type: `tool-${res.toolName}`,
                  toolCallId: res.toolCallId,
                  toolName: res.toolName,
                  result: res.result,
                })
              }
              return parts
            }),
          })
        } catch (err) {
          console.error('[strudel/chat] Failed to persist assistant message:', err)
        }
      },
    })

    return result.toUIMessageStreamResponse()
  } catch (err) {
    console.error('[strudel/chat] Error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
