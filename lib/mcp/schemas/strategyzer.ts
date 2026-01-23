import { z } from 'zod'

// Shared Canvas Building Blocks
export const CanvasBlockItemSchema = z.object({
  id: z.string(),
  content: z.string(),
  priority: z.enum(['high', 'medium', 'low']).optional(),
  created_at: z.string().datetime(),
  metadata: z
    .object({
      source: z.string().optional(),
      confidence: z.enum(['low', 'medium', 'high']).optional(),
      tags: z.array(z.string()).optional(),
    })
    .passthrough()
    .optional(),
})

export const AssumptionSchema = z.object({
  id: z.string(),
  statement: z.string(),
  criticality: z.enum(['high', 'medium', 'low']),
  tested: z.boolean(),
  hypothesis_id: z.string().uuid().optional(),
})

export const EvidenceSchema = z.object({
  id: z.string(),
  type: z.enum(['interview', 'survey', 'analytics', 'experiment', 'observation']),
  reference: z.string(),
  summary: z.string(),
  confidence: z.enum(['low', 'medium', 'high']),
  date: z.string().datetime(),
})

export const CanvasBlockSchema = z.object({
  items: z.array(CanvasBlockItemSchema).default([]),
  assumptions: z.array(AssumptionSchema).default([]),
  evidence: z.array(EvidenceSchema).optional(),
  validation_status: z.enum(['untested', 'testing', 'validated', 'invalidated']).default('untested'),
  validated_at: z.string().datetime().optional(),
  notes: z.string().optional(),
})

// Business Model Canvas
export const BusinessModelCanvasSchema = z.object({
  id: z.string().uuid().optional(),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  studio_project_id: z.string().uuid().optional().nullable(),
  hypothesis_id: z.string().uuid().optional().nullable(),
  status: z.enum(['draft', 'active', 'validated', 'archived']).default('draft'),
  version: z.number().int().positive().default(1),
  parent_version_id: z.string().uuid().optional().nullable(),

  // Canvas Building Blocks
  key_partners: CanvasBlockSchema.default({
    items: [],
    assumptions: [],
    validation_status: 'untested',
  }),
  key_activities: CanvasBlockSchema.default({
    items: [],
    assumptions: [],
    validation_status: 'untested',
  }),
  key_resources: CanvasBlockSchema.default({
    items: [],
    assumptions: [],
    validation_status: 'untested',
  }),
  value_propositions: CanvasBlockSchema.default({
    items: [],
    assumptions: [],
    validation_status: 'untested',
  }),
  customer_segments: CanvasBlockSchema.default({
    items: [],
    assumptions: [],
    validation_status: 'untested',
  }),
  customer_relationships: CanvasBlockSchema.default({
    items: [],
    assumptions: [],
    validation_status: 'untested',
  }),
  channels: CanvasBlockSchema.default({
    items: [],
    assumptions: [],
    validation_status: 'untested',
  }),
  cost_structure: CanvasBlockSchema.default({
    items: [],
    assumptions: [],
    validation_status: 'untested',
  }),
  revenue_streams: CanvasBlockSchema.default({
    items: [],
    assumptions: [],
    validation_status: 'untested',
  }),

  // Relationships
  related_value_proposition_ids: z.array(z.string().uuid()).default([]),
  related_customer_profile_ids: z.array(z.string().uuid()).default([]),

  // Metadata
  tags: z.array(z.string()).default([]),
  metadata: z.record(z.string(), z.any()).default({}),
})

export const BusinessModelCanvasCreateSchema = BusinessModelCanvasSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
})

export const BusinessModelCanvasUpdateSchema = BusinessModelCanvasCreateSchema.partial()

export type BusinessModelCanvas = z.infer<typeof BusinessModelCanvasSchema>
export type BusinessModelCanvasCreate = z.infer<typeof BusinessModelCanvasCreateSchema>
export type BusinessModelCanvasUpdate = z.infer<typeof BusinessModelCanvasUpdateSchema>

// Value Map (the "square" side - what you offer)
export const ValueMapSchema = z.object({
  id: z.string().uuid().optional(),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  studio_project_id: z.string().uuid().optional().nullable(),
  hypothesis_id: z.string().uuid().optional().nullable(),
  status: z.enum(['draft', 'active', 'validated', 'archived']).default('draft'),
  version: z.number().int().positive().default(1),
  parent_version_id: z.string().uuid().optional().nullable(),

  // Value Map Blocks
  products_services: CanvasBlockSchema.default({
    items: [],
    assumptions: [],
    validation_status: 'untested',
  }),
  pain_relievers: CanvasBlockSchema.default({
    items: [],
    assumptions: [],
    validation_status: 'untested',
  }),
  gain_creators: CanvasBlockSchema.default({
    items: [],
    assumptions: [],
    validation_status: 'untested',
  }),

  // Relationship to BMC
  business_model_canvas_id: z.string().uuid().optional().nullable(),

  // Metadata
  tags: z.array(z.string()).default([]),
  metadata: z.record(z.string(), z.any()).default({}),
})

export const ValueMapCreateSchema = ValueMapSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
})

