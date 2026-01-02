# Entity Relationships Analysis

## Overview

This document maps all entity relationships in the codebase, identifies gaps, and critically evaluates the current relationship management approach.

**Key Question:** Is our relationship complexity justified, or is there a simpler approach?

---

## Part 1: Entity Inventory

### Core Entities (33 tables)

| Category | Entity | Purpose |
|----------|--------|---------|
| **Portfolio** | projects | Public portfolio items |
| | log_entries | Chronological records |
| | backlog_items | Rough ideas inbox |
| **Studio** | studio_projects | Workshop projects with PRD |
| | studio_hypotheses | Hypotheses to validate |
| | studio_experiments | Experiments testing hypotheses |
| **Canvases** | business_model_canvases | Strategyzer BMC |
| | customer_profiles | Personas with jobs/pains/gains |
| | value_proposition_canvases | FIT analysis |
| **Canvas Items** | canvas_items | Normalized block items |
| | canvas_item_placements | Where items appear |
| | canvas_item_assumptions | Item ↔ assumption links |
| | canvas_item_mappings | FIT mappings |
| | canvas_item_evidence | Evidence on items |
| **Assumptions** | assumptions | First-class assumptions |
| | assumption_experiments | Junction to experiments |
| | assumption_evidence | Evidence on assumptions |
| **Journeys** | user_journeys | Customer experience maps |
| | journey_stages | Phases within journeys |
| | touchpoints | Interaction moments |
| | touchpoint_mappings | Polymorphic links |
| | touchpoint_assumptions | Junction to assumptions |
| | touchpoint_evidence | Evidence on touchpoints |
| **Content** | specimens | UI components |
| | gallery_sequences | Curated collections |
| | channels | Distribution platforms |
| | distribution_posts | Track posts |
| | distribution_queue | Agent queue |

---

## Part 2: Current Relationship Patterns

### Pattern 1: Foreign Keys (One-to-Many)
```
studio_projects → studio_hypotheses (project_id)
studio_projects → studio_experiments (project_id)
user_journeys → journey_stages (user_journey_id)
journey_stages → touchpoints (journey_stage_id)
```
**Verdict:** Clean, appropriate for hierarchical ownership.

### Pattern 2: Junction Tables (Many-to-Many)
```
assumption_experiments (assumption_id, experiment_id, result)
canvas_item_assumptions (canvas_item_id, assumption_id, relationship_type)
canvas_item_placements (canvas_item_id, canvas_type, canvas_id, block_name)
touchpoint_mappings (touchpoint_id, target_type, target_id, mapping_type)
gallery_specimen_items (gallery_sequence_id, specimen_id, position)
log_entry_specimens (log_entry_id, specimen_id, position)
project_specimens (project_id, specimen_id, position)
log_entry_projects (log_entry_id, project_id)
backlog_log_entries (backlog_item_id, log_entry_id, relationship_type)
touchpoint_assumptions (touchpoint_id, assumption_id, relationship_type)
canvas_item_mappings (source_item_id, target_item_id, mapping_type)
```
**Count:** 11 junction tables

### Pattern 3: JSONB UUID Arrays (Denormalized References)
```sql
business_model_canvases.related_value_proposition_ids UUID[]
business_model_canvases.related_customer_profile_ids UUID[]
customer_profiles.related_business_model_ids UUID[]
customer_profiles.related_value_proposition_ids UUID[]
user_journeys.related_value_proposition_ids UUID[]
user_journeys.related_business_model_ids UUID[]
```
**Verdict:** No referential integrity, orphan risk, hard to query.

### Pattern 4: JSONB Embedded Objects (Canvas Blocks)
```typescript
// BMC blocks store items inline
{
  key_partners: {
    items: [{ id, content }],
    assumptions: [{ id, statement }],
    validation_status: 'untested'
  }
}
```
**Problem:** Items stored BOTH here AND in `canvas_items` table = dual truth sources.

### Pattern 5: Polymorphic References
```
canvas_item_placements: canvas_type + canvas_id
touchpoint_mappings: target_type + target_id
```
**Verdict:** Appropriate for cross-canvas linking.

---

## Part 3: Relationship Complexity Critique

### Issue 1: Dual Storage of Canvas Items

**Current State:**
- BMC blocks store items as JSONB arrays: `key_partners.items[]`
- `canvas_items` table stores normalized items
- `canvas_item_placements` tracks where items appear
- Forms must sync both representations

**Problem:**
- Two sources of truth
- Risk of drift between JSONB and normalized data
- `syncCanvasPlacements()` function needed to keep in sync
- Extra queries, extra complexity

**Recommendation:** Pick ONE approach:
- **Option A:** Fully normalize - Remove JSONB item arrays, only use `canvas_items` + `canvas_item_placements`
- **Option B:** Fully denormalize - Remove `canvas_items`, keep JSONB, accept no cross-references

### Issue 2: Three Evidence Tables

