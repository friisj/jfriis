import { z } from 'zod';
export declare const LandingPageSchema: z.ZodObject<{
    id: z.ZodOptional<z.ZodString>;
    created_at: z.ZodOptional<z.ZodString>;
    updated_at: z.ZodOptional<z.ZodString>;
    title: z.ZodString;
    slug: z.ZodString;
    content: z.ZodNullable<z.ZodOptional<z.ZodAny>>;
    target_audience: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    published: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    title: string;
    slug: string;
    published: boolean;
    id?: string | undefined;
    created_at?: string | undefined;
    updated_at?: string | undefined;
    content?: any;
    target_audience?: string | null | undefined;
}, {
    title: string;
    slug: string;
    id?: string | undefined;
    created_at?: string | undefined;
    updated_at?: string | undefined;
    content?: any;
    published?: boolean | undefined;
    target_audience?: string | null | undefined;
}>;
export declare const LandingPageCreateSchema: z.ZodObject<Omit<{
    id: z.ZodOptional<z.ZodString>;
    created_at: z.ZodOptional<z.ZodString>;
    updated_at: z.ZodOptional<z.ZodString>;
    title: z.ZodString;
    slug: z.ZodString;
    content: z.ZodNullable<z.ZodOptional<z.ZodAny>>;
    target_audience: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    published: z.ZodDefault<z.ZodBoolean>;
}, "id" | "created_at" | "updated_at">, "strip", z.ZodTypeAny, {
    title: string;
    slug: string;
    published: boolean;
    content?: any;
    target_audience?: string | null | undefined;
}, {
    title: string;
    slug: string;
    content?: any;
    published?: boolean | undefined;
    target_audience?: string | null | undefined;
}>;
export declare const LandingPageUpdateSchema: z.ZodObject<{
    title: z.ZodOptional<z.ZodString>;
    slug: z.ZodOptional<z.ZodString>;
    content: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodAny>>>;
    published: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
    target_audience: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodString>>>;
}, "strip", z.ZodTypeAny, {
    title?: string | undefined;
    slug?: string | undefined;
    content?: any;
    published?: boolean | undefined;
    target_audience?: string | null | undefined;
}, {
    title?: string | undefined;
    slug?: string | undefined;
    content?: any;
    published?: boolean | undefined;
    target_audience?: string | null | undefined;
}>;
export declare const BacklogItemSchema: z.ZodObject<{
    id: z.ZodOptional<z.ZodString>;
    created_at: z.ZodOptional<z.ZodString>;
    updated_at: z.ZodOptional<z.ZodString>;
    title: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    content: z.ZodNullable<z.ZodOptional<z.ZodAny>>;
    media: z.ZodNullable<z.ZodOptional<z.ZodArray<z.ZodAny, "many">>>;
    status: z.ZodDefault<z.ZodEnum<["inbox", "in-progress", "shaped", "archived"]>>;
    converted_to: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    converted_id: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    tags: z.ZodNullable<z.ZodOptional<z.ZodArray<z.ZodString, "many">>>;
}, "strip", z.ZodTypeAny, {
    status: "archived" | "inbox" | "in-progress" | "shaped";
    id?: string | undefined;
    created_at?: string | undefined;
    updated_at?: string | undefined;
    title?: string | null | undefined;
    content?: any;
    tags?: string[] | null | undefined;
    media?: any[] | null | undefined;
    converted_to?: string | null | undefined;
    converted_id?: string | null | undefined;
}, {
    id?: string | undefined;
    created_at?: string | undefined;
    updated_at?: string | undefined;
    title?: string | null | undefined;
    content?: any;
    status?: "archived" | "inbox" | "in-progress" | "shaped" | undefined;
    tags?: string[] | null | undefined;
    media?: any[] | null | undefined;
    converted_to?: string | null | undefined;
    converted_id?: string | null | undefined;
}>;
export declare const BacklogItemCreateSchema: z.ZodObject<Omit<{
    id: z.ZodOptional<z.ZodString>;
    created_at: z.ZodOptional<z.ZodString>;
    updated_at: z.ZodOptional<z.ZodString>;
    title: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    content: z.ZodNullable<z.ZodOptional<z.ZodAny>>;
    media: z.ZodNullable<z.ZodOptional<z.ZodArray<z.ZodAny, "many">>>;
    status: z.ZodDefault<z.ZodEnum<["inbox", "in-progress", "shaped", "archived"]>>;
    converted_to: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    converted_id: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    tags: z.ZodNullable<z.ZodOptional<z.ZodArray<z.ZodString, "many">>>;
}, "id" | "created_at" | "updated_at">, "strip", z.ZodTypeAny, {
    status: "archived" | "inbox" | "in-progress" | "shaped";
    title?: string | null | undefined;
    content?: any;
    tags?: string[] | null | undefined;
    media?: any[] | null | undefined;
    converted_to?: string | null | undefined;
    converted_id?: string | null | undefined;
}, {
    title?: string | null | undefined;
    content?: any;
    status?: "archived" | "inbox" | "in-progress" | "shaped" | undefined;
    tags?: string[] | null | undefined;
    media?: any[] | null | undefined;
    converted_to?: string | null | undefined;
    converted_id?: string | null | undefined;
}>;
export declare const BacklogItemUpdateSchema: z.ZodObject<{
    title: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodString>>>;
    content: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodAny>>>;
    status: z.ZodOptional<z.ZodDefault<z.ZodEnum<["inbox", "in-progress", "shaped", "archived"]>>>;
    tags: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodArray<z.ZodString, "many">>>>;
    media: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodArray<z.ZodAny, "many">>>>;
    converted_to: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodString>>>;
    converted_id: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodString>>>;
}, "strip", z.ZodTypeAny, {
    title?: string | null | undefined;
    content?: any;
    status?: "archived" | "inbox" | "in-progress" | "shaped" | undefined;
    tags?: string[] | null | undefined;
    media?: any[] | null | undefined;
    converted_to?: string | null | undefined;
    converted_id?: string | null | undefined;
}, {
    title?: string | null | undefined;
    content?: any;
    status?: "archived" | "inbox" | "in-progress" | "shaped" | undefined;
    tags?: string[] | null | undefined;
    media?: any[] | null | undefined;
    converted_to?: string | null | undefined;
    converted_id?: string | null | undefined;
}>;
export declare const ProfileSchema: z.ZodObject<{
    id: z.ZodString;
    created_at: z.ZodOptional<z.ZodString>;
    updated_at: z.ZodOptional<z.ZodString>;
    display_name: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    avatar_url: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    is_admin: z.ZodDefault<z.ZodBoolean>;
    metadata: z.ZodNullable<z.ZodOptional<z.ZodAny>>;
}, "strip", z.ZodTypeAny, {
    id: string;
    is_admin: boolean;
    created_at?: string | undefined;
    updated_at?: string | undefined;
    metadata?: any;
    display_name?: string | null | undefined;
    avatar_url?: string | null | undefined;
}, {
    id: string;
    created_at?: string | undefined;
    updated_at?: string | undefined;
    metadata?: any;
    display_name?: string | null | undefined;
    avatar_url?: string | null | undefined;
    is_admin?: boolean | undefined;
}>;
export declare const ProfileUpdateSchema: z.ZodObject<{
    metadata: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodAny>>>;
    display_name: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodString>>>;
    avatar_url: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodString>>>;
    is_admin: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
}, "strip", z.ZodTypeAny, {
    metadata?: any;
    display_name?: string | null | undefined;
    avatar_url?: string | null | undefined;
    is_admin?: boolean | undefined;
}, {
    metadata?: any;
    display_name?: string | null | undefined;
    avatar_url?: string | null | undefined;
    is_admin?: boolean | undefined;
}>;
