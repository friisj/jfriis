/**
 * Arena Infer Style Action
 *
 * Multimodal action that analyzes screenshots or HTML content
 * and produces SkillDecision[] + SkillRule[] for the Arena design system.
 *
 * Prompt vocabulary drawn from the frontend-design skill to ensure
 * the model looks for the right design characteristics.
 */

import { z } from 'zod'
import { registerAction } from './index'
import type { Action } from './types'

// --- Schemas ---

const decisionSchema = z.object({
  id: z.string(),
  label: z.string(),
  value: z.string(),
  rationale: z.string(),
  confidence: z.enum(['low', 'medium', 'high']),
  source: z.string(),
})

const ruleSchema = z.object({
  id: z.string(),
  statement: z.string(),
  type: z.enum(['must', 'should', 'must-not', 'prefer']),
  source: z.string().optional(),
})

const dimensionSchema = z.object({
  decisions: z.array(decisionSchema),
  rules: z.array(ruleSchema),
})

const inputSchema = z.object({
  inputType: z.enum(['image', 'url', 'svg', 'css']),
  inputLabel: z.string(),
  inputContent: z.string(), // base64 data URL for images, HTML for URLs, SVG markup, or CSS text
  currentSkill: z
    .object({
      color: dimensionSchema,
      typography: dimensionSchema,
      spacing: dimensionSchema,
    })
    .optional(),
})

type InferStyleInput = z.infer<typeof inputSchema>

const outputSchema = z.object({
  color: dimensionSchema,
  typography: dimensionSchema,
  spacing: dimensionSchema,
  summary: z.string(),
})

type InferStyleOutput = z.infer<typeof outputSchema>

// --- Decision labels that must match the canonical components ---

const DECISION_LABELS = {
  color: ['Primary', 'Accent', 'Background', 'Text', 'Muted', 'Border'],
  typography: [
    'Display Font', 'Body Font',
    'Heading Size', 'Body Size', 'Small Size',
    'Heading Weight', 'Body Weight',
  ],
  spacing: ['Padding', 'Gap', 'Border Radius'],
}

// --- Prompt construction ---

const SYSTEM_PROMPT = `You are a design system analyst with deep typographic and chromatic expertise. You examine visual interfaces and extract precise, opinionated design tokens.

Your job is to produce a JSON skill state with three dimensions: color, typography, and spacing. You must also produce RULES — these are the design principles that govern how the tokens relate to each other and what aesthetic posture they express.

## Decision Labels

You MUST produce decisions with EXACTLY these labels:

### Color (6 decisions)
- "Primary" — the dominant brand/action color (hex). This is the color that carries the most semantic weight.
- "Accent" — a secondary highlight or contrast color (hex). Used for secondary actions, badges, or visual punctuation. If the interface is monochromatic, this may be a tonal shift of the primary.
- "Background" — the main surface/background color (hex).
- "Text" — primary text color (hex).
- "Muted" — secondary/de-emphasized text color (hex).
- "Border" — border/divider/separator color (hex).

### Typography (7 decisions)
- "Display Font" — the font family used for headings and display text (CSS value, e.g. "Georgia, serif"). Look for distinctive, characterful choices — serif vs sans-serif, geometric vs humanist, condensed vs extended.
- "Body Font" — the font family used for body/paragraph text (CSS value). Often a more readable companion to the display font.
- "Heading Size" — heading/title font size (e.g. "20px").
- "Body Size" — body text font size (e.g. "15px").
- "Small Size" — small/caption/metadata font size (e.g. "12px").
- "Heading Weight" — font weight for headings (e.g. "700", "600", "bold").
- "Body Weight" — font weight for body text (e.g. "400", "normal").

### Spacing (3 decisions)
- "Padding" — standard internal padding (e.g. "16px").
- "Gap" — standard gap between sibling elements (e.g. "12px").
- "Border Radius" — corner rounding (e.g. "8px", "0px" for sharp, "9999px" for pill).

Each decision needs: id (unique string), label (from above), value, rationale (why you chose this — reference what you observed), confidence (low/medium/high), source (use the inputLabel).

## Rules

Rules are NOT optional. Every dimension should have at least 1-2 rules. Rules capture the design principles and aesthetic character that go BEYOND raw token values.

Each rule needs: id (unique string like "rule-color-1"), statement (the rule text), type ("must" | "should" | "must-not" | "prefer").

### Rule Categories to Consider

**Color rules** — How does the palette relate?
- Dominance pattern: Is primary used as sparse accent or as a fill? Is the palette high-contrast or muted?
- Temperature: Warm neutrals, cool grays, or mixed?
- Surface treatment: Flat solids, subtle gradients, noise/texture, layered transparencies?

**Typography rules** — What typographic strategy is at work?
- Font pairing relationship: Is the display font paired with a contrasting body font, or are they the same family at different weights?
- Typographic hierarchy: Tight scale (small differences between sizes) or dramatic scale (large headings, small body)?
- Character: Does the typography feel editorial, technical, playful, luxurious, utilitarian?

**Spacing rules** — What spatial philosophy is expressed?
- Density: Generous negative space or controlled density?
- Rhythm: Even/mathematical spacing or organic/varied?
- Edges: Sharp corners (brutalist/technical) or rounded (friendly/soft) or pill shapes (modern/app-like)?

### Strong vs Weak Rules

WEAK (too vague, don't write these):
- "prefer warm colors"
- "use good spacing"
- "typography should be readable"

STRONG (specific, actionable, write these):
- "must use primary as sparse accent on interactive elements only, never as a background fill"
- "should pair a serif display font with a sans-serif body font for editorial contrast"
- "must-not use evenly-distributed color — primary should dominate, accent should punctuate"
- "prefer generous negative space with padding at least 1.5x the gap value"
- "should maintain tight typographic scale — heading no more than 1.4x body size"

### Aesthetic Posture

Include exactly ONE rule in the color dimension that identifies the overall aesthetic tone. Use this format:
- type: "prefer", statement: "Aesthetic posture: [descriptor] — [1-sentence explanation]"

Example descriptors: brutally minimal, maximalist, retro-futuristic, organic/natural, luxury/refined, editorial/magazine, brutalist/raw, soft/pastel, industrial/utilitarian, warm corporate, dark technical.

## Output Format

Output a single JSON object:
{
  "color": { "decisions": [...], "rules": [...] },
  "typography": { "decisions": [...], "rules": [...] },
  "spacing": { "decisions": [...], "rules": [...] },
  "summary": "2-3 sentence description of the visual style, its distinguishing characteristics, and what makes it distinctive or generic"
}

## Analysis Guidance

- Be precise with hex colors — extract exact values, not approximations.
- For typography, identify the font family from visual characteristics: stroke contrast, x-height, terminal shapes, letter spacing. Name the closest known typeface if you can (e.g. "SF Pro, system-ui, sans-serif"). If both headings and body use the same font, set both Display Font and Body Font to the same value but note this in a rule.
- For spacing, measure proportional relationships — is padding roughly 1x, 1.5x, or 2x the gap?
- Pay attention to what is NOT there: absence of border radius, absence of color, monochromatic palette — these are as important as what's present.`

