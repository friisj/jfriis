import { z } from 'zod'

// --- Enums ---

export const BlueprintTypeSchema = z.enum(['service', 'product', 'hybrid', 'digital', 'physical'])
export const BlueprintStatusSchema = z.enum(['draft', 'active', 'validated', 'archived'])
export const BlueprintValidationStatusSchema = z.enum(['untested', 'testing', 'validated', 'invalidated'])
export const CostImplicationSchema = z.enum(['none', 'low', 'medium', 'high'])
export const CustomerValueDeliverySchema = z.enum(['none', 'low', 'medium', 'high'])
export const FailureRiskSchema = z.enum(['low', 'medium', 'high', 'critical'])

// --- Service Blueprints ---

export const ServiceBlueprintSchema = z.object({
  id: z.string().uuid().optional(),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),

  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
  name: z.string().min(1),
  description: z.string().optional().nullable(),

  studio_project_id: z.string().uuid().optional().nullable(),
  hypothesis_id: z.string().uuid().optional().nullable(),

  blueprint_type: BlueprintTypeSchema.default('service'),
  status: BlueprintStatusSchema.default('draft'),

  version: z.number().int().default(1),
  parent_version_id: z.string().uuid().optional().nullable(),

  service_scope: z.string().optional().nullable(),
  service_duration: z.string().optional().nullable(),

  validation_status: BlueprintValidationStatusSchema.default('untested'),
  validated_at: z.string().datetime().optional().nullable(),

  tags: z.array(z.string()).default([]),
  metadata: z.record(z.string(), z.any()).default({}),
})

export const ServiceBlueprintCreateSchema = ServiceBlueprintSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
})

export const ServiceBlueprintUpdateSchema = ServiceBlueprintCreateSchema.partial()

export type ServiceBlueprint = z.infer<typeof ServiceBlueprintSchema>
export type ServiceBlueprintCreate = z.infer<typeof ServiceBlueprintCreateSchema>
export type ServiceBlueprintUpdate = z.infer<typeof ServiceBlueprintUpdateSchema>

// --- Blueprint Steps ---

export const BlueprintStepSchema = z.object({
  id: z.string().uuid().optional(),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),

  service_blueprint_id: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  sequence: z.number().int(),

  layers: z.record(z.string(), z.any()).default({
    customer_action: null,
    frontstage: null,
    backstage: null,
    support_process: null,
  }),
  actors: z.record(z.string(), z.any()).default({}),

  duration_estimate: z.string().optional().nullable(),
  cost_implication: CostImplicationSchema.optional().nullable(),
  customer_value_delivery: CustomerValueDeliverySchema.optional().nullable(),
  failure_risk: FailureRiskSchema.optional().nullable(),
  failure_impact: z.string().optional().nullable(),

  validation_status: BlueprintValidationStatusSchema.default('untested'),
  metadata: z.record(z.string(), z.any()).default({}),
})

export const BlueprintStepCreateSchema = BlueprintStepSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
})

export const BlueprintStepUpdateSchema = BlueprintStepCreateSchema.partial()

export type BlueprintStep = z.infer<typeof BlueprintStepSchema>
export type BlueprintStepCreate = z.infer<typeof BlueprintStepCreateSchema>
export type BlueprintStepUpdate = z.infer<typeof BlueprintStepUpdateSchema>
