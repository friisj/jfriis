import { NextResponse } from 'next/server';
import { streamText } from 'ai';
import { requireAuth } from '@/lib/ai/auth';
import { checkAIRateLimit, getAIRateLimitHeaders } from '@/lib/ai/rate-limit';
import { getModel } from '@/lib/ai/models';
import { composeSoulSystemPrompt } from '@/lib/luv-prompt-composer';
import { getLuvCharacterServer } from '@/lib/luv-server';
import { luvTools } from '@/lib/luv-tools';

export async function POST(request: Request) {
  const { user, error } = await requireAuth();
  if (!user) {
    return NextResponse.json({ error }, { status: 401 });
  }

  const rateLimit = await checkAIRateLimit(user.id);
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429, headers: getAIRateLimitHeaders(rateLimit) }
    );
  }

  const body = await request.json();
  const { messages, modelKey = 'claude-sonnet' } = body as {
    messages: Array<{ role: 'user' | 'assistant'; content: string }>;
    modelKey?: string;
  };

  if (!messages || messages.length === 0) {
    return NextResponse.json({ error: 'Messages required' }, { status: 400 });
  }

  // Load soul from DB server-side
  const character = await getLuvCharacterServer();
  const soulData = character?.soul_data ?? {};
  const systemPrompt = composeSoulSystemPrompt(soulData);

  const result = streamText({
    model: getModel(modelKey),
    system: systemPrompt,
    messages,
    tools: luvTools,
  });

  return result.toUIMessageStreamResponse();
}
