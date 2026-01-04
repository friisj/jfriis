import { z } from 'zod'

// Landing Pages
export const LandingPageSchema = z.object({
  id: z.string().uuid().optional(),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
  title: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
  content: z.any().optional().nullable(),
  target_audience: z.string().optional().nullable(),
  published: z.boolean().default(false),
})

export const LandingPageCreateSchema = LandingPageSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
})

export const LandingPageUpdateSchema = LandingPageCreateSchema.partial()

// Profiles
export const ProfileSchema = z.object({
  id: z.string().uuid(),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
  display_name: z.string().optional().nullable(),
  avatar_url: z.string().optional().nullable(),
  is_admin: z.boolean().default(false),
  metadata: z.any().optional().nullable(),
})

export const ProfileUpdateSchema = ProfileSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
}).partial()
