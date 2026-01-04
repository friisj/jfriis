/**
 * Generate Entity Action
 *
 * Generates complete child entities from parent entity context.
 * Used by EntityGeneratorField for LLM-assisted entity creation.
 */

import { z } from 'zod'
import { registerAction } from './index'
import type { Action } from './types'
import type { EntityType } from '@/lib/ai/types/entities'
import { isValidEntityType } from '@/lib/ai/types/entities'
import {
  getEntityGenerationConfig,
  buildSourceContext,
  buildAntiRedundancyContext,
} from '@/lib/ai/prompts/entity-generation'

// Input schema
const inputSchema = z.object({
  sourceType: z.string(),
  sourceData: z.record(z.string(), z.unknown()),
  targetType: z.string(),
  existingItems: z.array(z.record(z.string(), z.unknown())).default([]),
  pendingItems: z.array(z.record(z.string(), z.unknown())).default([]),
  instructions: z.string().optional(),
  count: z.number().min(1).max(5).default(1),
  // Generation options
  temperature: z.number().min(0.1).max(1.0).optional(),
  model: z.enum(['claude-sonnet', 'claude-opus']).optional(),
  entitySubtype: z.string().optional(), // e.g., hypothesis type or experiment type
})

type EntityGenerationInput = z.infer<typeof inputSchema>

// Output schema - array of generated entities
const outputSchema = z.object({
  entities: z.array(z.record(z.string(), z.unknown())),
})

type EntityGenerationOutput = z.infer<typeof outputSchema>

// Build the prompt
function buildPrompt(input: EntityGenerationInput): { system: string; user: string } {
  const {
    sourceType,
    sourceData,
    targetType,
    existingItems,
    pendingItems,
    instructions,
    count,
    entitySubtype,
  } = input

  // Get config for target entity type
  const config = getEntityGenerationConfig(targetType as EntityType)

  if (!config) {
    console.warn(
      `[generateEntity] No config for target type: "${targetType}". Using generic generation.`
    )
  }

  // Build source context
  const contextFields = config?.contextFields || ['name', 'description']
  const sourceContext = buildSourceContext(sourceData, contextFields)

  // Build anti-redundancy context
  const displayField = config?.displayField || 'name'
  const antiRedundancy = buildAntiRedundancyContext(existingItems, pendingItems, displayField)

  // Build fields specification
  const fieldsToGenerate = config?.fieldsToGenerate || ['name', 'description']
  const fieldHints = config?.fieldHints || {}
  const fieldsSpec = fieldsToGenerate
    .map((field) => {
      const hint = fieldHints[field]
      return hint ? `- ${field}: ${hint}` : `- ${field}`
    })
    .join('\n')

  // System prompt
  const baseSystemPrompt = config?.systemPrompt || `Generate entities based on the provided context.`

  const system = `${baseSystemPrompt}

You MUST respond with valid JSON only. No markdown, no explanations, just JSON.

Response format:
{
  "entities": [
    {
      ${fieldsToGenerate.map((f) => `"${f}": "..."`).join(',\n      ')}
    }
  ]
}

Generate exactly ${count} ${count === 1 ? 'entity' : 'entities'}.
Each entity must have all these fields:
${fieldsSpec}`

  // User prompt
  let user = `Generate ${count} ${targetType.replace(/_/g, ' ')} based on this ${sourceType.replace(/_/g, ' ')}:

${sourceContext}${antiRedundancy}`

  // Add subtype-specific guidance
  if (entitySubtype) {
    user += `\n\nFocus on generating ${entitySubtype} type ${targetType.replace(/_/g, ' ')}.`
  }

  if (instructions) {
    user += `\n\nAdditional instructions: ${instructions}`
  }

  user += `\n\nRespond with JSON only.`

  return { system, user }
}

// Create the action
const generateEntityAction: Action<EntityGenerationInput, EntityGenerationOutput> = {
  id: 'generate-entity',
  name: 'Generate Entity',
  description: 'Generate complete child entities from parent entity context',
  entityTypes: ['*'],
  taskType: 'generation',
  inputSchema,
  outputSchema,
  buildPrompt,
}

// Register the action
registerAction(generateEntityAction)

export { generateEntityAction }
export type { EntityGenerationInput, EntityGenerationOutput }
