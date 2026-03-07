import { NextResponse } from 'next/server';
import { streamText, convertToModelMessages, stepCountIs, type UIMessage, type ToolSet } from 'ai';
import { requireAuth } from '@/lib/ai/auth';
import { checkAIRateLimit, getAIRateLimitHeaders } from '@/lib/ai/rate-limit';
import { getModel } from '@/lib/ai/models';
import { composeSoulSystemPrompt } from '@/lib/luv-prompt-composer';
import { getLuvCharacterServer, getLuvMemoriesServer } from '@/lib/luv-server';
import { getChassisModulesServer } from '@/lib/luv-chassis-server';
import { luvTools } from '@/lib/luv-tools';
import { getAnthropic } from '@/lib/ai/providers';
import type { ChassisModuleSummary } from '@/lib/luv/soul-layers';

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

  try {
    const body = await request.json();
    const { messages, modelKey = 'claude-sonnet' } = body as {
      messages: UIMessage[];
      modelKey?: string;
    };

    if (!messages || messages.length === 0) {
      return NextResponse.json({ error: 'Messages required' }, { status: 400 });
    }

    // Load soul + chassis modules + memories server-side
    const [character, chassisModules, memories] = await Promise.all([
      getLuvCharacterServer(),
      getChassisModulesServer(),
      getLuvMemoriesServer(true),
    ]);
    const soulData = character?.soul_data ?? {};
    const chassisModuleSummaries: ChassisModuleSummary[] = chassisModules.map((m) => ({
      slug: m.slug,
      name: m.name,
      category: m.category,
      paramCount: Object.keys(m.parameters ?? {}).length,
    }));
    const memoryItems = memories.map((m) => ({
      content: m.content,
      category: m.category,
    }));
    const systemPrompt = composeSoulSystemPrompt(soulData, {
      chassisModuleSummaries,
      memories: memoryItems,
    });

    // Convert UI-format messages (from useChat) to model-format messages (for streamText)
    const modelMessages = await convertToModelMessages(messages);

    const result = streamText({
      model: getModel(modelKey),
      system: systemPrompt,
      messages: modelMessages,
      tools: {
        ...luvTools,
        web_search: getAnthropic().tools.webSearch_20250305({ maxUses: 3 }),
      } as ToolSet,
      stopWhen: stepCountIs(5),
    });

    return result.toUIMessageStreamResponse();
  } catch (err) {
    console.error('[luv/chat] Error:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
