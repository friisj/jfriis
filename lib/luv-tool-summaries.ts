/**
 * Tool Result Summarizer Registry
 *
 * Generates compact one-line summaries of tool results for conversation context.
 * Full results stay in DB — summaries replace them in the ModelMessage array
 * sent to the AI provider, keeping context lean.
 *
 * Each summary includes the toolCallId so the agent can retrieve full details
 * via get_tool_result if needed.
 */

type ToolSummarizer = (output: unknown, toolCallId: string) => string;

function safe(output: unknown): Record<string, unknown> {
  return (typeof output === 'object' && output !== null) ? output as Record<string, unknown> : {};
}

function dur(ms: unknown): string {
  return typeof ms === 'number' ? `${(ms / 1000).toFixed(0)}s` : '';
}

function trunc(s: unknown, len = 40): string {
  if (typeof s !== 'string') return '';
  return s.length > len ? s.slice(0, len) + '…' : s;
}

// ── Video generation tools ───────────────────────────────────────

const summarizeStartVideo: ToolSummarizer = (output, callId) => {
  const r = safe(output);
  if (!r.success) return `[start_video_generation failed: ${trunc(r.error)} | callId=${callId}]`;
  return `[video job started jobId=${r.jobId}, provider=${r.provider} | callId=${callId}]`;
};

const summarizeCheckVideo: ToolSummarizer = (output, callId) => {
  const r = safe(output);
  if (r.status === 'completed') return `[video completed jobId=${r.jobId}, ${dur(r.durationMs)} | callId=${callId}]`;
  if (r.status === 'failed') return `[video failed jobId=${r.jobId}: ${trunc(r.error)} | callId=${callId}]`;
  return `[video ${r.status ?? 'in-progress'} jobId=${r.jobId} | callId=${callId}]`;
};

// ── Image generation tools ───────────────────────────────────────

const summarizeImageGen: ToolSummarizer = (output, callId) => {
  const r = safe(output);
  if (!r.success) return `[generate_image failed: ${trunc(r.error)} | callId=${callId}]`;
  return `[generated image cogId=${r.cogImageId}, ${r.model ?? 'unknown'}, ${r.aspectRatio ?? '?'}, ${dur(r.durationMs)} | callId=${callId}]`;
};

const summarizeChassisStudy: ToolSummarizer = (output, callId) => {
  const r = safe(output);
  if (!r.success) return `[chassis study failed: ${trunc(r.error)} | callId=${callId}]`;
  const modules = Array.isArray(r.moduleSlugs) ? (r.moduleSlugs as string[]).join(',') : '';
  const delib = safe(r.deliberation);
  return `[chassis study studyId=${r.studyId}, modules=${modules || 'all'}, ${delib.rounds ?? '?'} rounds, ${dur(r.durationMs)} | callId=${callId}]`;
};

const summarizeSketchStudy: ToolSummarizer = (output, callId) => {
  const r = safe(output);
  if (!r.success) return `[sketch study failed: ${trunc(r.error)} | callId=${callId}]`;
  return `[sketch cogId=${r.cogImageId}, focus=${r.focus}, ${dur(r.durationMs)} | callId=${callId}]`;
};

// ── Gen job tools (two-phase pattern) ────────────────────────────

const summarizeGenJobStarted: ToolSummarizer = (output, callId) => {
  const r = safe(output);
  if (!r.success) return `[gen job failed to start: ${trunc(r.error)} | callId=${callId}]`;
  return `[gen job started jobId=${r.jobId}, type=${r.jobType} | callId=${callId}]`;
};

const summarizeGenJobResult: ToolSummarizer = (output, callId) => {
  const r = safe(output);
  if (!r.success) return `[gen job failed: ${trunc(r.error)} | callId=${callId}]`;
  return `[gen job completed type=${r.jobType}, ${dur(r.durationMs)} | callId=${callId}]`;
};

// ── Data retrieval tools ─────────────────────────────────────────

const summarizeFetchSeries: ToolSummarizer = (output, callId) => {
  const r = safe(output);
  const images = Array.isArray(r.images) ? r.images : [];
  return `[fetched ${images.length} images (${r.total ?? images.length} total) | callId=${callId}]`;
};

const summarizeListGenerations: ToolSummarizer = (output, callId) => {
  const r = safe(output);
  const gens = Array.isArray(r.generations) ? r.generations : [];
  return `[listed ${gens.length} generations | callId=${callId}]`;
};

const summarizeListSketches: ToolSummarizer = (output, callId) => {
  const r = safe(output);
  const sketches = Array.isArray(r.sketches) ? r.sketches : [];
  return `[listed ${sketches.length} sketches | callId=${callId}]`;
};

const summarizeListStudies: ToolSummarizer = (output, callId) => {
  const r = safe(output);
  const studies = Array.isArray(r.studies) ? r.studies : [];
  return `[listed ${studies.length} chassis studies | callId=${callId}]`;
};

// ── Soul/chassis tools ───────────────────────────────────────────

const summarizeReadSoul: ToolSummarizer = (_output, callId) => {
  return `[read soul data | callId=${callId}]`;
};

const summarizeReadChassis: ToolSummarizer = (_output, callId) => {
  return `[read chassis data | callId=${callId}]`;
};

const summarizeListModules: ToolSummarizer = (output, callId) => {
  const r = safe(output);
  const modules = Array.isArray(r.modules) ? r.modules : [];
  return `[listed ${modules.length} chassis modules | callId=${callId}]`;
};

const summarizeReadModule: ToolSummarizer = (output, callId) => {
  const r = safe(output);
  const params = typeof r.parameters === 'object' && r.parameters ? Object.keys(r.parameters).length : '?';
  return `[read module ${r.slug ?? '?'}: ${params} parameters | callId=${callId}]`;
};

