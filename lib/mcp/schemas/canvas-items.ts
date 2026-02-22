import { z } from 'zod'

// ============================================================================
// ENUMS AND TYPES
// ============================================================================

// Canvas Item Types - determines which blocks items can appear in
export const CanvasItemTypeSchema = z.enum([
  // Business Model Canvas items
  'partner',           // key_partners
  'activity',          // key_activities
  'resource',          // key_resources
  'value_proposition', // value_propositions
  'segment',           // customer_segments
  'relationship',      // customer_relationships
  'channel',           // channels
  'cost',              // cost_structure
  'revenue',           // revenue_streams
  // Customer Profile items
  'job',               // jobs
  'pain',              // pains
  'gain',              // gains
  // Value Map items
  'product_service',   // products_services
  'pain_reliever',     // pain_relievers
  'gain_creator',      // gain_creators
])

export const JobTypeSchema = z.enum(['functional', 'social', 'emotional', 'supporting'])
export const IntensitySchema = z.enum(['minor', 'moderate', 'major', 'extreme'])
export const ImportanceSchema = z.enum(['critical', 'high', 'medium', 'low'])
export const ValidationStatusSchema = z.enum(['untested', 'testing', 'validated', 'invalidated'])
export const FrequencySchema = z.enum(['rarely', 'sometimes', 'often', 'always'])

export const CanvasTypeSchema = z.enum(['business_model_canvas', 'customer_profile', 'value_map'])

export const AssumptionRelationshipTypeSchema = z.enum([
  'about',       // Assumption is about this item
  'depends_on',  // Item depends on this assumption being true
  'validates',   // If assumption is validated, item is validated
  'contradicts', // Assumption contradicts this item
])

export const MappingTypeSchema = z.enum([
  'relieves',  // pain_reliever → pain
  'creates',   // gain_creator → gain
  'addresses', // product_service → job
  'enables',   // general enablement relationship
])

export const FitStrengthSchema = z.enum(['weak', 'partial', 'strong', 'perfect'])
export const ValidationMethodSchema = z.enum(['assumed', 'interviewed', 'tested', 'measured'])

// ============================================================================
// CANVAS ITEM SCHEMA
// ============================================================================

export const CanvasItemSchema = z.object({
  id: z.string().uuid().optional(),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),

  studio_project_id: z.string().uuid().optional().nullable(),

  title: z.string().min(1),
  description: z.string().optional().nullable(),

  item_type: CanvasItemTypeSchema,
  importance: ImportanceSchema.default('medium'),
  validation_status: ValidationStatusSchema.default('untested'),

  // Job-specific fields (for item_type = 'job')
  job_type: JobTypeSchema.optional().nullable(),
  job_context: z.string().optional().nullable(),

  // Pain/Gain intensity (for item_type IN ('pain', 'gain'))
  intensity: IntensitySchema.optional().nullable(),

  // Frequency/occurrence
  frequency: FrequencySchema.optional().nullable(),

  // Metadata
  notes: z.string().optional().nullable(),
  tags: z.array(z.string()).default([]),
  metadata: z.record(z.string(), z.any()).default({}),
})

export const CanvasItemCreateSchema = CanvasItemSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
})

export const CanvasItemUpdateSchema = CanvasItemCreateSchema.partial()

export type CanvasItem = z.infer<typeof CanvasItemSchema>
export type CanvasItemCreate = z.infer<typeof CanvasItemCreateSchema>
export type CanvasItemUpdate = z.infer<typeof CanvasItemUpdateSchema>

// ============================================================================
// CANVAS ITEM PLACEMENT SCHEMA
// ============================================================================

export const CanvasItemPlacementSchema = z.object({
  id: z.string().uuid().optional(),
  created_at: z.string().datetime().optional(),

  canvas_item_id: z.string().uuid(),
  canvas_type: CanvasTypeSchema,
  canvas_id: z.string().uuid(),
  block_name: z.string().min(1),
  position: z.number().int().default(0),
  validation_status_override: ValidationStatusSchema.optional().nullable(),
})

export const CanvasItemPlacementCreateSchema = CanvasItemPlacementSchema.omit({
  id: true,
  created_at: true,
})

export const CanvasItemPlacementUpdateSchema = CanvasItemPlacementCreateSchema
  .omit({ canvas_item_id: true })
  .partial()

export type CanvasItemPlacement = z.infer<typeof CanvasItemPlacementSchema>
export type CanvasItemPlacementCreate = z.infer<typeof CanvasItemPlacementCreateSchema>
export type CanvasItemPlacementUpdate = z.infer<typeof CanvasItemPlacementUpdateSchema>

// ============================================================================
// CANVAS ITEM ASSUMPTION SCHEMA
// ============================================================================

export const CanvasItemAssumptionSchema = z.object({
  id: z.string().uuid().optional(),
  created_at: z.string().datetime().optional(),

  canvas_item_id: z.string().uuid(),
  assumption_id: z.string().uuid(),
  relationship_type: AssumptionRelationshipTypeSchema.default('about'),
  notes: z.string().optional().nullable(),
})

export const CanvasItemAssumptionCreateSchema = CanvasItemAssumptionSchema.omit({
  id: true,
  created_at: true,
})

export const CanvasItemAssumptionUpdateSchema = CanvasItemAssumptionCreateSchema
  .omit({ canvas_item_id: true, assumption_id: true })
  .partial()

export type CanvasItemAssumption = z.infer<typeof CanvasItemAssumptionSchema>
export type CanvasItemAssumptionCreate = z.infer<typeof CanvasItemAssumptionCreateSchema>
export type CanvasItemAssumptionUpdate = z.infer<typeof CanvasItemAssumptionUpdateSchema>

// ============================================================================
// CANVAS ITEM MAPPING SCHEMA (FIT Analysis)
// ============================================================================

export const CanvasItemMappingSchema = z.object({
  id: z.string().uuid().optional(),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),

  source_item_id: z.string().uuid(),
  target_item_id: z.string().uuid(),
  mapping_type: MappingTypeSchema,
  fit_strength: FitStrengthSchema.default('partial'),
  validation_method: ValidationMethodSchema.optional().nullable(),
  notes: z.string().optional().nullable(),
})

export const CanvasItemMappingCreateSchema = CanvasItemMappingSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
})

export const CanvasItemMappingUpdateSchema = CanvasItemMappingCreateSchema
  .omit({ source_item_id: true, target_item_id: true })
  .partial()

export type CanvasItemMapping = z.infer<typeof CanvasItemMappingSchema>
export type CanvasItemMappingCreate = z.infer<typeof CanvasItemMappingCreateSchema>
export type CanvasItemMappingUpdate = z.infer<typeof CanvasItemMappingUpdateSchema>

