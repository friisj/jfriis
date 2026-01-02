/**
 * Generate Field Action (v2 - Production Ready)
 *
 * Generic action for generating or improving field content based on context.
 *
 * FIXES (from critical assessment):
 * - ✅ P0: Context serialization handles numbers/booleans/null
 * - ✅ P1: Validation warnings for unknown entity/field combinations
 * - ✅ P2: Organized field prompts by entity
 */

import { z } from 'zod'
import { registerAction } from './index'
import type { Action, FieldGenerationInput, FieldGenerationOutput } from './types'
import type { EntityType } from '@/lib/ai/types/entities'
import { isValidEntityType } from '@/lib/ai/types/entities'

// Field-specific prompts and context
const fieldPrompts: Record<string, Record<string, string>> = {
  studio_projects: {
    description: 'A concise description of what this project is and what problem it solves.',
    problem_statement: 'A clear statement of the problem this project addresses. Focus on the user pain point, not the solution.',
    hypothesis: 'A testable hypothesis about how this project will create value. Format: "We believe [action] will result in [outcome] for [audience]."',
    success_criteria: 'Measurable criteria that define success for this project. Be specific and quantifiable.',
    current_focus: 'The current priority or focus area for this project.',
    scope_out: 'What is explicitly out of scope for this project.',
  },
  studio_hypotheses: {
    statement: 'A clear, testable hypothesis statement. Format: "If we [action], then [result] because [rationale]."',
    validation_criteria: 'Specific, measurable criteria that would validate or invalidate this hypothesis.',
  },
  studio_experiments: {
    name: 'A clear, descriptive name for this experiment or spike.',
    description: 'What are we testing, how, and what success looks like.',
    learnings: 'Key insights and lessons learned from running this experiment, regardless of outcome.',
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
    description: 'Description of the value proposition being mapped.',
    tags: 'Tags for this value map (e.g., onboarding, retention, acquisition).',
    products_services: 'Products and services that help customers get jobs done.',
    pain_relievers: 'How products and services alleviate customer pains.',
    gain_creators: 'How products and services create customer gains.',
  },
  value_proposition_canvases: {
    description: 'Overview of what value proposition fit is being explored.',
    tags: 'Tags for categorizing this canvas.',
  },
  canvas_items: {
    title: 'A clear, concise title for this canvas item.',
    description: 'Detailed description of this item and its significance.',
    job_context: 'Context about when and why the customer performs this job.',
    notes: 'Additional observations, insights, or considerations about this item.',
    tags: 'Relevant tags for this item.',
  },
  assumptions: {
    statement: 'A clear, testable assumption statement. Format: "We believe [assumption]."',
    validation_criteria: 'Specific criteria that would validate or invalidate this assumption.',
    decision_notes: 'Reasoning behind the decision (persevere/pivot/kill) based on validation.',
    notes: 'Additional context, observations, or related insights.',
    tags: 'Tags for categorizing this assumption.',
  },
  ventures: {
    title: 'A clear, descriptive title for this venture.',
    description: 'Brief overview of what this venture is and its goals.',
    content: 'Detailed venture content, background, process, or learnings.',
    tags: 'Relevant tags for categorizing this venture.',
  },
  log_entries: {
    title: 'A descriptive title for this log entry.',
    content: 'The main content of this log entry - observations, learnings, or notes.',
    tags: 'Tags for categorizing this entry (e.g., learning, decision, experiment).',
  },
  specimens: {
    title: 'A descriptive title for this specimen.',
    description: 'What this specimen demonstrates or explores.',
    tags: 'Tags describing this specimen (e.g., interaction, animation, layout).',
  },
  backlog_items: {
    title: 'A clear title for this backlog item.',
    content: 'Description of what needs to be done or explored.',
    tags: 'Tags for categorizing this item.',
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

// Build the prompt (P1: with validation warnings)
function buildPrompt(input: FieldGenerationInput): { system: string; user: string } {
  const { fieldName, entityType, currentValue, context, instructions } = input

  // P1: Validate entity type
  if (!isValidEntityType(entityType)) {
    console.warn(
      `[generateField] Unknown entity type: "${entityType}". Available types:`,
      Object.keys(fieldPrompts)
    )
  }

  // Get field-specific guidance
  const entityPrompts = fieldPrompts[entityType] || {}
  const fieldGuidance = entityPrompts[fieldName]

  // P1: Warn if field not found
  if (!fieldGuidance) {
    console.warn(
      `[generateField] Unknown field "${fieldName}" for entity "${entityType}". Available fields:`,
      Object.keys(entityPrompts)
    )
  }

  const guidanceText = fieldGuidance || `Content for the ${fieldName} field.`

// Build context string (P0: handles all serializable types)
  const contextParts: string[] = []
  for (const [key, value] of Object.entries(context)) {
    if (value === null || value === undefined || value === '') {
      continue // Skip empty values
    }

    const label = key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

    // Handle all serializable types (P0 fix)
    if (typeof value === 'string') {
      contextParts.push(`${label}: ${value}`)
    } else if (typeof value === 'number') {
      contextParts.push(`${label}: ${value}`)
    } else if (typeof value === 'boolean') {
      contextParts.push(`${label}: ${value ? 'yes' : 'no'}`)
    } else {
      // Log warning for unexpected types
      console.warn(`[generateField] Unexpected context value type for "${key}":`, typeof value)
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

Field guidance: ${guidanceText}${contextStr}`

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
