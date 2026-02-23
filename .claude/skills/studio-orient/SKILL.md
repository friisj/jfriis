---
name: studio-orient
description: Orient on studio projects and prototypes. Portfolio snapshot (no args), or deep-dive on a specific project with filesystem map, DB state, entity links, and log entries. Use when starting a session, resuming work, or diving into a specific project.
allowed-tools: Read, Bash, Glob, Grep, Task
argument-hint: [optional: slug, status filter, or "deep <slug>"]
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

```
mcp__jfriis__db_query({
  table: "studio_projects",
  filters: <see below>,
  order_by: "updated_at",
  order_direction: "desc"
})
```

**Filter logic:**
- No argument → `{ "status": "neq:archived" }` (all except archived)
- Status filter (e.g., "active") → `{ "status": "active" }`
- "archived" → `{ "status": "archived" }`

Save the returned projects array.

### Step 2: Query Validation Chain Counts

For each project returned, query hypothesis and experiment counts in parallel:

```
mcp__jfriis__db_query({
  table: "studio_hypotheses",
  filters: { "project_id": "<project-id>" }
})

mcp__jfriis__db_query({
  table: "studio_experiments",
  filters: { "project_id": "<project-id>" }
})
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

When a specific slug is provided, build full project context. Run queries and filesystem scans in parallel where possible.

### Step 1: Query All Project Data (parallel)

Run ALL of these in parallel:

**1a. Project record:**
```
mcp__jfriis__db_query({
  table: "studio_projects",
  filter: { "slug": "<slug>" }
})
```

**1b. Hypotheses:**
```
mcp__jfriis__db_query({
  table: "studio_hypotheses",
  filter: { "project_id": "<project-id>" },
  order_by: { "column": "sequence", "ascending": true }
})
```
Note: You need the project ID from 1a first. If running truly parallel, query hypotheses by project slug if possible, or run 1a first then 1b-1f in parallel.

**1c. Experiments:**
```
mcp__jfriis__db_query({
  table: "studio_experiments",
  filter: { "project_id": "<project-id>" }
})
```

**1d. Entity links (outbound):**
```
mcp__jfriis__db_query({
  table: "entity_links",
  filter: { "source_type": "studio_project", "source_id": "<project-id>" }
})
```

**1e. Entity links (inbound):**
```
mcp__jfriis__db_query({
  table: "entity_links",
  filter: { "target_type": "studio_project", "target_id": "<project-id>" }
})
```

**1f. Linked log entries:**
```
mcp__jfriis__db_query({
  table: "log_entries",
  filter: { "studio_project_id": "<project-id>" },
  select: "id, title, slug, entry_date, published, type",
  order_by: { "column": "entry_date", "ascending": false },
  limit: 10
})
```

### Step 2: Scan Filesystem (parallel with Step 1 where possible)

Use Glob to check for files in each location. Run these in parallel:

**2a. App prototype:**
```
Glob: app/(private)/apps/<slug>/**/*
```

**2b. Components:**
```
Glob: components/studio/<slug>/**/*
```

**2c. Prototype experiment components:**
```
Glob: components/studio/prototypes/<slug>/**/*
```

**2d. Library code:**
```
Glob: lib/studio/<slug>/**/*
```

**2e. Documentation:**
```
Glob: docs/studio/<slug>/**/*
```

### Step 3: Format Deep-Dive Output

Present the complete context in this structure:

```
## <name> (<slug>)

Status: <status> | Temperature: <temp>
Created: <created_at> | Updated: <updated_at>

### Focus
<current_focus or "none set">

### PRD
<Include problem_statement, success_criteria, scope_out if populated. Skip section if all empty.>

---

### Filesystem

<For each location that has files, show the tree. Skip empty locations.>

**App** — `app/(private)/apps/<slug>/`
<file list or "none">

**Components** — `components/studio/<slug>/`
<file list or "none">

**Prototypes** — `components/studio/prototypes/<slug>/`
<file list or "none">

**Library** — `lib/studio/<slug>/`
<file list or "none">

**Docs** — `docs/studio/<slug>/`
<file list or "none">

**DB Tables**: <slug>_* (if app prototype exists, note the table prefix convention)

---

### Validation Chain

**Hypotheses** (<N>)
<For each hypothesis:>
  <seq>. <statement> [<status>]
     Criteria: <validation_criteria>

**Experiments** (<N>)
<For each experiment:>
  - <name> (<slug>) [<status>] — type: <type>
    <If completed: outcome: <outcome>>
    <If has learnings: <first ~80 chars of learnings>>

---

### Entity Links

<Group by target type. Skip section if no links.>

**Linked to:**
  - <target_table>: <target_id> (<link_type>)
  ...

**Linked from:**
  - <source_table>: <source_id> (<link_type>)
  ...

<If entity links reference known tables (ventures, canvases, journeys, etc.), resolve the name/title via a quick db_get. If too many links, just show IDs.>

---

### Log Entries (<N>)

<For each log entry:>
  - <entry_date> — <title> [<type>] <"(published)" if published>

---

### Quick Links

- Admin: /admin/studio/<id>/edit
- Web: /studio/<slug>
```

---

## Notes

- **Speed over completeness.** If MCP is slow or a sub-query fails, proceed with what you have and note the gap.
- **No strategic recommendations.** This skill is orientation only — what exists and what state it's in. For prioritization and strategy, the user can follow up or use the studio-mgr agent.
- **Accurate field names matter.** Use exact field names: `status`, `temperature`, `current_focus`, `scaffolded_at`, `slug`, `path`, `updated_at`.
- **If MCP is unavailable**, fall back to reading `docs/studio/` directory structure and listing project folders as a degraded snapshot. Note the fallback clearly.
- **Parallel is key.** The deep-dive mode involves many queries. Maximize parallel tool calls to minimize latency. Get the project ID first, then run everything else in parallel.
- **Entity link entity types** use singular form without table prefix: `studio_project`, `venture`, `business_model_canvas`, `log_entry`, etc. See `lib/entity-links-validation.ts` for the full list.
- **DB table prefix convention**: Migrated app prototypes use `<slug>_` prefixed tables (e.g., `ludo_themes`, `verbivore_entries`). Mention this in the output so the user knows what tables to query.
