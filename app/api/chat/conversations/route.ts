import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/ai/auth';
import { createAgentConversation, listAgentConversations } from '@/lib/agent-chat';

export async function POST(req: Request) {
  const user = await requireAuth();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { agent, title, model } = await req.json();

  const conv = await createAgentConversation({
    agent: agent ?? 'chief',
    title,
    model,
  });

  return NextResponse.json(conv);
}

export async function GET(req: Request) {
  const user = await requireAuth();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const agent = searchParams.get('agent') ?? 'chief';
  const limit = parseInt(searchParams.get('limit') ?? '20');

  const conversations = await listAgentConversations(agent, limit);
  return NextResponse.json(conversations);
}
