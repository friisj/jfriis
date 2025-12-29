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

## Planned Improvements

### 1. Migrate Registry to Supabase

**Why:** Enable relations, MCP access, structured queries.

**Tables:**

```sql
-- Core project registry
studio_projects (
  id, slug, name, description,
  status,        -- planning, active, paused, archived
  temperature,   -- hot, warm, cold
  current_focus,
  path,          -- components/studio/{slug}/
  created_at, updated_at
)

-- Optional: keep markdown snapshot auto-generated for quick reference
```

**Benefits:**
- Projects can be related to experiments, logs, specimens
- Query via MCP ("show me all active projects")
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

## Implementation Order

1. **Create DB tables** (projects, hypotheses, experiments, notes)
2. **Migrate registry data** to `studio_projects`
3. **Create templates** (PRD, roadmap, experiment README)
4. **Update protocol** with new requirements
5. **Build simple views** (list projects, list experiments)
6. **Deprecate** markdown registry

---

## Open Questions

- Should notes support threading/replies?
- How to handle sub-projects (Hando/Twin pattern)?
- Auto-generate experiment READMEs from DB or keep manual?
- Integration with log entries (experiment → spawns log post)?

---

## References

- [Studio Registry](/.claude/STUDIO_REGISTRY.md) - Current (to be migrated)
- [Studio Project Protocol](/docs/infrastructure/STUDIO_PROJECT_PROTOCOL.md) - Current (to be updated)
- [DOCS_UI_SPEC](/docs/infrastructure/DOCS_UI_SPEC.md) - Studio architecture context

---

*Updated: 2025-12-28*
