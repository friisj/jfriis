# Boundary Objects Phase 2: Journey Mappings & Evidence

## Prerequisites

**Before Phase 2, apply Phase 1 migrations:**
```bash
supabase db push
```

This applies:
- `20251231120000_boundary_objects_phase1_journeys.sql`
- `20251231170000_boundary_objects_phase1_fixes.sql`

Then regenerate types:
```bash
supabase gen types typescript --project-id gmjkufgctbhrlefzzicg > lib/types/supabase.ts
```

---

## Phase 2 Scope

Build UI for the junction tables that exist in Phase 1 migration:

| Table | Purpose | Links To |
|-------|---------|----------|
| `touchpoint_mappings` | Link touchpoints to canvas items | canvas_items, customer_profiles, value_proposition_canvases |
| `touchpoint_assumptions` | Link touchpoints to assumptions | assumptions table |
| `touchpoint_evidence` | Collect validation evidence | standalone evidence records |

---

## Implementation Plan

### Step 1: CRUD Operations (lib/boundary-objects/mappings.ts)

```typescript
// Touchpoint Mappings
createTouchpointMapping(data: TouchpointMappingInsert): Promise<TouchpointMapping>
deleteTouchpointMapping(id: string): Promise<void>
listTouchpointMappings(touchpointId: string): Promise<TouchpointMapping[]>
listMappingsForCanvasItem(canvasItemId: string): Promise<TouchpointMapping[]>

// Touchpoint Assumptions
createTouchpointAssumption(data: TouchpointAssumptionInsert): Promise<TouchpointAssumption>
deleteTouchpointAssumption(touchpointId: string, assumptionId: string): Promise<void>
listTouchpointAssumptions(touchpointId: string): Promise<TouchpointAssumptionWithDetails[]>
listAssumptionTouchpoints(assumptionId: string): Promise<TouchpointAssumption[]>

// Touchpoint Evidence
createTouchpointEvidence(data: TouchpointEvidenceInsert): Promise<TouchpointEvidence>
updateTouchpointEvidence(id: string, data: TouchpointEvidenceUpdate): Promise<TouchpointEvidence>
deleteTouchpointEvidence(id: string): Promise<void>
listTouchpointEvidence(touchpointId: string): Promise<TouchpointEvidence[]>
```

### Step 2: Type Additions (lib/types/boundary-objects.ts)

Already defined in Phase 1:
- `TouchpointMapping`, `TouchpointMappingInsert`
- `TouchpointAssumption`
- `TouchpointEvidence`, `TouchpointEvidenceInsert`, `TouchpointEvidenceUpdate`

Need to add:
```typescript
// Extended types with joins
interface TouchpointAssumptionWithDetails extends TouchpointAssumption {
  assumption: Pick<Assumption, 'id' | 'statement' | 'status' | 'risk_level'>
}

interface TouchpointMappingWithTarget extends TouchpointMapping {
  canvas_item?: Pick<CanvasItem, 'id' | 'title' | 'item_type'>
  customer_profile?: Pick<CustomerProfile, 'id' | 'name'>
  value_proposition_canvas?: Pick<ValuePropositionCanvas, 'id' | 'name'>
}

interface TouchpointWithAllRelations extends Touchpoint {
  mappings: TouchpointMappingWithTarget[]
  assumptions: TouchpointAssumptionWithDetails[]
  evidence: TouchpointEvidence[]
}
```

### Step 3: UI Components

#### 3a. TouchpointMappingLinker Component

Location: `components/admin/touchpoint-mapping-linker.tsx`

Purpose: Link touchpoints to canvas items (jobs, pains, gains)

UI:
```
┌─────────────────────────────────────────────────┐
│ Canvas Item Mappings                    [+ Add] │
├─────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────┐ │
│ │ 🎯 Job: "Find parking quickly"              │ │
│ │ Type: addresses_job | Strength: strong      │ │
│ │                                    [Remove] │ │
│ └─────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────┐ │
│ │ 😣 Pain: "Unclear pricing"                  │ │
│ │ Type: triggers_pain | Strength: moderate    │ │
│ │                                    [Remove] │ │
│ └─────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘

[+ Add Mapping] Modal:
- Select canvas item (from project's canvas items)
- Select mapping type (addresses_job, triggers_pain, delivers_gain, etc.)
- Select strength (weak, moderate, strong)
- Notes field
```

Props:
```typescript
interface TouchpointMappingLinkerProps {
  touchpointId: string
  projectId?: string  // Filter canvas items by project
  mappings: TouchpointMappingWithTarget[]
  onMappingAdded: (mapping: TouchpointMapping) => void
  onMappingRemoved: (mappingId: string) => void
}
```

#### 3b. TouchpointAssumptionLinker Component

Location: `components/admin/touchpoint-assumption-linker.tsx`

Purpose: Link touchpoints to assumptions being tested

