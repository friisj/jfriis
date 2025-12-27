import { z } from 'zod'

// Channels
export const ChannelSchema = z.object({
  id: z.string().uuid().optional(),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
  name: z.string().min(1),
  display_name: z.string().min(1),
  type: z.string().optional().nullable(),
  config: z.any().optional().nullable(),
  enabled: z.boolean().default(true),
})

export const ChannelCreateSchema = ChannelSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
})

export const ChannelUpdateSchema = ChannelCreateSchema.partial()

// Distribution Posts
export const DistributionPostSchema = z.object({
  id: z.string().uuid().optional(),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
  channel_id: z.string().uuid(),
  content_type: z.string(),
  content_id: z.string().uuid(),
  title: z.string().optional().nullable(),
  body: z.string().optional().nullable(),
  url: z.string().optional().nullable(),
  status: z.enum(['draft', 'scheduled', 'posted', 'failed']).default('draft'),
  posted_at: z.string().datetime().optional().nullable(),
  engagement: z.any().optional().nullable(),
})

export const DistributionPostCreateSchema = DistributionPostSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
})

export const DistributionPostUpdateSchema = DistributionPostCreateSchema.partial()

// Distribution Queue
export const DistributionQueueSchema = z.object({
  id: z.string().uuid().optional(),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
  channel_id: z.string().uuid(),
  content_type: z.string(),
  content_id: z.string().uuid(),
  status: z.enum(['pending', 'processing', 'completed', 'failed']).default('pending'),
  priority: z.number().int().default(0),
  attempts: z.number().int().default(0),
  max_attempts: z.number().int().default(3),
  process_after: z.string().datetime().optional().nullable(),
  error_message: z.string().optional().nullable(),
})

export const DistributionQueueCreateSchema = DistributionQueueSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
})

export const DistributionQueueUpdateSchema = DistributionQueueCreateSchema.partial()
