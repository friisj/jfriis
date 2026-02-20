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

When boundary object context is provided (BMC, VPC, customer profiles, assumptions, journeys):
- Ground hypotheses in specific strategic findings from the boundary objects
- Reference specific customer pains, gains, or jobs when relevant
- Address gaps in the current validation coverage

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
      'assumption_importance',
      'boundary_context',
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

When boundary object context is provided (BMC, VPC, customer profiles, assumptions, journeys):
- Ground experiments in specific strategic findings
- Choose type based on risk category:
  - Desirability risks (customer pains/gains) -> prototype or interview
  - Viability risks (revenue/cost/channels) -> smoke_test
  - Feasibility risks (technical capabilities) -> spike
  - Usability risks (journey friction) -> prototype
- Reference specific untested assumptions or unvalidated hypotheses

Return a complete experiment object with all required fields.`,

    fieldsToGenerate: ['name', 'description', 'type', 'expected_outcome'],

    defaultValues: {
      status: 'planned',
    },

    contextFields: ['name', 'description', 'problem_statement', 'current_focus', 'boundary_context'],

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

  // ============================================================================
  // Journey Canvas Entity Types (Phase 2)
  // ============================================================================

  journey_stages: {
    systemPrompt: `Generate stages for a customer journey that map the progression through an experience.

Each stage represents a distinct phase in the customer journey. Stages should:
- Flow logically left-to-right as a temporal sequence
- Cover the full experience arc from awareness to loyalty/advocacy
- Have clear entry/exit criteria (what marks the transition between stages)
- Be specific enough to map distinct customer behaviors
- Use concise names (1-3 words)
- Be distinct from existing stages

Common stage patterns:
- Awareness → Consideration → Decision → Purchase → Onboarding → Usage → Loyalty
- Discovery → Research → Evaluation → Purchase → Setup → Engagement → Advocacy
- Need Recognition → Information Search → Alternative Evaluation → Purchase → Post-Purchase

Return complete stage objects with all required fields.`,

    fieldsToGenerate: ['name', 'description'],

    defaultValues: {},

    contextFields: [
      'journey_name',
      'journey_description',
      'persona_context',
      'existing_stages',
    ],

    displayField: 'name',

    editableFields: ['name', 'description'],

    fieldHints: {
      name: 'Short stage name (e.g., "Discovery", "Evaluation", "Onboarding")',
      description: 'What happens during this stage, customer goals and behaviors',
    },
  },

  journey_cells: {
    systemPrompt: `Generate content for a customer journey cell at the intersection of a stage and layer.

Consider:
- Stage context: what phase of the journey the customer is in
- Layer type: touchpoint / emotion / pain_point / channel / opportunity

Layer descriptions:
- touchpoint: Customer interaction points (what they do, experience, or encounter)
- emotion: Emotional state (-5 to +5 scale, very negative to very positive)
- pain_point: Frustrations, problems, friction points, unmet needs
- channel: Communication channels used (email, phone, web, app, in-person, etc.)
- opportunity: Improvement opportunities, ways to enhance the experience

Write content appropriate for the specific layer type.

For emotion layer:
- Include emotion_score field (integer -5 to +5)
- Include brief content explaining the emotional state

For channel layer:
- Include channel_type field (the primary channel)
- Include content with details about channel usage

For other layers:
- Focus on content field with clear, actionable descriptions

Return complete cell objects with all required fields.`,

    fieldsToGenerate: ['content', 'emotion_score', 'channel_type'],

    defaultValues: {},

    contextFields: [
      'stage_name',
      'stage_description',
      'layer_type',
      'layer_name',
      'layer_description',
      'journey_context',
      'persona_context',
      'adjacent_cells',
    ],

    displayField: 'content',

    editableFields: ['content', 'emotion_score', 'channel_type'],

    fieldHints: {
      content: 'Description for this stage and layer intersection',
      emotion_score: 'Customer emotional state (-5 very negative to +5 very positive)',
      channel_type: 'Communication channel (email, phone, web, app, chat, in-person, etc.)',
    },
  },

  // ============================================================================
  // Block Grid Canvas Entities (Phase 3+)
  // ============================================================================

  bmc_items: {
    systemPrompt: `Generate items for a Business Model Canvas block.

