import { NextResponse } from 'next/server';
import { generateObject } from 'ai';
import { z } from 'zod';
import { requireAuth } from '@/lib/ai/auth';
import { getModel } from '@/lib/ai/models';
import { getLuvConversationServer, getLuvMessagesServer } from '@/lib/luv-server';
import { updateLuvConversation } from '@/lib/luv';
import type { LuvCompactSummary } from '@/lib/types/luv';

const compactSummarySchema = z.object({
  goals: z
    .array(z.string())
    .describe('Primary goals the user was pursuing in this conversation'),
  decisions: z
    .array(z.string())
    .describe('Key decisions or conclusions reached'),
  important_context: z
    .array(z.string())
    .describe(
      'Facts established about Luv (chassis, soul, appearance, behavior) that should persist into future sessions'
    ),
  open_threads: z
    .array(z.string())
    .describe('Unresolved questions or work-in-progress items left open'),
  carry_forward_summary: z
    .string()
    .describe(
      'A 2–4 paragraph narrative summary written as seed context for a continuation session — orient a fresh conversation, not a transcript recap'
    ),
});

const SYSTEM_PROMPT = `You are analyzing a saved conversation between Jon (the user) and Luv (a parametric character workbench) to produce a compact context summary.

Your task is to identify what was most material to the goals being pursued — not to summarize the conversation as a transcript, but to extract what a fresh continuation session would most benefit from knowing.

Focus on:
- What was being built, refined, or decided about Luv's soul, chassis, or behavior
- Key conclusions and settled questions
- Facts about Luv that were established or changed (parameter values, personality traits, rules, aesthetic decisions)
- Work that was started but not finished

The carry_forward_summary should read as a clear, confident orientation — written in second person to Luv, as if briefing her before resuming. Not "the conversation discussed X" but "You and Jon worked on X; here's where things stand."`;

export async function POST(request: Request) {
  const { user, error } = await requireAuth();
  if (!user) {
    return NextResponse.json({ error }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { conversationId, modelKey = 'claude-opus' } = body as {
      conversationId: string;
      modelKey?: string;
    };

    if (!conversationId) {
      return NextResponse.json({ error: 'conversationId required' }, { status: 400 });
    }

    const [conversation, messages] = await Promise.all([
      getLuvConversationServer(conversationId),
      getLuvMessagesServer(conversationId),
    ]);

    if (messages.length === 0) {
      return NextResponse.json({ error: 'No messages to compact' }, { status: 400 });
    }

    // Format the conversation as a readable transcript for the agent.
    // For long conversations, keep the first 5 + last 40 messages to fit
    // within model context while capturing both the opening context and
    // the most recent work.
    const filtered = messages.filter((m) => m.role === 'user' || m.role === 'assistant');
    let formattedLines: string[];
    if (filtered.length > 50) {
      const head = filtered.slice(0, 5);
      const tail = filtered.slice(-40);
      formattedLines = [
        ...head.map((m) => `${m.role === 'user' ? 'Jon' : 'Luv'}: ${m.content}`),
        `[... ${filtered.length - 45} messages omitted ...]`,
        ...tail.map((m) => `${m.role === 'user' ? 'Jon' : 'Luv'}: ${m.content}`),
      ];
    } else {
      formattedLines = filtered.map((m) => `${m.role === 'user' ? 'Jon' : 'Luv'}: ${m.content}`);
    }
    const transcript = formattedLines.join('\n\n');

    const { object } = await generateObject({
      model: getModel(modelKey),
      schema: compactSummarySchema,
      system: SYSTEM_PROMPT,
      prompt: `Conversation title: "${conversation.title ?? 'Untitled'}"\nMessage count: ${messages.length}\n\n---\n\n${transcript}`,
    });

    const compactSummary: LuvCompactSummary = object;
    const compactSummaryJson = JSON.stringify(compactSummary);

    await updateLuvConversation(conversationId, {
      compact_summary: compactSummaryJson,
      is_compacted: true,
    });

    return NextResponse.json({ success: true, summary: compactSummary });
  } catch (err) {
    console.error('[luv/compact-conversation] Error:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
