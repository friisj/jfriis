# Plan: Idea Management System

## Overview

Build an idea management layer that makes it easy to capture ideas and explicitly graduate them through the pipeline: **Idea → Studio Project → Venture**. Two deliverables:

1. **`/admin/ideas` UI** — an aggregation view that surfaces ideas across entities and makes graduation explicit
2. **`/idea-capture` skill** — a Claude Code skill for frictionless idea capture from any context

## Design Principles

- **No new tables.** Ideas remain as `log_entries` with `type` values in the idea family (`idea`, `idea-shaped`, `idea-validated`). The removed `backlog_items` table proved a separate table adds complexity without proportional value.
- **Build on entity_links.** Graduation = creating the next entity + an `evolved_from` link back to the idea. The lineage is explicit and queryable.
- **Aggregation, not duplication.** The `/admin/ideas` page is a *view* that pulls ideas from `log_entries`, shows connected studio projects and ventures, and surfaces the graduation pipeline.

---

## Step 1: Add `idea_stage` column to `log_entries`

The `type` field currently overloads entry classification (idea vs experiment vs research) with idea lifecycle stage (idea vs idea-shaped vs idea-validated). Separate these concerns with a dedicated `idea_stage` column.

**Migration:** `supabase/migrations/YYYYMMDD_add_idea_stage.sql`

```sql
-- Add idea_stage for tracking idea lifecycle (only meaningful when type LIKE 'idea%')
ALTER TABLE log_entries ADD COLUMN idea_stage TEXT;

-- Backfill: existing idea-typed entries get 'captured' stage
UPDATE log_entries SET idea_stage = 'captured' WHERE type = 'idea';
UPDATE log_entries SET idea_stage = 'exploring' WHERE type = 'idea-shaped';
UPDATE log_entries SET idea_stage = 'validated' WHERE type = 'idea-validated';

-- Normalize: set all idea variants back to type='idea'
UPDATE log_entries SET type = 'idea' WHERE type IN ('idea-shaped', 'idea-validated');

-- Add check constraint for valid stages
ALTER TABLE log_entries ADD CONSTRAINT log_entries_idea_stage_valid
  CHECK (idea_stage IS NULL OR idea_stage IN (
    'captured',    -- Raw idea, just jotted down
    'exploring',   -- Being researched/shaped
    'validated',   -- Has evidence supporting it
    'graduated',   -- Promoted to studio project or venture
    'parked'       -- Deliberately set aside (not archived/deleted)
  ));
```

**Update TypeScript types** in `lib/types/database.ts`:

```typescript
export type IdeaStage = 'captured' | 'exploring' | 'validated' | 'graduated' | 'parked'

export interface LogEntry extends BaseRecord {
  // ... existing fields
  idea_stage?: IdeaStage  // Only set when type='idea'
}
```

---

## Step 2: Build `/admin/ideas` page

### 2a: Server page — `/app/(private)/admin/ideas/page.tsx`

Fetches and aggregates:
- All `log_entries` where `type = 'idea'`, ordered by `updated_at desc`
- Entity links where source_type='log_entry' and those entry IDs, to find connected studio_projects and ventures
- Studio projects that have no linked idea (orphan projects, for context)
- Counts of links per idea

### 2b: Client view — `/components/admin/views/ideas-list-view.tsx`

Uses `AdminDataView` with these features:

**Columns:**
| Column | Source |
|--------|--------|
| Title | log_entry.title |
| Stage | log_entry.idea_stage (StatusBadge with stage colors) |
| Linked To | Entity link targets (studio projects, ventures shown as chips) |
| Evidence | Count of entity_links with link_type in validation family |
| Date | log_entry.entry_date |
| Actions | Edit (→ log entry form), Graduate (→ graduation flow) |

**Filters:**
- By stage (captured / exploring / validated / graduated / parked)
- By linked status (unlinked / has studio project / has venture)

**Views:**
- **Table** (default): sorted list with all columns
- **Kanban**: columns by `idea_stage` — the pipeline view

