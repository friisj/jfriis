import { NextResponse } from 'next/server';
import { streamText } from 'ai';
import { requireAuth } from '@/lib/ai/auth';
import { checkAIRateLimit, getAIRateLimitHeaders } from '@/lib/ai/rate-limit';
import { getModel } from '@/lib/ai/models';
import { composeSoulSystemPrompt } from '@/lib/luv-prompt-composer';
import type { LuvSoulData } from '@/lib/types/luv';

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
  const {
    messages,
    soulData,
    modelKey = 'claude-sonnet',
  } = body as {
    messages: Array<{ role: 'user' | 'assistant'; content: string }>;
    soulData: LuvSoulData;
    modelKey?: string;
  };

  if (!messages || messages.length === 0) {
    return NextResponse.json({ error: 'Messages required' }, { status: 400 });
  }

  const systemPrompt = composeSoulSystemPrompt(soulData || {});

  const result = streamText({
    model: getModel(modelKey),
    system: systemPrompt,
    messages,
  });

  return result.toTextStreamResponse();
}
