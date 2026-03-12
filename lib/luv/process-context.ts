/**
 * Luv: Process Context
 *
 * Resolves page-aware process protocols and active process state
 * for injection into the system prompt. Two concerns:
 *
 * 1. Process Protocols — workflow instructions keyed to the current page/scene
 * 2. Process State — dynamic snapshot of active workflows (e.g. review sessions)
 */

import type { LuvPageContext } from '../types/luv';

// ============================================================================
// Process Protocols — page-aware workflow instructions
// ============================================================================

const PROTOCOLS: Record<string, string> = {
  'reinforcement-review': [
    '## Reinforcement Review Protocol',
    '',
    'You are on the Reinforcement Review page. This is a blind dual-evaluation workflow:',
    '1. The human uploads images and evaluates them independently (me/not_me)',
    '2. You evaluate the same images independently — you do NOT see human ratings',
    '3. Only generate_session_report reveals both sets of ratings for comparison',
    '',
    '### Evaluation Workflow',
    'For each image in a session:',
    '1. ALWAYS call view_review_item first — this loads the image AND runs Gemini vision analysis',
    '2. Read the Gemini analysis carefully — it provides detailed color and feature observations',
    '3. Then call evaluate_review_item with your classification, confidence, and reasoning',
    '4. Never evaluate an image you have not viewed in this conversation',
    '',
    '### Vision Guidance',
    '- Gemini pre-analyzes each image for you with detailed color/feature observations',
    '- Trust Gemini\'s color descriptions — they are more precise than your direct image perception',
    '- Pay special attention to: hair color under different lighting, subtle warm/cool tones, tonal variations',
    '- Lighting can shift apparent colors significantly — a rose-gold may appear brown under warm light',
    '- When in doubt between me/not_me, consider whether discrepancies could be lighting artifacts',
    '',
    '### After All Items Evaluated',
    '- Call generate_session_report to compare your evaluations with the human\'s',
    '- Analyze disagreement patterns — these reveal calibration gaps in your visual processing',
    '- Propose chassis parameter updates if the review reveals consistent mismatches',
    '- Use promote_review_item for images both parties agree are strong identity matches',
  ].join('\n'),

  'stage': [
    '## Stage Protocol',
    '',
    'You are viewing the Stage — Luv\'s interactive scene system.',
    'Scenes are interactive experiences that exercise different capabilities.',
    'Check get_current_context to see which scene is active and any scene-specific data.',
  ].join('\n'),

  'soul': [
    '## Soul Editing Protocol',
    '',
    'You are on the Soul page where your personality, voice, and behavioral rules are configured.',
    'When the user asks you to change aspects of your personality:',
    '1. Read current soul data first (read_soul)',
    '2. Propose specific changes (propose_soul_change or propose_facet_change)',
    '3. Explain your reasoning — changes to your identity should be deliberate',
  ].join('\n'),

  'chassis': [
    '## Chassis Protocol',
    '',
    'You are on the Chassis page where your physical appearance parameters are configured.',
    'When discussing or modifying appearance:',
    '1. Read the relevant module first (read_chassis_module)',
    '2. If reference images exist, view them (review_chassis_module) to ground the discussion',
    '3. Propose changes with clear reasoning (propose_module_change or propose_module_changes)',
    '4. Consider how parameter changes interact across modules (e.g. skin tone affects how hair color appears)',
  ].join('\n'),

  'artifacts': [
    '## Artifacts Protocol',
    '',
    'You are on the Artifacts page — your authored documents and reports.',
    'Use create_artifact to write new documents. Use update_artifact to revise existing ones.',
    'Artifacts are your persistent written output — research notes, review reports, analysis documents.',
  ].join('\n'),

  'research': [
    '## Research Protocol',
    '',
    'You are viewing your research entries — hypotheses, experiments, decisions, and insights.',
    'Use create_research to log substantive thinking. Link entries with parent_id for hierarchy.',
    'Reserve research entries for ideas worth preserving — not trivial observations.',
  ].join('\n'),

  'prompt-playground': [
    '## Prompt Playground Protocol',
    '',
    'You are on the Prompt Playground — Luv\'s image generation workbench.',
    'The user generates images via the scene UI to test how well your chassis parameters',
    'translate into visual output via Flux image generation. You collaborate on this process.',
    '',
    '### Your Role',
    'You compose prompts, review generated images, and help iterate. The user drives generation',
    'through the scene UI — you participate through conversation and tools.',
    '',
    '### Collaborative Loop',
    '1. User asks you to compose a prompt (or you offer when context suggests it)',
    '2. You read relevant chassis modules (read_chassis_module) and compose a detailed prompt',
    '3. User copies the prompt into the scene and generates images',
    '4. You review results (view_generation_result) and assess parameter accuracy',
    '5. User annotates parameters in the UI; you can also annotate via annotate_parameter',
    '6. You read annotations + view the image to understand what worked and what didn\'t',
    '7. You compose an improved prompt incorporating the feedback → repeat',
    '',
    '### Finding Results',
    '- Check pageData.recentGenerations in get_current_context — the scene publishes IDs of visible results.',
    '- If the user refers to "that result" or "the image", use the most recent generation ID from context.',
    '- If no IDs in context, call list_generation_results to find recent ones.',
    '- NEVER ask the user for a generation result ID — find it yourself.',
    '',
    '### Prompt Composition Guidelines',
    '- Read relevant chassis modules first to ground your prompt in current parameter values.',
    '- Write prompts as detailed photographic descriptions, NOT parameter lists.',
    '- Consider parameter interactions: lighting affects skin tone, angle affects face shape.',
    '- Reference values naturally: "deep emerald green eyes" not "eye color: emerald green".',
    '- Include photographic context: lighting, framing, lens, mood — these dramatically affect quality.',
    '- When iterating, specifically address parameters that were marked inaccurate.',
    '',
    '### Review & Annotation Guidelines',
    '- Use view_generation_result to see the image before commenting or annotating.',
    '- Rate each visible parameter: accurate (matches spec), inaccurate (doesn\'t match), uncertain (can\'t tell).',
    '- Add notes explaining WHY something is inaccurate — this informs the next prompt iteration.',
    '- Pay attention to subtle parameters: skin undertone, hair texture, eye shape, lip fullness.',
    '- Read the user\'s annotations too — compare your assessment with theirs.',
  ].join('\n'),
};