export const ValueMapUpdateSchema = ValueMapCreateSchema.partial()

export type ValueMap = z.infer<typeof ValueMapSchema>
export type ValueMapCreate = z.infer<typeof ValueMapCreateSchema>
export type ValueMapUpdate = z.infer<typeof ValueMapUpdateSchema>

// Addressed Items Schema (for VPC fit analysis)
const AddressedItemsSchema = z.object({
  items: z.array(z.string()).default([]),
  coverage: z.number().min(0).max(1).optional().nullable(),
})

// Value Proposition Canvas (FIT analysis between Value Map + Customer Profile)
export const ValuePropositionCanvasSchema = z.object({
  id: z.string().uuid().optional(),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  studio_project_id: z.string().uuid().optional().nullable(),
  hypothesis_id: z.string().uuid().optional().nullable(),

  // Core Links (both required for VPC)
  value_map_id: z.string().uuid(),
  customer_profile_id: z.string().uuid(),

  // Fit Analysis
  status: z.enum(['draft', 'active', 'validated', 'archived']).default('draft'),
  fit_score: z.number().min(0).max(1).optional().nullable(),
  fit_analysis: z.record(z.string(), z.any()).default({}),

  // Which jobs/pains/gains from customer profile are addressed
  addressed_jobs: AddressedItemsSchema.default({ items: [] }),
  addressed_pains: AddressedItemsSchema.default({ items: [] }),
  addressed_gains: AddressedItemsSchema.default({ items: [] }),

  // Validation
  assumptions: z.object({ items: z.array(AssumptionSchema) }).default({ items: [] }),
  evidence: z.object({ items: z.array(EvidenceSchema) }).default({ items: [] }),
  validation_status: z.enum(['untested', 'testing', 'validated', 'invalidated']).default('untested'),
  last_validated_at: z.string().datetime().optional().nullable(),

  // Metadata
  tags: z.array(z.string()).default([]),
  metadata: z.record(z.string(), z.any()).default({}),
})

export const ValuePropositionCanvasCreateSchema = ValuePropositionCanvasSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
})

export const ValuePropositionCanvasUpdateSchema = ValuePropositionCanvasCreateSchema.partial()

export type ValuePropositionCanvas = z.infer<typeof ValuePropositionCanvasSchema>
export type ValuePropositionCanvasCreate = z.infer<typeof ValuePropositionCanvasCreateSchema>
export type ValuePropositionCanvasUpdate = z.infer<typeof ValuePropositionCanvasUpdateSchema>

// Customer Profile
export const CustomerProfileSchema = z.object({
  id: z.string().uuid().optional(),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  studio_project_id: z.string().uuid().optional().nullable(),
  hypothesis_id: z.string().uuid().optional().nullable(),
  status: z.enum(['draft', 'active', 'validated', 'archived']).default('draft'),
  version: z.number().int().positive().default(1),
  parent_version_id: z.string().uuid().optional().nullable(),
  profile_type: z.enum(['persona', 'segment', 'archetype', 'icp']).optional().nullable(),

  // Core Profile Data
  demographics: z.record(z.string(), z.any()).default({}),
  psychographics: z.record(z.string(), z.any()).default({}),
  behaviors: z.record(z.string(), z.any()).default({}),

  // Jobs, Pains, Gains
  jobs: CanvasBlockSchema.default({
    items: [],
    assumptions: [],
    validation_status: 'untested',
  }),
  pains: CanvasBlockSchema.extend({
    severity: z.record(z.string(), z.enum(['high', 'medium', 'low'])).optional(),
  }).default({
    items: [],
    assumptions: [],
    validation_status: 'untested',
  }),
  gains: CanvasBlockSchema.extend({
    importance: z.record(z.string(), z.enum(['high', 'medium', 'low'])).optional(),
  }).default({
    items: [],
    assumptions: [],
    validation_status: 'untested',
  }),

  // Context
  environment: z.record(z.string(), z.any()).default({}),
  journey_stages: z.object({ items: z.array(z.any()) }).default({ items: [] }),

  // Metrics
  market_size_estimate: z.string().optional().nullable(),
  addressable_percentage: z.number().min(0).max(100).optional().nullable(),

  // Validation
  evidence_sources: z.object({ items: z.array(EvidenceSchema) }).default({ items: [] }),
  validation_confidence: z.enum(['low', 'medium', 'high']).optional().nullable(),
  last_validated_at: z.string().datetime().optional().nullable(),

  // Relationships
  related_business_model_ids: z.array(z.string().uuid()).default([]),
  related_value_proposition_ids: z.array(z.string().uuid()).default([]),

  // Metadata
  tags: z.array(z.string()).default([]),
  metadata: z.record(z.string(), z.any()).default({}),
})

export const CustomerProfileCreateSchema = CustomerProfileSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
})

export const CustomerProfileUpdateSchema = CustomerProfileCreateSchema.partial()

export type CustomerProfile = z.infer<typeof CustomerProfileSchema>
export type CustomerProfileCreate = z.infer<typeof CustomerProfileCreateSchema>
export type CustomerProfileUpdate = z.infer<typeof CustomerProfileUpdateSchema>
