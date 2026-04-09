/**
 * Luv Agent Adapter
 *
 * Loads Luv's system prompt, tools, and middleware for the unified chat route.
 * This bridges Luv's existing infrastructure into the multi-agent surface
 * without modifying Luv's original files.
 */

import type { UIMessage, ToolSet, ModelMessage } from 'ai';
import { composeSoulSystemPrompt } from '../luv-prompt-composer';
import { getLuvCharacterServer, getLuvMemoriesServer } from '../luv-server';
import { getChassisModulesServer } from '../luv-chassis-server';
import { listLuvResearchServer } from '../luv-research-server';
import { getLuvChangelogServer } from '../luv-changelog-server';
import { getCurrentSoulConfigServer } from '../luv-soul-modulation-server';
import { luvTools, createGetToolResultTool } from '../luv-tools';
import { luvImageMgmtTools } from '../luv-image-mgmt-tools';
import { createStartImageGenTool } from '../luv-image-gen-tools';
import { createStartChassisStudyTool, recordStudyFeedback, listChassisStudies } from '../luv-chassis-study-tools';
import { createStartSketchStudyTool, listSketches } from '../luv-sketch-study-tools';
import { createStartVideoGenerationTool, checkVideoGeneration } from '../luv-video-gen-tools';
import { checkGenJob } from '../luv-gen-job-tools';
import { getAnthropic } from '../ai/providers';
import { applyMessageWindowing } from '../luv-chat-windowing';
import { summarizeToolResults } from '../luv-chat-windowing';

export interface LuvSetupResult {
  systemPrompt: string;
  tools: ToolSet;
  providerOptions: Record<string, unknown>;
  /** Apply windowing + summarization to model messages */
  processMessages: (messages: ModelMessage[]) => ModelMessage[];
}

/**
 * Set up Luv's system prompt, tools, and message processing.
 * Call this once per request when agent === 'luv'.
 */
export async function setupLuvAgent(
  modelMessages: ModelMessage[],
  opts: {
    modelKey: string;
    thinking: boolean;
    convId?: string;
  },
): Promise<LuvSetupResult> {
  // Load all Luv context in parallel
  const [character, modules, research, changelog] = await Promise.all([
    getLuvCharacterServer(),
    getChassisModulesServer(),
    listLuvResearchServer().catch(() => []),
    getLuvChangelogServer(10).catch(() => []),
  ]);

  // Soul config needs character ID
  const soulConfig = character
    ? await getCurrentSoulConfigServer(character.id).catch(() => null)
    : null;

  // Load memories (needs character)
  const memories = character
    ? await getLuvMemoriesServer({ activeOnly: true }).catch(() => [])
    : [];

  // Compose system prompt
  const systemPrompt = character
    ? composeSoulSystemPrompt({ character }, {
        chassisModuleSummaries: modules.map((m) => ({
          slug: m.slug,
          name: m.name,
          category: m.tier?.toString() ?? 'unknown',
          paramCount: Object.keys(m.parameters ?? {}).length,
        })),
        memories: memories.map((m) => ({ content: m.content, category: m.category })),
        research: { openHypotheses: 0, activeExperiments: 0, totalEntries: 0 },
        changelog,
        soulTraits: soulConfig?.traits,
        soulPresetName: soulConfig?.preset?.name,
      })
    : 'You are Luv, a parametric character engine. Your character data could not be loaded.';

  // Build tools
  const tools = {
    ...luvTools,
    ...luvImageMgmtTools,
    start_image_generation: createStartImageGenTool(modelMessages),
    start_chassis_study: createStartChassisStudyTool(modelMessages),
    start_sketch_study: createStartSketchStudyTool(modelMessages),
    check_gen_job: checkGenJob,
    record_study_feedback: recordStudyFeedback,
    list_chassis_studies: listChassisStudies,
    list_sketches: listSketches,
    start_video_generation: createStartVideoGenerationTool(modelMessages),
    check_video_generation: checkVideoGeneration,
    ...(opts.convId ? { get_tool_result: createGetToolResultTool(opts.convId) } : {}),
    web_search: getAnthropic().tools.webSearch_20250305({ maxUses: 3 }),
    tool_search: getAnthropic().tools.toolSearchBm25_20251119(),
  } as ToolSet;

  // Provider options (thinking, context management)
  const isClaudeModel = opts.modelKey.startsWith('claude-');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let providerOptions: any = undefined;
  if (isClaudeModel) {
    const anthOptions: Record<string, unknown> = {
      reasoningClearing: { type: 'summarize' },
    };
    if (opts.thinking) {
      anthOptions.thinking = { type: 'enabled', budgetTokens: 32000 };
    }
    providerOptions = { anthropic: anthOptions };
  }

  // Message processing (windowing + summarization)
  const processMessages = (msgs: ModelMessage[]): ModelMessage[] => {
    const windowed = applyMessageWindowing(msgs, 8);
    return summarizeToolResults(windowed, 2);
  };

  return { systemPrompt, tools, providerOptions, processMessages };
}
