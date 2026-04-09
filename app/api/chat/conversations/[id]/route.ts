import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/ai/auth';
import { getAgentConversation } from '@/lib/agent-chat';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireAuth();
  if (!user?.user) return NextResponse.json(null, { status: 401 });

  const { id } = await params;
  const conv = await getAgentConversation(id);
  if (!conv) return NextResponse.json(null, { status: 404 });

  return NextResponse.json(conv);
}
