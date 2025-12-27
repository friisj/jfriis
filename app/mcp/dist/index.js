#!/usr/bin/env node

// src/index.ts
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema
} from "@modelcontextprotocol/sdk/types.js";

// src/supabase.ts
import { createClient } from "@supabase/supabase-js";
var supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
var supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    "Missing Supabase environment variables. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or NEXT_PUBLIC_ variants)"
  );
}
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Warning: Using anon key. Some operations may fail due to RLS. Set SUPABASE_SERVICE_ROLE_KEY for full access.");
}
var supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// ../../lib/mcp/schemas/projects.ts
import { z } from "zod";
var ProjectSchema = z.object({
  id: z.string().uuid().optional(),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
  title: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
  description: z.string().optional().nullable(),
  content: z.any().optional().nullable(),
  status: z.enum(["draft", "active", "archived", "completed"]).default("draft"),
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
  published_at: z.string().datetime().optional().nullable()
});
var ProjectCreateSchema = ProjectSchema.omit({
  id: true,
  created_at: true,
  updated_at: true
});
var ProjectUpdateSchema = ProjectCreateSchema.partial();

// ../../lib/mcp/schemas/log-entries.ts
import { z as z2 } from "zod";
var LogEntrySchema = z2.object({
  id: z2.string().uuid().optional(),
  created_at: z2.string().datetime().optional(),
  updated_at: z2.string().datetime().optional(),
  title: z2.string().min(1),
  slug: z2.string().min(1).regex(/^[a-z0-9-]+$/),
  content: z2.any().optional().nullable(),
  entry_date: z2.string(),
  type: z2.string().optional().nullable(),
  featured_image: z2.string().optional().nullable(),
  images: z2.array(z2.any()).optional().nullable(),
  tags: z2.array(z2.string()).optional().nullable(),
  metadata: z2.any().optional().nullable(),
  published: z2.boolean().default(false),
  published_at: z2.string().datetime().optional().nullable()
});
var LogEntryCreateSchema = LogEntrySchema.omit({
  id: true,
  created_at: true,
  updated_at: true
});
var LogEntryUpdateSchema = LogEntryCreateSchema.partial();

// ../../lib/mcp/schemas/specimens.ts
import { z as z3 } from "zod";
var SpecimenSchema = z3.object({
  id: z3.string().uuid().optional(),
  created_at: z3.string().datetime().optional(),
  updated_at: z3.string().datetime().optional(),
  title: z3.string().min(1),
  slug: z3.string().min(1).regex(/^[a-z0-9-]+$/),
  description: z3.string().optional().nullable(),
  component_code: z3.string().optional().nullable(),
  component_props: z3.any().optional().nullable(),
  theme_config: z3.object({
    themeName: z3.string().optional(),
    mode: z3.enum(["light", "dark"]).optional(),
    customColors: z3.any().optional()
  }).optional().nullable(),
  media: z3.array(z3.any()).optional().nullable(),
  fonts: z3.object({
    display: z3.string().optional(),
    body: z3.string().optional(),
    mono: z3.string().optional()
  }).optional().nullable(),
  custom_css: z3.string().optional().nullable(),
  type: z3.string().optional().nullable(),
  tags: z3.array(z3.string()).optional().nullable(),
  metadata: z3.any().optional().nullable(),
  published: z3.boolean().default(false)
});
var SpecimenCreateSchema = SpecimenSchema.omit({
  id: true,
  created_at: true,
  updated_at: true
});
var SpecimenUpdateSchema = SpecimenCreateSchema.partial();

// ../../lib/mcp/schemas/gallery.ts
import { z as z4 } from "zod";
var GallerySequenceSchema = z4.object({
  id: z4.string().uuid().optional(),
  created_at: z4.string().datetime().optional(),
  updated_at: z4.string().datetime().optional(),
  title: z4.string().min(1),
  slug: z4.string().min(1).regex(/^[a-z0-9-]+$/),
  description: z4.string().optional().nullable(),
  sequence_order: z4.number().int().optional().nullable(),
  published: z4.boolean().default(false)
});
var GallerySequenceCreateSchema = GallerySequenceSchema.omit({
  id: true,
  created_at: true,
  updated_at: true
});
var GallerySequenceUpdateSchema = GallerySequenceCreateSchema.partial();

