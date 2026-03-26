import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/ai/auth';
import { registerHeartbeatTrigger } from '@/lib/luv-heartbeat';

export async function POST(request: Request) {
  const { user, error } = await requireAuth();
  if (!user) {
    return NextResponse.json({ error }, { status: 401 });
  }

  const { conversationId } = (await request.json()) as { conversationId?: string };

  const result = await registerHeartbeatTrigger(
    user.id,
    conversationId ?? null,
    'conversation_lull',
    { source: 'client_timer' },
    "It's been a while since we last spoke — is there anything from our conversation you'd like to revisit, or something new on your mind?",
  );

  return NextResponse.json(result);
}
