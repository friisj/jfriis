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

// Venture Specimens
export const VentureSpecimenSchema = z.object({
  id: z.string().uuid().optional(),
  created_at: z.string().datetime().optional(),
  venture_id: z.string().uuid(),
  specimen_id: z.string().uuid(),
  position: z.number().int().optional().nullable(),
})

export const VentureSpecimenCreateSchema = VentureSpecimenSchema.omit({
  id: true,
  created_at: true,
})

export const VentureSpecimenUpdateSchema = VentureSpecimenCreateSchema.partial()

// Log Entry Ventures
export const LogEntryVentureSchema = z.object({
  id: z.string().uuid().optional(),
  created_at: z.string().datetime().optional(),
  log_entry_id: z.string().uuid(),
  venture_id: z.string().uuid(),
})

export const LogEntryVentureCreateSchema = LogEntryVentureSchema.omit({
  id: true,
  created_at: true,
})

export const LogEntryVentureUpdateSchema = LogEntryVentureCreateSchema.partial()

// Backwards compatibility (deprecated)
/** @deprecated Use VentureSpecimenSchema instead */
export const ProjectSpecimenSchema = VentureSpecimenSchema
/** @deprecated Use VentureSpecimenCreateSchema instead */
export const ProjectSpecimenCreateSchema = VentureSpecimenCreateSchema
/** @deprecated Use VentureSpecimenUpdateSchema instead */
export const ProjectSpecimenUpdateSchema = VentureSpecimenUpdateSchema
/** @deprecated Use LogEntryVentureSchema instead */
export const LogEntryProjectSchema = LogEntryVentureSchema
/** @deprecated Use LogEntryVentureCreateSchema instead */
export const LogEntryProjectCreateSchema = LogEntryVentureCreateSchema
/** @deprecated Use LogEntryVentureUpdateSchema instead */
export const LogEntryProjectUpdateSchema = LogEntryVentureUpdateSchema
