import { z } from 'zod';
export const ProjectSchema = z.object({
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
});
export const ProjectCreateSchema = ProjectSchema.omit({
    id: true,
    created_at: true,
    updated_at: true,
});
export const ProjectUpdateSchema = ProjectCreateSchema.partial();
