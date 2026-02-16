# Studio Project Protocol

> Procedural guide for creating and managing studio projects using the database-first workflow.

---

## Workflow Overview

```
1. CAPTURE    →  Create studio_project record (status: draft)
2. SHAPE      →  Fill PRD fields, add hypotheses & experiments (manually or via survey)
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

### Survey System: Structured Project Authoring

> **Status**: Critical infrastructure, nascent implementation. Core tables exist; UI and agent integration in development.

Surveys are the **primary instrument** for transforming unstructured ideas into validated project artifacts. While optional today, they are designed to become the backbone of project initialization and continuous assessment.

#### Current Capabilities

- **Structured idea capture**: Guided questions help articulate project concepts clearly
- **Automated artifact generation**: AI creates hypotheses, experiments, customer profiles, and assumptions from survey responses
- **Acceptance workflow**: Operator reviews and accepts/rejects generated artifacts

**Database schema:**
| Table | Purpose |
|-------|---------|
| `studio_surveys` | Survey definitions linked to projects |
| `studio_survey_responses` | Operator answers to questions |
| `studio_survey_artifacts` | Generated artifacts with acceptance tracking |

#### Vision: Agent-Driven Project Authoring

The survey system is designed to evolve into a full agent orchestration platform:

**Phase 1 (Current)**: Basic surveys with AI artifact generation
- Survey questions defined per project
- AI generates hypotheses/experiments from responses
- Manual acceptance workflow

**Phase 2 (Planned)**: Agent dispatch
- Surveys trigger specialized agents (hypothesis generator, experiment designer, assumption extractor)
- Agents operate on survey context + project state
- Parallel artifact generation with conflict resolution

**Phase 3 (Vision)**: Recursive iteration
- Agents can spawn follow-up surveys based on findings
- Operator feedback loops drive refinement
- Event-driven assessments (e.g., "hypothesis invalidated" triggers pivot survey)

**Phase 4 (Vision)**: Autonomous project evolution
- Agents monitor project health metrics
- Proactive surveys surface when projects stall
- Cross-project learning informs new survey templates

#### Why Surveys Matter

1. **Reduces cognitive load**: Structured questions are easier than blank-page authoring
2. **Captures reasoning**: Survey responses document the "why" behind artifacts
3. **Enables automation**: Consistent input format allows reliable AI processing
4. **Supports iteration**: Generated artifacts can be regenerated with new context
5. **Creates provenance**: Survey → Response → Artifact chain is auditable

---

## 3. Work: Implement & Track

### View Projects and Experiments

Projects and experiments are automatically available via dynamic routes:

- **Project page**: `/studio/{project-slug}` - displays PRD, hypotheses, and experiments
- **Experiment page**: `/studio/{project-slug}/{experiment-slug}` - displays experiment details, hypothesis, and prototype

**No scaffolding required** - as soon as you create records in the database, the pages render dynamically.

### Mount Prototype Components

For `prototype` type experiments, create a React component and register it:

1. **Create the component**:
   ```tsx
   // components/studio/prototypes/{project-slug}/{experiment-slug}.tsx
   'use client'

   export default function MyPrototype() {
     // Your prototype implementation
   }
   ```

2. **Register in the prototype registry**:
   ```tsx
   // app/(private)/studio/[project]/[experiment]/page.tsx
   const prototypeRegistry: Record<string, React.ComponentType<any>> = {
     'my-project/my-experiment': dynamic(() => import('@/components/studio/prototypes/my-project/my-experiment')),
   }
   ```

The experiment page will automatically mount your component when viewing `/studio/my-project/my-experiment`.

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
| `studio_surveys` | Survey definitions for project authoring |
| `studio_survey_responses` | Operator answers to survey questions |
| `studio_survey_artifacts` | Generated artifacts (hypotheses, experiments, profiles, assumptions) |
| `entity_links` | Universal relationship table (projects can link to ventures, canvases, journeys, blueprints, story maps, etc.) |

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

### View Projects and Experiments
```
/studio/{project-slug}                     # Project homepage
/studio/{project-slug}/{experiment-slug}   # Experiment page
```

### Dynamic Routes
```
app/(private)/studio/
├── page.tsx                               # Studio index
├── [project]/
│   ├── page.tsx                           # Project view (queries DB)
│   └── [experiment]/
│       └── page.tsx                       # Experiment view (queries DB)
```

### Prototype Components
```
components/studio/prototypes/
└── {project-slug}/
    └── {experiment-slug}.tsx              # Register in experiment page
```

### Create Records via MCP
```typescript
// Create project
db_create('studio_projects', { slug: 'my-project', name: 'My Project', status: 'draft' })

// Create hypothesis
db_create('studio_hypotheses', { project_id: '...', statement: '...', sequence: 1 })

// Create experiment
db_create('studio_experiments', { project_id: '...', slug: 'exp-1', name: '...', type: 'prototype' })

// Link to other entities via entity_links
db_create('entity_links', {
  source_table: 'studio_projects', source_id: '...',
  target_table: 'ventures', target_id: '...'
})
```

---

*Protocol version: 5.0 | Last updated: 2026-01-13*
