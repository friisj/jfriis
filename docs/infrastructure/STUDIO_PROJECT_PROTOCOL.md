# Studio Project Protocol

> Procedural guide for creating and managing studio projects using the database-first workflow.

---

## Workflow Overview

```
1. CAPTURE    →  Create studio_project record (status: draft)
2. SHAPE      →  Fill PRD fields, add hypotheses & experiments
3. SCAFFOLD   →  Run scaffold script to generate components & routes
4. WORK       →  Status: active, implement experiments
5. COMPLETE   →  Status: completed/archived
```

**Environments:**
- **Admin UI / MCP:** Capture ideas, shape PRD fields, add hypotheses/experiments
- **Claude Code:** Run scaffold script, implement code

---

## 1. Capture: Create Draft Project

### Via Admin UI

Navigate to `/admin/studio-projects/new` and create a project with:

**Required fields:**
- `slug` - URL-friendly identifier (kebab-case)
- `name` - Display name
- `status` - Start with `draft`

**Optional at this stage:**
- `description` - Brief overview
- `temperature` - hot, warm, cold
- `current_focus` - What's top of mind

### Via MCP

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

---

## 2. Shape: Define PRD & Structure

### Fill PRD Fields

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

### Add Experiments

Create experiments that will test hypotheses:

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
    "type": "prototype",
    "status": "planned"
  }
}
```

**Experiment Types:**

| Type | Purpose | What Gets Scaffolded |
|------|---------|---------------------|
| `experiment` | Standard hypothesis test | Basic experiment page |
| `prototype` | Working code demo | Experiment page + prototype component in `src/prototypes/` |
| `discovery_interviews` | User research | Experiment page with interview tools (future) |
| `landing_page` | Market validation | Experiment page with metrics tracking (future) |

---

## 3. Scaffold: Generate Project Structure

### When to Scaffold

Scaffold when:
- PRD fields are reasonably complete
- Hypotheses and experiments are defined in DB
- Ready to write code
- Status moving from `draft` → `active`

### Run the Scaffold Script

```bash
npm run scaffold:studio <project-slug>
```

**What it creates:**

```
components/studio/{slug}/
├── page.tsx                      # Homepage component
├── experiments/
│   └── {exp-slug}.tsx           # Per-experiment page components
└── src/
    └── prototypes/
        └── {exp-slug}.tsx       # Prototype components (for prototype type only)

app/(private)/studio/{slug}/
├── page.tsx                      # Route to homepage
└── [experiment]/
    └── page.tsx                  # Dynamic experiment route
```

### The Script Also:
- Updates `scaffolded_at` timestamp in DB
- Sets `path` to component directory
- Outputs next steps including Linear project creation suggestion

### Claude Code Hook

When running the scaffold command via Claude Code, a hook fires that suggests:
1. Creating a Linear project for task tracking
2. Enriching generated files with project-specific content
3. Implementing prototype components

---

## 4. Work: Implement & Track

### Implement Prototypes

For `prototype` type experiments, implement the component:

```tsx
// components/studio/{slug}/src/prototypes/{exp-slug}.tsx
export default function MyPrototype() {
  // Your prototype implementation
}
```

### Create Linear Project

Use Linear MCP to create a project for task tracking:

```
mcp__linear__create_project({
  name: "Project Name",
  team: "Oji",
  description: "...",
  state: "started"
})
```

Reference: See `.claude/rules/linear-tracking.md` for Linear workflow.

### Record Experiment Outcomes

After completing an experiment:

```json
{
  "tool": "db_update",
  "table": "studio_experiments",
  "id": "{experiment-id}",
  "data": {
    "status": "completed",
    "outcome": "success",
    "learnings": "Key findings from the experiment..."
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

### Experiment Types

| Type | Purpose |
|------|---------|
| `experiment` | Standard hypothesis test |
| `prototype` | Working code demonstration |
| `discovery_interviews` | User research and interviews |
| `landing_page` | Market validation via landing page |

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

## Quick Reference

### Scaffold a project
```bash
npm run scaffold:studio <slug>
```

### View generated pages
```
/studio/{slug}              # Project homepage
/studio/{slug}/{exp-slug}   # Experiment page
```

### File locations
```
components/studio/{slug}/page.tsx                    # Homepage
components/studio/{slug}/experiments/{exp}.tsx       # Experiment pages
components/studio/{slug}/src/prototypes/{exp}.tsx    # Prototype components
app/(private)/studio/{slug}/page.tsx                 # Homepage route
app/(private)/studio/{slug}/[experiment]/page.tsx    # Dynamic experiment route
```

---

*Protocol version: 3.0 | Last updated: 2026-01-02*
