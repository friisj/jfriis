import { z } from 'zod';
export const SpecimenSchema = z.object({
    id: z.string().uuid().optional(),
    created_at: z.string().datetime().optional(),
    updated_at: z.string().datetime().optional(),
    title: z.string().min(1),
    slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
    description: z.string().optional().nullable(),
    component_code: z.string().optional().nullable(),
    component_props: z.any().optional().nullable(),
    theme_config: z.object({
        themeName: z.string().optional(),
        mode: z.enum(['light', 'dark']).optional(),
        customColors: z.any().optional(),
    }).optional().nullable(),
    media: z.array(z.any()).optional().nullable(),
    fonts: z.object({
        display: z.string().optional(),
        body: z.string().optional(),
        mono: z.string().optional(),
    }).optional().nullable(),
    custom_css: z.string().optional().nullable(),
    type: z.string().optional().nullable(),
    tags: z.array(z.string()).optional().nullable(),
    metadata: z.any().optional().nullable(),
    published: z.boolean().default(false),
});
export const SpecimenCreateSchema = SpecimenSchema.omit({
    id: true,
    created_at: true,
    updated_at: true,
});
export const SpecimenUpdateSchema = SpecimenCreateSchema.partial();
