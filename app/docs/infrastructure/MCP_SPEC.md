# jonfriis.com MCP Server Specification

> **Version:** 1.0.0
> **Status:** Specification
> **Last Updated:** 2025-12-26

---

## Overview

A private MCP server providing typed CRUD access to the jonfriis.com Supabase database. Claude Code remains the primary tool for all code operations; this MCP handles database operations only.

### Purpose

- **Database CRUD** - Query, create, update, delete records across all tables
- **Schema validation** - Zod schemas prevent bad data
- **Discoverability** - Tables and their schemas are enumerable

### What This MCP Does NOT Do

- File read/write operations (Claude Code handles this)
- Code generation or modification
- Custom business logic tools
- Plugin loading or dynamic discovery

---

## Architecture

```
┌──────────────────────────────────────┐
│           Claude Code                │
│     (all code operations)            │
└─────────────────┬────────────────────┘
                  │ MCP Protocol (stdio)
┌─────────────────▼────────────────────┐
│            jfriis-mcp                │
│  ┌────────────────────────────────┐  │
│  │     5 CRUD Tools               │  │
│  │     Table Registry             │  │
│  │     Zod Validation             │  │
│  └────────────────────────────────┘  │
└─────────────────┬────────────────────┘
                  │
           ┌──────▼──────┐
           │  Supabase   │
           │ (PostgreSQL)│
           └─────────────┘
```

### Technology Stack

- **Runtime:** Node.js (TypeScript)
- **MCP SDK:** `@modelcontextprotocol/sdk`
- **Database:** `@supabase/supabase-js`
- **Validation:** Zod

---

## Tools

Five tools handle all database operations.

### `db_list_tables`

List all registered tables and their schemas.

```typescript
// Input: none

// Output
interface DbListTablesOutput {
  tables: Array<{
    name: string
    description: string
    columns: Array<{
      name: string
      type: string
      required: boolean
    }>
  }>
}
```

**Example:**
```json
{ "tool": "db_list_tables" }
```

---

### `db_query`

Query records from a table with filtering, ordering, and pagination.

```typescript
interface DbQueryInput {
  table: string                         // Table name
  select?: string                       // Columns (default: "*")
  filter?: Record<string, any>          // Equality filters
  filter_in?: Record<string, any[]>     // IN filters
  filter_like?: Record<string, string>  // ILIKE filters
  order_by?: {
    column: string
    ascending?: boolean                 // default: true
  }
  limit?: number                        // default: 100, max: 1000
  offset?: number                       // default: 0
}

interface DbQueryOutput {
  data: Record<string, any>[]
  count: number
  error?: string
}
```

**Examples:**
```json
// Get published projects
{
  "tool": "db_query",
  "table": "projects",
  "filter": { "published": true },
  "order_by": { "column": "created_at", "ascending": false },
  "limit": 10
}

// Search log entries by tag
{
  "tool": "db_query",
  "table": "log_entries",
  "filter": { "published": true },
  "filter_like": { "title": "%design%" }
}

// Get specimens of a specific type
{
  "tool": "db_query",
  "table": "specimens",
  "filter": { "type": "ui-component", "published": true }
}
```

---

### `db_get`

Fetch a single record by ID or slug.

```typescript
interface DbGetInput {
  table: string
  id?: string       // UUID - use this OR slug
  slug?: string     // URL identifier - use this OR id
}

interface DbGetOutput {
  data: Record<string, any> | null
  error?: string
}
```

**Examples:**
```json
// By ID
{
  "tool": "db_get",
  "table": "projects",
  "id": "123e4567-e89b-12d3-a456-426614174000"
}

// By slug
{
  "tool": "db_get",
  "table": "projects",
  "slug": "design-system-tool"
}
```

---

### `db_create`

Insert a new record. Validates against table schema.

```typescript
interface DbCreateInput {
  table: string
  data: Record<string, any>
}

interface DbCreateOutput {
  data: Record<string, any>   // Created record with id, timestamps
  error?: string
  validation_errors?: string[]
}
```

**Example:**
```json
{
  "tool": "db_create",
  "table": "log_entries",
  "data": {
    "title": "New Experiment",
    "slug": "new-experiment",
    "entry_date": "2025-12-26",
    "type": "experiment",
    "content": { "blocks": [] },
    "published": false
  }
}
```

---

### `db_update`

Update an existing record by ID. Validates against table schema.

```typescript
interface DbUpdateInput {
  table: string
  id: string
  data: Record<string, any>   // Partial update - only fields to change
}

interface DbUpdateOutput {
  data: Record<string, any>   // Updated record
  error?: string
  validation_errors?: string[]
}
```

**Example:**
```json
{
  "tool": "db_update",
  "table": "projects",
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "data": {
    "status": "completed",
    "published": true
  }
}
```

---

### `db_delete`

Delete a record by ID.

```typescript
interface DbDeleteInput {
  table: string
  id: string
}

interface DbDeleteOutput {
  success: boolean
  error?: string
}
```

