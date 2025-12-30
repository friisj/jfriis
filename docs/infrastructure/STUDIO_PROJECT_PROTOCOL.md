# Studio Project Protocol

> Procedural guide for creating and managing studio projects using the database-first workflow.

---

## Workflow Overview

```
1. CAPTURE    →  Create studio_project record (status: draft)
2. SHAPE      →  Fill PRD fields via MCP conversations
3. SCAFFOLD   →  Create directories, files, routes in Claude Code
4. WORK       →  Status: active, add hypotheses & experiments
5. COMPLETE   →  Status: completed/archived
```

**Environments:**
- **MCP (anywhere):** Capture ideas, shape PRD fields conversationally
- **Claude Code:** Scaffold when ready to work, manage code

---

## 1. Capture: Create Draft Project

### Via MCP

Use `db_create` to add a new studio project:

```json
{
  "tool": "db_create",
  "table": "studio_projects",
  "data": {
    "slug": "my-project",
    "name": "My Project",
    "description": "Brief description of the idea",
    "status": "draft",
    "temperature": "warm"
  }
}
```

**Required fields:**
- `slug` - URL-friendly identifier (kebab-case)
- `name` - Display name
- `status` - Always start with `draft`

**Optional at this stage:**
- `description` - Brief overview
- `temperature` - hot, warm, cold
- `current_focus` - What's top of mind

---

## 2. Shape: Define PRD Fields

### Via MCP conversations

Use `db_update` to fill in PRD fields as you refine the idea:

```json
{
  "tool": "db_update",
  "table": "studio_projects",
  "id": "{project-id}",
  "data": {
    "problem_statement": "The problem this project solves...",
    "hypothesis": "If we build X, then Y will happen...",
    "success_criteria": "We'll know it works when...",
    "scope_out": "Explicitly not building: ..."
  }
}
```

**PRD fields:**

| Field | Purpose | Example |
|-------|---------|---------|
| `problem_statement` | What problem exists | "Design tokens are hard to manage" |
| `hypothesis` | What we believe | "If we build an interactive configurator..." |
| `success_criteria` | How we'll know success | "Theme export works, site uses it" |
| `scope_out` | What's NOT in scope | "Figma sync, marketplace features" |

### Add Hypotheses

Break the project into testable hypotheses:

```json
{
  "tool": "db_create",
  "table": "studio_hypotheses",
  "data": {
    "project_id": "{project-id}",
    "statement": "If we implement OKLCH color space, we can derive accessible palettes automatically",
    "validation_criteria": "Generated palettes pass WCAG contrast checks",
    "sequence": 1,
    "status": "proposed"
  }
}
```

---

## 3. Scaffold: Create Project Structure

### When to Scaffold

Scaffold when:
- PRD fields are reasonably complete
- Ready to write code
- Status moving from `draft` → `active`

### In Claude Code

Run the scaffolding process:

1. **Create directory structure:**

```
components/studio/{slug}/
├── README.md                 # Generated from DB PRD fields
├── roadmap.md               # Generated from hypotheses
├── experiments/             # For experiment code
└── src/                     # Production code
```

2. **Create app routes (if needed):**

```
app/(private)/studio/{slug}/
├── page.tsx                 # Uses ProjectCover template
└── [experiment]/
    └── page.tsx             # Uses ExperimentPage template
```

3. **Update project record:**

```json
{
  "tool": "db_update",
  "table": "studio_projects",
  "id": "{project-id}",
  "data": {
    "status": "active",
    "path": "components/studio/{slug}/",
    "scaffolded_at": "2025-01-01T00:00:00Z"
  }
}
```

### Directory README Template

Generate `README.md` from DB fields:

```markdown
# {name}

> {description}

**Status:** {status} | **Temperature:** {temperature}

## Problem

{problem_statement}

## Hypothesis

{hypothesis}

## Success Criteria

{success_criteria}

## Out of Scope

{scope_out}

---

*This README is generated from the studio_projects database record.*
```

---

## 4. Work: Experiments & Progress

### Create Experiments

Each experiment tests a hypothesis:

```json
{
  "tool": "db_create",
  "table": "studio_experiments",
  "data": {
    "project_id": "{project-id}",
    "hypothesis_id": "{hypothesis-id}",
    "slug": "oklch-palette-generator",
    "name": "OKLCH Palette Generator",
    "description": "Test if OKLCH can generate accessible palettes",
    "type": "spike",
    "status": "planned"
  }
}
```

