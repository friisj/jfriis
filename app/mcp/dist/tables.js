// Import schemas
import { ProjectSchema, ProjectCreateSchema, ProjectUpdateSchema, } from './schemas/projects.js';
import { LogEntrySchema, LogEntryCreateSchema, LogEntryUpdateSchema, } from './schemas/log-entries.js';
import { SpecimenSchema, SpecimenCreateSchema, SpecimenUpdateSchema, } from './schemas/specimens.js';
import { GallerySequenceSchema, GallerySequenceCreateSchema, GallerySequenceUpdateSchema, } from './schemas/gallery.js';
import { LandingPageSchema, LandingPageCreateSchema, LandingPageUpdateSchema, BacklogItemSchema, BacklogItemCreateSchema, BacklogItemUpdateSchema, ProfileSchema, ProfileUpdateSchema, } from './schemas/other.js';
import { ChannelSchema, ChannelCreateSchema, ChannelUpdateSchema, DistributionPostSchema, DistributionPostCreateSchema, DistributionPostUpdateSchema, DistributionQueueSchema, DistributionQueueCreateSchema, DistributionQueueUpdateSchema, } from './schemas/distribution.js';
import { GallerySpecimenItemSchema, GallerySpecimenItemCreateSchema, GallerySpecimenItemUpdateSchema, LogEntrySpecimenSchema, LogEntrySpecimenCreateSchema, LogEntrySpecimenUpdateSchema, ProjectSpecimenSchema, ProjectSpecimenCreateSchema, ProjectSpecimenUpdateSchema, LogEntryProjectSchema, LogEntryProjectCreateSchema, LogEntryProjectUpdateSchema, } from './schemas/junctions.js';
export const tables = {
    // Site content tables
    projects: {
        description: 'Portfolio projects and businesses',
        schema: ProjectSchema,
        createSchema: ProjectCreateSchema,
        updateSchema: ProjectUpdateSchema,
        hasSlug: true,
    },
    log_entries: {
        description: 'Chronological log posts',
        schema: LogEntrySchema,
        createSchema: LogEntryCreateSchema,
        updateSchema: LogEntryUpdateSchema,
        hasSlug: true,
    },
    specimens: {
        description: 'Reusable components',
        schema: SpecimenSchema,
        createSchema: SpecimenCreateSchema,
        updateSchema: SpecimenUpdateSchema,
        hasSlug: true,
    },
    gallery_sequences: {
        description: 'Curated specimen collections',
        schema: GallerySequenceSchema,
        createSchema: GallerySequenceCreateSchema,
        updateSchema: GallerySequenceUpdateSchema,
        hasSlug: true,
    },
    landing_pages: {
        description: 'Custom landing page configs',
        schema: LandingPageSchema,
        createSchema: LandingPageCreateSchema,
        updateSchema: LandingPageUpdateSchema,
        hasSlug: true,
    },
    backlog_items: {
        description: 'Content inbox',
        schema: BacklogItemSchema,
        createSchema: BacklogItemCreateSchema,
        updateSchema: BacklogItemUpdateSchema,
        hasSlug: false,
    },
    profiles: {
        description: 'User profiles',
        schema: ProfileSchema,
        createSchema: ProfileSchema, // Profiles are created via auth
        updateSchema: ProfileUpdateSchema,
        hasSlug: false,
    },
    // Distribution tables
    channels: {
        description: 'Distribution platforms',
        schema: ChannelSchema,
        createSchema: ChannelCreateSchema,
        updateSchema: ChannelUpdateSchema,
        hasSlug: false,
    },
    distribution_posts: {
        description: 'Posted content tracking',
        schema: DistributionPostSchema,
        createSchema: DistributionPostCreateSchema,
        updateSchema: DistributionPostUpdateSchema,
        hasSlug: false,
    },
    distribution_queue: {
        description: 'Pending distribution tasks',
        schema: DistributionQueueSchema,
        createSchema: DistributionQueueCreateSchema,
        updateSchema: DistributionQueueUpdateSchema,
        hasSlug: false,
    },
    // Junction tables
    gallery_specimen_items: {
        description: 'Specimens in gallery sequences',
        schema: GallerySpecimenItemSchema,
        createSchema: GallerySpecimenItemCreateSchema,
        updateSchema: GallerySpecimenItemUpdateSchema,
        hasSlug: false,
    },
    log_entry_specimens: {
        description: 'Specimens in log entries',
        schema: LogEntrySpecimenSchema,
        createSchema: LogEntrySpecimenCreateSchema,
        updateSchema: LogEntrySpecimenUpdateSchema,
        hasSlug: false,
    },
    project_specimens: {
        description: 'Specimens in projects',
        schema: ProjectSpecimenSchema,
        createSchema: ProjectSpecimenCreateSchema,
        updateSchema: ProjectSpecimenUpdateSchema,
        hasSlug: false,
    },
    log_entry_projects: {
        description: 'Projects in log entries',
        schema: LogEntryProjectSchema,
        createSchema: LogEntryProjectCreateSchema,
        updateSchema: LogEntryProjectUpdateSchema,
        hasSlug: false,
    },
};
// Helper to get schema columns for db_list_tables
export function getTableColumns(tableName) {
    const table = tables[tableName];
    if (!table)
        return [];
    const shape = table.schema.shape;
    return Object.entries(shape).map(([name, zodType]) => {
        const zodTypeAny = zodType;
        const isOptional = zodTypeAny.isOptional() || zodTypeAny.isNullable();
        let type = 'unknown';
        // Try to determine the type
        const description = zodTypeAny._def;
        if (description.typeName === 'ZodString')
            type = 'string';
        else if (description.typeName === 'ZodNumber')
            type = 'number';
        else if (description.typeName === 'ZodBoolean')
            type = 'boolean';
        else if (description.typeName === 'ZodArray')
            type = 'array';
        else if (description.typeName === 'ZodObject')
            type = 'object';
        else if (description.typeName === 'ZodAny')
            type = 'json';
        else if (description.typeName === 'ZodOptional' || description.typeName === 'ZodNullable') {
            // Unwrap optional/nullable
            const innerType = description.innerType?._def?.typeName;
            if (innerType === 'ZodString')
                type = 'string';
            else if (innerType === 'ZodNumber')
                type = 'number';
            else if (innerType === 'ZodBoolean')
                type = 'boolean';
            else if (innerType === 'ZodArray')
                type = 'array';
            else if (innerType === 'ZodObject')
                type = 'object';
            else if (innerType === 'ZodAny')
                type = 'json';
        }
        else if (description.typeName === 'ZodDefault') {
            const innerType = description.innerType?._def?.typeName;
            if (innerType === 'ZodString')
                type = 'string';
            else if (innerType === 'ZodNumber')
                type = 'number';
            else if (innerType === 'ZodBoolean')
                type = 'boolean';
            else if (innerType === 'ZodEnum')
                type = 'enum';
        }
        else if (description.typeName === 'ZodEnum')
            type = 'enum';
        return { name, type, required: !isOptional };
    });
}
export function isValidTable(tableName) {
    return tableName in tables;
}
