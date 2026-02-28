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
import { DECISION_LABELS } from '@/lib/studio/arena/types'

// --- Schemas ---

const decisionSchema = z.object({
  id: z.string().optional(),
  label: z.string(),
  value: z.string(),
  rationale: z.string(),
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
  dimension: z.enum(['color', 'typography', 'spacing']),
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
  currentSkill: z.object({
    color: dimensionSchema,
    typography: dimensionSchema,
    spacing: dimensionSchema,
  }),
  feedback: z.array(feedbackItemSchema),
  annotations: z.array(annotationSchema).default([]),
  notes: z.string(),
  iterationCount: z.number(),
})

type RefineInput = z.infer<typeof inputSchema>

const outputDimensionSchema = z.object({
  decisions: z.array(decisionSchema),
  rules: z.array(ruleSchema),
})

const outputSchema = z.object({
  color: outputDimensionSchema,
  typography: outputDimensionSchema,
  spacing: outputDimensionSchema,
  summary: z.string(),
})

type RefineOutput = z.infer<typeof outputSchema>

// --- Prompt ---

const SYSTEM_PROMPT = `You are a design system refinement assistant. You receive a SkillState (design decisions and rules across color, typography, and spacing) along with structured user feedback on individual decisions.

Your job is to produce a REFINED SkillState that incorporates the user's feedback precisely.

## Feedback Actions

Each feedback item targets a specific decision by dimension + label:

- **approve**: The user confirms this value is correct. Keep value EXACTLY as-is. Set confidence to "high".
- **adjust**: The user provides a new value. Use their newValue EXACTLY. Set rationale to "User adjusted from [old] to [new]: [reason]". Set confidence to "high".
- **flag**: The user flags this decision as problematic with a reason. You should propose a BETTER value based on the user's reason and the overall design context. Set confidence to "medium". Set rationale to explain your proposal referencing the user's concern.

Decisions with NO feedback: keep value, rationale, confidence, and source exactly as they were.

## Decision Labels

You MUST produce decisions with EXACTLY these labels:

### Color (${DECISION_LABELS.color.length} decisions)
${DECISION_LABELS.color.map(l => `- "${l}"`).join('\n')}

### Typography (${DECISION_LABELS.typography.length} decisions)
${DECISION_LABELS.typography.map(l => `- "${l}"`).join('\n')}

### Spacing (${DECISION_LABELS.spacing.length} decisions)
${DECISION_LABELS.spacing.map(l => `- "${l}"`).join('\n')}

## Rules

- Preserve all existing rules unless they contradict the feedback.
- If feedback corroborates an existing rule, strengthen it (should -> must, prefer -> should).
- Add new rules ONLY if the general notes or feedback patterns clearly warrant them.
- Each iteration should produce FEWER changes than the last (convergence).

## Value Format

- **Colors**: hex values (e.g. "#1A1A2E")
- **Font families**: family name strings (e.g. "Inter")
- **Font sizes**: pixel values with "px" suffix (e.g. "16px")
- **Font weights**: number as string (e.g. "600")
- **Spacing values**: pixel values with "px" suffix (e.g. "16px")

## Output Format

Output a single JSON object:
{
  "color": { "decisions": [...], "rules": [...] },
  "typography": { "decisions": [...], "rules": [...] },
  "spacing": { "decisions": [...], "rules": [...] },
  "summary": "2-3 sentence summary of what changed and why"
}

Each decision: { label, value, rationale, confidence, source: "gym" }

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
Green offers options, not directives.`

function buildPrompt(input: RefineInput) {
  const dims = ['color', 'typography', 'spacing'] as const

  // Serialize current skill
  const skillSummary = dims.map(dim => {
    const state = input.currentSkill[dim]
    const decisions = state.decisions.map(d =>
      `  ${d.label}: ${d.value} [${d.confidence}] — ${d.rationale}`
    ).join('\n')
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

  return { system: SYSTEM_PROMPT, user }
}

// --- Action registration ---

const arenaRefineSkillAction: Action<RefineInput, RefineOutput> = {
  id: 'arena-refine-skill',
  name: 'Arena Refine Skill',
  description: 'Refine a SkillState based on structured user feedback',
  entityTypes: ['studio_experiment'],
  taskType: 'classification',
  model: 'claude-haiku',
  inputSchema,
  outputSchema,
  buildPrompt,
}

registerAction(arenaRefineSkillAction)

export { arenaRefineSkillAction }
export type { RefineInput, RefineOutput }
