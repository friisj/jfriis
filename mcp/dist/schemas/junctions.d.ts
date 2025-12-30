import { z } from 'zod';
export declare const GallerySpecimenItemSchema: z.ZodObject<{
    id: z.ZodOptional<z.ZodString>;
    created_at: z.ZodOptional<z.ZodString>;
    gallery_sequence_id: z.ZodString;
    specimen_id: z.ZodString;
    position: z.ZodDefault<z.ZodNumber>;
    display_config: z.ZodNullable<z.ZodOptional<z.ZodAny>>;
}, "strip", z.ZodTypeAny, {
    gallery_sequence_id: string;
    specimen_id: string;
    position: number;
    id?: string | undefined;
    created_at?: string | undefined;
    display_config?: any;
}, {
    gallery_sequence_id: string;
    specimen_id: string;
    id?: string | undefined;
    created_at?: string | undefined;
    position?: number | undefined;
    display_config?: any;
}>;
export declare const GallerySpecimenItemCreateSchema: z.ZodObject<Omit<{
    id: z.ZodOptional<z.ZodString>;
    created_at: z.ZodOptional<z.ZodString>;
    gallery_sequence_id: z.ZodString;
    specimen_id: z.ZodString;
    position: z.ZodDefault<z.ZodNumber>;
    display_config: z.ZodNullable<z.ZodOptional<z.ZodAny>>;
}, "id" | "created_at">, "strip", z.ZodTypeAny, {
    gallery_sequence_id: string;
    specimen_id: string;
    position: number;
    display_config?: any;
}, {
    gallery_sequence_id: string;
    specimen_id: string;
    position?: number | undefined;
    display_config?: any;
}>;
export declare const GallerySpecimenItemUpdateSchema: z.ZodObject<{
    gallery_sequence_id: z.ZodOptional<z.ZodString>;
    specimen_id: z.ZodOptional<z.ZodString>;
    position: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
    display_config: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodAny>>>;
}, "strip", z.ZodTypeAny, {
    gallery_sequence_id?: string | undefined;
    specimen_id?: string | undefined;
    position?: number | undefined;
    display_config?: any;
}, {
    gallery_sequence_id?: string | undefined;
    specimen_id?: string | undefined;
    position?: number | undefined;
    display_config?: any;
}>;
export declare const LogEntrySpecimenSchema: z.ZodObject<{
    id: z.ZodOptional<z.ZodString>;
    created_at: z.ZodOptional<z.ZodString>;
    log_entry_id: z.ZodString;
    specimen_id: z.ZodString;
    position: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    specimen_id: string;
    log_entry_id: string;
    id?: string | undefined;
    created_at?: string | undefined;
    position?: number | null | undefined;
}, {
    specimen_id: string;
    log_entry_id: string;
    id?: string | undefined;
    created_at?: string | undefined;
    position?: number | null | undefined;
}>;
export declare const LogEntrySpecimenCreateSchema: z.ZodObject<Omit<{
    id: z.ZodOptional<z.ZodString>;
    created_at: z.ZodOptional<z.ZodString>;
    log_entry_id: z.ZodString;
    specimen_id: z.ZodString;
    position: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
}, "id" | "created_at">, "strip", z.ZodTypeAny, {
    specimen_id: string;
    log_entry_id: string;
    position?: number | null | undefined;
}, {
    specimen_id: string;
    log_entry_id: string;
    position?: number | null | undefined;
}>;
export declare const LogEntrySpecimenUpdateSchema: z.ZodObject<{
    specimen_id: z.ZodOptional<z.ZodString>;
    position: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodNumber>>>;
    log_entry_id: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    specimen_id?: string | undefined;
    position?: number | null | undefined;
    log_entry_id?: string | undefined;
}, {
    specimen_id?: string | undefined;
    position?: number | null | undefined;
    log_entry_id?: string | undefined;
}>;
export declare const ProjectSpecimenSchema: z.ZodObject<{
    id: z.ZodOptional<z.ZodString>;
    created_at: z.ZodOptional<z.ZodString>;
    project_id: z.ZodString;
    specimen_id: z.ZodString;
    position: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    specimen_id: string;
    project_id: string;
    id?: string | undefined;
    created_at?: string | undefined;
    position?: number | null | undefined;
}, {
    specimen_id: string;
    project_id: string;
    id?: string | undefined;
    created_at?: string | undefined;
    position?: number | null | undefined;
}>;
export declare const ProjectSpecimenCreateSchema: z.ZodObject<Omit<{
    id: z.ZodOptional<z.ZodString>;
    created_at: z.ZodOptional<z.ZodString>;
    project_id: z.ZodString;
    specimen_id: z.ZodString;
    position: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
}, "id" | "created_at">, "strip", z.ZodTypeAny, {
    specimen_id: string;
    project_id: string;
    position?: number | null | undefined;
}, {
    specimen_id: string;
    project_id: string;
    position?: number | null | undefined;
}>;
export declare const ProjectSpecimenUpdateSchema: z.ZodObject<{
    specimen_id: z.ZodOptional<z.ZodString>;
    position: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodNumber>>>;
    project_id: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    specimen_id?: string | undefined;
    position?: number | null | undefined;
    project_id?: string | undefined;
}, {
    specimen_id?: string | undefined;
    position?: number | null | undefined;
    project_id?: string | undefined;
}>;
export declare const LogEntryProjectSchema: z.ZodObject<{
    id: z.ZodOptional<z.ZodString>;
    created_at: z.ZodOptional<z.ZodString>;
    log_entry_id: z.ZodString;
    project_id: z.ZodString;
}, "strip", z.ZodTypeAny, {
    log_entry_id: string;
    project_id: string;
    id?: string | undefined;
    created_at?: string | undefined;
}, {
    log_entry_id: string;
    project_id: string;
    id?: string | undefined;
    created_at?: string | undefined;
}>;
export declare const LogEntryProjectCreateSchema: z.ZodObject<Omit<{
    id: z.ZodOptional<z.ZodString>;
    created_at: z.ZodOptional<z.ZodString>;
    log_entry_id: z.ZodString;
    project_id: z.ZodString;
}, "id" | "created_at">, "strip", z.ZodTypeAny, {
    log_entry_id: string;
    project_id: string;
}, {
    log_entry_id: string;
    project_id: string;
}>;
export declare const LogEntryProjectUpdateSchema: z.ZodObject<{
    log_entry_id: z.ZodOptional<z.ZodString>;
    project_id: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    log_entry_id?: string | undefined;
    project_id?: string | undefined;
}, {
    log_entry_id?: string | undefined;
    project_id?: string | undefined;
}>;
