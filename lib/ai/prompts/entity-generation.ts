/**
 * Entity Generation Prompts Configuration
 *
 * Defines how to generate child entities from parent entity context.
 * Used by EntityGeneratorField for LLM-assisted entity creation.
 */

import type { EntityType } from '../types/entities'

export interface EntityGenerationConfig {
  /** System prompt describing what kind of entity to generate */
  systemPrompt: string

  /** Fields to generate (will be populated by LLM) */
  fieldsToGenerate: string[]

  /** Default values for non-generated fields */
  defaultValues: Record<string, unknown>

  /** Which fields from source entity to include in context */
  contextFields: string[]

  /** Field to display in collapsed list view */
  displayField: string

  /** Fields editable in expanded view */
  editableFields: string[]

  /** Optional: field-specific generation hints */
  fieldHints?: Record<string, string>
}

/**
 * Generation configs keyed by target entity type
 */
export const ENTITY_GENERATION_CONFIGS: Partial<Record<EntityType, EntityGenerationConfig>> = {
  studio_hypotheses: {
    systemPrompt: `Generate testable hypotheses for product development.

Each hypothesis should:
- Be specific, falsifiable, and testable
- Follow the format: "We believe [action/change] will [result/outcome] for [audience] because [rationale]"
- Be grounded in the project context provided
- **If testing an assumption:** Design a hypothesis that directly validates or tests that assumption
- **If assumption context provided:** Align the hypothesis to test the specific risk/belief
- Be meaningfully different from existing and pending hypotheses

When testing an assumption:
- Address the same category of risk (desirability/viability/feasibility/usability/ethical)
- Provide a measurable way to validate or invalidate the assumption
- Propose a specific action or test to gather evidence

Return a complete hypothesis object with all required fields.`,

    fieldsToGenerate: ['statement', 'rationale', 'validation_criteria'],

    defaultValues: {
      status: 'proposed',
    },

    contextFields: [
      'name',
      'description',
      'problem_statement',
      'success_criteria',
      'current_focus',
      'testing_assumption',
      'assumption_category',
      'assumption_importance'
    ],

    displayField: 'statement',

    editableFields: ['statement', 'rationale', 'validation_criteria'],

    fieldHints: {
      statement: 'A clear, testable hypothesis statement',
      rationale: 'The reasoning behind this hypothesis - why we believe it',
      validation_criteria: 'Specific, measurable criteria to validate or invalidate',
    },
  },

  studio_experiments: {
    systemPrompt: `Design experiments to test hypotheses and assumptions.

Each experiment should:
- Have a clear objective and methodology
- Define what success looks like
- Be scoped appropriately (not too broad)
- Include expected outcomes

Return a complete experiment object with all required fields.`,

    fieldsToGenerate: ['name', 'description', 'type', 'expected_outcome'],

    defaultValues: {
      status: 'planned',
    },

    contextFields: ['name', 'description', 'problem_statement', 'current_focus'],

    displayField: 'name',

    editableFields: ['name', 'description', 'type', 'expected_outcome'],

    fieldHints: {
      name: 'A clear, descriptive name for this experiment',
      description: 'What we are testing and how',
      type: 'Type of experiment (e.g., prototype, survey, interview, a_b_test)',
      expected_outcome: 'What we expect to learn or prove',
    },
  },

  canvas_items: {
    systemPrompt: `Generate canvas items for Value Proposition or Business Model canvases.

Each item should:
- Be specific and actionable
- Fit the canvas section context (jobs, pains, gains, etc.)
- Be grounded in customer understanding
- Be distinct from existing items

Return a complete canvas item object.`,

    fieldsToGenerate: ['title', 'description', 'notes'],

    defaultValues: {
      importance: 'medium',
    },

    contextFields: ['name', 'description', 'section'],

    displayField: 'title',

    editableFields: ['title', 'description', 'importance', 'notes'],

    fieldHints: {
      title: 'A concise title for this item',
      description: 'Detailed description of this job/pain/gain',
      notes: 'Additional context or observations',
    },
  },

  assumptions: {
    systemPrompt: `Generate assumptions that need validation.

Each assumption should:
- Be a belief that, if wrong, would significantly impact the project
- Be testable through experiments or research
- Be specific enough to validate or invalidate
- Follow the format: "We assume that [belief]"

Return a complete assumption object.`,

    fieldsToGenerate: ['title', 'statement', 'validation_criteria'],

    defaultValues: {
      status: 'untested',
      risk_level: 'medium',
    },

    contextFields: ['name', 'description', 'problem_statement'],

    displayField: 'title',

    editableFields: ['title', 'statement', 'risk_level', 'validation_criteria'],

    fieldHints: {
      title: 'A short title for this assumption',
      statement: 'The full assumption statement',
      validation_criteria: 'How we will know if this is true or false',
    },
  },

  activities: {
    systemPrompt: `Generate activity columns for a story map that expands a touchpoint into detailed micro-steps.

Each activity represents a distinct phase within the customer interaction. Activities should:
- Flow logically left-to-right as a sequence the user experiences
- Be specific action phases (not outcomes)
- Cover the full scope of the touchpoint interaction
- Be distinct from existing activities
- Use short, action-oriented names (2-4 words)

Example activities for a "Check Out" touchpoint:
- Review Cart, Enter Shipping, Select Payment, Confirm Order, View Confirmation

Return complete activity objects with all required fields.`,

    fieldsToGenerate: ['name', 'description', 'user_goal'],

    defaultValues: {},

    contextFields: [
      'story_map_name',
      'story_map_description',
      'touchpoint_name',
      'touchpoint_description',
      'existing_activities',
    ],

    displayField: 'name',

    editableFields: ['name', 'description', 'user_goal'],

    fieldHints: {
      name: 'Short action phrase (e.g., "Enter credentials", "Review summary")',
      description: 'What happens in this step',
      user_goal: 'What the user is trying to accomplish at this step',
    },
  },

  user_stories: {
    systemPrompt: `Generate user stories for a story map cell (intersection of activity column + actor/layer row).

Each story describes what happens at this specific step for this specific actor. Stories should:
- Be specific to the activity and actor intersection
- Use standard format when helpful: "As a [actor], I [action] so that [benefit]"
- Be actionable and implementable
- Be distinct from existing stories in this cell

Consider the actor/layer type:
- Customer: Focus on user-facing features and interactions
- Internal Agent: Focus on staff tools and workflows
- AI Agent: Focus on automation and intelligent behaviors
- Platform: Focus on system capabilities and integrations
- API: Focus on data and service interfaces

Return complete story objects with all required fields.`,

    fieldsToGenerate: ['title', 'description', 'acceptance_criteria'],

    defaultValues: {
      status: 'backlog',
      story_type: 'feature',
    },

    contextFields: [
      'activity_name',
      'activity_description',
      'layer_name',
      'layer_type',
      'touchpoint_description',
      'existing_stories',
    ],

    displayField: 'title',

    editableFields: ['title', 'description', 'story_type', 'acceptance_criteria'],

    fieldHints: {
      title: 'User story title - what this story accomplishes',
      description: 'Detailed description of the story requirements',
      acceptance_criteria: 'List of criteria that must be met for completion',
    },
  },

  // ============================================================================
  // Blueprint Canvas Entity Types (Phase 1)
  // ============================================================================

  blueprint_steps: {
    systemPrompt: `Generate steps for a service blueprint that map the customer journey through service delivery.

Each step represents a moment in the service experience. Steps should:
- Flow logically left-to-right as a sequence
- Cover the full service encounter
- Be specific enough to map actions at each layer
- Use concise names (2-4 words)
- Be distinct from existing steps

Example step names: "Enter Store", "Browse Products", "Request Help", "Complete Purchase", "Receive Confirmation"

Return complete step objects with all required fields.`,

    fieldsToGenerate: ['name', 'description'],

    defaultValues: {},

    contextFields: [
      'blueprint_name',
      'blueprint_description',
      'blueprint_type',
      'existing_steps',
    ],

    displayField: 'name',

    editableFields: ['name', 'description'],

    fieldHints: {
      name: 'Short action phrase (e.g., "Enter store", "Browse products")',
      description: 'What happens during this step',
    },
  },

  blueprint_cells: {
    systemPrompt: `Generate content for a service blueprint cell at the intersection of a step and layer.

Consider:
- Step context: what moment in the journey
- Layer type: customer_action / frontstage / backstage / support_process

Layer descriptions:
- customer_action: What the customer does (visible actions, decisions, touchpoints)
- frontstage: What employees do that customers see (visible interactions, communications)
- backstage: What employees do behind the scenes (invisible actions, preparation)
- support_process: Systems and infrastructure (IT, databases, integrations)

Write concise, actionable descriptions of what happens at this intersection.

Return complete cell objects with all required fields.`,

    fieldsToGenerate: ['content'],

    defaultValues: {},

    contextFields: [
      'step_name',
      'layer_type',
      'layer_name',
      'layer_description',
      'blueprint_context',
      'adjacent_cells',
    ],

    displayField: 'content',

    editableFields: ['content'],

    fieldHints: {
      content: 'Description of what happens at this step for this layer',
    },
  },
}

