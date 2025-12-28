# Studio Project Protocol

> Procedural guide for creating and configuring new studio projects.

---

## When to Use This Protocol

- Creating a new studio project from scratch
- Adding database tables to an existing studio project
- Registering new tables with the MCP server

**Note:** For strategic decisions about *whether* to create a project, consult the `studio-mgr` agent first.

---

## 1. Create Project Directory

### Location

```
app/components/studio/{project-name}/
```

Use kebab-case for directory names.

### Minimum Structure

```
app/components/studio/{project-name}/
├── README.md                 # Project overview, status, links
├── components/               # React components (if applicable)
├── lib/                      # Utilities, helpers
└── config/                   # Configuration files
```

### README.md Template

```markdown
# {Project Name}

> One-line description

## Status

- **Phase:** Planning | Active | Paused | Archived
- **Temperature:** Hot | Warm | Cold

## Overview

Brief description of what this project does and why it exists.

## Key Files

- `components/` - UI components
- `lib/` - Utilities
- `config/` - Configuration

## Related

- Links to related docs, projects, or resources
```

---

## 2. Database Tables (If Needed)

### Naming Convention

All studio project tables use the prefix:

```
studio_{project-short-name}_{table-name}
```

Examples:
- `studio_dst_configs` (Design System Tool)
- `studio_es_tokens` (Experience Systems)
- `studio_audioviz_presets` (Audio Visualizer)

### Create Supabase Migration

Create migration file in `app/supabase/migrations/`:

```sql
-- {timestamp}_studio_{project}_tables.sql
-- Studio: {Project Name}
-- Description: {What these tables store}

-- Main table
CREATE TABLE studio_{project}_{tablename} (
  -- Standard fields (always include these)
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,

  -- Project-specific fields
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  data JSONB,
  -- ... add fields as needed

  -- Optional: soft delete
  deleted_at TIMESTAMPTZ
);

-- Updated_at trigger
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON studio_{project}_{tablename}
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Indexes (add as needed)
CREATE INDEX idx_studio_{project}_{tablename}_slug
  ON studio_{project}_{tablename}(slug);

-- RLS
ALTER TABLE studio_{project}_{tablename} ENABLE ROW LEVEL SECURITY;

-- Policies (adjust based on needs)
-- Public read for published items
CREATE POLICY "Public read published"
  ON studio_{project}_{tablename}
  FOR SELECT
  USING (published = true);

-- Admin full access
CREATE POLICY "Admin full access"
  ON studio_{project}_{tablename}
  FOR ALL
  USING (is_admin());
```

### Run Migration

```bash
# Via Supabase CLI
cd app && npx supabase db push

# Or manually in Supabase Dashboard SQL Editor
```

---

## 3. Add MCP Schema

### Create Schema File

Create `app/mcp/src/schemas/studio-{project}.ts`:

```typescript
import { z } from 'zod'

// Full schema (for reading)
export const {TableName}Schema = z.object({
  // Standard fields
  id: z.string().uuid().optional(),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),

  // Project-specific fields
  name: z.string().min(1),
  slug: z.string().regex(/^[a-z0-9-]+$/).optional(),
  data: z.any().optional(),
  // ... match your table columns
})

// Create schema (omit auto-generated fields)
export const {TableName}CreateSchema = {TableName}Schema.omit({
  id: true,
  created_at: true,
  updated_at: true,
})

// Update schema (all fields optional)
export const {TableName}UpdateSchema = {TableName}CreateSchema.partial()
```

### Register in Table Registry

Edit `app/mcp/src/tables.ts`:

```typescript
import {
  {TableName}Schema,
  {TableName}CreateSchema,
  {TableName}UpdateSchema,
} from './schemas/studio-{project}'

export const tables = {
  // ... existing tables

  // {Project Name}
  studio_{project}_{tablename}: {
    description: '{What this table stores}',
    schema: {TableName}Schema,
    createSchema: {TableName}CreateSchema,
    updateSchema: {TableName}UpdateSchema,
  },
}
```

### Rebuild MCP

```bash
cd app/mcp && npm run build
```

---

## 4. Update Studio Registry

Edit `.claude/STUDIO_REGISTRY.md`:

### Add New Project Entry

Add under `## Active Projects` or `## Paused Projects`:

```markdown
### {Project Name}

| Field | Value |
|-------|-------|
| **Path** | `/app/components/studio/{project-name}/` |
| **Status** | Planning | Active | Paused |
| **Temperature** | Hot | Warm | Cold |
| **Database Tables** | `studio_{project}_*` |

**Current focus:** What you're working on now (or N/A if paused)

**Next milestone:** What completion looks like

**Blockers:** None | List any blockers

**Deferred:** Items explicitly pushed to later

**Recent wins:** Notable completions (update as you go)
```

### Update Quick Pulse

Update the header quick pulse to reflect the new project:

```markdown
> **Last updated:** {today's date}
> **Quick pulse:** {Updated summary including new project}
```

---

## 5. Verification Checklist

After completing the above steps, verify:

- [ ] Project directory exists at `app/components/studio/{project}/`
- [ ] README.md describes the project
- [ ] Migration ran successfully (check Supabase dashboard)
- [ ] Zod schema file exists at `app/mcp/src/schemas/studio-{project}.ts`
- [ ] Table registered in `app/mcp/src/tables.ts`
- [ ] MCP rebuilt (`npm run build` in mcp/)
- [ ] Studio registry updated (`.claude/STUDIO_REGISTRY.md`)
- [ ] Can query new table via MCP: `{ "tool": "db_query", "table": "studio_{project}_{table}" }`

---

## Quick Reference

### File Locations

| What | Where |
|------|-------|
| Project code | `app/components/studio/{project}/` |
| Migrations | `app/supabase/migrations/` |
| MCP schemas | `app/mcp/src/schemas/studio-{project}.ts` |
| Table registry | `app/mcp/src/tables.ts` |
| Studio registry | `.claude/STUDIO_REGISTRY.md` |

### Naming Conventions

| Thing | Convention | Example |
|-------|------------|---------|
| Directory | kebab-case | `audio-visualizer` |
| Table prefix | `studio_{short}_` | `studio_av_` |
| Table name | snake_case | `studio_av_presets` |
| Schema export | PascalCase | `AvPresetSchema` |

### Common Table Patterns

**Config/Settings table:**
```sql
CREATE TABLE studio_{project}_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  name TEXT NOT NULL DEFAULT 'default',
  config JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN DEFAULT true
);
```

**Items/Entries table:**
```sql
CREATE TABLE studio_{project}_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE,
  content JSONB,
  metadata JSONB DEFAULT '{}',
  published BOOLEAN DEFAULT false,
  published_at TIMESTAMPTZ
);
```

**Junction table:**
```sql
CREATE TABLE studio_{project}_item_tags (
  item_id UUID REFERENCES studio_{project}_items(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES studio_{project}_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (item_id, tag_id)
);
```

---

## Removing a Project

If a project is abandoned:

1. Update `STUDIO_REGISTRY.md` - move to archived or remove
2. Optionally drop tables (create a migration with `DROP TABLE`)
3. Remove schema file and registry entry from MCP
4. Keep or archive the project directory as reference

---

*Protocol version: 1.0 | Last updated: 2025-12-26*
