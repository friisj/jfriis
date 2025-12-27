import { z } from 'zod'

// Gallery Specimen Items
export const GallerySpecimenItemSchema = z.object({
  id: z.string().uuid().optional(),
  created_at: z.string().datetime().optional(),
  gallery_sequence_id: z.string().uuid(),
  specimen_id: z.string().uuid(),
  position: z.number().int().default(0),
  display_config: z.any().optional().nullable(),
})

export const GallerySpecimenItemCreateSchema = GallerySpecimenItemSchema.omit({
  id: true,
  created_at: true,
})

export const GallerySpecimenItemUpdateSchema = GallerySpecimenItemCreateSchema.partial()

// Log Entry Specimens
export const LogEntrySpecimenSchema = z.object({
  id: z.string().uuid().optional(),
  created_at: z.string().datetime().optional(),
  log_entry_id: z.string().uuid(),
  specimen_id: z.string().uuid(),
  position: z.number().int().optional().nullable(),
})

export const LogEntrySpecimenCreateSchema = LogEntrySpecimenSchema.omit({
  id: true,
  created_at: true,
})

export const LogEntrySpecimenUpdateSchema = LogEntrySpecimenCreateSchema.partial()

// Project Specimens
export const ProjectSpecimenSchema = z.object({
  id: z.string().uuid().optional(),
  created_at: z.string().datetime().optional(),
  project_id: z.string().uuid(),
  specimen_id: z.string().uuid(),
  position: z.number().int().optional().nullable(),
})

export const ProjectSpecimenCreateSchema = ProjectSpecimenSchema.omit({
  id: true,
  created_at: true,
})

export const ProjectSpecimenUpdateSchema = ProjectSpecimenCreateSchema.partial()

// Log Entry Projects
export const LogEntryProjectSchema = z.object({
  id: z.string().uuid().optional(),
  created_at: z.string().datetime().optional(),
  log_entry_id: z.string().uuid(),
  project_id: z.string().uuid(),
})

export const LogEntryProjectCreateSchema = LogEntryProjectSchema.omit({
  id: true,
  created_at: true,
})

export const LogEntryProjectUpdateSchema = LogEntryProjectCreateSchema.partial()
