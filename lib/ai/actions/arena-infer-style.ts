/**
 * Arena Infer Style Action
 *
 * Multimodal action that analyzes screenshots or HTML content
 * and produces SkillDecision[] + SkillRule[] for the Arena design system.
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
  source: z.string(),
})

const dimensionSchema = z.object({
  decisions: z.array(decisionSchema),
  rules: z.array(ruleSchema),
})

const inputSchema = z.object({
  inputType: z.enum(['image', 'url']),
  inputLabel: z.string(),
  inputContent: z.string(), // base64 data URL for images, HTML text for URLs
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
  color: ['Primary', 'Background', 'Text', 'Muted', 'Border'],
  typography: ['Font Family', 'Heading Size', 'Body Size', 'Small Size'],
  spacing: ['Padding', 'Gap', 'Border Radius'],
}

// --- Prompt construction ---

const SYSTEM_PROMPT = `You are a design system analyst. You examine visual interfaces (screenshots or HTML) and extract precise design tokens.

Your job is to produce a JSON skill state with three dimensions: color, typography, and spacing.

CRITICAL: You must produce decisions with EXACTLY these labels:

Color decisions:
- "Primary" — the dominant brand/action color (hex)
- "Background" — the main background color (hex)
- "Text" — primary text color (hex)
- "Muted" — secondary/muted text color (hex)
- "Border" — border/divider color (hex)

Typography decisions:
- "Font Family" — the primary font family (CSS value)
- "Heading Size" — heading font size (e.g. "18px")
- "Body Size" — body text font size (e.g. "14px")
- "Small Size" — small/caption font size (e.g. "12px")

Spacing decisions:
- "Padding" — standard padding (e.g. "16px")
- "Gap" — standard gap between elements (e.g. "12px")
- "Border Radius" — border radius (e.g. "8px")

Each decision needs: id (unique string), label (from above), value, rationale (why you chose this), confidence (low/medium/high), source (use the inputLabel).

Rules are optional observations like "prefer warm neutrals" or "must-not use pure black". Each rule needs: id, statement, type (must/should/must-not/prefer), source.

Output a single JSON object:
{
  "color": { "decisions": [...], "rules": [...] },
  "typography": { "decisions": [...], "rules": [...] },
  "spacing": { "decisions": [...], "rules": [...] },
  "summary": "2-3 sentence description of the visual style detected"
}

Be precise with hex colors — use exact values you observe, not approximations. For typography, infer the font family from visual characteristics (serif vs sans-serif, geometric vs humanist, etc). For spacing, estimate from visual proportions.`

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
      text: `Here is the current accumulated skill state from previous inputs. Refine these decisions based on the new input — update values if the new input suggests different tokens, increase confidence where corroborated, and add rules if you notice patterns:\n\n${existing}`,
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
      text: `Analyze this screenshot (from "${input.inputLabel}") and extract design tokens. Output JSON only.`,
    })
  } else {
    content.push({
      type: 'text',
      text: `Analyze the following HTML/CSS from "${input.inputLabel}" and extract design tokens.\n\n---\n${input.inputContent}\n---\n\nOutput JSON only.`,
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
  description: 'Analyze screenshots or HTML to extract design tokens into a skill state',
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
