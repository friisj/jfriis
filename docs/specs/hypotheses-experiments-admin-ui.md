# Hypotheses & Experiments Admin UI Spec

## Overview

Add admin CRUD for `studio_hypotheses` and `studio_experiments` tables, plus wire up existing linker components for junction tables.

## Current State

- Hypotheses/experiments visible in studio project edit sidebar (read-only)
- Sidebar says "Add via MCP" - no UI to create/edit
- Junction tables (`assumption_experiments`, `assumption_evidence`) have no UI

## Implementation

### Phase 1: Hypotheses Admin UI

**Files to create:**
```
app/(private)/admin/hypotheses/
├── page.tsx           # List with filters
├── new/page.tsx       # Create form
└── [id]/edit/page.tsx # Edit form

components/admin/
├── hypothesis-form.tsx
└── views/hypotheses-list-view.tsx
```

**hypothesis-form.tsx fields:**
| Field | Type | Notes |
|-------|------|-------|
| studio_project_id | Select | Required, links to project |
| statement | Textarea | "If we X, then Y" format |
| validation_criteria | Textarea | How to validate |
| sequence | Number | Roadmap order (1, 2, 3...) |
| status | Select | proposed, testing, validated, invalidated |

**List view columns:**
- Statement (truncated)
- Project (linked)
- Sequence
- Status (badge)
- Actions

**Filters:**
- By project
- By status

---

### Phase 2: Experiments Admin UI

**Files to create:**
```
app/(private)/admin/experiments/
├── page.tsx           # List with filters
├── new/page.tsx       # Create form
└── [id]/edit/page.tsx # Edit form

components/admin/
├── experiment-form.tsx
└── views/experiments-list-view.tsx
```

**experiment-form.tsx fields:**
| Field | Type | Notes |
|-------|------|-------|
| studio_project_id | Select | Required |
| hypothesis_id | Select | Optional, filtered by project |
| slug | Text | Auto-generated from name |
| name | Text | Required |
| description | Textarea | |
| type | Select | spike, experiment, prototype |
| status | Select | planned, in_progress, completed, abandoned |
| outcome | Select | success, failure, inconclusive (nullable) |
| learnings | Textarea | What we learned |

**List view columns:**
- Name
- Project
- Hypothesis (if linked)
- Type (badge)
- Status (badge)
- Outcome (badge, if set)
- Actions

**Filters:**
- By project
- By hypothesis
- By type
- By status

---

### Phase 3: Wire Up Junction Tables

#### 3a. AssumptionLinker on Experiment Form

Add AssumptionLinker to experiment-form.tsx to link assumptions being tested:

```typescript
<AssumptionLinker
  linkedIds={formData.assumption_ids}
  onChange={(ids) => setFormData({ ...formData, assumption_ids: ids })}
  sourceType="experiment"
  projectId={formData.studio_project_id}
/>
```

On save, sync to `assumption_experiments` table with default:
- `result`: null
- `confidence`: null

#### 3b. Experiment Results on Assumption Form

Add section to assumption-form.tsx showing linked experiments with result editing:

```typescript
interface ExperimentResult {
  experiment_id: string
  experiment_name: string
  result: 'supports' | 'refutes' | 'inconclusive' | null
  confidence: 'low' | 'medium' | 'high' | null
  notes: string
}
```

Display as collapsible section with:
- List of linked experiments
- Inline result/confidence dropdowns
- Notes textarea

#### 3c. EvidenceLinker on Assumption Form

The `EvidenceLinker` component exists from canvas items. Add to assumption-form.tsx:

```typescript
<EvidenceLinker
  linkedEvidence={formData.evidence}
  onChange={(evidence) => setFormData({ ...formData, evidence })}
  entityType="assumption"
  entityId={assumptionId}
/>
```

Creates records in `assumption_evidence` table.

---

### Phase 4: Update Studio Project Sidebar

Replace read-only sidebar with links to filtered admin lists:

**Current:**
```
Hypotheses (3)           [Add via MCP]
- Hypothesis 1
- Hypothesis 2

Experiments (2)          [Add via MCP]
- Experiment 1
```

**Updated:**
```
Hypotheses (3)           [+ Add]
- Hypothesis 1           [Edit]
- Hypothesis 2           [Edit]
[View All →]

Experiments (2)          [+ Add]
- Experiment 1           [Edit]
[View All →]
```

Links:
- "+ Add" → `/admin/hypotheses/new?project={id}`
- "Edit" → `/admin/hypotheses/{id}/edit`
- "View All →" → `/admin/hypotheses?project={id}`

---

## File Summary

**New files (10):**
```
app/(private)/admin/hypotheses/page.tsx
app/(private)/admin/hypotheses/new/page.tsx
app/(private)/admin/hypotheses/[id]/edit/page.tsx
app/(private)/admin/experiments/page.tsx
app/(private)/admin/experiments/new/page.tsx
app/(private)/admin/experiments/[id]/edit/page.tsx
components/admin/hypothesis-form.tsx
components/admin/experiment-form.tsx
components/admin/views/hypotheses-list-view.tsx
components/admin/views/experiments-list-view.tsx
```

**Updated files (3):**
```
components/admin/assumption-form.tsx  # Add experiment results + evidence sections
app/(private)/admin/studio/[id]/edit/page.tsx  # Update sidebar with links
```

---

## Navigation

Add to admin nav (if not already):
- Studio → Hypotheses
- Studio → Experiments

Or add to existing Studio section with sub-nav.

---

## Data Flow

```
Studio Project
    │
    ├── Hypotheses (1:N)
    │       │
    │       └── Assumptions (N:N via hypothesis_id on assumption)
    │
    └── Experiments (1:N)
            │
            ├── Hypothesis (N:1, optional link)
            │
            └── Assumptions (N:N via assumption_experiments)
                    │
                    └── Evidence (1:N via assumption_evidence)
```

---

## Implementation Order

1. **hypothesis-form.tsx** + pages (can test immediately)
2. **experiment-form.tsx** + pages (can test immediately)
3. **Update studio sidebar** (makes navigation usable)
4. **Wire AssumptionLinker to experiment form**
5. **Add experiment results section to assumption form**
6. **Wire EvidenceLinker to assumption form**

Phases 1-3 are highest value. Phases 4-6 are refinements.
