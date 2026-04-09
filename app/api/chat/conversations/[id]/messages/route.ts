import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/ai/auth';
import { getAgentMessages } from '@/lib/agent-chat';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireAuth();
  if (!user?.user) return NextResponse.json([], { status: 401 });

  const { id } = await params;
  const messages = await getAgentMessages(id);
  return NextResponse.json(messages);
}