Consider the block type and generate appropriate content:
- Key Partners: Strategic partnerships and suppliers
- Key Activities: Core business activities required to deliver value
- Key Resources: Essential assets (physical, intellectual, human, financial)
- Value Propositions: Customer value delivered
- Customer Relationships: How you interact with and retain customers
- Channels: How you reach and deliver value to customers
- Customer Segments: Different groups of people or organizations you serve
- Cost Structure: Major costs in operating the business model
- Revenue Streams: How you generate income from each customer segment

Each item should:
- Be concise but descriptive
- Be specific to the business context provided
- Be actionable and clearly understandable
- Be meaningfully different from existing items in the block

Generate 3-5 items per request unless otherwise specified.`,

    fieldsToGenerate: ['content', 'priority'],

    defaultValues: {},

    contextFields: [
      'canvas_name',
      'canvas_description',
      'block_type',
      'block_name',
      'existing_items',
      'venture_context',
      'project_context',
    ],

    displayField: 'content',

    editableFields: ['content', 'priority'],

    fieldHints: {
      content: 'Concise description of the item (max 500 characters)',
      priority: 'Importance level: high, medium, or low',
    },
  },

  // ============================================================================
  // Customer Profile Canvas (Phase 4)
  // ============================================================================

  customer_profile_items: {
    systemPrompt: `Generate items for a Customer Profile canvas block.

Consider the block type:
- Jobs: What the customer is trying to accomplish
  - Functional jobs: Practical tasks and problems to solve
  - Social jobs: How they want to be perceived by others
  - Emotional jobs: How they want to feel
- Pains: Frustrations, obstacles, risks the customer faces
  - Undesired outcomes, problems, characteristics
  - Obstacles, risks, and barriers
  - Common mistakes and frustrations
- Gains: Benefits and outcomes the customer desires
  - Required gains: Basic expectations
  - Expected gains: Standard expectations
  - Desired gains: Things they would love
  - Unexpected gains: Things beyond expectations

Each item should:
- Be specific to the customer segment/persona
- Be grounded in real customer understanding
- Be concise but descriptive (max 500 characters)
- Be meaningfully different from existing items

Generate 3-5 items per request unless otherwise specified.`,

    fieldsToGenerate: ['content', 'type', 'severity', 'importance'],

    defaultValues: {},

    contextFields: [
      'profile_name',
      'profile_description',
      'block_type',
      'block_name',
      'persona_context',
      'existing_items',
    ],

    displayField: 'content',

    editableFields: ['content', 'type', 'severity', 'importance', 'evidence'],

    fieldHints: {
      content: 'Description of the job, pain, or gain (max 500 characters)',
      type: 'Job type: functional, social, or emotional',
      severity: 'Pain severity: low, medium, high, or extreme',
      importance: 'Importance level: nice_to_have, important, or critical',
      evidence: 'What evidence supports this item',
    },
  },

  // ============================================================================
  // Value Map Canvas (Phase 4)
  // ============================================================================

  value_map_items: {
    systemPrompt: `Generate items for a Value Map canvas block.

Consider the block type:
- Products & Services: What you offer to customers
  - Physical/tangible products
  - Intangible services
  - Digital products
  - Financial services
- Pain Relievers: How your offering addresses customer pains
  - Savings (time, money, effort)
  - Fix problems or solve issues
  - Eliminate negative emotions
  - Address unwanted characteristics
- Gain Creators: How your offering creates customer gains
  - Create functional utility
  - Generate positive emotions
  - Create social gains
  - Enable savings or cost reductions

Each item should:
- Be specific to how you deliver value
- Connect to customer profile when available
- Be concise but descriptive (max 500 characters)
- Be meaningfully different from existing items

Generate 3-5 items per request unless otherwise specified.`,

    fieldsToGenerate: ['content', 'type', 'effectiveness'],

    defaultValues: {},

    contextFields: [
      'value_map_name',
      'value_map_description',
      'block_type',
      'block_name',
      'linked_profile',
      'existing_items',
    ],

    displayField: 'content',

    editableFields: ['content', 'type', 'effectiveness', 'evidence'],

    fieldHints: {
      content: 'Description of the product, reliever, or creator (max 500 characters)',
      type: 'Product type: product, service, or feature',
      effectiveness: 'How well this addresses pain/creates gain: low, medium, or high',
      evidence: 'What evidence supports this item',
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