function buildMessages(input: InferStyleInput) {
  const content: Array<
    | { type: 'text'; text: string }
    | { type: 'image'; image: string }
  > = []

  // Add current skill context if accumulating
  if (input.currentSkill) {
    const existing = JSON.stringify(input.currentSkill, null, 2)
    content.push({
      type: 'text',
      text: `Here is the current accumulated skill state from previous inputs. Refine these decisions based on the new input — update values if the new input provides stronger evidence, increase confidence where corroborated, sharpen rules where patterns repeat, and add new rules if you notice cross-input patterns:\n\n${existing}`,
    })
  }

  // Add the input content
  if (input.inputType === 'image') {
    // Pass full data URL — the AI SDK handles parsing it internally
    content.push({
      type: 'image',
      image: input.inputContent,
    })
    content.push({
      type: 'text',
      text: `Analyze this screenshot (from "${input.inputLabel}") and extract design tokens + rules. Output JSON only.`,
    })
  } else if (input.inputType === 'svg') {
    content.push({
      type: 'text',
      text: `Analyze the following SVG markup from "${input.inputLabel}". This is structured vector data — extract EXACT values from fill, stroke, font-family, font-size, font-weight, rx/ry attributes, and spacing/dimension values. These are ground truth values from the source file, not estimates. Prefer these over visual guesses.\n\n\`\`\`svg\n${input.inputContent}\n\`\`\`\n\nOutput JSON only.`,
    })
  } else if (input.inputType === 'css') {
    content.push({
      type: 'text',
      text: `Analyze the following CSS from "${input.inputLabel}". This CSS was copied directly from a design tool (e.g. Figma Inspect) and contains exact design token values. Extract colors from color/background-color/border-color, typography from font-family/font-size/font-weight/line-height, and spacing from padding/margin/gap/border-radius. These are ground truth values — use them directly, do not estimate.\n\n\`\`\`css\n${input.inputContent}\n\`\`\`\n\nOutput JSON only.`,
    })
  } else {
    content.push({
      type: 'text',
      text: `Analyze the following HTML/CSS from "${input.inputLabel}" and extract design tokens + rules.\n\n---\n${input.inputContent}\n---\n\nOutput JSON only.`,
    })
  }

  return {
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user' as const, content }],
  }
}

// --- Action registration ---

const arenaInferStyleAction: Action<InferStyleInput, InferStyleOutput> = {
  id: 'arena-infer-style',
  name: 'Arena Infer Style',
  description: 'Analyze screenshots or HTML to extract design tokens and rules into a skill state',
  entityTypes: ['studio_experiment'],
  taskType: 'analysis',
  model: 'claude-sonnet',
  inputSchema,
  outputSchema,
  // buildPrompt is required by the interface but buildMessages takes precedence
  buildPrompt: () => ({ system: '', user: '' }),
  buildMessages,
}

registerAction(arenaInferStyleAction)

export { arenaInferStyleAction, DECISION_LABELS }
export type { InferStyleInput, InferStyleOutput }
