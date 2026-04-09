/**
 * /api/chat — Multi-agent chat endpoint
 *
 * Supports Chief and Luv agents. Agent param determines system prompt,
 * tools, and middleware. Luv gets soul data, memory, windowing; Chief is lighter.
 */

import { NextResponse } from 'next/server';
import { streamText, convertToModelMessages, stepCountIs, type UIMessage, type ModelMessage, type ToolSet } from 'ai';
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
import { setupLuvAgent } from '@/lib/agents/luv-adapter';

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
      thinking = false,
    } = body as {
      messages: UIMessage[];
      chatId?: string;
      latestMessage?: UIMessage;
      modelKey?: string;
      agent?: string;
      thinking?: boolean;
    };

    const convId = chatId;
    let turnCount = 0;

    // Use client messages directly — useChat includes the latest user message
    const messages: UIMessage[] = clientMessages;

    // Persist user message to DB if we have a conversation
    if (convId && latestMessage) {
      const conv = await getAgentConversation(convId);
      if (!conv) {
        return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
      }

      await createAgentMessage({
        conversation_id: convId,
        role: latestMessage.role,
        content: getMessageText(latestMessage),
        parts: latestMessage.parts,
      });

      await incrementAgentTurnCount(convId);
      turnCount = conv.turn_count + 1;
    }

    // Convert to model messages
    let modelMessages = await convertToModelMessages(messages);

    // Agent-specific setup
    let systemPrompt: string;
    let tools: ToolSet;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let providerOptions: any = undefined;

    if (agent === 'luv') {
      const luv = await setupLuvAgent(modelMessages, { modelKey, thinking, convId });
      systemPrompt = luv.systemPrompt;
      tools = luv.tools;
      providerOptions = luv.providerOptions;
      modelMessages = luv.processMessages(modelMessages);
    } else {
      // Chief (default)
      systemPrompt = buildChiefSystemPrompt();
      tools = {
        ...chiefTools,
        web_search: getAnthropic().tools.webSearch_20250305({ maxUses: 3 }),
      } as ToolSet;
    }

    const result = streamText({
      model: getModel(modelKey),
      system: systemPrompt,
      messages: modelMessages,
      tools,
      stopWhen: agent === 'luv' ? stepCountIs(15) : undefined,
      ...(providerOptions ? { providerOptions } : {}),
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
