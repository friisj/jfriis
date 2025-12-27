import { z } from 'zod'

export const LogEntrySchema = z.object({
  id: z.string().uuid().optional(),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
  title: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
  content: z.any().optional().nullable(),
  entry_date: z.string(),
  type: z.string().optional().nullable(),
  featured_image: z.string().optional().nullable(),
  images: z.array(z.any()).optional().nullable(),
  tags: z.array(z.string()).optional().nullable(),
  metadata: z.any().optional().nullable(),
  published: z.boolean().default(false),
  published_at: z.string().datetime().optional().nullable(),
})

export const LogEntryCreateSchema = LogEntrySchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
})

export const LogEntryUpdateSchema = LogEntryCreateSchema.partial()

export type LogEntry = z.infer<typeof LogEntrySchema>
export type LogEntryCreate = z.infer<typeof LogEntryCreateSchema>
export type LogEntryUpdate = z.infer<typeof LogEntryUpdateSchema>
