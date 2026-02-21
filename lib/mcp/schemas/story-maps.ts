import { z } from 'zod'

// --- Enums ---

export const MapTypeSchema = z.enum(['feature', 'product', 'release', 'discovery'])
export const StoryMapStatusSchema = z.enum(['draft', 'active', 'validated', 'archived'])
export const StoryMapValidationStatusSchema = z.enum(['untested', 'testing', 'validated', 'invalidated'])
export const StoryTypeSchema = z.enum(['feature', 'enhancement', 'bug', 'tech_debt', 'spike'])
export const StoryPrioritySchema = z.enum(['critical', 'high', 'medium', 'low'])
export const StoryStatusSchema = z.enum(['backlog', 'ready', 'in_progress', 'review', 'done', 'archived'])

// --- Story Maps ---

export const StoryMapSchema = z.object({
  id: z.string().uuid().optional(),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),

  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
  name: z.string().min(1),
  description: z.string().optional().nullable(),

  studio_project_id: z.string().uuid().optional().nullable(),
  hypothesis_id: z.string().uuid().optional().nullable(),

  map_type: MapTypeSchema.default('feature'),
  status: StoryMapStatusSchema.default('draft'),

  version: z.number().int().default(1),
  parent_version_id: z.string().uuid().optional().nullable(),

  validation_status: StoryMapValidationStatusSchema.default('untested'),
  validated_at: z.string().datetime().optional().nullable(),

  tags: z.array(z.string()).default([]),
  metadata: z.record(z.string(), z.any()).default({}),
})

export const StoryMapCreateSchema = StoryMapSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
})

export const StoryMapUpdateSchema = StoryMapCreateSchema.partial()

export type StoryMap = z.infer<typeof StoryMapSchema>
export type StoryMapCreate = z.infer<typeof StoryMapCreateSchema>
export type StoryMapUpdate = z.infer<typeof StoryMapUpdateSchema>

// --- Story Map Layers ---

export const StoryMapLayerSchema = z.object({
  id: z.string().uuid().optional(),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),

  story_map_id: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  sequence: z.number().int(),
  layer_type: z.string().optional().nullable(),
  customer_profile_id: z.string().uuid().optional().nullable(),

  metadata: z.record(z.string(), z.any()).default({}),
})

export const StoryMapLayerCreateSchema = StoryMapLayerSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
})

export const StoryMapLayerUpdateSchema = StoryMapLayerCreateSchema.partial()

export type StoryMapLayer = z.infer<typeof StoryMapLayerSchema>
export type StoryMapLayerCreate = z.infer<typeof StoryMapLayerCreateSchema>
export type StoryMapLayerUpdate = z.infer<typeof StoryMapLayerUpdateSchema>

// --- Activities ---

export const ActivitySchema = z.object({
  id: z.string().uuid().optional(),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),

  story_map_id: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  sequence: z.number().int(),
  user_goal: z.string().optional().nullable(),

  metadata: z.record(z.string(), z.any()).default({}),
})

export const ActivityCreateSchema = ActivitySchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
})

export const ActivityUpdateSchema = ActivityCreateSchema.partial()

export type Activity = z.infer<typeof ActivitySchema>
export type ActivityCreate = z.infer<typeof ActivityCreateSchema>
export type ActivityUpdate = z.infer<typeof ActivityUpdateSchema>

// --- User Stories ---

export const UserStorySchema = z.object({
  id: z.string().uuid().optional(),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),

  activity_id: z.string().uuid(),
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  acceptance_criteria: z.string().optional().nullable(),

  story_type: StoryTypeSchema.optional().nullable(),
  priority: StoryPrioritySchema.optional().nullable(),
  story_points: z.number().int().positive().optional().nullable(),
  status: StoryStatusSchema.default('backlog'),

  vertical_position: z.number().int().optional().nullable(),
  layer_id: z.string().uuid().optional().nullable(),

  validation_status: StoryMapValidationStatusSchema.default('untested'),
  validated_at: z.string().datetime().optional().nullable(),

  tags: z.array(z.string()).default([]),
  metadata: z.record(z.string(), z.any()).default({}),
})

export const UserStoryCreateSchema = UserStorySchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
})

export const UserStoryUpdateSchema = UserStoryCreateSchema.partial()

export type UserStory = z.infer<typeof UserStorySchema>
export type UserStoryCreate = z.infer<typeof UserStoryCreateSchema>
export type UserStoryUpdate = z.infer<typeof UserStoryUpdateSchema>

// --- Story Releases ---

export const StoryReleaseSchema = z.object({
  id: z.string().uuid().optional(),
  created_at: z.string().datetime().optional(),

  user_story_id: z.string().uuid(),
  release_name: z.string().min(1),
  release_date: z.string().optional().nullable(),
  release_order: z.number().int().optional().nullable(),

  metadata: z.record(z.string(), z.any()).default({}),
})

export const StoryReleaseCreateSchema = StoryReleaseSchema.omit({
  id: true,
  created_at: true,
})

export const StoryReleaseUpdateSchema = StoryReleaseCreateSchema.partial()

export type StoryRelease = z.infer<typeof StoryReleaseSchema>
export type StoryReleaseCreate = z.infer<typeof StoryReleaseCreateSchema>
export type StoryReleaseUpdate = z.infer<typeof StoryReleaseUpdateSchema>
