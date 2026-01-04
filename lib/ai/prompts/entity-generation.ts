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
- Be specific and falsifiable
- Follow the format: "We believe [action/change] will [result/outcome] for [audience] because [rationale]"
- Be grounded in the project context provided
- Be meaningfully different from existing and pending hypotheses

Return a complete hypothesis object with all required fields.`,

    fieldsToGenerate: ['statement', 'rationale', 'validation_criteria'],

    defaultValues: {
      status: 'draft',
    },

    contextFields: ['name', 'description', 'problem_statement', 'success_criteria', 'current_focus'],

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
