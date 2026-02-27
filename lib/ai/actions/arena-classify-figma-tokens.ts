/**
 * Arena Classify Figma Tokens Action
 *
 * Takes deterministically extracted tokens from Figma nodes and classifies
 * them into semantic roles (Primary, Accent, Background, etc.) to produce
 * a SkillState. Values are exact — the AI only assigns labels and generates rules.
 */

import { z } from 'zod'
import { registerAction } from './index'
import type { Action } from './types'
import { DECISION_LABELS } from '@/lib/studio/arena/types'

// --- Schemas ---

const extractedColorSchema = z.object({
  hex: z.string(),
  count: z.number(),
  nodeNames: z.array(z.string()),
  usage: z.enum(['fill', 'stroke']),
})

const extractedFontSchema = z.object({
  family: z.string(),
  size: z.number(),
  weight: z.number(),
  count: z.number(),
  nodeNames: z.array(z.string()),
})

const extractedSpacingSchema = z.object({
  type: z.enum(['padding', 'gap', 'corner-radius']),
  value: z.number(),
  count: z.number(),
})

const decisionSchema = z.object({
  id: z.string().optional(),
  label: z.string(),
  value: z.string(),
  rationale: z.string(),
  confidence: z.enum(['low', 'medium', 'high']).default('high'),
  source: z.string().default('figma'),
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
      source: r.source ?? 'figma',
    }))
  ),
})

const inputSchema = z.object({
  colors: z.array(extractedColorSchema),
  fonts: z.array(extractedFontSchema),
  spacing: z.array(extractedSpacingSchema),
  frameNames: z.array(z.string()),
})

type ClassifyInput = z.infer<typeof inputSchema>

const outputSchema = z.object({
  color: dimensionSchema,
  typography: dimensionSchema,
  spacing: dimensionSchema,
  summary: z.string(),
})

type ClassifyOutput = z.infer<typeof outputSchema>

// --- Prompt ---

const SYSTEM_PROMPT = `You are a design system analyst. You receive EXACT values extracted from a Figma file — hex colors, font families, font sizes, weights, padding, gap, and corner radius values with frequency counts.

Your job is to CLASSIFY these values into semantic roles and generate design rules. Do NOT modify or estimate values — use them exactly as provided.

## Decision Labels

You MUST produce decisions with EXACTLY these labels:

### Color (${DECISION_LABELS.color.length} decisions)
${DECISION_LABELS.color.map(l => `- "${l}"`).join('\n')}

### Typography (${DECISION_LABELS.typography.length} decisions)
${DECISION_LABELS.typography.map(l => `- "${l}"`).join('\n')}

### Spacing (${DECISION_LABELS.spacing.length} decisions)
${DECISION_LABELS.spacing.map(l => `- "${l}"`).join('\n')}

## Classification Signals

Use these signals to assign semantic roles:

**Colors:**
- Most frequent fill color is likely Background
- Darkest high-frequency fill is likely Text
- Medium gray fills/strokes are likely Muted or Border
- Saturated colors with lower frequency are likely Primary or Accent
- Stroke colors are often Border
- Node names containing "button", "cta", "link" suggest Primary usage

**Fonts:**
- The most common font family at larger sizes → Display Font
- The most common font family at body sizes → Body Font
- Monospace fonts → Mono Font (if none found, use "ui-monospace, monospace")
- Largest common size → Heading Size
- Most frequent mid-range size → Body Size
- Smallest common size → Small Size
- Weight at heading sizes → Heading Weight
- Weight at body sizes → Body Weight

**Spacing:**
- Most frequent padding value → Padding
- Most frequent gap value → Gap
- Most frequent corner-radius → Border Radius

## Rules

Generate 1-3 rules per dimension describing the design principles you observe. Use the format:
- type: "must" | "should" | "must-not" | "prefer"
- statement: specific, actionable rule

Include exactly ONE aesthetic posture rule in the color dimension:
- type: "prefer", statement: "Aesthetic posture: [descriptor] — [1-sentence explanation]"

## Output Format

Output a single JSON object:
{
  "color": { "decisions": [...], "rules": [...] },
  "typography": { "decisions": [...], "rules": [...] },
  "spacing": { "decisions": [...], "rules": [...] },
  "summary": "2-3 sentence description of the visual style"
}

Each decision: { id, label, value, rationale, confidence: "high" (exact values), source: "figma" }

IMPORTANT: Use the EXACT hex values, font families, sizes, and spacing values provided. Do not round, modify, or substitute them.`

function buildMessages(input: ClassifyInput) {
  const colorSummary = input.colors.slice(0, 20).map(c =>
    `${c.hex} (${c.usage}, ${c.count}x, nodes: ${c.nodeNames.slice(0, 3).join(', ')}${c.nodeNames.length > 3 ? '...' : ''})`
  ).join('\n')

  const fontSummary = input.fonts.slice(0, 15).map(f =>
    `${f.family} ${f.size}px w${f.weight} (${f.count}x, nodes: ${f.nodeNames.slice(0, 3).join(', ')}${f.nodeNames.length > 3 ? '...' : ''})`
  ).join('\n')

  const spacingSummary = input.spacing.slice(0, 15).map(s =>
    `${s.type}: ${s.value}px (${s.count}x)`
  ).join('\n')

  const text = `Classify these exact Figma design tokens into semantic roles.

## Extracted Colors (${input.colors.length} unique)
${colorSummary || 'None found'}

## Extracted Fonts (${input.fonts.length} unique)
${fontSummary || 'None found'}

## Extracted Spacing (${input.spacing.length} unique)
${spacingSummary || 'None found'}

## Frame Names
${input.frameNames.join(', ') || 'None'}

Output JSON only.`

  return {
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user' as const, content: [{ type: 'text' as const, text }] }],
  }
}

// --- Action registration ---

const arenaClassifyFigmaTokensAction: Action<ClassifyInput, ClassifyOutput> = {
  id: 'arena-classify-figma-tokens',
  name: 'Arena Classify Figma Tokens',
  description: 'Classify extracted Figma tokens into semantic design roles',
  entityTypes: ['studio_experiment'],
  taskType: 'classification',
  model: 'claude-haiku',
  inputSchema,
  outputSchema,
  buildPrompt: () => ({ system: '', user: '' }),
  buildMessages,
}

registerAction(arenaClassifyFigmaTokensAction)

export { arenaClassifyFigmaTokensAction }
export type { ClassifyInput, ClassifyOutput }