// ../../lib/mcp/schemas/other.ts
import { z as z5 } from "zod";
var LandingPageSchema = z5.object({
  id: z5.string().uuid().optional(),
  created_at: z5.string().datetime().optional(),
  updated_at: z5.string().datetime().optional(),
  title: z5.string().min(1),
  slug: z5.string().min(1).regex(/^[a-z0-9-]+$/),
  content: z5.any().optional().nullable(),
  target_audience: z5.string().optional().nullable(),
  published: z5.boolean().default(false)
});
var LandingPageCreateSchema = LandingPageSchema.omit({
  id: true,
  created_at: true,
  updated_at: true
});
var LandingPageUpdateSchema = LandingPageCreateSchema.partial();
var BacklogItemSchema = z5.object({
  id: z5.string().uuid().optional(),
  created_at: z5.string().datetime().optional(),
  updated_at: z5.string().datetime().optional(),
  title: z5.string().optional().nullable(),
  content: z5.any().optional().nullable(),
  media: z5.array(z5.any()).optional().nullable(),
  status: z5.enum(["inbox", "in-progress", "shaped", "archived"]).default("inbox"),
  converted_to: z5.string().optional().nullable(),
  converted_id: z5.string().uuid().optional().nullable(),
  tags: z5.array(z5.string()).optional().nullable()
});
var BacklogItemCreateSchema = BacklogItemSchema.omit({
  id: true,
  created_at: true,
  updated_at: true
});
var BacklogItemUpdateSchema = BacklogItemCreateSchema.partial();
var ProfileSchema = z5.object({
  id: z5.string().uuid(),
  created_at: z5.string().datetime().optional(),
  updated_at: z5.string().datetime().optional(),
  display_name: z5.string().optional().nullable(),
  avatar_url: z5.string().optional().nullable(),
  is_admin: z5.boolean().default(false),
  metadata: z5.any().optional().nullable()
});
var ProfileUpdateSchema = ProfileSchema.omit({
  id: true,
  created_at: true,
  updated_at: true
}).partial();

// ../../lib/mcp/schemas/distribution.ts
import { z as z6 } from "zod";
var ChannelSchema = z6.object({
  id: z6.string().uuid().optional(),
  created_at: z6.string().datetime().optional(),
  updated_at: z6.string().datetime().optional(),
  name: z6.string().min(1),
  display_name: z6.string().min(1),
  type: z6.string().optional().nullable(),
  config: z6.any().optional().nullable(),
  enabled: z6.boolean().default(true)
});
var ChannelCreateSchema = ChannelSchema.omit({
  id: true,
  created_at: true,
  updated_at: true
});
var ChannelUpdateSchema = ChannelCreateSchema.partial();
var DistributionPostSchema = z6.object({
  id: z6.string().uuid().optional(),
  created_at: z6.string().datetime().optional(),
  updated_at: z6.string().datetime().optional(),
  channel_id: z6.string().uuid(),
  content_type: z6.string(),
  content_id: z6.string().uuid(),
  title: z6.string().optional().nullable(),
  body: z6.string().optional().nullable(),
  url: z6.string().optional().nullable(),
  status: z6.enum(["draft", "scheduled", "posted", "failed"]).default("draft"),
  posted_at: z6.string().datetime().optional().nullable(),
  engagement: z6.any().optional().nullable()
});
var DistributionPostCreateSchema = DistributionPostSchema.omit({
  id: true,
  created_at: true,
  updated_at: true
});
var DistributionPostUpdateSchema = DistributionPostCreateSchema.partial();
var DistributionQueueSchema = z6.object({
  id: z6.string().uuid().optional(),
  created_at: z6.string().datetime().optional(),
  updated_at: z6.string().datetime().optional(),
  channel_id: z6.string().uuid(),
  content_type: z6.string(),
  content_id: z6.string().uuid(),
  status: z6.enum(["pending", "processing", "completed", "failed"]).default("pending"),
  priority: z6.number().int().default(0),
  attempts: z6.number().int().default(0),
  max_attempts: z6.number().int().default(3),
  process_after: z6.string().datetime().optional().nullable(),
  error_message: z6.string().optional().nullable()
});
var DistributionQueueCreateSchema = DistributionQueueSchema.omit({
  id: true,
  created_at: true,
  updated_at: true
});
var DistributionQueueUpdateSchema = DistributionQueueCreateSchema.partial();

