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
  rootBackgrounds: z.array(z.string()).optional(),
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

Your job is to CLASSIFY these values into semantic roles and generate design rules.

## Decision Labels

You MUST produce decisions with EXACTLY these labels:

### Color (${DECISION_LABELS.color.length} decisions)
${DECISION_LABELS.color.map(l => `- "${l}"`).join('\n')}

### Typography (${DECISION_LABELS.typography.length} decisions)
${DECISION_LABELS.typography.map(l => `- "${l}"`).join('\n')}

### Spacing (${DECISION_LABELS.spacing.length} decisions)
${DECISION_LABELS.spacing.map(l => `- "${l}"`).join('\n')}

## Classification Signals

### Colors — Background Detection (CRITICAL)

**Root frame backgrounds are the strongest signal.** If root backgrounds are provided, they ARE the Background color. Do NOT override this with frequency-based guessing.

- If root backgrounds are dark (#000-#333): this is a DARK THEME. Background = root fill, Text = white/light color.
- If root backgrounds are light (#EEE-#FFF): this is a LIGHT THEME. Background = root fill, Text = dark color.
- Frequency alone is NOT reliable for Background — nested elements with different fills often outnumber the root background.

**After Background is assigned:**
- Text: the high-contrast color opposite to Background (dark bg → light text, light bg → dark text)
- Muted: a mid-tone gray or desaturated color
- Border: stroke colors, or subtle gray fills on separators
- Primary: the most saturated/vibrant color — often used on buttons, CTAs, links
- Accent: a secondary saturated color, or if only one saturated color exists, a tonal variation

### Fonts
- The most common font family at larger sizes → Display Font
- The most common font family at body sizes → Body Font
- Monospace fonts → Mono Font (if none found, use "ui-monospace, monospace")
- Largest common size → Heading Size (use exact value with "px" suffix)
- Most frequent mid-range size → Body Size (use exact value with "px" suffix)
- Smallest common size → Small Size (use exact value with "px" suffix)
- Weight at heading sizes → Heading Weight (number as string, e.g. "600")
- Weight at body sizes → Body Weight (number as string, e.g. "400")

### Spacing
- Most frequent padding value → Padding (use exact value with "px" suffix)
- Most frequent gap value → Gap (use exact value with "px" suffix)
- Most frequent corner-radius → Border Radius (use exact value with "px" suffix)

## Value Format

- **Colors**: exact hex values from extraction (e.g. "#1A1A2E")
- **Font families**: exact family name strings (e.g. "RM Neue VF")
- **Font sizes**: exact pixel values with "px" suffix (e.g. "16px")
- **Font weights**: number as string (e.g. "600")
- **Spacing values**: exact pixel values with "px" suffix (e.g. "16px")

Use the EXACT values from the extraction. Do not modify, round, or substitute them.

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

Each decision: { label, value, rationale, confidence: "high", source: "figma" }`

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

  const rootBgSection = input.rootBackgrounds && input.rootBackgrounds.length > 0
    ? `\n## Root Frame Backgrounds (STRONGEST signal for Background color)\n${input.rootBackgrounds.join(', ')}\n`
    : ''

  const text = `Classify these exact Figma design tokens into semantic roles.
${rootBgSection}
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
