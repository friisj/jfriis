/**
 * Remix Job Prompt Builders
 *
 * Three prompts for the remix sourcing pipeline:
 * 1. Search Translation: story + topics + colors -> search params
 * 2. Vision Evaluation: image + brief -> score + reasoning
 * 3. Selection Decision: evaluated candidates -> select or iterate
 */

import type { CogEvalProfile } from '@/lib/types/cog';

// ============================================================================
// Search Translation
// ============================================================================

interface SearchTranslationInput {
  story: string;
  topics: string[];
  colors: string[];
  targetAspectRatio?: string | null;
  previousIterations?: {
    searchParams: { queries: string[]; color?: string; orientation?: string };
    bestScore: number | null;
    bestReasoning: string | null;
    feedback: string | null;
  }[];
}

export function buildSearchTranslationPrompt(input: SearchTranslationInput): string {
  const { story, topics, colors, targetAspectRatio, previousIterations } = input;

  let iterationContext = '';
  if (previousIterations && previousIterations.length > 0) {
    iterationContext = `\n\nPREVIOUS SEARCH ATTEMPTS (adjust your strategy based on what didn't work):\n`;
    for (let i = 0; i < previousIterations.length; i++) {
      const iter = previousIterations[i];
      iterationContext += `\nAttempt ${i + 1}:
- Queries used: ${JSON.stringify(iter.searchParams.queries)}
- Color filter: ${iter.searchParams.color || 'none'}
- Orientation: ${iter.searchParams.orientation || 'any'}
- Best candidate score: ${iter.bestScore ?? 'N/A'}/10
- Best candidate reasoning: ${iter.bestReasoning || 'N/A'}
- Feedback for improvement: ${iter.feedback || 'N/A'}`;
    }
    iterationContext += `\n\nIMPORTANT: Use different search queries and strategies. Try broader or narrower terms, different angles on the subject, or alternative visual metaphors.`;
  }

  const orientationHint = targetAspectRatio
    ? `\nTarget aspect ratio: ${targetAspectRatio} (use this to determine orientation preference)`
    : '';

  return `You are a creative photo researcher. Your task is to translate a creative brief into optimal stock photo search parameters.

CREATIVE BRIEF:
Story: ${story}
Topics: ${topics.length > 0 ? topics.join(', ') : 'none specified'}
Colors: ${colors.length > 0 ? colors.join(', ') : 'none specified'}${orientationHint}${iterationContext}

Generate search parameters that will find the best matching stock photographs. Think about:
- What visual scenes, subjects, or compositions would represent this story?
- What specific search terms will find high-quality editorial/artistic photos?
- Should we filter by color tone or orientation?

Respond with ONLY a JSON object (no markdown, no explanation):
{
  "queries": ["query1", "query2", "query3"],
  "color": "optional_unsplash_color_filter",
  "orientation": "landscape|portrait|squarish or omit",
  "reasoning": "brief explanation of your search strategy"
}

Valid color values: black_and_white, black, white, yellow, orange, red, purple, magenta, green, teal, blue
Generate 2-4 diverse search queries that approach the subject from different angles.`;
}

// ============================================================================
// Vision Evaluation
// ============================================================================

interface VisionEvalInput {
  story: string;
  topics: string[];
  colors: string[];
  evalProfile?: CogEvalProfile | null;
}