**Example:**
```json
{
  "tool": "db_delete",
  "table": "backlog_items",
  "id": "123e4567-e89b-12d3-a456-426614174000"
}
```

---

## Table Registry

All tables are registered with their Zod schemas. The registry is static configuration updated when tables are added.

### Site Tables

| Table | Description |
|-------|-------------|
| `projects` | Portfolio projects and businesses |
| `log_entries` | Chronological log posts |
| `specimens` | Reusable components |
| `gallery_sequences` | Curated specimen collections |
| `landing_pages` | Custom landing page configs |
| `backlog_items` | Content inbox |
| `profiles` | User profiles |

### Distribution Tables

| Table | Description |
|-------|-------------|
| `channels` | Distribution platforms |
| `distribution_posts` | Posted content tracking |
| `distribution_queue` | Pending distribution tasks |

### Junction Tables

| Table | Description |
|-------|-------------|
| `gallery_specimen_items` | Specimens ↔ Gallery sequences |
| `log_entry_specimens` | Specimens ↔ Log entries |
| `project_specimens` | Specimens ↔ Projects |
| `log_entry_projects` | Projects ↔ Log entries |

### Studio Tables

| Table | Description |
|-------|-------------|
| `studio_dst_configs` | Design System Tool configurations |

*Add studio tables here as projects create them.*

---

## Schema Definitions

Schemas live in the MCP server codebase. Example:

```typescript
// mcp/src/schemas/projects.ts
import { z } from 'zod'

export const ProjectSchema = z.object({
  id: z.string().uuid().optional(),           // Auto-generated
  created_at: z.string().datetime().optional(), // Auto-generated
  updated_at: z.string().datetime().optional(), // Auto-generated

  title: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
  description: z.string().optional(),
  content: z.any().optional(),                 // JSONB
  status: z.enum(['draft', 'active', 'archived', 'completed']),
  type: z.string().optional(),
  start_date: z.string().date().optional(),
  end_date: z.string().date().optional(),
  featured_image: z.string().url().optional(),
  images: z.array(z.any()).optional(),
  tags: z.array(z.string()).optional(),
  metadata: z.any().optional(),
  seo_title: z.string().optional(),
  seo_description: z.string().optional(),
  published: z.boolean().default(false),
  published_at: z.string().datetime().optional(),
})

export const ProjectCreateSchema = ProjectSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
})

export const ProjectUpdateSchema = ProjectCreateSchema.partial()
```

### Validation Behavior

- **db_create**: Validates full record against `*CreateSchema`
- **db_update**: Validates partial record against `*UpdateSchema`
- **db_query/db_get**: No input validation (read-only)
- **Validation errors**: Return `validation_errors` array with field-specific messages

---

## Adding New Tables

When a studio project needs database tables:

### 1. Create Supabase Migration

```sql
-- supabase/migrations/xxx_studio_newproject.sql
CREATE TABLE studio_newproject_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  name TEXT NOT NULL,
  data JSONB,
  -- ... fields
);

-- RLS policies
ALTER TABLE studio_newproject_items ENABLE ROW LEVEL SECURITY;
-- ... policies
```

### 2. Add Zod Schema

```typescript
// mcp/src/schemas/studio-newproject.ts
import { z } from 'zod'

export const NewProjectItemSchema = z.object({
  id: z.string().uuid().optional(),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
  name: z.string().min(1),
  data: z.any().optional(),
})

export const NewProjectItemCreateSchema = NewProjectItemSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
})

export const NewProjectItemUpdateSchema = NewProjectItemCreateSchema.partial()
```

### 3. Register in Table Registry

```typescript
// mcp/src/tables.ts
import { NewProjectItemSchema, NewProjectItemCreateSchema, NewProjectItemUpdateSchema }
  from './schemas/studio-newproject'

export const tables = {
  // ... existing tables

  studio_newproject_items: {
    description: 'Items for the new project',
    schema: NewProjectItemSchema,
    createSchema: NewProjectItemCreateSchema,
    updateSchema: NewProjectItemUpdateSchema,
  },
}
```

### 4. Restart MCP Server

The new table is immediately available via all CRUD tools.

---

## File Structure

```
app/
├── mcp/
│   ├── src/
│   │   ├── index.ts              # Server entry point
│   │   ├── tools.ts              # CRUD tool handlers
│   │   ├── tables.ts             # Table registry
│   │   ├── supabase.ts           # Supabase client
│   │   └── schemas/
│   │       ├── projects.ts
│   │       ├── log-entries.ts
│   │       ├── specimens.ts
│   │       ├── gallery.ts
│   │       ├── landing-pages.ts
│   │       ├── backlog.ts
│   │       ├── distribution.ts
│   │       ├── junctions.ts
│   │       └── studio-dst.ts
│   ├── package.json
│   ├── tsconfig.json
│   └── dist/
└── docs/
    └── infrastructure/
        └── MCP_SPEC.md
```

