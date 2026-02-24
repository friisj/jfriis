---
name: studio-orient
description: Orient on studio projects and prototypes. Portfolio snapshot (no args), or deep-dive on a specific project with filesystem map, DB state, entity links, and log entries. Use when starting a session, resuming work, or diving into a specific project.
allowed-tools: Read, Bash, Glob, Grep, Task
argument-hint: [optional: slug or status filter]
---

# Studio Orientation

You are giving a fast, accurate snapshot of the studio project portfolio — or a deep contextual briefing on a specific project. The goal is zero-friction orientation so you can start working immediately without burning tokens on discovery.

## Input

The user has provided: `$ARGUMENTS`

This may be:
- Empty → show all non-archived projects (portfolio summary)
- A status filter: `active`, `draft`, `paused`, `completed`, `archived`
- A project slug → deep-dive into that project (full context)

---

## Procedure

### Determine Mode

- **Portfolio mode**: no argument, or a status filter keyword
- **Deep-dive mode**: a project slug (any argument that isn't a status keyword)

---

## Portfolio Mode

### Step 1: Query Studio Projects

```bash
# No argument (all except archived):
scripts/sb query studio_projects "status=neq.archived&order=updated_at.desc"

# Status filter (e.g., "active"):
scripts/sb query studio_projects "status=eq.active&order=updated_at.desc"

# Archived:
scripts/sb query studio_projects "status=eq.archived&order=updated_at.desc"
```

Save the returned projects array.

### Step 2: Query Validation Chain Counts

For each project returned, query hypothesis and experiment counts in parallel:

```bash
scripts/sb query studio_hypotheses "project_id=eq.<project-id>&select=id"
scripts/sb query studio_experiments "project_id=eq.<project-id>&select=id"
```

Record counts per project: `hypotheses_count`, `experiments_count`.

If more than 5 projects are returned, skip per-project counts to keep response fast — just note "run `/studio-orient <slug>` to drill in."

### Step 3: Format Output

Print a header:

```
## Studio Portfolio — <date>
<N> projects (<X> active, <Y> draft, <Z> paused)
```

Then a table, sorted: hot first, then warm, then cold; within each temperature group, active before draft before paused:

```
| Project | Status | Temp | Current Focus | Hyp | Exp |
|---------|--------|------|---------------|-----|-----|
| name (slug) | active | hot | current_focus text | 3 | 7 |
| name (slug) | draft  | warm | current_focus text | 1 | 0 |
| name (slug) | paused | cold | — | 2 | 4 |
```

Truncate `current_focus` to ~60 chars if long. Use `—` for null values.

After the table, print:
```
Drill into any project: /studio-orient <slug>
```

---

## Deep-Dive Mode

When a specific slug is provided, build full project context. This output is for **your own orientation** — optimize for what helps you start working immediately.

### Step 1: Get Project ID

```bash
scripts/sb query studio_projects "slug=eq.<slug>"
```

Save the project record. You need the `id` for all subsequent queries.

### Step 2: Query Everything Else (all in parallel)

Once you have the project ID, run ALL of these in a single parallel batch:

**DB queries (via Bash tool):**
```bash
# Hypotheses
scripts/sb query studio_hypotheses "project_id=eq.<id>&order=sequence.asc"

# Experiments
scripts/sb query studio_experiments "project_id=eq.<id>"

# Entity links (outbound)
scripts/sb query entity_links "source_type=eq.studio_project&source_id=eq.<id>"

# Entity links (inbound)
scripts/sb query entity_links "target_type=eq.studio_project&target_id=eq.<id>"

# Log entries
scripts/sb query log_entries "studio_project_id=eq.<id>&select=id,title,slug,entry_date,published,type&order=entry_date.desc&limit=10"

# DB tables (to find <slug>_* tables)
scripts/sb tables
```

**Filesystem scans (Glob, also in same parallel batch):**
```
app/(private)/apps/<slug>/**/*
components/studio/<slug>/**/*
components/studio/prototypes/<slug>/**/*
lib/studio/<slug>/**/*
docs/studio/<slug>/**/*
```

### Step 3: Format Deep-Dive Output

The output structure is optimized for your working context. **Summarize, don't list.**

```
## <name> (<slug>)

<description — this is your tech stack summary, show it prominently>

Status: <status> | Temp: <temp> | Updated: <updated_at>
Focus: <current_focus or "none set">

### PRD
<problem_statement, success_criteria, scope_out — only show fields that are populated>
```

#### Filesystem — show **directory structure with file counts**, not individual files

```
### Codebase

app/(private)/apps/<slug>/
  page.tsx, <route>/page.tsx, ...        (list page routes only, not layout files)

components/studio/<slug>/
  Board/ (3)  Game/ (1)  HUD/ (2)  UI/ (17)  Audio/ (1)  ThemeBuilder/ (8)
  Tests: Board/__tests__/ (1)

lib/studio/<slug>/
  ai/ (8)  audio/ (14)  game/ (12)  three/ (4)  audit/ (7)  theme-builder/ (3)
  Tests: ai/__tests__/ (4)  game/__tests__/ (4)  three/__tests__/ (3)

components/studio/prototypes/<slug>/
  <list or "none">

docs/studio/<slug>/
  <list or "none — consider creating README.md">

DB tables: ludo_themes, ludo_sound_collections, ludo_sound_assignments
  (Filter tables output for tables starting with <slug>_)
```

**Key rules for filesystem section:**
- Show **subdirectory names with file counts in parens**, not individual files
- Call out **test directories separately** so you know what's covered
- For app routes, list just the **page.tsx routes** (these are the entry points)
- If docs/ is empty, note it as a gap
- For DB tables, show the **actual table names** from the tables output, not just the convention

#### Validation Chain — group experiments under their hypothesis

```
### Validation Chain

H1. <hypothesis statement> [<status>]
    Criteria: <validation_criteria>
    Experiments:
      - <name> (<slug>) [<status>] type:<type>
      - <name> (<slug>) [<status>] type:<type>

H2. <hypothesis statement> [<status>]
    Criteria: <validation_criteria>
    Experiments:
      - <name> (<slug>) [<status>] type:<type>

Unlinked experiments (no hypothesis):
  - <name> (<slug>) [<status>] type:<type>
```

**Key rules for validation chain:**
- Group experiments under the hypothesis they test (match via `hypothesis_id`)
- Show experiment learnings (truncated to ~80 chars) if present
- Show outcome for completed experiments
- List any experiments with no `hypothesis_id` separately at the end

#### Entity Links and Log Entries

```
### Entity Links
<Group by target/source type. Resolve names via db_get for readability.>

Linked to:
  - venture: "Venture Name" (spin_off)
  - log_entry: "Entry Title" (evolved_from)

Linked from:
  - log_entry: "Entry Title" (documents)

### Recent Log Entries (<N>)
  - <entry_date> — <title> [<type>] <"(published)" if published>

### Quick Links
- Admin: /admin/studio/<id>/edit
- Web: /studio/<slug>
```

---

## Notes

- **This output is for your orientation, not a report for the user.** Optimize for what helps you start working: directory structure, tech stack, test locations, table names.
- **Speed over completeness.** If a query fails, proceed with what you have and note the gap.
- **No strategic recommendations.** This skill is orientation only — what exists and what state it's in. For prioritization and strategy, the user can follow up or use the studio-mgr agent.
- **Summarize filesystem, don't dump it.** Directory names with file counts. Individual files only for app routes (entry points) and docs. Never list 90 files.
- **Parallel is key.** Get the project ID first, then run everything else (all DB queries + all Globs) in a single parallel batch.
- **Entity link column names** are `source_type`/`target_type` and `source_id`/`target_id`. Entity types use singular form: `studio_project`, `venture`, `business_model_canvas`, `log_entry`, etc.
- **DB table discovery**: Use `scripts/sb tables` and filter for tables starting with `<slug>_`. Show actual table names, not just the convention.
- **If scripts/sb is unavailable**, fall back to reading `docs/studio/` directory structure and listing project folders as a degraded snapshot. Note the fallback clearly.
