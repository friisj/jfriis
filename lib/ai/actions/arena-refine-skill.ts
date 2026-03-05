/**
 * Arena Refine Skill Action
 *
 * Takes a SkillState + structured user feedback and returns a refined SkillState.
 * Part of the "gym" loop: users approve, adjust, or flag individual decisions,
 * and the AI produces a refined skill that converges toward the user's intent.
 */

import { z } from 'zod'
import { registerAction } from './index'
import type { Action } from './types'
// --- Schemas ---

const decisionSchema = z.object({
  id: z.string().optional(),
  label: z.string(),
  value: z.string().optional(),
  rationale: z.string(),
  intent: z.string().optional(),
  confidence: z.enum(['low', 'medium', 'high']).default('high'),
  source: z.string().default('gym'),
}).transform(d => ({
  ...d,
  id: d.id ?? `decision_${d.label.toLowerCase().replace(/\s+/g, '_')}`,
}))

const ruleSchema = z.object({
  id: z.string().optional(),
  statement: z.string(),
  type: z.enum(['must', 'should', 'must-not', 'prefer']),
  source: z.string().optional(),
})

const dimensionSchema = z.object({
  decisions: z.array(decisionSchema),
  rules: z.array(ruleSchema).transform(rules =>
    rules.map((r, i) => ({
      ...r,
      id: r.id ?? `rule_${i + 1}`,
      source: r.source ?? 'gym',
    }))
  ),
})

const feedbackItemSchema = z.object({
  dimension: z.string(),
  label: z.string(),
  action: z.enum(['approve', 'adjust', 'flag']),
  newValue: z.string().optional(),
  reason: z.string().optional(),
})

const segmentSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('text'), value: z.string() }),
  z.object({
    type: z.literal('grab'),
    componentName: z.string(),
    filePath: z.string().nullable(),
    lineNumber: z.number().nullable(),
    displayName: z.string(),
    elementTag: z.string(),
  }),
])

const annotationSchema = z.object({
  hatKey: z.enum(['white', 'red', 'black', 'yellow', 'green', 'blue']),
  segments: z.array(segmentSchema),
})

const inputSchema = z.object({
  currentSkill: z.record(z.string(), dimensionSchema),
  feedback: z.array(feedbackItemSchema),
  annotations: z.array(annotationSchema).default([]),
  notes: z.string(),
  iterationCount: z.number(),
  targetDimension: z.string().optional(),
})

type RefineInput = z.infer<typeof inputSchema>

const outputDimensionSchema = z.object({
  decisions: z.array(decisionSchema),
  rules: z.array(ruleSchema),
})

const themeUpdatesSchema = z.record(z.string(), z.record(z.string(), z.string())).optional()

const outputSchema = z.object({
  summary: z.string(),
  theme_updates: themeUpdatesSchema,
}).catchall(z.any()).transform((data) => {
  // Validate dimension keys (everything except summary/theme_updates) as dimension objects
  const result: Record<string, unknown> = { summary: data.summary, theme_updates: data.theme_updates }
  for (const [key, value] of Object.entries(data)) {
    if (key === 'summary' || key === 'theme_updates') continue
    const parsed = outputDimensionSchema.safeParse(value)
    if (parsed.success) {
      result[key] = parsed.data
    }
    // Silently drop non-dimension keys (e.g. "content" from post-processing)
  }
  return result
})

type RefineOutput = z.infer<typeof outputSchema>

// --- Prompt ---

const BASE_SYSTEM_PROMPT = `You are a design system refinement assistant. You receive a SkillState (design decisions and rules across one or more dimensions) along with structured user feedback on individual decisions.

Your job is to produce a REFINED SkillState that incorporates the user's feedback precisely.

## Two-Layer Model

Skills are purely qualitative — they express design philosophy, not token values.

- **Decisions** contain intent, rationale, confidence, and source. They do NOT contain token values.
- **Token values** live in the theme layer, separate from the skill. Token corrections go exclusively into the "theme_updates" output.

When refining:
- Annotations and general notes refine **intent** fields and rules (the skill layer).
- Token feedback (approve/adjust/flag) produces **token corrections** in "theme_updates" only.
- Do NOT add "value" fields to decisions. Decisions are qualitative only.

## Feedback Actions

Each feedback item targets a specific decision by dimension + label:

- **approve**: The user confirms the token is correct. Preserve intent. Set confidence to "high". The approved token value goes into theme_updates to confirm it.
- **adjust**: The user provides a new token value. Set rationale to reference the adjustment. Set confidence to "high". Refine intent if the adjustment reveals a philosophical shift. Put the new value in theme_updates.
- **flag**: The user flags this decision as problematic with a reason. Update intent to reflect the concern. Set confidence to "medium". Set rationale to explain the revised direction. Propose a corrected token value in theme_updates.

Decisions with NO feedback: keep rationale, intent, confidence, and source exactly as they were.

## Rules

- Preserve all existing rules unless they contradict the feedback.
- If feedback corroborates an existing rule, strengthen it (should -> must, prefer -> should).
- Add new rules ONLY if the general notes or feedback patterns clearly warrant them.
- Each iteration should produce FEWER changes than the last (convergence).`

