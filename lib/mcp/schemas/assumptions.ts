import { z } from 'zod'

// Assumption Categories (Teresa Torres + David Bland)
export const AssumptionCategorySchema = z.enum([
  'desirability',  // Do customers want this?
  'viability',     // Can we make money / sustain this?
  'feasibility',   // Can we build it?
  'usability',     // Can customers use it effectively?
  'ethical',       // Is there potential harm?
])

// Prioritization (David Bland's 2x2 matrix)
export const AssumptionImportanceSchema = z.enum(['critical', 'high', 'medium', 'low'])
export const AssumptionEvidenceLevelSchema = z.enum(['none', 'weak', 'moderate', 'strong'])

// Status (Strategyzer's design-test loop)
export const AssumptionStatusSchema = z.enum([
  'identified',   // Just captured
  'prioritized',  // In the queue to test
  'testing',      // Currently being tested
  'validated',    // Supported by evidence
  'invalidated',  // Refuted by evidence
  'archived',     // No longer relevant
])

// Source tracking
export const AssumptionSourceTypeSchema = z.enum([
  'business_model_canvas',
  'value_map',
  'customer_profile',
  'value_proposition_canvas',
  'opportunity',
  'solution',
  'manual',
])

// Main Assumption Schema
export const AssumptionSchema = z.object({
  id: z.string().uuid().optional(),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),

  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
  statement: z.string().min(1),

  category: AssumptionCategorySchema,
  importance: AssumptionImportanceSchema.default('medium'),
  evidence_level: AssumptionEvidenceLevelSchema.default('none'),
  status: AssumptionStatusSchema.default('identified'),

  is_leap_of_faith: z.boolean().default(false),

  // Studio context
  studio_project_id: z.string().uuid().optional().nullable(),
  hypothesis_id: z.string().uuid().optional().nullable(),

  // Source tracking
  source_type: AssumptionSourceTypeSchema.optional().nullable(),
  source_id: z.string().uuid().optional().nullable(),
  source_block: z.string().optional().nullable(),

  // Validation
  validation_criteria: z.string().optional().nullable(),
  validated_at: z.string().datetime().optional().nullable(),
  invalidated_at: z.string().datetime().optional().nullable(),
  decision: z.string().optional().nullable(),
  decision_notes: z.string().optional().nullable(),

  // Metadata
  notes: z.string().optional().nullable(),
  tags: z.array(z.string()).default([]),
  metadata: z.record(z.string(), z.any()).default({}),
})

export const AssumptionCreateSchema = AssumptionSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
  is_leap_of_faith: true, // Computed field
})

export const AssumptionUpdateSchema = AssumptionCreateSchema.partial()

export type Assumption = z.infer<typeof AssumptionSchema>
export type AssumptionCreate = z.infer<typeof AssumptionCreateSchema>
export type AssumptionUpdate = z.infer<typeof AssumptionUpdateSchema>

// Assumption-Experiment Junction Schema
export const AssumptionExperimentResultSchema = z.enum(['supports', 'refutes', 'inconclusive'])

export const AssumptionExperimentSchema = z.object({
  id: z.string().uuid().optional(),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),

  assumption_id: z.string().uuid(),
  experiment_id: z.string().uuid(),

  result: AssumptionExperimentResultSchema.optional().nullable(),
  confidence: z.enum(['low', 'medium', 'high']).optional().nullable(),
  notes: z.string().optional().nullable(),
})

export const AssumptionExperimentCreateSchema = AssumptionExperimentSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
})

export const AssumptionExperimentUpdateSchema = AssumptionExperimentCreateSchema.partial()

export type AssumptionExperiment = z.infer<typeof AssumptionExperimentSchema>
export type AssumptionExperimentCreate = z.infer<typeof AssumptionExperimentCreateSchema>
export type AssumptionExperimentUpdate = z.infer<typeof AssumptionExperimentUpdateSchema>

// Assumption Evidence Schema
export const AssumptionEvidenceTypeSchema = z.enum([
  'interview',
  'survey',
  'analytics',
  'experiment',
  'observation',
  'research',
  'competitor',
  'expert',
])

export const AssumptionEvidenceSchema = z.object({
  id: z.string().uuid().optional(),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),

  assumption_id: z.string().uuid(),

  evidence_type: AssumptionEvidenceTypeSchema,
  title: z.string().min(1),
  summary: z.string().optional().nullable(),
  url: z.string().url().optional().nullable(),

  supports_assumption: z.boolean().optional().nullable(),
  confidence: z.enum(['low', 'medium', 'high']).optional().nullable(),
  collected_at: z.string().datetime().optional().nullable(),

  metadata: z.record(z.string(), z.any()).default({}),
})

export const AssumptionEvidenceCreateSchema = AssumptionEvidenceSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
})

export const AssumptionEvidenceUpdateSchema = AssumptionEvidenceCreateSchema.partial()

export type AssumptionEvidence = z.infer<typeof AssumptionEvidenceSchema>
export type AssumptionEvidenceCreate = z.infer<typeof AssumptionEvidenceCreateSchema>
export type AssumptionEvidenceUpdate = z.infer<typeof AssumptionEvidenceUpdateSchema>