const summarizeReviewModule: ToolSummarizer = (output, callId) => {
  const r = safe(output);
  return `[reviewed module ${r.moduleSlug ?? '?'} with reference image | callId=${callId}]`;
};

// ── Memory tools ─────────────────────────────────────────────────

const summarizeSaveMemory: ToolSummarizer = (output, callId) => {
  const r = safe(output);
  return `[saved memory: '${trunc(r.content, 50)}' | callId=${callId}]`;
};

const summarizeUpdateMemory: ToolSummarizer = (output, callId) => {
  const r = safe(output);
  return `[updated memory: '${trunc(r.content, 50)}' | callId=${callId}]`;
};

const summarizeListMemories: ToolSummarizer = (output, callId) => {
  const r = safe(output);
  const memories = Array.isArray(r.memories) ? r.memories : [];
  return `[listed ${memories.length} memories | callId=${callId}]`;
};

// ── Research tools ───────────────────────────────────────────────

const summarizeCreateResearch: ToolSummarizer = (output, callId) => {
  const r = safe(output);
  return `[created research ${r.kind ?? 'entry'}: '${trunc(r.title, 40)}' | callId=${callId}]`;
};

const summarizeListResearch: ToolSummarizer = (output, callId) => {
  const r = safe(output);
  const entries = Array.isArray(r.entries) ? r.entries : [];
  return `[listed ${entries.length} research entries | callId=${callId}]`;
};

// ── Changelog tools ──────────────────────────────────────────────

const summarizeReadChangelog: ToolSummarizer = (output, callId) => {
  const r = safe(output);
  const entries = Array.isArray(r.entries) ? r.entries : [];
  return `[read ${entries.length} changelog entries | callId=${callId}]`;
};

// ── Proposal tools ───────────────────────────────────────────────

const summarizeProposal: ToolSummarizer = (output, callId) => {
  const r = safe(output);
  const type = String(r.type ?? 'change');
  // soul/chassis change: use field + path
  if (r.field) return `[proposed ${type}: ${r.field}${r.path ? `.${r.path}` : ''} | callId=${callId}]`;
  // module change: use moduleSlug + parameterKey
  if (r.moduleSlug && r.parameterKey) return `[proposed ${type}: ${r.moduleSlug}.${r.parameterKey} | callId=${callId}]`;
  // batch module changes: use moduleSlug + count
  if (r.moduleSlug && Array.isArray(r.changes)) return `[proposed ${type}: ${r.moduleSlug} (${(r.changes as unknown[]).length} changes) | callId=${callId}]`;
  // new module: use name
  if (r.name) return `[proposed ${type}: ${trunc(r.name, 40)} | callId=${callId}]`;
  return `[proposed ${type} | callId=${callId}]`;
};

// ── Image management tools ───────────────────────────────────────

const summarizeListSeries: ToolSummarizer = (output, callId) => {
  const r = safe(output);
  const series = Array.isArray(r.series) ? r.series : [];
  return `[listed ${series.length} image series | callId=${callId}]`;
};

// ── Web search ───────────────────────────────────────────────────

const summarizeWebSearch: ToolSummarizer = (output, callId) => {
  // Web search output shape varies — keep it generic
  return `[web search completed | callId=${callId}]`;
};

// ── Registry ─────────────────────────────────────────────────────

const SUMMARIZERS: Record<string, ToolSummarizer> = {
  // Video generation
  start_video_generation: summarizeStartVideo,
  check_video_generation: summarizeCheckVideo,

  // Image generation (two-phase)
  start_image_generation: summarizeGenJobStarted,
  start_chassis_study: summarizeGenJobStarted,
  start_sketch_study: summarizeGenJobStarted,
  check_gen_job: summarizeGenJobResult,
  // Legacy (for summarizing old tool results in conversation history)
  generate_image: summarizeImageGen,
  run_chassis_study: summarizeChassisStudy,
  run_sketch_study: summarizeSketchStudy,

  // Image browsing
  fetch_series_images: summarizeFetchSeries,
  list_generations: summarizeListGenerations,
  list_sketches: summarizeListSketches,
  list_chassis_studies: summarizeListStudies,
  list_image_series: summarizeListSeries,

  // Soul/chassis
  read_soul: summarizeReadSoul,
  read_chassis: summarizeReadChassis,
  list_chassis_modules: summarizeListModules,
  read_chassis_module: summarizeReadModule,
  review_chassis_module: summarizeReviewModule,

  // Proposals
  propose_soul_change: summarizeProposal,
  propose_chassis_change: summarizeProposal,
  propose_module_change: summarizeProposal,
  propose_module_changes: summarizeProposal,
  propose_new_module: summarizeProposal,
  propose_facet_change: summarizeProposal,

  // Memory
  save_memory: summarizeSaveMemory,
  update_memory: summarizeUpdateMemory,
  list_memories: summarizeListMemories,

  // Research
  create_research: summarizeCreateResearch,
  update_research: summarizeCreateResearch,
  list_research: summarizeListResearch,
  search_research: summarizeListResearch,

  // Changelog
  read_changelog: summarizeReadChangelog,

  // Web
  web_search: summarizeWebSearch,
};

/**
 * Generate a compact summary of a tool result.
 * Returns a one-liner suitable for replacing full tool output in conversation context.
 */
export function summarizeToolResult(toolName: string, output: unknown, toolCallId: string): string {
  const summarizer = SUMMARIZERS[toolName];
  if (summarizer) {
    return summarizer(output, toolCallId);
  }
  return `[${toolName} completed | callId=${toolCallId}]`;
}