// ../../lib/mcp/schemas/junctions.ts
import { z as z7 } from "zod";
var GallerySpecimenItemSchema = z7.object({
  id: z7.string().uuid().optional(),
  created_at: z7.string().datetime().optional(),
  gallery_sequence_id: z7.string().uuid(),
  specimen_id: z7.string().uuid(),
  position: z7.number().int().default(0),
  display_config: z7.any().optional().nullable()
});
var GallerySpecimenItemCreateSchema = GallerySpecimenItemSchema.omit({
  id: true,
  created_at: true
});
var GallerySpecimenItemUpdateSchema = GallerySpecimenItemCreateSchema.partial();
var LogEntrySpecimenSchema = z7.object({
  id: z7.string().uuid().optional(),
  created_at: z7.string().datetime().optional(),
  log_entry_id: z7.string().uuid(),
  specimen_id: z7.string().uuid(),
  position: z7.number().int().optional().nullable()
});
var LogEntrySpecimenCreateSchema = LogEntrySpecimenSchema.omit({
  id: true,
  created_at: true
});
var LogEntrySpecimenUpdateSchema = LogEntrySpecimenCreateSchema.partial();
var ProjectSpecimenSchema = z7.object({
  id: z7.string().uuid().optional(),
  created_at: z7.string().datetime().optional(),
  project_id: z7.string().uuid(),
  specimen_id: z7.string().uuid(),
  position: z7.number().int().optional().nullable()
});
var ProjectSpecimenCreateSchema = ProjectSpecimenSchema.omit({
  id: true,
  created_at: true
});
var ProjectSpecimenUpdateSchema = ProjectSpecimenCreateSchema.partial();
var LogEntryProjectSchema = z7.object({
  id: z7.string().uuid().optional(),
  created_at: z7.string().datetime().optional(),
  log_entry_id: z7.string().uuid(),
  project_id: z7.string().uuid()
});
var LogEntryProjectCreateSchema = LogEntryProjectSchema.omit({
  id: true,
  created_at: true
});
var LogEntryProjectUpdateSchema = LogEntryProjectCreateSchema.partial();

