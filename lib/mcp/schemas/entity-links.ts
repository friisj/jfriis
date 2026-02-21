import { z } from 'zod'

// Strength levels for entity relationships
export const EntityLinkStrengthSchema = z.enum(['strong', 'moderate', 'weak', 'tentative'])

// Entity Links Schema (universal many-to-many relationship table)
export const EntityLinkSchema = z.object({
  id: z.string().uuid().optional(),
  created_at: z.string().datetime().optional(),

  source_type: z.string().min(1),
  source_id: z.string().uuid(),
  target_type: z.string().min(1),
  target_id: z.string().uuid(),

  link_type: z.string().min(1).default('related'),
  strength: EntityLinkStrengthSchema.optional().nullable(),
  notes: z.string().optional().nullable(),
  metadata: z.record(z.string(), z.any()).default({}),
  position: z.number().int().optional().nullable(),
})

export const EntityLinkCreateSchema = EntityLinkSchema.omit({
  id: true,
  created_at: true,
})

export const EntityLinkUpdateSchema = EntityLinkCreateSchema.partial()

export type EntityLink = z.infer<typeof EntityLinkSchema>
export type EntityLinkCreate = z.infer<typeof EntityLinkCreateSchema>
export type EntityLinkUpdate = z.infer<typeof EntityLinkUpdateSchema>
