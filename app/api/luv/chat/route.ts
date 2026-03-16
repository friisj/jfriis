import { NextResponse } from 'next/server';
import { streamText, convertToModelMessages, stepCountIs, type UIMessage, type ToolSet, type ModelMessage } from 'ai';
import { requireAuth } from '@/lib/ai/auth';
import { checkAIRateLimit, getAIRateLimitHeaders } from '@/lib/ai/rate-limit';
import { getModel } from '@/lib/ai/models';
import { composeSoulSystemPrompt } from '@/lib/luv-prompt-composer';
import {
  getLuvCharacterServer,
  getLuvMemoriesServer,
  searchMemoriesBySimularityServer,
} from '@/lib/luv-server';
import { getChassisModulesServer } from '@/lib/luv-chassis-server';
import { listLuvResearchServer } from '@/lib/luv-research-server';
import { luvTools, createCurrentContextTool } from '@/lib/luv-tools';
import { getAnthropic } from '@/lib/ai/providers';
import { analyzeImageWithGemini, buildGeneralVisionPrompt } from '@/lib/ai/gemini-vision';
import { resolveProcessProtocol, resolveProcessState } from '@/lib/luv/process-context';
import type { ChassisModuleSummary } from '@/lib/luv/soul-layers';
import type { LuvPageContext } from '@/lib/types/luv';

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
    const { messages, modelKey = 'claude-sonnet', pageContext = null, thinking = false, seedContext = null } = body as {
      messages: UIMessage[];
      modelKey?: string;
      pageContext?: LuvPageContext | null;
      thinking?: boolean;
      seedContext?: string | null;
    };

    if (!messages || messages.length === 0) {
      return NextResponse.json({ error: 'Messages required' }, { status: 400 });
    }

    // Load soul + chassis modules + research server-side
    const [character, chassisModules, allResearch] = await Promise.all([
      getLuvCharacterServer(),
      getChassisModulesServer(),
      listLuvResearchServer(),
    ]);
    const soulData = character?.soul_data ?? {};
    const chassisModuleSummaries: ChassisModuleSummary[] = chassisModules.map((m) => ({
      slug: m.slug,
      name: m.name,
      category: m.category,
      paramCount: Object.keys(m.parameters ?? {}).length,
    }));

    // Semantic memory retrieval: embed recent conversation context, find relevant memories
    const memoryItems = await retrieveRelevantMemories(messages);
    const researchSummary = {
      openHypotheses: allResearch.filter((r) => r.kind === 'hypothesis' && r.status === 'open').length,
      activeExperiments: allResearch.filter((r) => r.kind === 'experiment' && r.status === 'active').length,
      totalEntries: allResearch.length,
    };

    // Count user turns (number of user messages in conversation history)
    const turnCount = messages.filter((m: UIMessage) => m.role === 'user').length;

    // Resolve page-aware process protocol and active state
    const [processProtocol, processState] = await Promise.all([
      Promise.resolve(resolveProcessProtocol(pageContext)),
      resolveProcessState({ pageContext, turnCount }),
    ]);

    const systemPrompt = composeSoulSystemPrompt(soulData, {
      chassisModuleSummaries,
      memories: memoryItems,
      research: researchSummary,
      processProtocol,
      processState,
      seedContext,
    });

    // Convert UI-format messages (from useChat) to model-format messages (for streamText)
    const modelMessages = await convertToModelMessages(messages);

    // Pre-process user-uploaded images through Gemini vision
    const augmentedMessages = await augmentImagesWithGeminiVision(modelMessages);

    // Enable extended thinking for Claude models when toggled on
    const isClaudeModel = modelKey.startsWith('claude-');
    const thinkingEnabled = thinking && isClaudeModel;

    const result = streamText({
      model: getModel(modelKey),
      system: systemPrompt,
      messages: augmentedMessages,
      tools: {
        ...luvTools,
        get_current_context: createCurrentContextTool(pageContext ?? null),
        web_search: getAnthropic().tools.webSearch_20250305({ maxUses: 3 }),
      } as ToolSet,
      stopWhen: stepCountIs(5),
      ...(thinkingEnabled && {
        providerOptions: {
          anthropic: {
            thinking: { type: 'enabled', budgetTokens: 10000 },
          },
        },
      }),
    });

    return result.toUIMessageStreamResponse();
  } catch (err) {
    console.error('[luv/chat] Error:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * Retrieve memories relevant to the current conversation via semantic search.
 * Falls back to all active memories if embedding/search fails or returns too few.
 */
const MEMORY_MATCH_COUNT = 15;
const MEMORY_MIN_RESULTS = 3;
const MEMORY_SIMILARITY_THRESHOLD = 0.4;

async function retrieveRelevantMemories(
  messages: UIMessage[]
): Promise<Array<{ content: string; category: string }>> {
  // Extract text from recent messages for context embedding
  const recentText = messages
    .slice(-6)
    .map((m) => {
      if (Array.isArray(m.parts)) {
        return m.parts
          .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
          .map((p) => p.text)
          .join(' ');
      }
      return '';
    })
    .filter(Boolean)
    .join('\n');

  if (!recentText.trim()) {
    return fallbackToAllMemories();
  }

  try {
    const matches = await searchMemoriesBySimularityServer(
      recentText,
      MEMORY_MATCH_COUNT,
      MEMORY_SIMILARITY_THRESHOLD
    );

    if (matches.length >= MEMORY_MIN_RESULTS) {
      return matches.map((m) => ({ content: m.content, category: m.category }));
    }

    // Too few semantic results — fall back to all active memories
    return fallbackToAllMemories();
  } catch {
    // Embedding or search failure — fall back gracefully
    return fallbackToAllMemories();
  }
}

async function fallbackToAllMemories(): Promise<
  Array<{ content: string; category: string }>
> {
  const memories = await getLuvMemoriesServer({ activeOnly: true });
  return memories.map((m) => ({ content: m.content, category: m.category }));
}

/**
 * Scan the last user message for uploaded images. For each image found,
 * run Gemini vision analysis and inject the description as text alongside
 * the original image. Earlier messages are left untouched.
 */
async function augmentImagesWithGeminiVision(
  messages: ModelMessage[]
): Promise<ModelMessage[]> {
  const lastUserIdx = messages.findLastIndex((m) => m.role === 'user');
  if (lastUserIdx === -1) return messages;

  const msg = messages[lastUserIdx];
  if (msg.role !== 'user' || typeof msg.content === 'string') return messages;

  // Extract base64 data from image/file content parts
  function extractBase64(data: unknown): string | null {
    if (typeof data === 'string') return data;
    if (data instanceof URL) return null;
    if (Buffer.isBuffer(data)) return data.toString('base64');
    if (data instanceof Uint8Array) {
      return Buffer.from(data.buffer, data.byteOffset, data.byteLength).toString('base64');
    }
    if (data instanceof ArrayBuffer) {
      return Buffer.from(data).toString('base64');
    }
    return null;
  }

  const toAnalyze: Array<{ index: number; base64: string; mediaType: string }> = [];
  for (let i = 0; i < msg.content.length; i++) {
    const part = msg.content[i];
    if (part.type === 'image') {
      const base64 = extractBase64(part.image);
      if (base64) {
        toAnalyze.push({ index: i, base64, mediaType: part.mediaType ?? 'image/jpeg' });
      }
    } else if (part.type === 'file' && part.mediaType?.startsWith('image/')) {
      const base64 = extractBase64(part.data);
      if (base64) {
        toAnalyze.push({ index: i, base64, mediaType: part.mediaType });
      }
    }
  }

  if (toAnalyze.length === 0) return messages;

  const prompt = buildGeneralVisionPrompt();
  const analyses = await Promise.all(
    toAnalyze.map(({ base64, mediaType }) =>
      analyzeImageWithGemini({ base64, mediaType, prompt })
    )
  );

  // Inject analysis text before each image part
  const newContent = [...msg.content];
  let offset = 0;
  for (let i = 0; i < toAnalyze.length; i++) {
    if (analyses[i]) {
      newContent.splice(toAnalyze[i].index + offset, 0, {
        type: 'text' as const,
        text: `[Gemini Vision Analysis]\n${analyses[i]}`,
      });
      offset++;
    }
  }

  const result = [...messages];
  result[lastUserIdx] = { ...msg, content: newContent };
  return result;
}
