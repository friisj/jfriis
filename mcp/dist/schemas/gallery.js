import { z } from 'zod';
export const GallerySequenceSchema = z.object({
    id: z.string().uuid().optional(),
    created_at: z.string().datetime().optional(),
    updated_at: z.string().datetime().optional(),
    title: z.string().min(1),
    slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
    description: z.string().optional().nullable(),
    sequence_order: z.number().int().optional().nullable(),
    published: z.boolean().default(false),
});
export const GallerySequenceCreateSchema = GallerySequenceSchema.omit({
    id: true,
    created_at: true,
    updated_at: true,
});
export const GallerySequenceUpdateSchema = GallerySequenceCreateSchema.partial();
