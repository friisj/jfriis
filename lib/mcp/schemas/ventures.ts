import { z } from 'zod'

export const VentureSchema = z.object({
  id: z.string().uuid().optional(),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
  title: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
  description: z.string().optional().nullable(),
  content: z.any().optional().nullable(),
  status: z.enum(['draft', 'active', 'archived', 'completed']).default('draft'),
  type: z.string().optional().nullable(),
  start_date: z.string().optional().nullable(),
  end_date: z.string().optional().nullable(),
  featured_image: z.string().optional().nullable(),
  images: z.array(z.any()).optional().nullable(),
  tags: z.array(z.string()).optional().nullable(),
  metadata: z.any().optional().nullable(),
  seo_title: z.string().optional().nullable(),
  seo_description: z.string().optional().nullable(),
  published: z.boolean().default(false),
  published_at: z.string().datetime().optional().nullable(),
})

export const VentureCreateSchema = VentureSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
})

export const VentureUpdateSchema = VentureCreateSchema.partial()

export type Venture = z.infer<typeof VentureSchema>
export type VentureCreate = z.infer<typeof VentureCreateSchema>
export type VentureUpdate = z.infer<typeof VentureUpdateSchema>

// Backwards compatibility (deprecated)
/** @deprecated Use VentureSchema instead */
export const ProjectSchema = VentureSchema
/** @deprecated Use VentureCreateSchema instead */
export const ProjectCreateSchema = VentureCreateSchema
/** @deprecated Use VentureUpdateSchema instead */
export const ProjectUpdateSchema = VentureUpdateSchema
/** @deprecated Use Venture instead */
export type Project = Venture
/** @deprecated Use VentureCreate instead */
export type ProjectCreate = VentureCreate
/** @deprecated Use VentureUpdate instead */
export type ProjectUpdate = VentureUpdate