function buildPrompt(input: RefineInput) {
  const allDims = Object.keys(input.currentSkill)
  // When scoped to a target dimension, only include that dimension in prompt/output
  const targetDim = input.targetDimension
  const outputDims = targetDim ? [targetDim] : allDims

  // Build dynamic decision labels section for system prompt
  const decisionLabelsSection = outputDims.map(dim => {
    const state = input.currentSkill[dim]
    const labels = state.decisions.map(d => d.label)
    return `### ${dim.charAt(0).toUpperCase() + dim.slice(1)} (${labels.length} decisions)\n${labels.map(l => `- "${l}"`).join('\n')}`
  }).join('\n\n')

  const scopeNote = targetDim
    ? `\n\n## Scope\n\nThis refinement targets the "${targetDim}" dimension ONLY. Output ONLY "${targetDim}" decisions and rules. Do NOT include other dimensions in your response.`
    : ''

  const systemPrompt = `${BASE_SYSTEM_PROMPT}

## Decision Labels

You MUST produce decisions with EXACTLY these labels for each dimension:

${decisionLabelsSection}

## Token Value Format (for theme_updates only)

- **Colors**: hex values (e.g. "#1A1A2E")
- **Font families**: family name strings (e.g. "Inter")
- **Font sizes**: pixel values with "px" suffix (e.g. "16px")
- **Font weights**: number as string (e.g. "600")
- **Spacing values**: pixel values with "px" suffix (e.g. "16px")

## Output Format

Output a single JSON object with ${targetDim ? `"${targetDim}"` : 'one key per dimension'}, plus "theme_updates" and "summary":
{
${outputDims.map(d => `  "${d}": { "decisions": [...], "rules": [...] }`).join(',\n')},
  "theme_updates": {
${outputDims.map(d => `    "${d}": { "Label": "value", ... }`).join(',\n')}
  },
  "summary": "2-3 sentence summary of what changed and why"
}

Each decision: { label, rationale, intent, confidence, source: "gym" }
Do NOT include "value" in decisions — token values go exclusively into theme_updates.

The "theme_updates" object contains token corrections per dimension. For each dimension, include a flat object mapping decision labels to their corrected values. Only include entries that changed (adjusted or flagged decisions). Omit dimensions with no token changes.

## Brevity

Keep intent fields concise (1-2 sentences max). Keep rationale to one sentence. Do NOT pad with filler or restate the obvious. Shorter = better.

## Structured Annotations

You may also receive structured annotations referencing specific UI elements.
Each annotation has a De Bono hat type indicating the thinking mode, and contains
interleaved text and grab references. Grab references use the format
\`@ComponentName:line\` and identify specific React components in the canonical preview.

- White (factual): objective observations about values, measurements, specs
- Red (emotional): gut feeling, aesthetic reaction — treat as soft signal
- Black (critical): problems, risks, failures — high-priority issues to address
- Yellow (positive): what works well — preserve these qualities
- Green (creative): alternative ideas — consider but don't blindly apply
- Blue (process): meta/priority notes — use to guide which changes matter most

Weight annotations by hat type: Black and White observations are highest priority.
Yellow observations identify constraints (preserve these aspects).
Green offers options, not directives.${scopeNote}`

  // Serialize current skill — only target dimension when scoped
  const skillSummary = outputDims.map(dim => {
    const state = input.currentSkill[dim]
    const decisions = state.decisions.map(d => {
      let line = `  ${d.label}: [${d.confidence}] — ${d.rationale}`
      if (d.intent) line += `\n    Intent: ${d.intent}`
      return line
    }).join('\n')
    const rules = state.rules.map(r =>
      `  ${r.type}: ${r.statement}`
    ).join('\n')
    return `### ${dim}\nDecisions:\n${decisions}\nRules:\n${rules || '  (none)'}`
  }).join('\n\n')

  // Serialize feedback
  const feedbackSummary = input.feedback.length > 0
    ? input.feedback.map(f => {
        let line = `- ${f.dimension}/${f.label}: ${f.action}`
        if (f.action === 'adjust' && f.newValue) line += ` -> "${f.newValue}"`
        if (f.reason) line += ` (reason: ${f.reason})`
        return line
      }).join('\n')
    : '(no specific decision feedback)'

  let user = `Refine this design skill based on user feedback. This is iteration ${input.iterationCount + 1}.

## Current Skill State

${skillSummary}

## User Feedback on Decisions

${feedbackSummary}

## General Notes from User

${input.notes || '(none)'}

Output JSON only.`

  // Serialize annotations as structured text
  if (input.annotations.length > 0) {
    const annotationLines = input.annotations.map(ann => {
      const serialized = ann.segments.map(seg =>
        seg.type === 'text' ? seg.value : `@${seg.componentName}${seg.lineNumber ? ':' + seg.lineNumber : ''}`
      ).join('')
      return `[${ann.hatKey.toUpperCase()} HAT]: ${serialized}`
    })
    user += `\n\n## Annotations\n\n${annotationLines.join('\n')}`
  }

  return { system: systemPrompt, user }
}

// --- Action registration ---

const arenaRefineSkillAction: Action<RefineInput, RefineOutput> = {
  id: 'arena-refine-skill',
  name: 'Arena Refine Skill',
  description: 'Refine a SkillState based on structured user feedback',
  entityTypes: ['studio_experiment'],
  taskType: 'classification',
  model: 'claude-haiku',
  maxOutputTokens: 8000,
  inputSchema,
  outputSchema,
  buildPrompt,
}

registerAction(arenaRefineSkillAction)

export { arenaRefineSkillAction }
export type { RefineInput, RefineOutput }
