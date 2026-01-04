# Backlog Item Removal Plan

## Executive Summary
Remove the `backlog_items` entity entirely and rely on `log_entries` with `type='idea'` for idea capture. Log entries already have all necessary fields to support idea management.

## Why Log Entries Are Sufficient

### Current Backlog Item Fields vs Log Entry Fields

| Backlog Item Field | Log Entry Equivalent | Notes |
|-------------------|---------------------|-------|
| `title` | `title` | ✅ Required in log_entries |
| `content` | `content` | ✅ JSONB, more flexible |
| `media` | `images` | ✅ JSONB array |
| `status` | `metadata.status` or `type` | ✅ Can use type='idea-inbox', 'idea-shaped', etc. |
| `tags` | `tags` | ✅ Identical |
| `metadata` | `metadata` | ✅ Identical |
| `converted_to`/`converted_id` | `entity_links` table | ✅ Already migrated to universal linking |

### Additional Benefits of Log Entries
- **Published workflow**: `published` flag for public/private ideas
- **SEO support**: Built-in SEO fields
- **Project linking**: `studio_project_id`, `studio_experiment_id`
- **Dating**: `entry_date` for temporal tracking
- **Slug**: Unique slug for URL-friendly access

### Recommended Type Convention for Ideas
- `type='idea'` - Raw idea in inbox
- `type='idea-shaped'` - Shaped/refined idea
- `type='idea-experiment'` - Idea converted to experiment
- Or use `metadata.idea_status` for workflow tracking

---

## Removal Checklist

### Phase 1: Database Layer

#### Files to Delete
- [ ] `supabase/migrations/001_initial_schema.sql` - Remove backlog_items table creation (lines 159-180)
- [ ] `supabase/migrations/005_backlog_lineage.sql` - Delete entire file (backlog_log_entries junction)
- [ ] Create new migration to drop tables:
  ```sql
  -- DROP backlog tables
  DROP TABLE IF EXISTS backlog_log_entries CASCADE;
  DROP TABLE IF EXISTS backlog_items CASCADE;
  ```

#### Files to Modify
- [ ] `lib/types/database.ts:301-314` - Remove BacklogItem interface
- [ ] `lib/types/database.ts:767-771` - Remove from Database.Tables
- [ ] `lib/types/entity-relationships.ts` - Remove 'backlog_item' from LinkableEntityType
- [ ] `lib/types/entity-relationships.ts` - Remove backlog_item link mappings
- [ ] `lib/entity-links-validation.ts` - Remove backlog_item link validation rules

---

### Phase 2: UI Components

#### Files to Delete
- [ ] `components/admin/backlog-item-form.tsx` (260 lines)
- [ ] `components/admin/cards/backlog-item-card.tsx` (67 lines)
- [ ] `components/admin/views/backlog-list-view.tsx` (132 lines)

#### Files to Modify
- [ ] `components/admin/dashboard-stats.tsx` - Remove backlog count stat card
- [ ] `components/admin/recent-activity.tsx` - Remove backlog activity type
- [ ] `components/admin/status-badge.tsx:14-17` - Remove backlog status colors

---

### Phase 3: Routes & Pages

#### Files to Delete
- [ ] `app/(private)/admin/backlog/page.tsx`
- [ ] `app/(private)/admin/backlog/new/page.tsx`
- [ ] `app/(private)/admin/backlog/[id]/edit/page.tsx`
- [ ] Delete entire directory: `app/(private)/admin/backlog/`

---

### Phase 4: Server Actions & API

#### Files to Delete
- [ ] `app/actions/backlog.ts` - Delete entire file

---

### Phase 5: AI Integration

#### Files to Modify
- [ ] `lib/ai/types/entities.ts:22,51-52,83` - Remove 'backlog_items' from EntityType
- [ ] `lib/ai/actions/generate-field.ts:94-98` - Remove backlog_items field prompts

---

### Phase 6: MCP (Model Context Protocol)

#### Files to Modify
- [ ] `lib/mcp/schemas/other.ts:23-43` - Remove BacklogItemSchema
- [ ] `lib/mcp/tables.ts:162-169` - Remove backlog_items table config

---

### Phase 7: Navigation & UI Chrome

#### Files to Check/Modify
- [ ] Search for navigation links to `/admin/backlog`
- [ ] Check sidebar/menu components for backlog references
- [ ] Update any breadcrumbs or app routing configs

---

### Phase 8: Constants & Enums

#### Files to Check
- [ ] `lib/types/entity-relationships.ts` - Remove ENTITY_TYPES.BACKLOG_ITEM
- [ ] Search for any exported constants related to backlog

---

### Phase 9: Tests & Documentation

#### Files to Check
- [ ] Search for test files mentioning backlog_item
- [ ] Update any documentation files
- [ ] Check for example code or seed data

---

## Migration Strategy

### Option A: Clean Migration (Recommended)
```sql
-- File: supabase/migrations/XXX_remove_backlog_items.sql

-- Drop junction table first (has FK constraint)
DROP TABLE IF EXISTS backlog_log_entries CASCADE;

-- Drop main table
DROP TABLE IF EXISTS backlog_items CASCADE;

-- Remove from entity_links if any orphaned records exist
DELETE FROM entity_links
WHERE source_entity_type = 'backlog_item'
   OR target_entity_type = 'backlog_item';
```

