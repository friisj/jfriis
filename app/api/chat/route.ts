/**
 * /api/chat — Multi-agent chat endpoint
 *
 * Currently supports Chief agent. Designed for future agent additions.
 * Reuses patterns from Luv's chat route but with the shared agent_conversations tables.
 */

import { NextResponse } from 'next/server';
import { streamText, convertToModelMessages, type UIMessage, type ModelMessage, type ToolSet } from 'ai';
import { requireAuth } from '@/lib/ai/auth';
import { getModel } from '@/lib/ai/models';
import { getAnthropic } from '@/lib/ai/providers';
import {
  getAgentConversation,
  getAgentMessages,
  createAgentMessage,
  incrementAgentTurnCount,
  updateAgentConversationTitle,
} from '@/lib/agent-chat';
import { buildChiefSystemPrompt, chiefTools, CHIEF_AGENT_ID } from '@/lib/agents/chief';

export const maxDuration = 120;

export async function POST(req: Request) {
  const user = await requireAuth();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      messages: clientMessages,
      chatId,
      latestMessage,
      modelKey = 'claude-sonnet',
      agent = CHIEF_AGENT_ID,
    } = body as {
      messages: UIMessage[];
      chatId?: string;
      latestMessage?: UIMessage;
      modelKey?: string;
      agent?: string;
    };

    const convId = chatId;
    let turnCount = 0;
    let messages: UIMessage[] = clientMessages;

    // If resuming an existing conversation, load history from DB
    if (convId) {
      const conv = await getAgentConversation(convId);
      if (!conv) {
        return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
      }

      // Persist the latest user message
      if (latestMessage) {
        await createAgentMessage({
          conversation_id: convId,
          role: latestMessage.role,
          content: getMessageText(latestMessage),
          parts: latestMessage.parts,
        });
      }

      await incrementAgentTurnCount(convId);
      turnCount = conv.turn_count + 1;

      // Load full history
      const dbMessages = await getAgentMessages(convId);
      const historicalMessages = dbMessages
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .map((m) => ({
          id: m.id,
          role: m.role as 'user' | 'assistant',
          parts: m.parts ? (m.parts as UIMessage['parts']) : [{ type: 'text' as const, text: m.content ?? '' }],
        })) as UIMessage[];

      if (latestMessage) {
        messages = [...historicalMessages, latestMessage];
      } else {
        messages = historicalMessages;
      }
    }

    // Build system prompt based on agent
    const systemPrompt = agent === CHIEF_AGENT_ID
      ? buildChiefSystemPrompt()
      : buildChiefSystemPrompt(); // fallback to chief for now

    // Convert to model messages
    const modelMessages = await convertToModelMessages(messages);

    // Select tools based on agent
    const tools = {
      ...chiefTools,
      web_search: getAnthropic().tools.webSearch_20250305({ maxUses: 3 }),
    } as ToolSet;

    const result = streamText({
      model: getModel(modelKey),
      system: systemPrompt,
      messages: modelMessages,
      tools,
      onFinish: async (event) => {
        if (!convId) return;
        try {
          await createAgentMessage({
            conversation_id: convId,
            role: 'assistant',
            content: event.text,
            parts: serializeParts(event),
          });

          // Generate title after first exchange
          if (turnCount === 1 && latestMessage) {
            generateTitle(convId, getMessageText(latestMessage), event.text).catch(() => {});
          }
        } catch (err) {
          console.error('[chat] Failed to persist assistant message:', err);
        }
      },
    });

    return result.toUIMessageStreamResponse();
  } catch (err) {
    console.error('[chat] Error:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getMessageText(msg: UIMessage): string {
  for (const part of msg.parts) {
    if (part.type === 'text') return (part as { text: string }).text;
  }
  return '';
}

function serializeParts(event: { steps: Array<{ text?: string; reasoning?: unknown; toolCalls?: unknown[]; toolResults?: unknown[] }> }): unknown {
  const parts: unknown[] = [];
  for (const step of event.steps) {
    if (step.text) {
      parts.push({ type: 'text', text: step.text });
    }
    if (step.toolCalls) {
      for (const tc of step.toolCalls) {
        parts.push(tc);
      }
    }
    if (step.toolResults) {
      for (const tr of step.toolResults) {
        parts.push(tr);
      }
    }
  }
  return parts.length > 0 ? parts : null;
}

async function generateTitle(conversationId: string, userMsg: string, assistantMsg: string) {
  try {
    const { generateText } = await import('ai');
    const { getGoogle } = await import('@/lib/ai/providers');
    const google = getGoogle();

    const { text } = await generateText({
      model: google('gemini-2.5-flash-lite'),
      maxOutputTokens: 30,
      temperature: 0.3,
      system: 'Generate a short, descriptive title (3-8 words) for this conversation. No quotes, no punctuation at the end.',
      prompt: `User: ${userMsg.slice(0, 300)}\n\nAssistant: ${assistantMsg.slice(0, 300)}`,
    });

    const title = text.trim().replace(/^["']|["']$/g, '').slice(0, 80);
    if (title) {
      await updateAgentConversationTitle(conversationId, title);
    }
  } catch (err) {
    console.error('[chat] Title generation failed:', err);
  }
}