// ../../lib/mcp/tables.ts
var tables = {
  // Site content tables
  projects: {
    description: "Portfolio projects and businesses",
    schema: ProjectSchema,
    createSchema: ProjectCreateSchema,
    updateSchema: ProjectUpdateSchema,
    hasSlug: true,
    hasProjectId: false
    // Projects ARE the project - admin only for write
  },
  log_entries: {
    description: "Chronological log posts",
    schema: LogEntrySchema,
    createSchema: LogEntryCreateSchema,
    updateSchema: LogEntryUpdateSchema,
    hasSlug: true,
    hasProjectId: true
    // Via log_entry_projects junction
  },
  specimens: {
    description: "Reusable components",
    schema: SpecimenSchema,
    createSchema: SpecimenCreateSchema,
    updateSchema: SpecimenUpdateSchema,
    hasSlug: true,
    hasProjectId: false
    // Admin only
  },
  gallery_sequences: {
    description: "Curated specimen collections",
    schema: GallerySequenceSchema,
    createSchema: GallerySequenceCreateSchema,
    updateSchema: GallerySequenceUpdateSchema,
    hasSlug: true,
    hasProjectId: false
    // Admin only
  },
  landing_pages: {
    description: "Custom landing page configs",
    schema: LandingPageSchema,
    createSchema: LandingPageCreateSchema,
    updateSchema: LandingPageUpdateSchema,
    hasSlug: true,
    hasProjectId: false
    // Admin only
  },
  backlog_items: {
    description: "Content inbox",
    schema: BacklogItemSchema,
    createSchema: BacklogItemCreateSchema,
    updateSchema: BacklogItemUpdateSchema,
    hasSlug: false,
    hasProjectId: false
    // Admin only
  },
  profiles: {
    description: "User profiles",
    schema: ProfileSchema,
    createSchema: ProfileSchema,
    // Profiles are created via auth
    updateSchema: ProfileUpdateSchema,
    hasSlug: false,
    hasProjectId: false
    // Admin only
  },
  // Distribution tables
  channels: {
    description: "Distribution platforms",
    schema: ChannelSchema,
    createSchema: ChannelCreateSchema,
    updateSchema: ChannelUpdateSchema,
    hasSlug: false,
    hasProjectId: false
    // Admin only
  },
  distribution_posts: {
    description: "Posted content tracking",
    schema: DistributionPostSchema,
    createSchema: DistributionPostCreateSchema,
    updateSchema: DistributionPostUpdateSchema,
    hasSlug: false,
    hasProjectId: false
    // Admin only
  },
  distribution_queue: {
    description: "Pending distribution tasks",
    schema: DistributionQueueSchema,
    createSchema: DistributionQueueCreateSchema,
    updateSchema: DistributionQueueUpdateSchema,
    hasSlug: false,
    hasProjectId: false
    // Admin only
  },
  // Junction tables
  gallery_specimen_items: {
    description: "Specimens in gallery sequences",
    schema: GallerySpecimenItemSchema,
    createSchema: GallerySpecimenItemCreateSchema,
    updateSchema: GallerySpecimenItemUpdateSchema,
    hasSlug: false,
    hasProjectId: false
    // Admin only
  },
  log_entry_specimens: {
    description: "Specimens in log entries",
    schema: LogEntrySpecimenSchema,
    createSchema: LogEntrySpecimenCreateSchema,
    updateSchema: LogEntrySpecimenUpdateSchema,
    hasSlug: false,
    hasProjectId: true
    // Inherits from log_entry
  },
  project_specimens: {
    description: "Specimens in projects",
    schema: ProjectSpecimenSchema,
    createSchema: ProjectSpecimenCreateSchema,
    updateSchema: ProjectSpecimenUpdateSchema,
    hasSlug: false,
    hasProjectId: true
    // Has project_id directly
  },
  log_entry_projects: {
    description: "Projects in log entries",
    schema: LogEntryProjectSchema,
    createSchema: LogEntryProjectCreateSchema,
    updateSchema: LogEntryProjectUpdateSchema,
    hasSlug: false,
    hasProjectId: true
    // Has project_id directly
  }
};
function getTableColumns(tableName) {
  const table = tables[tableName];
  if (!table) return [];
  const shape = table.schema.shape;
  return Object.entries(shape).map(([name, zodType]) => {
    const zodTypeAny = zodType;
    const isOptional = zodTypeAny.isOptional() || zodTypeAny.isNullable();
    let type = "unknown";
    const description = zodTypeAny._def;
    if (description.typeName === "ZodString") type = "string";
    else if (description.typeName === "ZodNumber") type = "number";
    else if (description.typeName === "ZodBoolean") type = "boolean";
    else if (description.typeName === "ZodArray") type = "array";
    else if (description.typeName === "ZodObject") type = "object";
    else if (description.typeName === "ZodAny") type = "json";
    else if (description.typeName === "ZodOptional" || description.typeName === "ZodNullable") {
      const innerType = description.innerType?._def?.typeName;
      if (innerType === "ZodString") type = "string";
      else if (innerType === "ZodNumber") type = "number";
      else if (innerType === "ZodBoolean") type = "boolean";
      else if (innerType === "ZodArray") type = "array";
      else if (innerType === "ZodObject") type = "object";
      else if (innerType === "ZodAny") type = "json";
    } else if (description.typeName === "ZodDefault") {
      const innerType = description.innerType?._def?.typeName;
      if (innerType === "ZodString") type = "string";
      else if (innerType === "ZodNumber") type = "number";
      else if (innerType === "ZodBoolean") type = "boolean";
      else if (innerType === "ZodEnum") type = "enum";
    } else if (description.typeName === "ZodEnum") type = "enum";
    return { name, type, required: !isOptional };
  });
}
function isValidTable(tableName) {
  return tableName in tables;
}

