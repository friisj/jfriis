import { NextResponse } from 'next/server';
import { streamText, convertToModelMessages, stepCountIs, type UIMessage, type ToolSet, type ModelMessage } from 'ai';
import { requireAuth } from '@/lib/ai/auth';
import { checkAIRateLimit, getAIRateLimitHeaders } from '@/lib/ai/rate-limit';
import { getModel } from '@/lib/ai/models';
import { composeSoulSystemPrompt } from '@/lib/luv-prompt-composer';
import {
  getLuvCharacterServer,
  getLuvMemoriesServer,
  searchMemoriesBySimilarityServer,
  getLuvConversationServer,
  getLuvMessagesServer,
  createLuvMessageServer,
  incrementTurnCountServer,
} from '@/lib/luv-server';
import { getChassisModulesServer } from '@/lib/luv-chassis-server';
import { listLuvResearchServer } from '@/lib/luv-research-server';
import { getLuvChangelogServer } from '@/lib/luv-changelog-server';
import { getCurrentSoulConfigServer } from '@/lib/luv-soul-modulation-server';
import { luvTools, createCurrentContextTool } from '@/lib/luv-tools';
import { luvImageMgmtTools } from '@/lib/luv-image-mgmt-tools';
import { createGenerateImageTool } from '@/lib/luv-image-gen-tools';
import { createChassisStudyTool, recordStudyFeedback, listChassisStudies } from '@/lib/luv-chassis-study-tools';
import { getAnthropic } from '@/lib/ai/providers';
import { analyzeImageWithGemini, buildGeneralVisionPrompt } from '@/lib/ai/gemini-vision';
import { resolveProcessProtocol, resolveProcessState } from '@/lib/luv/process-context';
import { buildHeartbeatPromptFragment, scanToolResultsForTriggers } from '@/lib/luv-heartbeat';
import type { ChassisModuleSummary } from '@/lib/luv/soul-layers';
import type { LuvPageContext } from '@/lib/types/luv';
import { deserializeMessage, getMessageText, serializeOnFinishParts, serializeParts } from '@/lib/luv-message-utils';
import { applyMessageWindowing } from '@/lib/luv-chat-windowing';

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
    const {
      messages: legacyMessages,
      chatId,
      latestMessage,
      modelKey = 'claude-sonnet',
      pageContext = null,
      thinking = false,
      seedContext = null,
      sessionId,
    } = body as {
      messages?: UIMessage[];
      chatId?: string;
      latestMessage?: UIMessage;
      modelKey?: string;
      pageContext?: LuvPageContext | null;
      thinking?: boolean;
      seedContext?: string | null;
      sessionId?: string;
    };

    // Resolve conversation messages: server-side state (new) or client payload (legacy)
    let messages: UIMessage[];
    let convId: string | null = null;
    let turnCount: number;

    if (chatId && latestMessage) {
      // New flow: load history from DB, persist user message server-side
      convId = chatId;
      const [conv, dbMessages] = await Promise.all([
        getLuvConversationServer(chatId),
        getLuvMessagesServer(chatId),
      ]);

      // Persist user message — skip if the last DB message is already a user message
      // to prevent duplicate writes from network retries or double-submits.
      const lastDbMessage = dbMessages[dbMessages.length - 1];
      if (!lastDbMessage || lastDbMessage.role !== 'user') {
        await createLuvMessageServer({
          conversation_id: chatId,
          role: latestMessage.role,
          content: getMessageText(latestMessage),
          parts: serializeParts(latestMessage),
        });
      }

      // Increment turn count (persisted, survives compaction)
      await incrementTurnCountServer(chatId);
      turnCount = conv.turn_count + 1;

      // Reconstruct full message history, collapsing any consecutive same-role messages
      // that may have been written by duplicate requests (retries, double-submits, etc.)
      const rawHistorical = dbMessages
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .map((m) => deserializeMessage(m));
      const historicalMessages = rawHistorical.filter((m, i) => {
        // Drop consecutive same-role: keep only the last message in each run
        const next = rawHistorical[i + 1];
        return !next || next.role !== m.role;
      });
      messages = [...historicalMessages, latestMessage];
    } else if (legacyMessages && legacyMessages.length > 0) {
      // Legacy flow: full message array from client (backward compat)
      messages = legacyMessages;
      turnCount = messages.filter((m) => m.role === 'user').length;
    } else {
      return NextResponse.json({ error: 'Messages required' }, { status: 400 });
    }

    // Load soul + chassis modules + research + changelog + soul traits server-side
    const [character, chassisModules, allResearch, recentChangelog] = await Promise.all([
      getLuvCharacterServer(),
      getChassisModulesServer(),
      listLuvResearchServer(),
      getLuvChangelogServer(8).catch(() => []),
    ]);
    const soulData = character?.soul_data ?? {};
    const chassisModuleSummaries: ChassisModuleSummary[] = chassisModules.map((m) => ({
      slug: m.slug,
      name: m.name,
      category: m.category,
      paramCount: Object.keys(m.parameters ?? {}).length,
    }));

    // Load current soul trait config (falls back to defaults gracefully)
    const soulModulation = character?.id
      ? await getCurrentSoulConfigServer(character.id, sessionId).catch(() => null)
      : null;

    // Semantic memory retrieval: embed recent conversation context, find relevant memories
    const memoryItems = await retrieveRelevantMemories(messages);
    const researchSummary = {
      openHypotheses: allResearch.filter((r) => r.kind === 'hypothesis' && r.status === 'open').length,
      activeExperiments: allResearch.filter((r) => r.kind === 'experiment' && r.status === 'active').length,
      totalEntries: allResearch.length,
    };

    // Resolve page-aware process protocol and active state
    const [processProtocol, processState] = await Promise.all([
      Promise.resolve(resolveProcessProtocol(pageContext)),
      resolveProcessState({ pageContext, turnCount }),
    ]);

    let systemPrompt = composeSoulSystemPrompt(soulData, {
      chassisModuleSummaries,
      memories: memoryItems,
      research: researchSummary,
      changelog: recentChangelog,
      processProtocol,
      processState,
      seedContext,
      soulTraits: soulModulation?.traits ?? null,
      soulPresetName: soulModulation?.preset?.name ?? null,
    });

    // Inject pending heartbeat nudges into system prompt
    const heartbeat = await buildHeartbeatPromptFragment(user.id, convId ?? undefined);
    if (heartbeat.fragment) {
      systemPrompt += heartbeat.fragment;
    }

    // Convert UI-format messages (from useChat) to model-format messages (for streamText)
    // Old conversations may have stored parts that don't match the current SDK schema.
    // If conversion fails, strip to text-only parts and retry.
    let modelMessages: ModelMessage[];
    try {
      modelMessages = await convertToModelMessages(messages);
    } catch (convErr) {
      console.warn('[luv/chat] convertToModelMessages failed, retrying with text-only parts:', convErr);
      const textOnlyMessages: UIMessage[] = messages.map((m) => ({
        ...m,
        parts: m.parts
          .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
          .map((p) => ({ type: 'text' as const, text: p.text })),
      })).filter((m) => m.parts.length > 0);
      modelMessages = await convertToModelMessages(textOnlyMessages);
    }

    // Apply server-side windowing to trim older tool results and image data
    const windowedMessages = applyMessageWindowing(modelMessages);

    // Pre-process user-uploaded images through Gemini vision
    const augmentedMessages = await augmentImagesWithGeminiVision(windowedMessages);

    // Enable extended thinking for Claude models when toggled on
    const isClaudeModel = modelKey.startsWith('claude-');
    const thinkingEnabled = thinking && isClaudeModel;

    // Anthropic-specific provider options: context management + optional thinking
    const providerOptions = isClaudeModel ? {
      anthropic: {
        ...(thinkingEnabled && {
          thinking: { type: 'enabled', budgetTokens: 10000 },
        }),
        contextManagement: {
          edits: [
            {
              type: 'clear_tool_uses_20250919',
              trigger: { type: 'input_tokens', value: 80000 },
              keep: { type: 'tool_uses', value: 5 },
              clearAtLeast: { type: 'input_tokens', value: 5000 },
              excludeTools: [
                'save_memory', 'update_memory', 'archive_memory', 'merge_memories',
                'review_memories', 'list_memories',
              ],
            },
            ...(thinkingEnabled ? [{
              type: 'clear_thinking_20251015' as const,
              keep: { type: 'thinking_turns' as const, value: 2 },
            }] : []),
          ],
        },
      },
    } : undefined;

    const result = streamText({
      model: getModel(modelKey),
      system: systemPrompt,
      messages: augmentedMessages,
      tools: {
        ...luvTools,
        ...luvImageMgmtTools,
        generate_image: createGenerateImageTool(augmentedMessages),
        run_chassis_study: createChassisStudyTool(augmentedMessages),
        record_study_feedback: recordStudyFeedback,
        list_chassis_studies: listChassisStudies,
        get_current_context: createCurrentContextTool(pageContext ?? null),
        web_search: getAnthropic().tools.webSearch_20250305({ maxUses: 3 }),
      } as ToolSet,
      stopWhen: stepCountIs(15),
      providerOptions,
      onFinish: async (event) => {
        if (!convId) return;
        try {
          await createLuvMessageServer({
            conversation_id: convId,
            role: 'assistant',
            content: event.text,
            parts: serializeOnFinishParts(event),
          });
        } catch (err) {
          console.error('[luv/chat] Failed to persist assistant message:', err);
        }

        // Scan tool results for heartbeat triggers (non-blocking)
        scanToolResultsForTriggers(user.id, convId, event.steps).catch((err) => {
          console.error('[luv/chat] Heartbeat scan failed:', err);
        });
      },
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
    const matches = await searchMemoriesBySimilarityServer(
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
