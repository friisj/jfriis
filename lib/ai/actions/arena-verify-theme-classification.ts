/**
 * Arena Verify Theme Classification Action
 *
 * Takes classified theme tokens and reference screenshots, uses vision
 * to verify that role assignments match the actual design.
 */

import { z } from 'zod'
import { registerAction } from './index'
import type { Action } from './types'

// --- Schemas ---

const correctionSchema = z.object({
  dimension: z.string(),
  label: z.string(),
  currentValue: z.string(),
  suggestedValue: z.string().optional(),
  status: z.enum(['confirmed', 'flagged', 'uncertain']),
  explanation: z.string(),
})

const inputSchema = z.object({
  themeTokens: z.record(z.string(), z.record(z.string(), z.string())),
  summary: z.string(),
  images: z.array(z.object({
    dataUrl: z.string(),
    label: z.string().optional(),
  })).min(1).max(3),
})

type VerifyInput = z.infer<typeof inputSchema>

const outputSchema = z.object({
  corrections: z.array(correctionSchema),
  overallConfidence: z.enum(['low', 'medium', 'high']),
  notes: z.string(),
})

type VerifyOutput = z.infer<typeof outputSchema>

// --- Prompt ---

const SYSTEM_PROMPT = `You are a design verification agent. You receive:
1. A set of classified theme tokens (color, typography, spacing, elevation) with assigned semantic roles
2. One or more reference screenshots of the actual design

Your job is to verify that the token assignments match what you see in the screenshots.

## How to Verify

For each token assignment, check if it matches the visual evidence:
- **Color roles**: Does the "Primary" color appear on CTAs/buttons? Does "Background" match the page background? Does "Text" match the main text color?
- **Typography**: Do font sizes match headings vs body text? Are weights reasonable for their roles?
- **Spacing**: Do padding/gap values look consistent with what you see?
- **Elevation**: Do shadow levels match the visual depth of components?

## Output

For each token you can assess, produce a correction entry:
- **confirmed**: The assignment looks correct based on visual evidence
- **flagged**: The assignment appears wrong — provide a suggestedValue if you can identify the correct one
- **uncertain**: Not enough visual evidence to verify

Focus on the most important/visible tokens. You don't need to verify every single one — prioritize:
1. Background and Text colors (most impactful if wrong)
2. Primary and Accent colors
3. Font sizes and weights
4. Spacing values (if clearly visible)

Output a single JSON object:
{
  "corrections": [...],
  "overallConfidence": "low" | "medium" | "high",
  "notes": "Brief overall assessment of classification quality"
}`

function buildMessages(input: VerifyInput) {
  const content: Array<
    | { type: 'text'; text: string }
    | { type: 'image'; image: string; mediaType?: string }
  > = []

  // Add images first
  for (const img of input.images) {
    content.push({
      type: 'image',
      image: img.dataUrl,
    })
    if (img.label) {
      content.push({ type: 'text', text: `Image: ${img.label}` })
    }
  }

  // Add token data
  const tokenText = Object.entries(input.themeTokens)
    .map(([dim, tokens]) => {
      const entries = Object.entries(tokens)
        .map(([label, value]) => `  ${label}: ${value}`)
        .join('\n')
      return `### ${dim}\n${entries}`
    })
    .join('\n\n')

  content.push({
    type: 'text',
    text: `## Classification Summary\n${input.summary}\n\n## Theme Tokens to Verify\n${tokenText}\n\nVerify these assignments against the reference images. Output JSON only.`,
  })

  return {
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user' as const, content }],
  }
}

// --- Action registration ---

const arenaVerifyThemeClassificationAction: Action<VerifyInput, VerifyOutput> = {
  id: 'arena-verify-theme-classification',
  name: 'Arena Verify Theme Classification',
  description: 'Verify classified theme tokens against reference screenshots using vision',
  entityTypes: ['studio_experiment'],
  taskType: 'analysis',
  model: 'claude-sonnet',
  inputSchema,
  outputSchema,
  buildPrompt: () => ({ system: '', user: '' }),
  buildMessages,
}

registerAction(arenaVerifyThemeClassificationAction)

export { arenaVerifyThemeClassificationAction }
export type { VerifyInput, VerifyOutput }