// ../../lib/mcp/tools-core.ts
async function dbListTables() {
  const tableList = Object.entries(tables).map(([name, def]) => ({
    name,
    description: def.description,
    columns: getTableColumns(name)
  }));
  return { data: { tables: tableList } };
}
async function dbQuery(supabase2, input) {
  const { table, select = "*", filter, filter_in, filter_like, order_by, limit = 100, offset = 0 } = input;
  if (!isValidTable(table)) {
    return { data: null, error: `Table not found: ${table}` };
  }
  let query = supabase2.from(table).select(select, { count: "exact" });
  if (filter) {
    for (const [key, value] of Object.entries(filter)) {
      query = query.eq(key, value);
    }
  }
  if (filter_in) {
    for (const [key, values] of Object.entries(filter_in)) {
      query = query.in(key, values);
    }
  }
  if (filter_like) {
    for (const [key, pattern] of Object.entries(filter_like)) {
      query = query.ilike(key, pattern);
    }
  }
  if (order_by) {
    query = query.order(order_by.column, { ascending: order_by.ascending ?? true });
  }
  const effectiveLimit = Math.min(limit, 1e3);
  query = query.range(offset, offset + effectiveLimit - 1);
  const { data, error, count } = await query;
  if (error) {
    return { data: null, error: `Database error: ${error.message}`, code: error.code };
  }
  return { data: data || [], count: count ?? void 0 };
}
async function dbGet(supabase2, input) {
  const { table, id, slug } = input;
  if (!isValidTable(table)) {
    return { data: null, error: `Table not found: ${table}` };
  }
  if (!id && !slug) {
    return { data: null, error: "Must provide either id or slug" };
  }
  const tableDef = tables[table];
  if (slug && !tableDef.hasSlug) {
    return { data: null, error: `Table ${table} does not have a slug field` };
  }
  let query = supabase2.from(table).select("*");
  if (id) {
    query = query.eq("id", id);
  } else if (slug) {
    query = query.eq("slug", slug);
  }
  const { data, error } = await query.single();
  if (error) {
    if (error.code === "PGRST116") {
      return { data: null, error: "Record not found" };
    }
    return { data: null, error: `Database error: ${error.message}`, code: error.code };
  }
  return { data };
}
async function dbCreate(supabase2, input) {
  const { table, data } = input;
  if (!isValidTable(table)) {
    return { data: null, error: `Table not found: ${table}` };
  }
  const tableDef = tables[table];
  const validation = tableDef.createSchema.safeParse(data);
  if (!validation.success) {
    const errors = validation.error.errors.map(
      (e) => `${e.path.join(".")}: ${e.message}`
    );
    return { data: null, error: "Validation failed", validation_errors: errors };
  }
  const { data: created, error } = await supabase2.from(table).insert(validation.data).select().single();
  if (error) {
    return { data: null, error: `Database error: ${error.message}`, code: error.code };
  }
  return { data: created };
}
async function dbUpdate(supabase2, input) {
  const { table, id, data } = input;
  if (!isValidTable(table)) {
    return { data: null, error: `Table not found: ${table}` };
  }
  const tableDef = tables[table];
  const validation = tableDef.updateSchema.safeParse(data);
  if (!validation.success) {
    const errors = validation.error.errors.map(
      (e) => `${e.path.join(".")}: ${e.message}`
    );
    return { data: null, error: "Validation failed", validation_errors: errors };
  }
  const { data: updated, error } = await supabase2.from(table).update(validation.data).eq("id", id).select().single();
  if (error) {
    if (error.code === "PGRST116") {
      return { data: null, error: "Record not found" };
    }
    return { data: null, error: `Database error: ${error.message}`, code: error.code };
  }
  return { data: updated };
}
async function dbDelete(supabase2, input) {
  const { table, id } = input;
  if (!isValidTable(table)) {
    return { data: null, error: `Table not found: ${table}` };
  }
  const { error } = await supabase2.from(table).delete().eq("id", id);
  if (error) {
    return { data: null, error: `Database error: ${error.message}`, code: error.code };
  }
  return { data: { success: true } };
}