### Option B: Data Migration (If preserving data)
```sql
-- Migrate backlog items to log entries before dropping
INSERT INTO log_entries (
  title,
  slug,
  content,
  entry_date,
  type,
  images,
  tags,
  metadata,
  published,
  created_at,
  updated_at
)
SELECT
  COALESCE(title, 'Untitled Idea') as title,
  CONCAT('idea-', id) as slug,
  jsonb_build_object('text', content) as content,
  created_at::date as entry_date,
  CASE
    WHEN status = 'inbox' THEN 'idea'
    WHEN status = 'shaped' THEN 'idea-shaped'
    ELSE 'idea'
  END as type,
  media as images,
  tags,
  jsonb_build_object('original_status', status, 'migrated_from', 'backlog_item') as metadata,
  false as published,
  created_at,
  updated_at
FROM backlog_items;

-- Then drop tables
DROP TABLE IF EXISTS backlog_log_entries CASCADE;
DROP TABLE IF EXISTS backlog_items CASCADE;
```

---

## Search Commands to Find All References

```bash
# Find all backlog references in code
grep -r "backlog" --include="*.ts" --include="*.tsx" --include="*.sql"

# Find BacklogItem type references
grep -r "BacklogItem" --include="*.ts" --include="*.tsx"

# Find backlog_item string literals
grep -r "backlog_item" --include="*.ts" --include="*.tsx" --include="*.sql"

# Find backlog routes
grep -r "/admin/backlog" --include="*.ts" --include="*.tsx"
```

---

## Verification Steps

After removal, verify:

1. **No TypeScript Errors**: `npm run build` or `tsc --noEmit`
2. **No Database References**: Search codebase for `backlog`
3. **Navigation Works**: Check admin navigation doesn't have broken links
4. **Entity Links Valid**: `entity_links` table only has valid entity types
5. **AI Integration**: AI field generation works without backlog_items
6. **MCP Protocol**: MCP schema doesn't reference backlog_items

---

## Rollback Plan

If issues arise:
1. Revert the migration: `supabase migration down`
2. Restore deleted files from git: `git checkout HEAD~1 -- <file_path>`
3. Re-run type generation if needed

---

## Timeline Estimate

- **Phase 1-2** (Database & UI): ~30 mins
- **Phase 3-4** (Routes & Actions): ~15 mins
- **Phase 5-6** (AI & MCP): ~15 mins
- **Phase 7-9** (Nav, Constants, Docs): ~20 mins
- **Testing & Verification**: ~30 mins

**Total**: ~2 hours for careful surgical removal

---

## Post-Removal: Log Entry Idea Workflow

### Creating Ideas
```typescript
// Create a new idea
const { data } = await supabase
  .from('log_entries')
  .insert({
    title: 'My new idea',
    content: { text: 'Idea description...' },
    type: 'idea',
    published: false,
    entry_date: new Date().toISOString().split('T')[0],
    tags: ['idea', 'inbox']
  })
```

### Querying Ideas
```typescript
// Get all ideas in inbox
const { data } = await supabase
  .from('log_entries')
  .select('*')
  .eq('type', 'idea')
  .eq('published', false)
  .order('created_at', { ascending: false })
```

### Idea Status Tracking
Use metadata for status:
```typescript
{
  type: 'idea',
  metadata: {
    status: 'inbox' | 'shaped' | 'testing' | 'implemented'
  }
}
```

Or use type variants:
- `type='idea'` - inbox
- `type='idea-shaped'` - shaped/refined
- `type='idea-validated'` - validated idea
- `type='experiment'` - evolved into experiment

---

## Files Summary

### Delete Entirely (14 files/dirs)
1. `supabase/migrations/005_backlog_lineage.sql`
2. `components/admin/backlog-item-form.tsx`
3. `components/admin/cards/backlog-item-card.tsx`
4. `components/admin/views/backlog-list-view.tsx`
5. `app/(private)/admin/backlog/page.tsx`
6. `app/(private)/admin/backlog/new/page.tsx`
7. `app/(private)/admin/backlog/[id]/edit/page.tsx`
8. `app/(private)/admin/backlog/` (entire directory)
9. `app/actions/backlog.ts`

### Modify (10 files)
1. `lib/types/database.ts`
2. `lib/types/entity-relationships.ts`
3. `lib/entity-links-validation.ts`
4. `components/admin/dashboard-stats.tsx`
5. `components/admin/recent-activity.tsx`
6. `components/admin/status-badge.tsx`
7. `lib/ai/types/entities.ts`
8. `lib/ai/actions/generate-field.ts`
9. `lib/mcp/schemas/other.ts`
10. `lib/mcp/tables.ts`

### Create New (1 file)
1. `supabase/migrations/XXX_remove_backlog_items.sql`

---

## Decision Required: Data Migration

**Question**: Do you want to migrate existing backlog items to log entries, or is this a clean removal?

- **Option A**: Migrate data → Use migration script from "Option B" above
- **Option B**: Clean removal → Use migration script from "Option A" above

Please confirm before proceeding with implementation.
