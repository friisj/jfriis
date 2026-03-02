/**
 * Arena Generate Foundation Action
 *
 * Takes a substrate, project inputs, and dimension config to produce
 * a foundation brief with design intent principles and gap detection.
 */

import { z } from 'zod'
import { registerAction } from './index'
import type { Action } from './types'

// --- Schemas ---

const dimensionConfigSchema = z.object({
  scope: z.enum(['basic', 'advanced']),
})

const inputSchema = z.object({
  substrate: z.string().nullable(),
  inputs: z.object({
    figma_links: z.array(z.object({ url: z.string() })).default([]),
    fonts: z.array(z.object({ role: z.string(), family: z.string() })).default([]),
    images: z.array(z.string()).default([]),
    urls: z.array(z.string()).default([]),
  }).nullable(),
  config: z.object({
    dimensions: z.record(z.string(), dimensionConfigSchema).default({}),
  }).nullable(),
})

type FoundationInput = z.infer<typeof inputSchema>

const gapSchema = z.object({
  dimension: z.string(),
  description: z.string(),
  severity: z.enum(['low', 'medium', 'high']),
})

const outputSchema = z.object({
  intent: z.array(z.string()),
  gaps: z.array(gapSchema),
})

type FoundationOutput = z.infer<typeof outputSchema>

// --- Prompt ---

function buildPrompt(input: FoundationInput) {
  const substrate = input.substrate ?? 'none specified'
  const dimensions = input.config?.dimensions ? Object.keys(input.config.dimensions) : []
  const dimScopes = input.config?.dimensions
    ? Object.entries(input.config.dimensions).map(([dim, cfg]) => `${dim} (${cfg.scope})`).join(', ')
    : 'none configured'

  const fonts = input.inputs?.fonts ?? []
  const figmaLinks = input.inputs?.figma_links ?? []
  const images = input.inputs?.images ?? []
  const urls = input.inputs?.urls ?? []

  const inputsSummary = [
    fonts.length > 0 ? `Fonts: ${fonts.map(f => `${f.role}: ${f.family}`).join(', ')}` : null,
    figmaLinks.length > 0 ? `Figma links: ${figmaLinks.length}` : null,
    images.length > 0 ? `Images: ${images.length}` : null,
    urls.length > 0 ? `Reference URLs: ${urls.length}` : null,
  ].filter(Boolean).join('\n')

  const system = `You are a design system foundation analyst. You analyze a project's substrate (aesthetic posture), inputs, and dimension configuration to produce a foundation brief.

## Substrate Concept

A substrate is the aesthetic foundation of a design system — it shapes the overall feel:
- **minimal**: clean, sparse, focused on essentials, generous whitespace, restrained palette
- **brutalist**: raw, honest, exposed structure, unconventional, bold contrasts
- **maximalist**: rich, layered, expressive, abundant detail, vibrant
- **organic**: natural, flowing, warm, textured, earthy tones
- **corporate**: professional, structured, trustworthy, conventional, polished

## Your Task

1. Analyze the substrate through the lens of the configured dimensions
2. Consider the provided inputs (fonts, links, images, URLs) as constraints
3. Produce 3-5 design intent principles that guide decision-making
4. Detect gaps where the dimension config demands exceed what the inputs provide

## Gap Detection

For each configured dimension, check if the inputs provide enough signal:
- Color dimension with no images or Figma links → gap (no color source)
- Typography dimension with no fonts → gap (no font specification)
- Any advanced scope with limited inputs → gap (insufficient detail)

## Output Format

Output a single JSON object:
{
  "intent": ["principle 1", "principle 2", ...],
  "gaps": [{ "dimension": "color", "description": "No color inputs provided", "severity": "high" }, ...]
}

Severity: "high" = missing critical input, "medium" = partial coverage, "low" = nice to have.`

  const user = `Generate a foundation brief for this project.

## Substrate: ${substrate}

## Configured Dimensions: ${dimScopes || 'none'}

## Available Inputs
${inputsSummary || '(no inputs yet)'}

Output JSON only.`

  return { system, user }
}

// --- Action registration ---

const arenaGenerateFoundationAction: Action<FoundationInput, FoundationOutput> = {
  id: 'arena-generate-foundation',
  name: 'Arena Generate Foundation',
  description: 'Generate a foundation brief from substrate, inputs, and dimension config',
  entityTypes: ['studio_experiment'],
  taskType: 'generation',
  model: 'claude-haiku',
  inputSchema,
  outputSchema,
  buildPrompt,
}

registerAction(arenaGenerateFoundationAction)

export { arenaGenerateFoundationAction }
export type { FoundationInput, FoundationOutput }
