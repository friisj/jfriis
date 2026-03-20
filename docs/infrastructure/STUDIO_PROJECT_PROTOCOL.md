# Studio Project Protocol

> Procedural guide for creating and managing studio projects using the database-first workflow.

---

## Workflow Overview

```
1. CAPTURE    →  Create studio_project record (status: draft)
2. SHAPE      →  Fill PRD fields, add hypotheses & experiments
3. WORK       →  Status: active, implement experiments, mount prototypes
4. COMPLETE   →  Status: completed/archived
```

**Environments:**
- **Admin UI / MCP:** Capture ideas, shape PRD fields, add hypotheses/experiments
- **Dynamic Pages:** View projects and experiments at `/studio/[project]` and `/studio/[project]/[experiment]`
- **Claude Code:** Implement experiments, mount prototype components

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

| Type | Purpose | What's Rendered |
|------|---------|-----------------|
| `experiment` | Standard hypothesis test | Experiment page with details |
| `prototype` | Working code demo | Experiment page with mountable component |
| `discovery_interviews` | User research | Experiment page (interview tools TBD) |
| `landing_page` | Market validation | Experiment page (metrics tracking TBD) |

---

## 3. Work: Implement & Track

### View Projects and Experiments

Projects and experiments are automatically available via dynamic routes:

- **Project page**: `/studio/{project-slug}` - displays PRD, hypotheses, and experiments
- **Experiment page**: `/studio/{project-slug}/{experiment-slug}` - displays experiment details, hypothesis, and prototype

**No scaffolding required** - as soon as you create records in the database, the pages render dynamically.

### Mount Spike Components

Experiments display linked spike assets on their page. Each spike is a mountable React component rendered fullscreen at `/studio/{project}/{experiment}/{spike}`. Wiring a spike requires four records:

> **Shortcut:** Run `/scaffold-experiment-prototype {project-slug} {spike-name}` to create all four in one step.

**Manual procedure (if not using the skill):**

1. **Create the component file**:
   ```tsx
   // components/studio/prototypes/{project-slug}/{spike-slug}.tsx
   'use client'

   export default function MySpike() {
     // Your spike implementation
   }
   ```

2. **Register in the prototype renderer** (`components/studio/prototype-renderer.tsx`):
   ```tsx
   '{project-slug}/{spike-slug}': dynamic(() => import('@/components/studio/prototypes/{project-slug}/{spike-slug}'), { ssr: false }),
   ```

3. **Create a spike asset record** in `studio_asset_spikes`:
   ```bash
   scripts/sb create studio_asset_spikes '{"project_id":"<project-id>","slug":"<spike-slug>","name":"<Spike Name>","description":"...","component_key":"<project-slug>/<spike-slug>"}'
   ```

4. **Create an entity link** connecting the experiment to the spike:
   ```bash
   scripts/sb create entity_links '{"source_type":"experiment","source_id":"<experiment-id>","target_type":"asset_spike","target_id":"<spike-id>"}'
   ```

**How it works at runtime:**
- Experiment page (`[experiment]/page.tsx`) queries `entity_links` for `target_type=asset_spike` and displays linked spike cards
- Clicking a spike navigates to `[asset]/page.tsx`, which looks up `studio_asset_spikes.component_key`
- `PrototypeRenderer` maps `component_key` → dynamic import → fullscreen render

**Multiple spikes per hypothesis:** A single hypothesis can have multiple experiments, and each experiment can have multiple linked spikes. This supports iterative exploration with alternate approaches side-by-side.

**Do not create standalone pages** outside the studio route system (e.g., at `/apps/{slug}/spikes/`). All spike prototypes must be wired through the asset system so they appear on experiment pages and are discoverable via the studio UI.

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

## 4. Complete: Archive or Ship

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
| `studio_asset_spikes` | Spike assets with `component_key` for rendering via `PrototypeRenderer` |
| `studio_asset_prototypes` | Prototype app assets with `app_path` for external linking |
| `entity_links` | Universal relationship table — connects experiments to assets, projects to ventures, etc. |

---

## Status Reference

### Project Status

| Status | Meaning |
|--------|---------|
| `draft` | Idea captured, not yet actively worked |
| `active` | Work in progress, experiments being implemented |
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

### View Projects, Experiments, and Spikes
```
/studio/{project-slug}                                      # Project homepage
/studio/{project-slug}/{experiment-slug}                    # Experiment page (lists linked spike assets)
/studio/{project-slug}/{experiment-slug}/{spike-slug}       # Spike asset (fullscreen component render)
```

### Dynamic Routes
```
app/(private)/studio/
├── page.tsx                               # Studio index
├── [project]/
│   ├── page.tsx                           # Project view (queries DB)
│   └── [experiment]/
│       ├── page.tsx                       # Experiment view (queries entity_links for assets)
│       └── [asset]/
│           └── page.tsx                   # Asset view (renders via PrototypeRenderer)
```

### Spike Components
```
components/studio/
├── prototype-renderer.tsx                 # Registry: component_key → dynamic import
└── prototypes/
    └── {project-slug}/
        └── {spike-slug}.tsx               # Spike component (default export, 'use client')
```

### Wiring Chain (all four are required for a spike to render)
```
studio_experiments  →  entity_links  →  studio_asset_spikes  →  prototype-renderer.tsx
   (experiment)     source→target      (component_key)         (dynamic import registry)
```

### Create Records via scripts/sb
```bash
# Create project
scripts/sb create studio_projects '{"slug":"my-project","name":"My Project","status":"draft"}'

# Create hypothesis
scripts/sb create studio_hypotheses '{"project_id":"...","statement":"...","sequence":1}'

# Create experiment
scripts/sb create studio_experiments '{"project_id":"...","slug":"exp-1","name":"...","type":"prototype"}'

# Create spike asset
scripts/sb create studio_asset_spikes '{"project_id":"...","slug":"exp-1","name":"...","component_key":"my-project/exp-1"}'

# Link experiment → spike
scripts/sb create entity_links '{"source_type":"experiment","source_id":"...","target_type":"asset_spike","target_id":"..."}'
```

### Skills
```
/scaffold-experiment-prototype {project-slug} {spike-name}   # Creates all 4 records + component file
/studio-project-setup {project-name}                         # Creates project + hypothesis + docs scaffold
```

---

*Protocol version: 6.0 | Last updated: 2026-03-20*