**Experiment types:**
- `spike` - Time-boxed exploration (hours)
- `experiment` - Tests a hypothesis
- `prototype` - Working demo

**Status progression:**
```
planned → in_progress → completed/abandoned
```

### Record Outcomes

After completing an experiment:

```json
{
  "tool": "db_update",
  "table": "studio_experiments",
  "id": "{experiment-id}",
  "data": {
    "status": "completed",
    "outcome": "success",
    "learnings": "OKLCH perceptual uniformity makes contrast calculations reliable. L channel directly maps to luminance."
  }
}
```

### Update Hypothesis Status

```json
{
  "tool": "db_update",
  "table": "studio_hypotheses",
  "id": "{hypothesis-id}",
  "data": {
    "status": "validated"
  }
}
```

### Link Log Entries

For substantive notes, create log entries linked to the project/experiment:

```json
{
  "tool": "db_create",
  "table": "log_entries",
  "data": {
    "title": "OKLCH Color Space Learnings",
    "slug": "oklch-learnings",
    "content": "...",
    "entry_date": "2025-01-01",
    "studio_project_id": "{project-id}",
    "studio_experiment_id": "{experiment-id}",
    "published": false
  }
}
```

---

## 5. Complete: Archive or Ship

### Mark Complete

```json
{
  "tool": "db_update",
  "table": "studio_projects",
  "id": "{project-id}",
  "data": {
    "status": "completed",
    "current_focus": null
  }
}
```

### Archive

For abandoned projects:

```json
{
  "tool": "db_update",
  "table": "studio_projects",
  "id": "{project-id}",
  "data": {
    "status": "archived"
  }
}
```

---

## Database Tables

| Table | Purpose |
|-------|---------|
| `studio_projects` | Main project records with PRD fields |
| `studio_hypotheses` | Testable hypotheses per project |
| `studio_experiments` | Experiments that test hypotheses |
| `log_entries` | Substantive notes (linked via FK) |
| `specimens` | Visual artifacts (linked via FK) |

---

## Templates

### Markdown (for scaffolding)

| Template | Location | Use |
|----------|----------|-----|
| PRD | `docs/studio/templates/prd.md` | Project PRD document |
| Roadmap | `docs/studio/templates/roadmap.md` | Hypothesis roadmap |
| Experiment | `docs/studio/templates/experiment.md` | Experiment README |

### React (for pages)

| Template | Location | Use |
|----------|----------|-----|
| ProjectCover | `components/studio/_templates/project-cover.tsx` | Project home page |
| ExperimentPage | `components/studio/_templates/experiment-page.tsx` | Experiment detail page |

---

## Status Reference

### Project Status

| Status | Meaning |
|--------|---------|
| `draft` | Idea captured, not yet scaffolded |
| `active` | Scaffolded, work in progress |
| `paused` | On hold, may resume |
| `completed` | Done, achieved goals |
| `archived` | Abandoned or superseded |

### Temperature

| Temp | Meaning |
|------|---------|
| `hot` | Active focus, daily work |
| `warm` | Regular attention, weekly |
| `cold` | Background, occasional |

### Hypothesis Status

| Status | Meaning |
|--------|---------|
| `proposed` | Not yet tested |
| `testing` | Experiments in progress |
| `validated` | Proved true |
| `invalidated` | Proved false (still valuable!) |

### Experiment Status

| Status | Meaning |
|--------|---------|
| `planned` | Defined but not started |
| `in_progress` | Currently working |
| `completed` | Finished (check outcome) |
| `abandoned` | Stopped, not completing |

### Experiment Outcome

| Outcome | Meaning |
|---------|---------|
| `success` | Hypothesis supported |
| `failure` | Hypothesis not supported |
| `inconclusive` | Needs more data |

---

## Quick Commands

### List draft projects
```json
{"tool": "db_query", "table": "studio_projects", "filters": {"status": "draft"}}
```

### List active projects
```json
{"tool": "db_query", "table": "studio_projects", "filters": {"status": "active"}}
```

### Get project with hypotheses
```json
{"tool": "db_query", "table": "studio_hypotheses", "filters": {"project_id": "{id}"}}
```

### Get experiments for hypothesis
```json
{"tool": "db_query", "table": "studio_experiments", "filters": {"hypothesis_id": "{id}"}}
```

---

*Protocol version: 2.0 | Last updated: 2025-12-29*
