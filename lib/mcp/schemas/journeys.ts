import { z } from 'zod'

// --- Enums ---

export const JourneyTypeSchema = z.enum(['end_to_end', 'sub_journey', 'micro_moment'])
export const JourneyStatusSchema = z.enum(['draft', 'active', 'validated', 'archived'])
export const ValidationStatusSchema = z.enum(['untested', 'testing', 'validated', 'invalidated'])
export const ValidationConfidenceSchema = z.enum(['low', 'medium', 'high'])

export const StageTypeSchema = z.enum(['pre_purchase', 'purchase', 'post_purchase', 'ongoing'])
export const DropOffRiskSchema = z.enum(['low', 'medium', 'high'])

export const ChannelTypeSchema = z.enum([
  'web', 'mobile_app', 'phone', 'email', 'in_person',
  'chat', 'social', 'physical_location', 'mail', 'other',
])
export const InteractionTypeSchema = z.enum([
  'browse', 'search', 'read', 'watch', 'listen',
  'form', 'transaction', 'conversation', 'notification', 'passive',
])
export const ImportanceSchema = z.enum(['critical', 'high', 'medium', 'low'])
export const ExperienceQualitySchema = z.enum(['poor', 'fair', 'good', 'excellent', 'unknown'])
export const PainLevelSchema = z.enum(['none', 'minor', 'moderate', 'major', 'critical'])
export const DelightPotentialSchema = z.enum(['low', 'medium', 'high'])

// --- User Journeys ---

export const UserJourneySchema = z.object({
  id: z.string().uuid().optional(),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),

  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
  name: z.string().min(1),
  description: z.string().optional().nullable(),

  studio_project_id: z.string().uuid().optional().nullable(),
  hypothesis_id: z.string().uuid().optional().nullable(),
  customer_profile_id: z.string().uuid().optional().nullable(),

  journey_type: JourneyTypeSchema.default('end_to_end'),
  status: JourneyStatusSchema.default('draft'),

  version: z.number().int().default(1),
  parent_version_id: z.string().uuid().optional().nullable(),

  goal: z.string().optional().nullable(),
  context: z.record(z.string(), z.any()).default({}),
  duration_estimate: z.string().optional().nullable(),

  validation_status: ValidationStatusSchema.default('untested'),
  validated_at: z.string().datetime().optional().nullable(),
  validation_confidence: ValidationConfidenceSchema.optional().nullable(),

  tags: z.array(z.string()).default([]),
  metadata: z.record(z.string(), z.any()).default({}),
})

export const UserJourneyCreateSchema = UserJourneySchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
})

export const UserJourneyUpdateSchema = UserJourneyCreateSchema.partial()

export type UserJourney = z.infer<typeof UserJourneySchema>
export type UserJourneyCreate = z.infer<typeof UserJourneyCreateSchema>
export type UserJourneyUpdate = z.infer<typeof UserJourneyUpdateSchema>

// --- Journey Stages ---

export const JourneyStageSchema = z.object({
  id: z.string().uuid().optional(),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),

  user_journey_id: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  sequence: z.number().int(),

  stage_type: StageTypeSchema.optional().nullable(),
  customer_emotion: z.string().optional().nullable(),
  customer_mindset: z.string().optional().nullable(),
  customer_goal: z.string().optional().nullable(),
  duration_estimate: z.string().optional().nullable(),
  drop_off_risk: DropOffRiskSchema.optional().nullable(),

  validation_status: ValidationStatusSchema.default('untested'),
  metadata: z.record(z.string(), z.any()).default({}),
})

export const JourneyStageCreateSchema = JourneyStageSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
})

export const JourneyStageUpdateSchema = JourneyStageCreateSchema.partial()

export type JourneyStage = z.infer<typeof JourneyStageSchema>
export type JourneyStageCreate = z.infer<typeof JourneyStageCreateSchema>
export type JourneyStageUpdate = z.infer<typeof JourneyStageUpdateSchema>

// --- Touchpoints ---

export const TouchpointSchema = z.object({
  id: z.string().uuid().optional(),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),

  journey_stage_id: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  sequence: z.number().int(),

  channel_type: ChannelTypeSchema.optional().nullable(),
  interaction_type: InteractionTypeSchema.optional().nullable(),
  importance: ImportanceSchema.optional().nullable(),
  current_experience_quality: ExperienceQualitySchema.optional().nullable(),
  pain_level: PainLevelSchema.optional().nullable(),
  delight_potential: DelightPotentialSchema.optional().nullable(),

  user_actions: z.array(z.any()).default([]),
  system_response: z.record(z.string(), z.any()).default({}),

  validation_status: ValidationStatusSchema.default('untested'),
  validated_at: z.string().datetime().optional().nullable(),
  metadata: z.record(z.string(), z.any()).default({}),
})

export const TouchpointCreateSchema = TouchpointSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
})

export const TouchpointUpdateSchema = TouchpointCreateSchema.partial()

export type Touchpoint = z.infer<typeof TouchpointSchema>
export type TouchpointCreate = z.infer<typeof TouchpointCreateSchema>
export type TouchpointUpdate = z.infer<typeof TouchpointUpdateSchema>