UI:
```
┌─────────────────────────────────────────────────┐
│ Linked Assumptions                      [+ Add] │
├─────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────┐ │
│ │ "Users prefer visual parking availability"  │ │
│ │ Relationship: tests | Status: testing       │ │
│ │                                    [Remove] │ │
│ └─────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

Props:
```typescript
interface TouchpointAssumptionLinkerProps {
  touchpointId: string
  projectId?: string
  linkedAssumptions: TouchpointAssumptionWithDetails[]
  onAssumptionLinked: (link: TouchpointAssumption) => void
  onAssumptionUnlinked: (assumptionId: string) => void
}
```

#### 3c. TouchpointEvidenceCollector Component

Location: `components/admin/touchpoint-evidence-collector.tsx`

Purpose: Add/manage evidence for touchpoint validation

UI:
```
┌─────────────────────────────────────────────────┐
│ Evidence (3)                            [+ Add] │
├─────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────┐ │
│ │ 📊 Analytics: "Parking page bounce rate"    │ │
│ │ Supports: ✓ Yes | Confidence: high          │ │
│ │ Collected: 2025-12-30                       │ │
│ │                              [Edit] [Delete]│ │
│ └─────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────┐ │
│ │ 🎙️ Interview: "User test session #4"        │ │
│ │ Supports: ✗ No | Confidence: medium         │ │
│ │ Collected: 2025-12-28                       │ │
│ │                              [Edit] [Delete]│ │
│ └─────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

Evidence Form Fields:
- evidence_type: user_test, interview, survey, analytics, observation, prototype, ab_test, heuristic_eval
- title: string (required)
- summary: textarea
- url: link to full evidence
- supports_design: boolean (yes/no/unclear)
- confidence: low/medium/high
- collected_at: date

Props:
```typescript
interface TouchpointEvidenceCollectorProps {
  touchpointId: string
  evidence: TouchpointEvidence[]
  onEvidenceAdded: (evidence: TouchpointEvidence) => void
  onEvidenceUpdated: (evidence: TouchpointEvidence) => void
  onEvidenceDeleted: (evidenceId: string) => void
}
```

### Step 4: Integrate into Journey Detail View

Update `components/admin/views/journey-detail-view.tsx`:

Add tabs or expandable sections to touchpoint cards:
```
Touchpoint: "Enter parking location"
├── Overview (existing)
├── Mappings (NEW - Phase 2)
│   └── TouchpointMappingLinker
├── Assumptions (NEW - Phase 2)
│   └── TouchpointAssumptionLinker
└── Evidence (NEW - Phase 2)
    └── TouchpointEvidenceCollector
```

### Step 5: Touchpoint Edit Page Enhancement

Update `app/(private)/admin/journeys/[id]/touchpoints/[touchpointId]/page.tsx` (NEW):

Dedicated page for managing single touchpoint with all relationships:
- Basic info form
- Mapping linker
- Assumption linker
- Evidence collector
- Delete touchpoint

---

## File Summary

### New Files

```
lib/boundary-objects/mappings.ts           # CRUD for mappings/assumptions/evidence
components/admin/touchpoint-mapping-linker.tsx
components/admin/touchpoint-assumption-linker.tsx
components/admin/touchpoint-evidence-collector.tsx
components/admin/touchpoint-evidence-form.tsx
app/(private)/admin/journeys/[id]/touchpoints/[touchpointId]/page.tsx
```

### Updated Files

```
lib/types/boundary-objects.ts              # Extended types with joins
lib/boundary-objects/index.ts              # Export new functions
components/admin/views/journey-detail-view.tsx  # Add mapping/evidence UI
```

---

## Implementation Order

1. **Apply Phase 1 migrations** (prerequisite)
2. **Regenerate Supabase types**
3. **Add CRUD operations** (`lib/boundary-objects/mappings.ts`)
4. **Add extended types**
5. **Create TouchpointEvidenceCollector** (simplest, standalone)
6. **Create TouchpointEvidenceForm** (modal for add/edit)
7. **Create TouchpointAssumptionLinker** (reuse AssumptionLinker patterns)
8. **Create TouchpointMappingLinker** (similar to CanvasItemSelector)
9. **Update journey-detail-view** to include new components
10. **Create touchpoint detail page** for dedicated editing
11. **Test end-to-end flow**

---

## Estimates

| Task | Complexity |
|------|------------|
| Apply migrations + regen types | Simple |
| CRUD operations | Medium |
| Evidence collector + form | Medium |
| Assumption linker | Medium (existing pattern) |
| Mapping linker | Medium-High (new pattern) |
| Journey detail integration | Medium |
| Touchpoint detail page | Simple |
| Testing | Medium |

**Total:** ~10 new/updated files, reusing existing patterns heavily.

---

## Dependencies

- Phase 1 migrations must be applied
- Existing components to reuse:
  - `AssumptionLinker` pattern from canvas forms
  - `CanvasItemSelector` pattern
  - `AdminDetailLayout`, `AdminFormLayout`
  - Form field patterns from journey-form

---

## Success Criteria

- [ ] Can link touchpoint to canvas items with type and strength
- [ ] Can link touchpoint to assumptions with relationship type
- [ ] Can add evidence with all evidence types
- [ ] Evidence shows supports/refutes indicator
- [ ] Journey detail view shows mapping/evidence counts
- [ ] Can navigate to touchpoint detail for full editing
- [ ] All operations persist to database
