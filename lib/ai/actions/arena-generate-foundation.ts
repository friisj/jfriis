/**
 * Arena Generate Foundation Action
 *
 * Multimodal action that analyzes project inputs (images, fonts, URLs, description)
 * and current template skills/tokens to produce updated, project-aligned skill
 * decisions and token values.
 */

import { z } from 'zod'
import { registerAction } from './index'
import type { Action } from './types'

// --- Schemas ---

// Output schemas are intentionally lenient — AI may add extra fields or
// use slightly different values. We validate shape, not exact content.
const decisionSchema = z.object({
  id: z.string(),
  label: z.string(),
  rationale: z.string().optional().default(''),
  intent: z.string().optional(),
  value: z.string().optional(),
  confidence: z.string().optional().default('medium'),
  source: z.string().optional().default('foundation'),
}).passthrough()

const ruleSchema = z.object({
  id: z.string(),
  statement: z.string(),
  type: z.string().optional().default('should'),
  source: z.string().optional().default('foundation'),
}).passthrough()

const dimensionStateSchema = z.object({
  decisions: z.array(decisionSchema),
  rules: z.array(ruleSchema).default([]),
}).passthrough()

const gapSchema = z.object({
  dimension: z.string(),
  description: z.string(),
  severity: z.string().default('medium'),
})

const inputSchema = z.object({
  description: z.string().nullable(),
  inputs: z.object({
    figma_links: z.array(z.object({ url: z.string() })).default([]),
    fonts: z.array(z.object({ role: z.string(), family: z.string() })).default([]),
    images: z.array(z.string()).default([]),
    urls: z.array(z.string()).default([]),
    icon_library: z.string().optional(),
  }).nullable(),
  dimensions: z.array(z.string()),
  currentSkills: z.record(z.string(), dimensionStateSchema).default({}),
  currentTokens: z.record(z.string(), z.record(z.string(), z.string())).default({}),
})

type FoundationInput = z.infer<typeof inputSchema>

// Output schema is deliberately permissive — AI output varies in shape.
// Real validation happens when writing to DB in generateFoundation().
const outputSchema = z.object({
  skills: z.record(z.string(), z.any()),
  tokens: z.record(z.string(), z.any()),
  summary: z.string(),
  gaps: z.array(gapSchema).default([]),
})

type FoundationOutput = z.infer<typeof outputSchema>

// --- Multimodal message builder ---

function buildMessages(input: FoundationInput) {
  const fonts = input.inputs?.fonts ?? []
  const figmaLinks = input.inputs?.figma_links ?? []
  const images = input.inputs?.images ?? []
  const urls = input.inputs?.urls ?? []
  const iconLibrary = input.inputs?.icon_library

  const system = `You are a design system foundation analyst. You analyze a project's visual inputs (reference images, fonts, URLs) alongside its current template skill decisions and token values to produce project-aligned updates.

## Your Task

1. Analyze any reference images for: color palettes, density, spacing rhythm, visual tone, typography patterns
2. Consider specified fonts and how they affect typography decisions
3. Consider the project description as design intent
4. Start from the current skill decisions (template baseline) and update rationale/intent to reflect this specific project
5. Start from current token values and update where inputs provide clear signal (e.g., extract primary/secondary/accent colors from images)
6. Preserve the decision label structure exactly — keep the same labels and same rules structure
7. Flag gaps where dimensions lack sufficient input signal

## Output Rules

- For skills: return the full decisions and rules arrays for each dimension, with updated rationale/intent fields. Keep all existing decision labels — do not add or remove decisions.
- For tokens: return the full token map per dimension, with updated values where inputs provide signal. Keep existing values where no new signal exists.
- summary: 2-4 sentences describing what was analyzed and what changed
- gaps: dimensions where the foundation couldn't make confident updates due to missing inputs

## Output Format

Output a single JSON object:
{
  "skills": { "<dimension>": { "decisions": [...], "rules": [...] }, ... },
  "tokens": { "<dimension>": { "<label>": "<value>", ... }, ... },
  "summary": "...",
  "gaps": [{ "dimension": "...", "description": "...", "severity": "high|medium|low" }]
}

Output JSON only. No markdown fences.`

  // Build content parts for the user message
  const content: Array<
    | { type: 'text'; text: string }
    | { type: 'image'; image: string }
  > = []

  // Add images as image parts for visual analysis
  for (const imageUrl of images) {
    content.push({ type: 'image', image: imageUrl })
  }

  // Build text context
  const textParts: string[] = []

  if (input.description) {
    textParts.push(`## Project Description\n${input.description}`)
  }

  textParts.push(`## Active Dimensions\n${input.dimensions.join(', ')}`)

  if (fonts.length > 0) {
    textParts.push(`## Fonts\n${fonts.map(f => `- ${f.role}: ${f.family}`).join('\n')}`)
  }

  if (figmaLinks.length > 0) {
    textParts.push(`## Figma Links\n${figmaLinks.map(l => `- ${l.url}`).join('\n')}`)
  }

  if (urls.length > 0) {
    textParts.push(`## Reference URLs\n${urls.map(u => `- ${u}`).join('\n')}`)
  }

  if (iconLibrary) {
    textParts.push(`## Icon Library\n${iconLibrary}`)
  }

  // Add current skills and tokens as structured context
  if (Object.keys(input.currentSkills).length > 0) {
    textParts.push(`## Current Skill Decisions (template baseline)\n\`\`\`json\n${JSON.stringify(input.currentSkills, null, 2)}\n\`\`\``)
  }

  if (Object.keys(input.currentTokens).length > 0) {
    textParts.push(`## Current Token Values (template baseline)\n\`\`\`json\n${JSON.stringify(input.currentTokens, null, 2)}\n\`\`\``)
  }

  textParts.push('Generate the foundation. Output JSON only.')

  content.push({ type: 'text', text: textParts.join('\n\n') })

  return {
    system,
    messages: [{ role: 'user' as const, content }],
  }
}

// Stub buildPrompt (required by Action interface but buildMessages takes precedence)
function buildPrompt(_input: FoundationInput) {
  return { system: '', user: '' }
}

// --- Action registration ---

const arenaGenerateFoundationAction: Action<FoundationInput, FoundationOutput> = {
  id: 'arena-generate-foundation',
  name: 'Arena Generate Foundation',
  description: 'Analyze project inputs and update skill decisions and tokens with project-specific context',
  entityTypes: ['studio_experiment'],
  taskType: 'generation',
  model: 'claude-sonnet',
  inputSchema,
  outputSchema,
  buildPrompt,
  buildMessages,
}

registerAction(arenaGenerateFoundationAction)

export { arenaGenerateFoundationAction }
export type { FoundationInput, FoundationOutput }
