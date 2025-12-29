/**
 * Generate Field Action
 *
 * Generic action for generating or improving field content based on context.
 */

import { z } from 'zod'
import { registerAction } from './index'
import type { Action, FieldGenerationInput, FieldGenerationOutput } from './types'

// Field-specific prompts and context
const fieldPrompts: Record<string, Record<string, string>> = {
  studio_projects: {
    description: 'A concise description of what this project is and what problem it solves.',
    problem_statement: 'A clear statement of the problem this project addresses. Focus on the user pain point, not the solution.',
    hypothesis: 'A testable hypothesis about how this project will create value. Format: "We believe [action] will result in [outcome] for [audience]."',
    success_criteria: 'Measurable criteria that define success for this project. Be specific and quantifiable.',
    current_focus: 'The current priority or focus area for this project.',
  },
  business_model_canvases: {
    key_partners: 'Key partners and suppliers needed to make this business model work.',
    key_activities: 'The most important activities required to deliver the value proposition.',
    key_resources: 'The most important assets required to make the business model work.',
    value_propositions: 'The bundle of products and services that create value for a specific customer segment.',
    customer_relationships: 'The type of relationship established with each customer segment.',
    channels: 'How the company communicates with and reaches its customer segments.',
    customer_segments: 'The different groups of people or organizations the enterprise aims to serve.',
    cost_structure: 'All costs incurred to operate the business model.',
    revenue_streams: 'The cash the company generates from each customer segment.',
  },
  customer_profiles: {
    jobs: 'Functional, social, and emotional jobs the customer is trying to get done.',
    pains: 'Negative emotions, undesired costs, situations, and risks the customer experiences.',
    gains: 'Benefits the customer expects, desires, or would be surprised by.',
  },
  value_maps: {
    products_services: 'Products and services that help customers get jobs done.',
    pain_relievers: 'How products and services alleviate customer pains.',
    gain_creators: 'How products and services create customer gains.',
  },
}

// Input schema
const inputSchema = z.object({
  fieldName: z.string(),
  entityType: z.string(),
  currentValue: z.string().optional(),
  context: z.record(z.string(), z.unknown()),
  instructions: z.string().optional(),
})

// Output schema
const outputSchema = z.object({
  content: z.string(),
  confidence: z.number().min(0).max(1).optional(),
})

// Build the prompt
function buildPrompt(input: FieldGenerationInput): { system: string; user: string } {
  const { fieldName, entityType, currentValue, context, instructions } = input

  // Get field-specific guidance
  const entityPrompts = fieldPrompts[entityType] || {}
  const fieldGuidance = entityPrompts[fieldName] || `Content for the ${fieldName} field.`

  // Build context string
  const contextParts: string[] = []
  for (const [key, value] of Object.entries(context)) {
    if (value && typeof value === 'string' && value.trim()) {
      const label = key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
      contextParts.push(`${label}: ${value}`)
    }
  }
  const contextStr = contextParts.length > 0
    ? `\n\nContext from other fields:\n${contextParts.join('\n')}`
    : ''

  // System prompt
  const system = `You are a helpful assistant that generates content for form fields.
Your responses should be:
- Concise and focused
- Professional in tone
- Directly usable without editing
- Based on the provided context

Always respond with just the content - no explanations, no quotes, no formatting unless specifically requested.`

  // User prompt
  let user = `Generate content for the "${fieldName.replace(/_/g, ' ')}" field.

Field guidance: ${fieldGuidance}${contextStr}`

  if (currentValue) {
    user += `\n\nExisting content to improve/expand:\n${currentValue}`
  }

  if (instructions) {
    user += `\n\nAdditional instructions: ${instructions}`
  }

  return { system, user }
}

// Create the action
const generateFieldAction: Action<FieldGenerationInput, FieldGenerationOutput> = {
  id: 'generate-field',
  name: 'Generate Field Content',
  description: 'Generate or improve content for a form field based on context',
  entityTypes: ['*'], // Works with any entity
  taskType: 'generation',
  inputSchema,
  outputSchema,
  buildPrompt,
}

// Register the action
registerAction(generateFieldAction)

export { generateFieldAction }