/**
 * Build the anti-redundancy context string
 */
export function buildAntiRedundancyContext(
  existing: Array<Record<string, unknown>>,
  pending: Array<Record<string, unknown>>,
  displayField: string
): string {
  const parts: string[] = []

  if (existing.length > 0) {
    const existingList = existing
      .map((item) => `- ${item[displayField] || item.id}`)
      .join('\n')
    parts.push(`Existing items (do NOT duplicate):\n${existingList}`)
  }

  if (pending.length > 0) {
    const pendingList = pending
      .map((item) => `- ${item[displayField] || 'pending item'}`)
      .join('\n')
    parts.push(`Pending items (do NOT duplicate):\n${pendingList}`)
  }

  if (parts.length === 0) {
    return ''
  }

  return `\n\n${parts.join('\n\n')}\n\nGenerate something meaningfully different from the above.`
}

/**
 * Build source context string from entity data
 */
export function buildSourceContext(
  sourceData: Record<string, unknown>,
  contextFields: string[]
): string {
  const parts: string[] = []

  for (const field of contextFields) {
    const value = sourceData[field]
    if (value && typeof value === 'string' && value.trim()) {
      const label = field.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
      parts.push(`${label}: ${value}`)
    }
  }

  return parts.length > 0 ? parts.join('\n') : 'No additional context provided.'
}

/**
 * Get config for a target entity type
 */
export function getEntityGenerationConfig(
  targetType: EntityType
): EntityGenerationConfig | undefined {
  return ENTITY_GENERATION_CONFIGS[targetType]
}