### 2c: Graduation actions

**"Graduate to Studio Project" button** (available when stage is `exploring` or `validated`):
1. Opens a modal/drawer with pre-filled fields from the idea (title → name, content → description/problem_statement)
2. On confirm: creates `studio_projects` record, creates `entity_link` (studio_project `evolved_from` log_entry), updates idea's `idea_stage` to `graduated`
3. Toast with link to the new studio project

**"Graduate to Venture" button** (available on studio projects from the ideas view, or directly on validated ideas):
1. Similar flow — pre-fills venture from idea/studio project data
2. Creates venture + `evolved_from` entity_link
3. Updates stage

**Implementation:** A `GraduationModal` component that accepts source entity info and target type, handles the creation + linking.

### 2d: Pipeline summary header

At the top of the ideas page, show a simple pipeline summary:

```
[12 Captured] → [4 Exploring] → [2 Validated] → [6 Graduated] | [3 Parked]
```

Each is a clickable filter. Quick visual for overall idea health.

---

## Step 3: Add to admin dashboard

Add "Ideas" to the quick actions grid in `/app/(private)/admin/page.tsx`:
- Icon: lightbulb
- Label: "Ideas"
- Link: `/admin/ideas`

Also add an "Ideas" link to "Capture Idea" as a quick action.

---

## Step 4: Create `/idea-capture` skill

**File:** `.claude/skills/idea-capture/SKILL.md`

A skill that makes it trivial to capture an idea from any Claude Code session:

**Invocation:** `/idea-capture [idea description]`

**Behavior:**
1. Parse the input for: title, description, optional tags
2. If input is brief (< 20 words), use it as title and prompt for optional elaboration
3. Create a `log_entries` record via MCP:
   - `type: 'idea'`
   - `idea_stage: 'captured'`
   - `published: false`
   - `is_private: true`
   - `entry_date: today`
   - `slug: auto-generated from title`
4. Optionally ask: "Link to a studio project?" — if yes, query studio_projects and create entity_link
5. Return confirmation with link to `/admin/ideas`

**Key design:** The skill should be *fast*. Capture first, elaborate later. The default path is: type idea → it's saved → done. Linking and elaboration are optional follow-ups.

---

## Step 5: Wire graduation links into existing views

### Studio projects list (`/admin/studio/page.tsx`)
- Add a column/indicator showing if the project originated from an idea (has `evolved_from` link from a log_entry)
- Show the source idea title as a link

### Ventures list (`/admin/ventures/page.tsx`)
- Same: show lineage indicator if venture evolved from a studio project or idea

### Log entry form (`components/admin/log-entry-form.tsx`)
- When `type='idea'`, show the `idea_stage` dropdown
- Show a "Graduate" button in the form header when viewing an existing idea

---

## File Changes Summary

| File | Action |
|------|--------|
| `supabase/migrations/YYYYMMDD_add_idea_stage.sql` | **Create** — new column + backfill |
| `lib/types/database.ts` | **Edit** — add IdeaStage type, update LogEntry |
| `app/(private)/admin/ideas/page.tsx` | **Create** — ideas list page |
| `components/admin/views/ideas-list-view.tsx` | **Create** — ideas list view component |
| `components/admin/graduation-modal.tsx` | **Create** — graduation flow modal |
| `app/(private)/admin/page.tsx` | **Edit** — add Ideas quick action |
| `.claude/skills/idea-capture/SKILL.md` | **Create** — idea capture skill |
| `components/admin/log-entry-form.tsx` | **Edit** — add idea_stage field when type='idea' |

---

## What this does NOT include (deliberate scope limits)

- **No public-facing ideas page.** Ideas are private/admin-only for now.
- **No automated graduation triggers.** Graduation is always a deliberate human action.
- **No new database table.** Ideas stay in log_entries.
- **No changes to entity_links schema.** Existing `evolved_from` link type and infrastructure are sufficient.
- **No AI-assisted idea scoring/ranking.** Keep it manual and intentional.
