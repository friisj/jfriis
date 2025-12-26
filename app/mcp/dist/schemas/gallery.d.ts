import { z } from 'zod';
export declare const GallerySequenceSchema: z.ZodObject<{
    id: z.ZodOptional<z.ZodString>;
    created_at: z.ZodOptional<z.ZodString>;
    updated_at: z.ZodOptional<z.ZodString>;
    title: z.ZodString;
    slug: z.ZodString;
    description: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    sequence_order: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
    published: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    title: string;
    slug: string;
    published: boolean;
    id?: string | undefined;
    created_at?: string | undefined;
    updated_at?: string | undefined;
    description?: string | null | undefined;
    sequence_order?: number | null | undefined;
}, {
    title: string;
    slug: string;
    id?: string | undefined;
    created_at?: string | undefined;
    updated_at?: string | undefined;
    description?: string | null | undefined;
    published?: boolean | undefined;
    sequence_order?: number | null | undefined;
}>;
export declare const GallerySequenceCreateSchema: z.ZodObject<Omit<{
    id: z.ZodOptional<z.ZodString>;
    created_at: z.ZodOptional<z.ZodString>;
    updated_at: z.ZodOptional<z.ZodString>;
    title: z.ZodString;
    slug: z.ZodString;
    description: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    sequence_order: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
    published: z.ZodDefault<z.ZodBoolean>;
}, "id" | "created_at" | "updated_at">, "strip", z.ZodTypeAny, {
    title: string;
    slug: string;
    published: boolean;
    description?: string | null | undefined;
    sequence_order?: number | null | undefined;
}, {
    title: string;
    slug: string;
    description?: string | null | undefined;
    published?: boolean | undefined;
    sequence_order?: number | null | undefined;
}>;
export declare const GallerySequenceUpdateSchema: z.ZodObject<{
    title: z.ZodOptional<z.ZodString>;
    slug: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodString>>>;
    published: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
    sequence_order: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodNumber>>>;
}, "strip", z.ZodTypeAny, {
    title?: string | undefined;
    slug?: string | undefined;
    description?: string | null | undefined;
    published?: boolean | undefined;
    sequence_order?: number | null | undefined;
}, {
    title?: string | undefined;
    slug?: string | undefined;
    description?: string | null | undefined;
    published?: boolean | undefined;
    sequence_order?: number | null | undefined;
}>;
export type GallerySequence = z.infer<typeof GallerySequenceSchema>;