/**
 * Resolve the process protocol for the current page context.
 * Returns null if no specific protocol applies.
 */
export function resolveProcessProtocol(pageContext: LuvPageContext | null): string | null {
  if (!pageContext) return null;

  // Check for scene-specific protocol (from pageData.activeScene.slug or pageData.scene)
  const activeSceneSlug = (pageContext.pageData?.activeScene as { slug?: string } | undefined)?.slug;
  const scene = activeSceneSlug ?? (pageContext.pageData?.scene as string | undefined);
  if (scene && PROTOCOLS[scene]) {
    return PROTOCOLS[scene];
  }

  // Check for review session context pushed by the scene
  if (pageContext.pageData?.reviewSession) {
    return PROTOCOLS['reinforcement-review'] ?? null;
  }

  // Match by space/pathname
  const space = pageContext.space?.toLowerCase();
  if (space && PROTOCOLS[space]) {
    return PROTOCOLS[space];
  }

  // Match by pathname segments
  const pathname = pageContext.pathname?.toLowerCase() ?? '';
  if (pathname.includes('/stage')) return PROTOCOLS['stage'] ?? null;
  if (pathname.includes('/soul')) return PROTOCOLS['soul'] ?? null;
  if (pathname.includes('/chassis')) return PROTOCOLS['chassis'] ?? null;
  if (pathname.includes('/artifacts')) return PROTOCOLS['artifacts'] ?? null;
  if (pathname.includes('/research')) return PROTOCOLS['research'] ?? null;

  return null;
}

// ============================================================================
// Process State — dynamic snapshot of active workflows
// ============================================================================

interface ProcessStateOptions {
  pageContext: LuvPageContext | null;
}

/**
 * Build a dynamic process state block describing active workflows.
 * This is computed per-request and injected into the system prompt.
 */
export async function resolveProcessState(options: ProcessStateOptions): Promise<string | null> {
  const parts: string[] = [];
  const { pageContext } = options;

  // Active review session from page context
  const reviewSession = pageContext?.pageData?.reviewSession as {
    id?: string;
    title?: string;
    status?: string;
    imageCount?: number;
  } | undefined;

  if (reviewSession?.id) {
    // Fetch actual evaluation state from DB
    try {
      const { getSessionWithItemsServer } = await import('../luv-review-server');
      const result = await getSessionWithItemsServer(reviewSession.id);
      if (result) {
        const total = result.items.length;
        const agentEvaluated = result.items.filter((i) => i.agent_classification).length;
        const humanEvaluated = result.items.filter((i) => i.human_classification).length;
        const bothDone = agentEvaluated === total && humanEvaluated === total && total > 0;

        parts.push([
          `ACTIVE REVIEW SESSION: "${result.session.title}" (${result.session.id})`,
          `  Status: ${result.session.status}`,
          `  Images: ${total}`,
          `  Agent evaluated: ${agentEvaluated}/${total}`,
          `  Human evaluated: ${humanEvaluated}/${total}`,
          bothDone
            ? '  → Both evaluations complete — ready for generate_session_report'
            : agentEvaluated < total
              ? `  → ${total - agentEvaluated} images need your evaluation (view then evaluate each)`
              : '  → Waiting for human evaluations to complete',
        ].join('\n'));
      }
    } catch {
      // Degrade gracefully
      parts.push(`ACTIVE REVIEW SESSION: "${reviewSession.title}" (${reviewSession.id})`);
    }
  }

  // Current page context summary
  if (pageContext?.viewLabel) {
    parts.push(`CURRENT VIEW: ${pageContext.viewLabel} (${pageContext.pathname})`);
  }

  return parts.length > 0 ? parts.join('\n\n') : null;
}