export function buildVisionEvalPrompt(input: VisionEvalInput): string {
  const { story, topics, colors, evalProfile } = input;

  const briefSection = `CREATIVE BRIEF:
Story: ${story}
Topics: ${topics.length > 0 ? topics.join(', ') : 'none specified'}
Colors: ${colors.length > 0 ? colors.join(', ') : 'none specified'}`;

  // Profile-driven eval
  if (evalProfile && evalProfile.criteria.length > 0) {
    const persona = evalProfile.system_prompt
      ? evalProfile.system_prompt
      : 'You are an expert photo editor evaluating a stock photograph against a creative brief.';

    const criteriaList = evalProfile.criteria
      .map((c, i) => `${i + 1}. **${c.label}** (0-10): ${c.description}`)
      .join('\n');

    const weightDesc = evalProfile.criteria
      .map(c => `${c.label} ${Math.round(c.weight * 100)}%`)
      .join(', ');

    const jsonFields = evalProfile.criteria
      .map(c => `  "${c.key}": 8`)
      .join(',\n');

    return `${persona}

${briefSection}

Evaluate the image on these criteria:
${criteriaList}

Calculate an overall score (weighted average: ${weightDesc}).

Respond with ONLY a JSON object (no markdown, no explanation):
{
  "score": 7.5,
  "reasoning": "Brief explanation of the evaluation",
${jsonFields}
}`;
  }

  // Default hardcoded eval (backwards compatible)
  return `You are an expert photo editor evaluating a stock photograph against a creative brief.

${briefSection}

Evaluate the image on these criteria:
1. **Subject relevance** (0-10): How well does the subject matter match the story/topics?
2. **Mood alignment** (0-10): Does the mood/atmosphere match the narrative tone?
3. **Color match** (0-10): Do the colors align with the requested palette?
4. **Composition quality** (0-10): Is it well-composed, high quality, usable as editorial imagery?

Calculate an overall score (weighted average: subject 40%, mood 25%, color 15%, composition 20%).

Respond with ONLY a JSON object (no markdown, no explanation):
{
  "score": 7.5,
  "reasoning": "Brief explanation of the evaluation",
  "subject_score": 8,
  "mood_score": 7,
  "color_score": 6,
  "composition_score": 9
}`;
}

/**
 * Parse criterion scores from an eval response, mapping profile criteria keys to their scores.
 * Falls back to extracting hardcoded keys if no profile is provided.
 */
export function extractCriterionScores(
  parsed: Record<string, unknown>,
  evalProfile?: CogEvalProfile | null,
): Record<string, number> | null {
  if (evalProfile && evalProfile.criteria.length > 0) {
    const scores: Record<string, number> = {};
    for (const c of evalProfile.criteria) {
      const val = parsed[c.key];
      if (typeof val === 'number') scores[c.key] = val;
    }
    return Object.keys(scores).length > 0 ? scores : null;
  }
  // Default keys
  const defaults: Record<string, number> = {};
  for (const key of ['subject_score', 'mood_score', 'color_score', 'composition_score']) {
    const val = parsed[key];
    if (typeof val === 'number') defaults[key] = val;
  }
  return Object.keys(defaults).length > 0 ? defaults : null;
}

// ============================================================================
// Selection Decision
// ============================================================================

interface SelectionDecisionInput {
  candidates: {
    index: number;
    score: number | null;
    reasoning: string | null;
    source: string;
    thumbnailUrl: string;
  }[];
  iterationNumber: number;
  maxIterations: number;
  story: string;
  selectionThreshold?: number;
}

export function buildSelectionDecisionPrompt(input: SelectionDecisionInput): string {
  const { candidates, iterationNumber, maxIterations, story, selectionThreshold = 7 } = input;

  const candidatesList = candidates
    .filter((c) => c.score !== null)
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .map((c) => `  - Candidate #${c.index}: score ${c.score}/10 (${c.source}) - ${c.reasoning}`)
    .join('\n');

  const isLastIteration = iterationNumber >= maxIterations;

  return `You are a photo editor making a selection decision.

STORY: ${story}
ITERATION: ${iterationNumber} of ${maxIterations}
${isLastIteration ? 'THIS IS THE FINAL ITERATION - you MUST select the best available candidate.\n' : ''}
EVALUATED CANDIDATES (sorted by score):
${candidatesList}

Decision criteria:
- Score >= ${selectionThreshold}: Good enough to select
- Score >= ${Math.max(selectionThreshold - 2, 3)} but < ${selectionThreshold}: Acceptable if this is the last iteration, otherwise try again
- Score < ${Math.max(selectionThreshold - 2, 3)}: Not suitable${isLastIteration ? '\n- FINAL ITERATION: Select the highest-scoring candidate regardless of threshold' : ''}

Respond with ONLY a JSON object (no markdown, no explanation):
{
  "decision": "select" or "iterate",
  "selected_index": <candidate index if selecting, null if iterating>,
  "feedback": "if iterating, specific guidance for the next search attempt"
}`;
}
