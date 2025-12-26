import { z } from 'zod';
export declare const SpecimenSchema: z.ZodObject<{
    id: z.ZodOptional<z.ZodString>;
    created_at: z.ZodOptional<z.ZodString>;
    updated_at: z.ZodOptional<z.ZodString>;
    title: z.ZodString;
    slug: z.ZodString;
    description: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    component_code: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    component_props: z.ZodNullable<z.ZodOptional<z.ZodAny>>;
    theme_config: z.ZodNullable<z.ZodOptional<z.ZodObject<{
        themeName: z.ZodOptional<z.ZodString>;
        mode: z.ZodOptional<z.ZodEnum<["light", "dark"]>>;
        customColors: z.ZodOptional<z.ZodAny>;
    }, "strip", z.ZodTypeAny, {
        themeName?: string | undefined;
        mode?: "light" | "dark" | undefined;
        customColors?: any;
    }, {
        themeName?: string | undefined;
        mode?: "light" | "dark" | undefined;
        customColors?: any;
    }>>>;
    media: z.ZodNullable<z.ZodOptional<z.ZodArray<z.ZodAny, "many">>>;
    fonts: z.ZodNullable<z.ZodOptional<z.ZodObject<{
        display: z.ZodOptional<z.ZodString>;
        body: z.ZodOptional<z.ZodString>;
        mono: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        display?: string | undefined;
        body?: string | undefined;
        mono?: string | undefined;
    }, {
        display?: string | undefined;
        body?: string | undefined;
        mono?: string | undefined;
    }>>>;
    custom_css: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    type: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    tags: z.ZodNullable<z.ZodOptional<z.ZodArray<z.ZodString, "many">>>;
    metadata: z.ZodNullable<z.ZodOptional<z.ZodAny>>;
    published: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    title: string;
    slug: string;
    published: boolean;
    id?: string | undefined;
    created_at?: string | undefined;
    updated_at?: string | undefined;
    description?: string | null | undefined;
    type?: string | null | undefined;
    tags?: string[] | null | undefined;
    metadata?: any;
    component_code?: string | null | undefined;
    component_props?: any;
    theme_config?: {
        themeName?: string | undefined;
        mode?: "light" | "dark" | undefined;
        customColors?: any;
    } | null | undefined;
    media?: any[] | null | undefined;
    fonts?: {
        display?: string | undefined;
        body?: string | undefined;
        mono?: string | undefined;
    } | null | undefined;
    custom_css?: string | null | undefined;
}, {
    title: string;
    slug: string;
    id?: string | undefined;
    created_at?: string | undefined;
    updated_at?: string | undefined;
    description?: string | null | undefined;
    type?: string | null | undefined;
    tags?: string[] | null | undefined;
    metadata?: any;
    published?: boolean | undefined;
    component_code?: string | null | undefined;
    component_props?: any;
    theme_config?: {
        themeName?: string | undefined;
        mode?: "light" | "dark" | undefined;
        customColors?: any;
    } | null | undefined;
    media?: any[] | null | undefined;
    fonts?: {
        display?: string | undefined;
        body?: string | undefined;
        mono?: string | undefined;
    } | null | undefined;
    custom_css?: string | null | undefined;
}>;
export declare const SpecimenCreateSchema: z.ZodObject<Omit<{
    id: z.ZodOptional<z.ZodString>;
    created_at: z.ZodOptional<z.ZodString>;
    updated_at: z.ZodOptional<z.ZodString>;
    title: z.ZodString;
    slug: z.ZodString;
    description: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    component_code: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    component_props: z.ZodNullable<z.ZodOptional<z.ZodAny>>;
    theme_config: z.ZodNullable<z.ZodOptional<z.ZodObject<{
        themeName: z.ZodOptional<z.ZodString>;
        mode: z.ZodOptional<z.ZodEnum<["light", "dark"]>>;
        customColors: z.ZodOptional<z.ZodAny>;
    }, "strip", z.ZodTypeAny, {
        themeName?: string | undefined;
        mode?: "light" | "dark" | undefined;
        customColors?: any;
    }, {
        themeName?: string | undefined;
        mode?: "light" | "dark" | undefined;
        customColors?: any;
    }>>>;
    media: z.ZodNullable<z.ZodOptional<z.ZodArray<z.ZodAny, "many">>>;
    fonts: z.ZodNullable<z.ZodOptional<z.ZodObject<{
        display: z.ZodOptional<z.ZodString>;
        body: z.ZodOptional<z.ZodString>;
        mono: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        display?: string | undefined;
        body?: string | undefined;
        mono?: string | undefined;
    }, {
        display?: string | undefined;
        body?: string | undefined;
        mono?: string | undefined;
    }>>>;
    custom_css: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    type: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    tags: z.ZodNullable<z.ZodOptional<z.ZodArray<z.ZodString, "many">>>;
    metadata: z.ZodNullable<z.ZodOptional<z.ZodAny>>;
    published: z.ZodDefault<z.ZodBoolean>;
}, "id" | "created_at" | "updated_at">, "strip", z.ZodTypeAny, {
    title: string;
    slug: string;
    published: boolean;
    description?: string | null | undefined;
    type?: string | null | undefined;
    tags?: string[] | null | undefined;
    metadata?: any;
    component_code?: string | null | undefined;
    component_props?: any;
    theme_config?: {
        themeName?: string | undefined;
        mode?: "light" | "dark" | undefined;
        customColors?: any;
    } | null | undefined;
    media?: any[] | null | undefined;
    fonts?: {
        display?: string | undefined;
        body?: string | undefined;
        mono?: string | undefined;
    } | null | undefined;
    custom_css?: string | null | undefined;
}, {
    title: string;
    slug: string;
    description?: string | null | undefined;
    type?: string | null | undefined;
    tags?: string[] | null | undefined;
    metadata?: any;
    published?: boolean | undefined;
    component_code?: string | null | undefined;
    component_props?: any;
    theme_config?: {
        themeName?: string | undefined;
        mode?: "light" | "dark" | undefined;
        customColors?: any;
    } | null | undefined;
    media?: any[] | null | undefined;
    fonts?: {
        display?: string | undefined;
        body?: string | undefined;
        mono?: string | undefined;
    } | null | undefined;
    custom_css?: string | null | undefined;
}>;
export declare const SpecimenUpdateSchema: z.ZodObject<{
    title: z.ZodOptional<z.ZodString>;
    slug: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodString>>>;
    type: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodString>>>;
    tags: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodArray<z.ZodString, "many">>>>;
    metadata: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodAny>>>;
    published: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
    component_code: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodString>>>;
    component_props: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodAny>>>;
    theme_config: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodObject<{
        themeName: z.ZodOptional<z.ZodString>;
        mode: z.ZodOptional<z.ZodEnum<["light", "dark"]>>;
        customColors: z.ZodOptional<z.ZodAny>;
    }, "strip", z.ZodTypeAny, {
        themeName?: string | undefined;
        mode?: "light" | "dark" | undefined;
        customColors?: any;
    }, {
        themeName?: string | undefined;
        mode?: "light" | "dark" | undefined;
        customColors?: any;
    }>>>>;
    media: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodArray<z.ZodAny, "many">>>>;
    fonts: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodObject<{
        display: z.ZodOptional<z.ZodString>;
        body: z.ZodOptional<z.ZodString>;
        mono: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        display?: string | undefined;
        body?: string | undefined;
        mono?: string | undefined;
    }, {
        display?: string | undefined;
        body?: string | undefined;
        mono?: string | undefined;
    }>>>>;
    custom_css: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodString>>>;
}, "strip", z.ZodTypeAny, {
    title?: string | undefined;
    slug?: string | undefined;
    description?: string | null | undefined;
    type?: string | null | undefined;
    tags?: string[] | null | undefined;
    metadata?: any;
    published?: boolean | undefined;
    component_code?: string | null | undefined;
    component_props?: any;
    theme_config?: {
        themeName?: string | undefined;
        mode?: "light" | "dark" | undefined;
        customColors?: any;
    } | null | undefined;
    media?: any[] | null | undefined;
    fonts?: {
        display?: string | undefined;
        body?: string | undefined;
        mono?: string | undefined;
    } | null | undefined;
    custom_css?: string | null | undefined;
}, {
    title?: string | undefined;
    slug?: string | undefined;
    description?: string | null | undefined;
    type?: string | null | undefined;
    tags?: string[] | null | undefined;
    metadata?: any;
    published?: boolean | undefined;
    component_code?: string | null | undefined;
    component_props?: any;
    theme_config?: {
        themeName?: string | undefined;
        mode?: "light" | "dark" | undefined;
        customColors?: any;
    } | null | undefined;
    media?: any[] | null | undefined;
    fonts?: {
        display?: string | undefined;
        body?: string | undefined;
        mono?: string | undefined;
    } | null | undefined;
    custom_css?: string | null | undefined;
}>;
export type Specimen = z.infer<typeof SpecimenSchema>;
export type SpecimenCreate = z.infer<typeof SpecimenCreateSchema>;
export type SpecimenUpdate = z.infer<typeof SpecimenUpdateSchema>;
