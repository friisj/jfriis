---
name: studio-orient
description: Orient on the current state of all studio projects. Shows portfolio snapshot with status, temperature, current focus, and validation chain counts. Use when starting a session or resuming work.
allowed-tools: Read, Bash, Glob, Grep, Task
argument-hint: [optional: slug or status filter]
---

# Studio Orientation

You are giving a fast, accurate snapshot of the studio project portfolio. The goal is zero-friction orientation — what exists, what's active, what's hot, and where each project stands in the validation chain.

## Input

The user has provided: `$ARGUMENTS`

This may be:
- Empty → show all non-archived projects
- A status filter: `active`, `draft`, `paused`, `completed`, `archived`
- A project slug → drill into that single project

---

## Procedure

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
- Slug argument → `{ "slug": "<slug>" }` (single project drill-down)
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

#### Portfolio Summary (multiple projects)

Print a header:

```
## Studio Portfolio — <date>
<N> projects (<X> active, <Y> draft, <Z> paused)
```

Then a table, sorted: hot first, then warm, then cold; within each temperature group, active before draft before paused:

```
| Project | Status | Temp | Current Focus | Hyp | Exp |
|---------|--------|------|---------------|-----|-----|
| name (slug) | active | 🔥 hot | current_focus text | 3 | 7 |
| name (slug) | draft  | 🌡 warm | current_focus text | 1 | 0 |
| name (slug) | paused | ❄️ cold | — | 2 | 4 |
```

Temperature icons:
- `hot` → 🔥
- `warm` → 🌡
- `cold` → ❄️
- null/unknown → `—`

Truncate `current_focus` to ~60 chars if long. Use `—` for null values.

After the table, print quick links:
```
Admin: /admin/studio
```

#### Single Project Drill-Down (slug argument or single result)

Print full project detail:

```
## <name>

Status: <status> | Temperature: <temp> | Slug: <slug>
Path: <path or "not scaffolded">
Scaffolded: <scaffolded_at or "no">
Created: <created_at>

**Current Focus**
<current_focus or "none set">

**Validation Chain**
- Hypotheses: <N>
- Experiments: <N>

**Admin Links**
- Project: /admin/studio/<id>/edit
- Hypotheses: /admin/studio/<id>/hypotheses
```

Then query and list hypotheses with their status:

```
mcp__jfriis__db_query({
  table: "studio_hypotheses",
  filters: { "project_id": "<id>" }
})
```

Print each hypothesis as:
```
  • <statement> [<status>]
```

---

## Notes

- **Speed over completeness.** If MCP is slow or a sub-query fails, proceed with what you have and note the gap.
- **No strategic recommendations.** This skill is orientation only — what exists and what state it's in. For prioritization and strategy, the user can follow up or use the studio-mgr agent.
- **Accurate field names matter.** Use exact field names: `status`, `temperature`, `current_focus`, `scaffolded_at`, `slug`, `path`, `updated_at`.
- **If MCP is unavailable**, fall back to reading `docs/studio/` directory structure and listing project folders as a degraded snapshot. Note the fallback clearly.
