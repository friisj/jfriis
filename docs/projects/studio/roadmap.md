# Studio Protocols Roadmap

> Planning document for improving studio project infrastructure and workflows.

---

## Current State

### Existing Infrastructure

| Component | Location | Status |
|-----------|----------|--------|
| Registry | `.claude/STUDIO_REGISTRY.md` | Markdown file, manual updates |
| Protocol | `docs/infrastructure/STUDIO_PROJECT_PROTOCOL.md` | Basic creation guide |
| Project code | `components/studio/` | Active |
| MCP schemas | `lib/mcp/schemas/` | Active |
| Studio-mgr agent | Claude Code config | Active |

### Pain Points

- Registry is disconnected from DB (can't relate projects to experiments, logs, etc.)
- Projects start without clear definition, leading to drift
- Learnings from experiments are scattered or lost
- No structured way to capture hypotheses and validate them
- Context gets buried in conversations, not persisted

---

## Workflow

### Capture → Shape → Scaffold

| Environment | Role |
|-------------|------|
| **MCP (anywhere)** | Capture ideas, shape PRD fields conversationally |
| **Claude Code** | Scaffold when ready to work |

**Status progression:**
```
draft → active → paused/completed/archived
  ↑        ↑
(MCP)  (Claude Code scaffolds)
```

1. **Capture** via MCP → `studio_projects` row (status: `draft`)
2. **Shape** over time via MCP → fill PRD fields, notes, hypotheses
3. **Scaffold** in Claude Code → create directories, files, routes (status: `active`, `scaffolded_at` set)

---

## Planned Improvements

### 1. Migrate Registry to Supabase

**Why:** Enable relations, MCP access, structured queries.

**Tables:**

```sql
studio_projects (
  id UUID PRIMARY KEY,
  slug TEXT UNIQUE,
  name TEXT,
  description TEXT,

  -- Status
  status TEXT,           -- draft, active, paused, completed, archived
  temperature TEXT,      -- hot, warm, cold
  current_focus TEXT,

  -- PRD fields
  problem_statement TEXT,
  hypothesis TEXT,
  success_criteria TEXT,
  scope_out TEXT,

  -- Scaffolding
  path TEXT,             -- components/studio/{slug}/
  scaffolded_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
```

**Benefits:**
- Projects can be related to experiments, logs, specimens
- Query via MCP ("show me all draft projects")
- Easier to update (no file editing)
- Studio-mgr agent can read current state

**Migration:** Export current registry data, create table, deprecate markdown file.

---

### 2. Upgrade Protocol: Require PRD + Roadmap

**New project creation flow:**

1. **PRD first** (lightweight)
   - Problem statement
   - Hypothesis (what we believe)
   - Success criteria (how we'll know)
   - Scope boundaries (what's out)

2. **Roadmap** (sequenced, not time-boxed)
   - Phases or milestones
   - Each phase decomposed into spikes/experiments

3. **Then:** Directory, tables, MCP registration

**Template locations:**
- `docs/studio/templates/prd.md`
- `docs/studio/templates/roadmap.md`

---

### 3. Decompose Work into Spikes/Experiments

**Principle:** Big fuzzy projects stall. Small experiments:
- Have clear pass/fail criteria
- Generate learnings even when they fail
- Can be paused/resumed cleanly

**Spike definition:**
- Time-bounded exploration (hours to days, not weeks)
- Single question to answer
- Outputs: working code, learnings, or "don't pursue"

**Experiment definition:**
- Tests a hypothesis
- Has measurable outcome
- Captures observations

---

### 4. Experiments & Hypotheses in DB

**Tables:**

```sql
-- Hypotheses to test
studio_hypotheses (
  id, project_id,
  statement,       -- "If we X, then Y"
  status,          -- proposed, testing, validated, invalidated
  created_at, updated_at
)

-- Experiments/spikes that test hypotheses
studio_experiments (
  id, project_id, hypothesis_id,
  name, description,
  type,            -- spike, experiment, prototype
  status,          -- planned, in_progress, completed, abandoned
  outcome,         -- success, failure, inconclusive, null
  learnings,       -- what we discovered
  created_at, updated_at
)

-- Observations, notes, annotations
studio_notes (
  id,
  parent_type,     -- project, hypothesis, experiment
  parent_id,
  content,
  note_type,       -- observation, question, decision, feedback
  created_at
)
```

**Benefits:**
- Rich context is captured and queryable
- Learnings persist across sessions
- Can review "what did we learn about X?"
- Hypotheses track validation state

---

### 5. Consistent Layouts for Spikes

**Directory structure for experiments:**

```
components/studio/{project}/
├── experiments/
│   ├── {experiment-slug}/
│   │   ├── README.md      -- Auto-generated from DB
│   │   ├── index.tsx      -- Entry point if UI
│   │   └── ...
│   └── ...
├── src/                   -- Graduated/production code
└── ...
```

**Experiment README template:**
```markdown
# {Experiment Name}

**Status:** {status}
**Hypothesis:** {link to hypothesis}
**Outcome:** {outcome}

## Question
What are we trying to learn?

## Approach
How we're testing it.

## Learnings
What we discovered.
```

---

### 6. Bidirectional Links to Other Entities

**Studio projects should link to:**
- `log_entries` (writing about the project)
- `specimens` (visual artifacts from the project)
- `studio_experiments` (experiments within the project)
- `studio_hypotheses` (hypotheses being tested)

**Implementation:**

Option A: Junction tables
```sql
studio_project_log_entries (project_id, log_entry_id)
studio_project_specimens (project_id, specimen_id)
```

Option B: Add `studio_project_id` FK to existing tables
```sql
ALTER TABLE log_entries ADD COLUMN studio_project_id UUID REFERENCES studio_projects(id);
ALTER TABLE specimens ADD COLUMN studio_project_id UUID REFERENCES studio_projects(id);
```

**Recommendation:** Option B is simpler. One project per log/specimen. Can query both directions.

---

### 7. Admin UI for Studio Projects

**Location:** `/admin/studio` or extend existing admin

**Features:**
- List all studio projects (filter by status, temperature)
- Edit project details, PRD fields
- View related entities (experiments, logs, specimens)
- Quick actions: change status, update focus
- Scaffold button (triggers Claude Code workflow description)

**Views needed:**
- Project list with status badges
- Project detail/edit form
- Related content panels

---

## Implementation Order

1. **Create DB tables** (projects, hypotheses, experiments, notes)
2. **Add FKs** to log_entries, specimens for bidirectional links
3. **Migrate registry data** to `studio_projects`
4. **Create templates** (PRD, roadmap, experiment README)
5. **Update protocol** with new requirements
6. **Build admin UI** for studio project management
7. **Create Claude Code skill** for scaffolding
8. **Deprecate** markdown registry

---

## Open Questions

- Should notes support threading/replies?
- How to handle sub-projects (Hando/Twin pattern)?
- Auto-generate experiment READMEs from DB or keep manual?
- Integration with log entries (experiment → spawns log post)?
- Admin UI: separate section or integrated with existing admin?

---

## References

- [Studio Registry](/.claude/STUDIO_REGISTRY.md) - Current (to be migrated)
- [Studio Project Protocol](/docs/infrastructure/STUDIO_PROJECT_PROTOCOL.md) - Current (to be updated)
- [DOCS_UI_SPEC](/docs/infrastructure/DOCS_UI_SPEC.md) - Studio architecture context

---

*Updated: 2025-12-28*