**Current State:**
```
assumption_evidence (assumption_id, ...)
canvas_item_evidence (canvas_item_id, ...)
touchpoint_evidence (touchpoint_id, ...)
```

**Problem:** Identical schema, three tables. Any new entity needing evidence requires a new table.

**Recommendation:** Single polymorphic evidence table:
```sql
CREATE TABLE evidence (
  id UUID PRIMARY KEY,
  entity_type TEXT NOT NULL, -- 'assumption', 'canvas_item', 'touchpoint'
  entity_id UUID NOT NULL,
  evidence_type TEXT NOT NULL,
  content TEXT,
  source_url TEXT,
  confidence DECIMAL(3,2),
  collected_at TIMESTAMP,
  collector_notes TEXT
);
CREATE INDEX ON evidence (entity_type, entity_id);
```

### Issue 3: JSONB UUID Arrays Without Integrity

**Current State:**
```sql
business_model_canvases.related_value_proposition_ids UUID[]
```

**Problems:**
- No foreign key constraint
- Deleted VPCs leave orphan UUIDs
- Can't join efficiently
- No relationship metadata (when linked, why linked)

**Recommendation:** Use junction table or universal relationship table:
```sql
CREATE TABLE entity_relationships (
  id UUID PRIMARY KEY,
  source_type TEXT NOT NULL,
  source_id UUID NOT NULL,
  target_type TEXT NOT NULL,
  target_id UUID NOT NULL,
  relationship_type TEXT, -- 'related_to', 'derived_from', 'validates'
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(source_type, source_id, target_type, target_id, relationship_type)
);
```

### Issue 4: Inconsistent Relationship Patterns

**Current Mix:**
| Relationship | Implementation |
|--------------|----------------|
| project → specimens | Junction table |
| canvas → VPC | JSONB UUID array |
| canvas_item → assumption | Junction table |
| BMC block → items | JSONB array |

**Problem:** Developers must remember which pattern each relationship uses.

**Recommendation:** Standardize on 2-3 patterns max:
1. **FK** for ownership (parent → children)
2. **Junction table** for many-to-many with metadata
3. **Universal relationship table** for loose associations

---

## Part 4: Missing Relationships (Gaps)

### High Priority Gaps

| Missing Link | Why It Matters | Suggested Fix |
|--------------|----------------|---------------|
| backlog_items → assumptions | Ideas often contain implicit assumptions | Add `assumption_ids UUID[]` or junction |
| backlog_items → canvas_items | Ideas become canvas items when refined | Add `evolved_to_canvas_item_id UUID` |
| log_entries → assumptions | Logs document assumption validation work | Add junction `log_entry_assumptions` |
| studio_experiments → canvas_items | Experiments validate specific items | Add junction `experiment_canvas_items` |
| specimens → assumptions | Working code proves feasibility assumptions | Add junction `specimen_assumptions` |

### Medium Priority Gaps

| Missing Link | Why It Matters | Suggested Fix |
|--------------|----------------|---------------|
| journey_stages → assumptions | Each stage has assumptions about customer behavior | Add junction `stage_assumptions` |
| log_entries → touchpoints | Logs document touchpoint research | Add junction or FK |
| projects → assumptions | Published work validated assumptions | Leverage existing studio_project link |

### Low Priority Gaps

| Missing Link | Why It Matters |
|--------------|----------------|
| User ownership (creator_id) | Track who created what |
| Versioning across entities | Currently only on canvases/journeys |

---

## Part 5: Simplification Proposal

### Proposed Universal Relationship Table

Replace:
- All JSONB UUID arrays
- Some junction tables (where relationship metadata is minimal)

```sql
CREATE TABLE entity_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Source entity
  source_type TEXT NOT NULL,
  source_id UUID NOT NULL,

  -- Target entity
  target_type TEXT NOT NULL,
  target_id UUID NOT NULL,

  -- Relationship metadata
  link_type TEXT DEFAULT 'related', -- 'related', 'validates', 'tests', 'evolved_from', etc.
  strength TEXT, -- 'strong', 'weak', 'tentative'
  notes TEXT,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(source_type, source_id, target_type, target_id, link_type)
);

-- Indexes for efficient querying
CREATE INDEX ON entity_links (source_type, source_id);
CREATE INDEX ON entity_links (target_type, target_id);
CREATE INDEX ON entity_links (link_type);
```

### Proposed Universal Evidence Table

Replace: assumption_evidence, canvas_item_evidence, touchpoint_evidence

```sql
CREATE TABLE evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- What this evidence supports
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,

  -- Evidence details
  evidence_type TEXT NOT NULL, -- 'interview', 'survey', 'analytics', 'experiment', etc.
  content TEXT,
  source_url TEXT,
  source_reference TEXT,

  -- Quality indicators
  confidence DECIMAL(3,2) CHECK (confidence >= 0 AND confidence <= 1),
  supports BOOLEAN DEFAULT true, -- true = supports, false = refutes

  -- Metadata
  collected_at TIMESTAMP,
  collector_notes TEXT,
  tags TEXT[],
  metadata JSONB,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX ON evidence (entity_type, entity_id);
CREATE INDEX ON evidence (evidence_type);
```