**Estimated size:** ~500 lines total

---

## Configuration

### Environment Variables

```bash
# .env.local (or .env in mcp/ directory)
SUPABASE_URL=https://gmjkufgctbhrlefzzicg.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

**Important:** Use service role key (not anon key) to bypass RLS for admin operations.

### Claude Code Integration

Add to project root `.claude/settings.local.json`:

```json
{
  "mcpServers": {
    "jfriis": {
      "command": "node",
      "args": ["./app/mcp/dist/index.js"]
    }
  }
}
```

Or if using ts-node for development:

```json
{
  "mcpServers": {
    "jfriis": {
      "command": "npx",
      "args": ["ts-node", "./app/mcp/src/index.ts"]
    }
  }
}
```

---

## Implementation Plan

### Phase 1: Minimal Viable Server

1. Initialize Node.js project with TypeScript
2. Install dependencies (`@modelcontextprotocol/sdk`, `@supabase/supabase-js`, `zod`)
3. Create Supabase client
4. Implement `db_query` and `db_get` tools
5. Test with Claude Code

**Deliverable:** Can query any table via MCP

### Phase 2: Full CRUD

1. Implement `db_create`, `db_update`, `db_delete`
2. Add Zod schemas for all site tables
3. Add validation to create/update operations
4. Implement `db_list_tables`

**Deliverable:** Full CRUD with validation

### Phase 3: Studio Tables

1. Add schemas for `studio_dst_configs`
2. Document pattern for adding new studio tables
3. Test full workflow

**Deliverable:** Ready for production use

---

## Security

### Supabase Service Role

The MCP uses the service role key which bypasses RLS. This is intentional:
- Claude Code is a trusted operator
- Admin-level access is required for all operations
- RLS still protects the public API

### Input Validation

- Table names validated against registry (prevents SQL injection via table name)
- Column selection validated
- All create/update data validated via Zod schemas
- IDs must be valid UUIDs

### No Network Exposure

- Server runs locally via stdio
- No HTTP endpoints
- Only accessible to Claude Code process

---

## Error Handling

### Error Response Format

```typescript
interface ErrorResponse {
  data: null
  error: string                    // Human-readable error message
  validation_errors?: string[]     // Field-specific validation errors
  code?: string                    // Supabase error code if applicable
}
```

### Common Errors

| Error | Cause |
|-------|-------|
| `Table not found: xyz` | Table not in registry |
| `Record not found` | ID/slug doesn't exist |
| `Validation failed` | Data doesn't match schema |
| `Duplicate slug` | Unique constraint violation |
| `Database error: ...` | Supabase error (passed through) |

---

## Usage Examples

### Workflow: Publish a Draft Project

```json
// 1. Find the draft
{ "tool": "db_query", "table": "projects", "filter": { "slug": "my-project" } }

// 2. Update to published
{
  "tool": "db_update",
  "table": "projects",
  "id": "...",
  "data": { "published": true, "published_at": "2025-12-26T12:00:00Z" }
}
```

### Workflow: Create Log Entry with Specimens

```json
// 1. Create log entry
{
  "tool": "db_create",
  "table": "log_entries",
  "data": {
    "title": "Design System Update",
    "slug": "design-system-update",
    "entry_date": "2025-12-26",
    "type": "update",
    "published": false
  }
}
// Returns: { "data": { "id": "log-uuid-here", ... } }

// 2. Link specimens
{
  "tool": "db_create",
  "table": "log_entry_specimens",
  "data": {
    "log_entry_id": "log-uuid-here",
    "specimen_id": "specimen-uuid-here",
    "position": 0
  }
}
```

### Workflow: Queue for Distribution

```json
// 1. Add to queue
{
  "tool": "db_create",
  "table": "distribution_queue",
  "data": {
    "channel_id": "hackernews-channel-uuid",
    "content_type": "log_entry",
    "content_id": "log-uuid-here",
    "status": "pending",
    "priority": 1
  }
}
```

### Workflow: Check Studio Config

```json
// Get DST configuration
{ "tool": "db_query", "table": "studio_dst_configs", "limit": 1 }
```

---

## Maintenance

### Adding Tables

See [Adding New Tables](#adding-new-tables) section.

### Updating Schemas

When Supabase schema changes:

1. Update the Zod schema in `mcp/src/schemas/`
2. Rebuild (`npm run build`)
3. Restart Claude Code (reloads MCP)

### Debugging

Run server directly to see logs:

```bash
cd app/mcp
npx ts-node src/index.ts
```

The MCP SDK logs protocol messages to stderr.

---

## Appendix: Dependencies

```json
{
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0",
    "@supabase/supabase-js": "^2.39.0",
    "zod": "^3.22.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.3.0",
    "ts-node": "^10.9.0"
  }
}
```

---

*This spec defines a focused database CRUD server. All code operations remain with Claude Code.*
