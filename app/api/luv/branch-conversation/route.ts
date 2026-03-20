import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/ai/auth';
import { getLuvConversationServer, getLuvMessagesServer } from '@/lib/luv-server';
import { createLuvConversation } from '@/lib/luv';

export async function POST(request: Request) {
  const { user, error } = await requireAuth();
  if (!user) {
    return NextResponse.json({ error }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { conversationId } = body as { conversationId: string };

    if (!conversationId) {
      return NextResponse.json({ error: 'conversationId required' }, { status: 400 });
    }

    const source = await getLuvConversationServer(conversationId);

    // If the source has a compact summary, use it as seed context.
    // Otherwise, build a lightweight seed from the last few messages.
    let seedSummary = source.compact_summary;

    if (!seedSummary) {
      const messages = await getLuvMessagesServer(conversationId);
      const recent = messages
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .slice(-10);

      if (recent.length > 0) {
        seedSummary = JSON.stringify({
          carry_forward_summary: `Branched from "${source.title ?? 'Untitled'}". Recent context follows.`,
          goals: [],
          decisions: [],
          important_context: recent.map(
            (m) => `${m.role === 'user' ? 'Jon' : 'Luv'}: ${m.content.slice(0, 200)}`
          ),
          open_threads: [],
        });
      }
    }

    const branch = await createLuvConversation({
      title: `Branch: ${source.title ?? 'Untitled'}`,
      soul_snapshot: source.soul_snapshot,
      model: source.model,
      parent_conversation_id: source.id,
      compact_summary: seedSummary ?? undefined,
    });

    return NextResponse.json({ conversationId: branch.id });
  } catch (err) {
    console.error('[luv/branch-conversation] Error:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