### Migration Path

1. **Phase 1:** Create universal tables alongside existing ones
2. **Phase 2:** Migrate data from JSONB arrays and specific junction tables
3. **Phase 3:** Update forms/queries to use universal tables
4. **Phase 4:** Remove deprecated tables/columns

---

## Part 6: Complexity Assessment

### Current Complexity Score

| Metric | Count | Assessment |
|--------|-------|------------|
| Total tables | 33 | High |
| Junction tables | 11 | High |
| JSONB relationship fields | 6+ | Medium |
| Polymorphic references | 2 | Appropriate |
| Evidence tables | 3 | Should be 1 |
| Relationship patterns | 5+ | Should be 2-3 |

### Target Complexity Score

| Metric | Current | Target | Savings |
|--------|---------|--------|---------|
| Junction tables | 11 | 6 | -5 (use entity_links) |
| JSONB UUID arrays | 6 | 0 | -6 (use entity_links) |
| Evidence tables | 3 | 1 | -2 |
| Relationship patterns | 5 | 3 | -2 patterns to learn |

### What We'd Keep

1. **Foreign Keys** for hierarchical ownership:
   - project → hypotheses, experiments
   - journey → stages → touchpoints

2. **Specialized Junction Tables** for complex relationships:
   - `canvas_item_placements` (polymorphic, with block_name)
   - `canvas_item_mappings` (FIT analysis with strength/method)
   - `assumption_experiments` (with result/confidence)

3. **Universal Tables** for simple associations:
   - `entity_links` (replaces all JSONB arrays, simple junctions)
   - `evidence` (replaces 3 evidence tables)

---

## Part 7: Decision Matrix

### Should We Simplify?

| Factor | For Simplification | Against Simplification |
|--------|-------------------|------------------------|
| Developer Experience | Fewer patterns to learn | Learning curve for universal tables |
| Query Performance | Single table = optimizable | May need more complex queries |
| Referential Integrity | Possible with triggers | JSONB arrays have none anyway |
| Feature Velocity | Less boilerplate for new relationships | Current approach works |
| Technical Debt | Reduces dual-storage issues | Migration effort required |

### Recommendation

**Proceed with simplification in phases:**

1. **Immediate:** Create `evidence` universal table for new evidence
2. **Short-term:** Create `entity_links` for new relationships
3. **Medium-term:** Migrate JSONB UUID arrays to `entity_links`
4. **Long-term:** Evaluate consolidating remaining junction tables

---

## Part 8: Canvas Block Item Strategy

### The Core Question

Should canvas block items be:
- **A)** JSONB in canvas tables (current partial approach)
- **B)** Fully normalized in `canvas_items` + `canvas_item_placements`
- **C)** Hybrid with JSONB as source of truth

### Analysis

| Approach | Pros | Cons |
|----------|------|------|
| **A) Pure JSONB** | Simple queries, atomic updates | No cross-references, no FKs |
| **B) Fully Normalized** | Full relational power, integrity | More queries, sync complexity |
| **C) Hybrid** | Best of both? | TWO sources of truth = bugs |

### Recommendation

**Pick B: Fully Normalized**

The reason we created `canvas_items` was to enable:
- Cross-canvas references (item appears in BMC and VPC)
- FIT mappings between items
- Assumption linking
- Evidence collection

These are valuable. The JSONB storage is now redundant.

**Action:** Migrate away from JSONB item storage, use `canvas_items` + `canvas_item_placements` as single source of truth.

---

## Summary

### Key Findings

1. **Dual storage** of canvas items (JSONB + normalized) creates sync complexity
2. **Three evidence tables** should be one universal table
3. **JSONB UUID arrays** lack integrity and should use junction tables
4. **11 junction tables** could be reduced to ~6 with a universal relationship table
5. **Missing relationships** between backlog → assumptions, experiments → canvas_items

### Recommended Actions

| Priority | Action | Effort |
|----------|--------|--------|
| High | Create universal `evidence` table | Medium |
| High | Create `entity_links` for new relationships | Medium |
| Medium | Migrate JSONB UUID arrays to `entity_links` | High |
| Medium | Remove JSONB item storage from canvas tables | High |
| Low | Add missing relationships (backlog → assumptions) | Low |
| Low | Consolidate remaining junction tables | Medium |

### Guiding Principles Going Forward

1. **One source of truth** - Never store the same relationship two ways
2. **Referential integrity** - Avoid JSONB UUID arrays
3. **Minimal patterns** - FK for ownership, junction for M:M with metadata, universal for loose links
4. **Evidence is universal** - One table for all entity evidence
