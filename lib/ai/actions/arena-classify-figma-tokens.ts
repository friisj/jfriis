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
import { clusterColors } from '@/lib/studio/arena/figma-extractor'

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
  lineHeightPx: z.number().optional(),
  letterSpacing: z.number().optional(),
})

const extractedSpacingSchema = z.object({
  type: z.enum(['padding', 'gap', 'corner-radius']),
  value: z.number(),
  count: z.number(),
})

const extractedShadowSchema = z.object({
  type: z.enum(['drop', 'inner']),
  offsetX: z.number(),
  offsetY: z.number(),
  blurRadius: z.number(),
  spreadRadius: z.number(),
  color: z.string(),
  count: z.number(),
})

const decisionSchema = z.object({
  id: z.string().optional(),
  label: z.string(),
  value: z.string().optional(),
  rationale: z.string(),
  intent: z.string().optional(),
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
  shadows: z.array(extractedShadowSchema).optional(),
  frameNames: z.array(z.string()),
  rootBackgrounds: z.array(z.string()).optional(),
  fontOverrides: z.object({
    display: z.string().optional(),
    body: z.string().optional(),
    mono: z.string().optional(),
  }).optional(),
})

type ClassifyInput = z.infer<typeof inputSchema>

const themeTokensSchema = z.record(z.string(), z.record(z.string(), z.string())).optional()

const outputSchema = z.object({
  summary: z.string(),
  theme_tokens: themeTokensSchema,
}).catchall(dimensionSchema)

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
Font families (Display Font, Body Font, Mono Font) are pre-determined by the user and provided as overrides. Do NOT classify font families from extraction data — only classify sizes, weights, line heights, and letter spacing.

- Largest common size → Heading Size (use exact value with "px" suffix)
- Most frequent mid-range size → Body Size (use exact value with "px" suffix)
- Smallest common size → Small Size (use exact value with "px" suffix)
- Weight at heading sizes → Heading Weight (number as string, e.g. "600")
- Weight at body sizes → Body Weight (number as string, e.g. "400")
- Line height at body sizes → Line Height (e.g. "1.5")
- Line height at heading sizes → Heading Line Height (e.g. "1.2")
- Letter spacing at body sizes → Letter Spacing (e.g. "0px")
- Letter spacing at headings → Heading Letter Spacing (e.g. "-0.5px")

### Spacing
- Most frequent padding value → Padding (use exact value with "px" suffix)
- Most frequent gap value → Gap (use exact value with "px" suffix)
- Most frequent corner-radius → Border Radius (use exact value with "px" suffix)

### Elevation (from shadow data)
If shadow data is provided, classify elevation levels:
- No shadow or very subtle → None (value: "none")
- Small offsets, low blur (1-4px) → Low (value: CSS box-shadow, e.g. "0 1px 3px rgba(0,0,0,0.1)")
- Medium offsets, moderate blur (4-12px) → Medium (value: CSS box-shadow)
- Large offsets, high blur (12px+) → High (value: CSS box-shadow)
If no shadows are provided, omit the elevation dimension entirely.

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

Output a single JSON object with decisions (qualitative) and theme_tokens (quantitative) separated:
{
  "color": { "decisions": [...], "rules": [...] },
  "typography": { "decisions": [...], "rules": [...] },
  "spacing": { "decisions": [...], "rules": [...] },
  "theme_tokens": {
    "color": { "Primary": "#hex", "Accent": "#hex", ... },
    "typography": { "Display Font": "family", "Body Size": "16px", ... },
    "spacing": { "Padding": "16px", "Gap": "12px", ... }
  },
  "summary": "2-3 sentence description of the visual style"
}

Each decision: { label, rationale, intent, confidence: "high", source: "figma" }
Do NOT include "value" in decisions — token values go exclusively into theme_tokens.
The "intent" field describes the design philosophy for each token role (1-2 sentences).
The "theme_tokens" object contains the exact extracted values per dimension.`

function buildMessages(input: ClassifyInput) {
  const clustered = clusterColors(input.colors)
  const colorSummary = clustered.slice(0, 20).map(c =>
    `${c.hex} (${c.usage}, ${c.count}x, nodes: ${c.nodeNames.slice(0, 3).join(', ')}${c.nodeNames.length > 3 ? '...' : ''})`
  ).join('\n')

  const fontSummary = input.fonts.slice(0, 15).map(f => {
    let line = `${f.size}px w${f.weight}`
    if (f.lineHeightPx) line += ` lh:${f.lineHeightPx}px`
    if (f.letterSpacing) line += ` ls:${f.letterSpacing}px`
    line += ` (${f.count}x, nodes: ${f.nodeNames.slice(0, 3).join(', ')}${f.nodeNames.length > 3 ? '...' : ''})`
    return line
  }).join('\n')

  const spacingSummary = input.spacing.slice(0, 15).map(s =>
    `${s.type}: ${s.value}px (${s.count}x)`
  ).join('\n')

  const shadowSummary = input.shadows?.slice(0, 10).map(s =>
    `${s.type}: offset(${s.offsetX},${s.offsetY}) blur:${s.blurRadius}px spread:${s.spreadRadius}px ${s.color} (${s.count}x)`
  ).join('\n') ?? ''

  const rootBgSection = input.rootBackgrounds && input.rootBackgrounds.length > 0
    ? `\n## Root Frame Backgrounds (STRONGEST signal for Background color)\n${input.rootBackgrounds.join(', ')}\n`
    : ''

  const fontOverridesSection = input.fontOverrides
    ? `\n## Font Overrides (pre-determined by user — do NOT override these)\n${
        [
          input.fontOverrides.display && `Display Font: ${input.fontOverrides.display}`,
          input.fontOverrides.body && `Body Font: ${input.fontOverrides.body}`,
          input.fontOverrides.mono && `Mono Font: ${input.fontOverrides.mono}`,
        ].filter(Boolean).join('\n')
      }\n`
    : ''

  const text = `Classify these exact Figma design tokens into semantic roles.
${rootBgSection}${fontOverridesSection}
## Extracted Colors (${clustered.length} unique, clustered from ${input.colors.length})
${colorSummary || 'None found'}

## Extracted Font Styles (${input.fonts.length} unique — sizes/weights only, families pre-determined)
${fontSummary || 'None found'}

## Extracted Spacing (${input.spacing.length} unique)
${spacingSummary || 'None found'}

## Extracted Shadows (${input.shadows?.length ?? 0})
${shadowSummary || 'None found'}

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
  model: 'claude-sonnet',
  inputSchema,
  outputSchema,
  buildPrompt: () => ({ system: '', user: '' }),
  buildMessages,
}

registerAction(arenaClassifyFigmaTokensAction)

export { arenaClassifyFigmaTokensAction }
export type { ClassifyInput, ClassifyOutput }