// src/tools.ts
async function dbListTables2() {
  return dbListTables();
}
async function dbQuery2(input) {
  return dbQuery(supabase, input);
}
async function dbGet2(input) {
  return dbGet(supabase, input);
}
async function dbCreate2(input) {
  return dbCreate(supabase, input);
}
async function dbUpdate2(input) {
  return dbUpdate(supabase, input);
}
async function dbDelete2(input) {
  return dbDelete(supabase, input);
}

// src/index.ts
var server = new Server(
  {
    name: "jfriis-mcp",
    version: "1.0.0"
  },
  {
    capabilities: {
      tools: {}
    }
  }
);
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "db_list_tables",
        description: "List all registered tables and their schemas",
        inputSchema: {
          type: "object",
          properties: {},
          required: []
        }
      },
      {
        name: "db_query",
        description: "Query records from a table with filtering, ordering, and pagination",
        inputSchema: {
          type: "object",
          properties: {
            table: {
              type: "string",
              description: "Table name"
            },
            select: {
              type: "string",
              description: 'Columns to select (default: "*")'
            },
            filter: {
              type: "object",
              description: "Equality filters as key-value pairs"
            },
            filter_in: {
              type: "object",
              description: "IN filters as key-array pairs"
            },
            filter_like: {
              type: "object",
              description: "ILIKE filters as key-pattern pairs"
            },
            order_by: {
              type: "object",
              properties: {
                column: { type: "string" },
                ascending: { type: "boolean" }
              },
              required: ["column"],
              description: "Order by column"
            },
            limit: {
              type: "number",
              description: "Max records to return (default: 100, max: 1000)"
            },
            offset: {
              type: "number",
              description: "Records to skip (default: 0)"
            }
          },
          required: ["table"]
        }
      },
      {
        name: "db_get",
        description: "Fetch a single record by ID or slug",
        inputSchema: {
          type: "object",
          properties: {
            table: {
              type: "string",
              description: "Table name"
            },
            id: {
              type: "string",
              description: "UUID of the record"
            },
            slug: {
              type: "string",
              description: "URL-friendly identifier"
            }
          },
          required: ["table"]
        }
      },
      {
        name: "db_create",
        description: "Insert a new record. Validates against table schema.",
        inputSchema: {
          type: "object",
          properties: {
            table: {
              type: "string",
              description: "Table name"
            },
            data: {
              type: "object",
              description: "Record data to insert"
            }
          },
          required: ["table", "data"]
        }
      },
      {
        name: "db_update",
        description: "Update an existing record by ID. Validates against table schema.",
        inputSchema: {
          type: "object",
          properties: {
            table: {
              type: "string",
              description: "Table name"
            },
            id: {
              type: "string",
              description: "UUID of the record to update"
            },
            data: {
              type: "object",
              description: "Fields to update"
            }
          },
          required: ["table", "id", "data"]
        }
      },
      {
        name: "db_delete",
        description: "Delete a record by ID",
        inputSchema: {
          type: "object",
          properties: {
            table: {
              type: "string",
              description: "Table name"
            },
            id: {
              type: "string",
              description: "UUID of the record to delete"
            }
          },
          required: ["table", "id"]
        }
      }
    ]
  };
});
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  try {
    let result;
    switch (name) {
      case "db_list_tables":
        result = await dbListTables2();
        break;
      case "db_query":
        result = await dbQuery2(args);
        break;
      case "db_get":
        result = await dbGet2(args);
        break;
      case "db_create":
        result = await dbCreate2(args);
        break;
      case "db_update":
        result = await dbUpdate2(args);
        break;
      case "db_delete":
        result = await dbDelete2(args);
        break;
      default:
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ error: `Unknown tool: ${name}` })
            }
          ],
          isError: true
        };
    }
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2)
        }
      ],
      isError: result.error !== void 0
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ error: message })
        }
      ],
      isError: true
    };
  }
});
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("jfriis-mcp server running on stdio");
}
main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
