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

// Backlog Items
export const BacklogItemSchema = z.object({
  id: z.string().uuid().optional(),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
  title: z.string().optional().nullable(),
  content: z.any().optional().nullable(),
  media: z.array(z.any()).optional().nullable(),
  status: z.enum(['inbox', 'in-progress', 'shaped', 'archived']).default('inbox'),
  converted_to: z.string().optional().nullable(),
  converted_id: z.string().uuid().optional().nullable(),
  tags: z.array(z.string()).optional().nullable(),
})

export const BacklogItemCreateSchema = BacklogItemSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
})

export const BacklogItemUpdateSchema = BacklogItemCreateSchema.partial()

// Profiles
export const ProfileSchema = z.object({
  id: z.string().uuid(),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
  display_name: z.string().optional().nullable(),
  avatar_url: z.string().optional().nullable(),
  is_admin: z.boolean().default(false),
  // Remote MCP role-based access
  role: z.enum(['admin', 'editor']).default('editor'),
  assigned_projects: z.array(z.string().uuid()).default([]),
  metadata: z.any().optional().nullable(),
})

export const ProfileUpdateSchema = ProfileSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
}).partial()
