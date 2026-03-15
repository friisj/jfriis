import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/ai/auth';
import { getLuvConversationServer } from '@/lib/luv-server';
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

    if (!source.compact_summary) {
      return NextResponse.json(
        { error: 'Source conversation must be compacted before branching' },
        { status: 400 }
      );
    }

    const branch = await createLuvConversation({
      title: `Branch: ${source.title ?? 'Untitled'}`,
      soul_snapshot: source.soul_snapshot,
      model: source.model,
      parent_conversation_id: source.id,
      compact_summary: source.compact_summary,
    });

    return NextResponse.json({ conversationId: branch.id });
  } catch (err) {
    console.error('[luv/branch-conversation] Error:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
