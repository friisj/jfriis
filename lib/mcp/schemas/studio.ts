import { z } from 'zod'

// Studio Projects
export const StudioProjectSchema = z.object({
  id: z.string().uuid().optional(),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  status: z.enum(['draft', 'active', 'paused', 'completed', 'archived']).default('draft'),
  temperature: z.enum(['hot', 'warm', 'cold']).optional().nullable(),
  current_focus: z.string().optional().nullable(),
  problem_statement: z.string().optional().nullable(),
  hypothesis: z.string().optional().nullable(),
  success_criteria: z.string().optional().nullable(),
  scope_out: z.string().optional().nullable(),
})

export const StudioProjectCreateSchema = StudioProjectSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
})

export const StudioProjectUpdateSchema = StudioProjectCreateSchema.partial()

export type StudioProject = z.infer<typeof StudioProjectSchema>
export type StudioProjectCreate = z.infer<typeof StudioProjectCreateSchema>
export type StudioProjectUpdate = z.infer<typeof StudioProjectUpdateSchema>

// Studio Hypotheses
export const StudioHypothesisSchema = z.object({
  id: z.string().uuid().optional(),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
  project_id: z.string().uuid(),
  statement: z.string().min(1),
  validation_criteria: z.string().optional().nullable(),
  sequence: z.number().int().positive().default(1),
  status: z.enum(['proposed', 'testing', 'validated', 'invalidated']).default('proposed'),
})

export const StudioHypothesisCreateSchema = StudioHypothesisSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
})

export const StudioHypothesisUpdateSchema = StudioHypothesisCreateSchema.partial()

export type StudioHypothesis = z.infer<typeof StudioHypothesisSchema>
export type StudioHypothesisCreate = z.infer<typeof StudioHypothesisCreateSchema>
export type StudioHypothesisUpdate = z.infer<typeof StudioHypothesisUpdateSchema>

// Studio Experiments
export const StudioExperimentSchema = z.object({
  id: z.string().uuid().optional(),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
  project_id: z.string().uuid(),
  hypothesis_id: z.string().uuid().optional().nullable(),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  type: z.enum(['spike', 'experiment', 'prototype']).default('experiment'),
  status: z.enum(['planned', 'in_progress', 'completed', 'abandoned']).default('planned'),
  outcome: z.enum(['success', 'failure', 'inconclusive']).optional().nullable(),
  learnings: z.string().optional().nullable(),
})

export const StudioExperimentCreateSchema = StudioExperimentSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
})

export const StudioExperimentUpdateSchema = StudioExperimentCreateSchema.partial()

export type StudioExperiment = z.infer<typeof StudioExperimentSchema>
export type StudioExperimentCreate = z.infer<typeof StudioExperimentCreateSchema>
export type StudioExperimentUpdate = z.infer<typeof StudioExperimentUpdateSchema>
