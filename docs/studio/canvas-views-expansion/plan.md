# Canvas Views Expansion Project

## Overview

Extend the reusable canvas UI pattern (established with Story Maps) to all strategic planning entities: Blueprints, Journeys, BMC, VPC, Customer Profiles, and Value Maps.

---

## Phase Order (Decided)

| Phase | Focus | Pattern | Rationale |
|-------|-------|---------|-----------|
| **1** | Service Blueprint | TimelineCanvas | Most complex - validates pattern |
| **2** | Customer Journey | TimelineCanvas | Reuses Phase 1 pattern |
| **3** | Business Model Canvas | BlockGridCanvas | Most standard block grid |
| **4** | Customer Profile + Value Map | BlockGridCanvas | Simpler 3-block layouts |
| **5** | Value Proposition Canvas | Split View | Combines Profile + Value Map |

**Key Decision:** Start with Blueprint (timeline pattern) because it's the most complex. If TimelineCanvas works for Blueprint, Journey will be straightforward. Block grid canvases are simpler and can come after.

---

## Current State

**Story Map Canvas (Reference Implementation):**
- Full canvas UI at `/admin/story-maps/[id]/canvas`
- Components: CanvasViewLayout, CanvasHeader, CanvasSurface (reusable)
- Entity-specific: StoryMapCanvas, LayerHeader, ActivityHeader, StoryDetailPanel
- AI generation integrated via AIGenerateMenu
- Drag-and-drop story repositioning
- Mode toggle (drag vs structured)

**Other Entities:**
- All have form-based edit UIs
- No visual canvas views yet
- Data stored in JSONB blocks (except Blueprint steps which are relational)

---

## Project Hypotheses

### H1: Reusable Canvas Framework
**Statement:** The base canvas components (CanvasViewLayout, CanvasHeader, CanvasSurface, AIGenerateMenu) can be reused without modification for all new canvas types.

**Validation:** Successfully implement 2+ canvas types using only entity-specific components.

### H2: TimelineCanvas Pattern (Blueprints + Journeys)
**Statement:** Blueprints and Journeys (both sequence-based with steps/stages) can share a common "timeline grid" component pattern.

**Validation:** Create a shared TimelineCanvas component used by both Blueprints and Journeys.

### H3: BlockGridCanvas Pattern (Strategyzer Canvases)
**Statement:** Canvases storing data as JSONB blocks (BMC, VPC, Customer Profile, Value Map) can share a common "block grid" component pattern.

**Validation:** Create a shared BlockGridCanvas component used by 2+ canvas types.

### H4: AI Generation Scalability
**Statement:** The AIGenerateMenu pattern can generate content for any canvas type by configuring entity-generation prompts.

**Validation:** AI generation works for all 6 canvas types with appropriate prompt configs.

---

## Canvas Patterns

### Pattern A: Timeline Grid (Steps × Layers)

**Used by:** Service Blueprints, Customer Journeys

```
             Step 1    Step 2    Step 3    Step 4    +
           ┌─────────┬─────────┬─────────┬─────────┬───┐
Layer 1    │  cell   │  cell   │  cell   │  cell   │   │
           ├─────────┼─────────┼─────────┼─────────┤   │
Layer 2    │  cell   │  cell   │  cell   │  cell   │   │
           ├─────────┼─────────┼─────────┼─────────┤   │
Layer 3    │  cell   │  cell   │  cell   │  cell   │   │
           └─────────┴─────────┴─────────┴─────────┴───┘
```

**Shared Components:**
- `TimelineCanvas` - Generic steps × layers grid
- Props: steps, layers, mode, renderCell, getters, callbacks

**Entity-Specific:**
- Layer definitions (fixed per entity type)
- Cell content/styling
- Detail panel fields

### Pattern B: Block Grid (Fixed Sections)

**Used by:** BMC, Customer Profile, Value Map

```
┌──────────────┬──────────────┬──────────────┐
│   Block 1    │   Block 2    │   Block 3    │
│   (items)    │   (items)    │   (items)    │
├──────────────┼──────────────┼──────────────┤
│   Block 4    │   Block 5    │   Block 6    │
│   (items)    │   (items)    │   (items)    │
└──────────────┴──────────────┴──────────────┘
```

**Shared Components:**
- `BlockGridCanvas` - Generic block layout
- `CanvasBlock` - Individual block with items
- `BlockItem` - Item card

**Entity-Specific:**
- Block definitions (semantic meaning per canvas type)
- Item fields and visualization

### Pattern C: Split View (Side-by-Side)

**Used by:** Value Proposition Canvas

```
┌─────────────────────┬─────────────────────┐
│    Value Map        │  Customer Profile   │
│   (3 blocks)        │    (3 blocks)       │
│                     │                     │
│ ┌─────┐ ┌─────────┐ │ ┌─────────┐ ┌─────┐ │
│ │Prod │ │Pain Rel │ │ │  Jobs   │ │Pains│ │
│ │ucts │ │ievers   │ │ │         │ │     │ │
│ └─────┘ └─────────┘ │ └─────────┘ └─────┘ │
│         ┌─────────┐ │ ┌─────────┐         │
│         │Gain Cre │ │ │  Gains  │         │
│         │ators    │ │ │         │         │
│         └─────────┘ │ └─────────┘         │
└─────────────────────┴─────────────────────┘
```

---

## Design Decisions (from Q&A)

### Universal Decisions

| Decision | Choice | Notes |
|----------|--------|-------|
| Mode toggle | Both modes (drag + structured) | Consistent with Story Map |
| Navigation | Additional `/canvas` route | Keep existing form pages |
| AI generation | Full canvas + cell-level | Both scopes available |
| Empty state | Placeholder + drop target | "Click to add" + dashed border in drag mode |

### Timeline-Specific Decisions

| Decision | Choice | Notes |
|----------|--------|-------|
| Step flow | Sequential numbers (1, 2, 3...) | In header |
| Step reorder | Menu + drag | Three-dot menu + drag mode |
| Layer styling | Color-coded swimlanes | Subtle background tint per layer |
| Cell content | Text only (clean) | No metadata badges in cells |
| Detail panel | Selected cell only | Side panel for editing |

### Blueprint-Specific Decisions

| Decision | Choice | Notes |
|----------|--------|-------|
| Layers | 5 total (4 content + 1 separator) | customer_action, frontstage, LINE OF VISIBILITY, backstage, support_process |
| Line of visibility | Visual separator only | Gray dashed line, no stored data |
| Data model | New `blueprint_cells` table | Proper relations, not JSONB |
| Migration | Drop and forget | No important data to migrate |
| Cell fields | Simple MVP | content, basic metadata |

### Journey-Specific Decisions

| Decision | Choice | Notes |
|----------|--------|-------|
| Layers | TBD in Phase 2 spec | Likely: touchpoints, emotions, pain points, channels |
| Data model | TBD | May need journey_cells table |

### Block Grid Decisions

| Decision | Choice | Notes |
|----------|--------|-------|
| Block layout | Per BMC/VPC standard | Fixed positions |
| Items | JSONB array per block | Existing pattern |
| Drag | Reorder within block | Not cross-block |

---

## Phase Specifications

### Phase 1: Blueprint Canvas
**Spec:** `phase1-blueprint-canvas-spec.md`
**Status:** Spec complete (P0 fixes applied)

**P0 Tech Review Fixes Applied:**
- RLS policies use `TO authenticated` pattern
- ActionResult type and error codes defined
- Authorization helpers documented
- Validation boundary-objects defined
- Entity type registration requirement documented
- Upsert pattern for UNIQUE constraint
- Navigation integration documented

### Phase 2: Journey Canvas
**Spec:** `phase2-journey-canvas-spec.md`
**Status:** Spec complete (P0 fixes applied)

**P0 Tech Review Fixes Applied:**
- Consistent RLS policy pattern
- Pattern reuse table from Phase 1
- Entity type registration documented
- Navigation integration documented

### Phase 3: BMC Canvas
**Spec:** `phase3-bmc-canvas-spec.md`
**Status:** Spec complete (P0 fixes applied)

**P0 Tech Review Fixes Applied:**
- Design decision documented (JSONB appropriate for block-based canvases)
- ActionResult type matches Timeline canvas pattern
- Authorization helper pattern (verifyCanvasAccess)
- Validation boundary-objects (lib/boundary-objects/bmc-canvas.ts)
- Entity type registration requirement (bmc_items)
- Navigation integration documented
- JSONB helper RPC pattern documented

### Phase 4: Customer Profile + Value Map
**Spec:** `phase4-profile-valuemap-spec.md`
**Status:** Spec complete (P0 fixes applied)

**P0 Tech Review Fixes Applied:**
- BlockGridCanvas reuse from Phase 3
- ActionResult type matches pattern
- Authorization helpers for both entity types
- Two validation boundary-object files (customer-profile-canvas.ts, value-map-canvas.ts)
- Entity type registration (customer_profile_items, value_map_items)
- Navigation integration for both canvas types
- Item type definitions with optional metadata fields

### Phase 5: VPC Split Canvas
**Spec:** `phase5-vpc-split-spec.md`
**Status:** Spec complete (P0 fixes applied)

**P0 Tech Review Fixes Applied:**
- Split view composition pattern documented
- ActionResult type matches pattern
- Authorization helper verifies VPC + linked entities access
- Validation boundary-objects (vpc-canvas.ts with fit calculation)
- Entity type registration (vpc_full, vpc_fit_suggestions)
- Navigation integration documented
- Leverages existing fit analysis fields (no new tables needed)

---

## Shared Patterns (All Phases)

These patterns ensure consistency and inter-operability across all canvas types:

### 1. ActionResult Type
```typescript
type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string; code?: string }
```

### 2. RLS Policy Pattern
```sql
ALTER TABLE <table_name> ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view ..." ON <table_name>
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage ..." ON <table_name>
  FOR ALL TO authenticated USING (true);
```

### 3. Authorization Helper Pattern
```typescript
async function verify<Entity>Access(
  supabase: Awaited<ReturnType<typeof createClient>>,
  entityId: string
): Promise<{ success: true; parentId: string } | { success: false; error: string }>
```

### 4. Entity Type Registration
All AI-generated entity types must be registered in `ENTITY_GENERATION_CONFIGS` before use.

### 5. Navigation Integration
Every canvas route needs a "Canvas View" link added to the corresponding detail/edit page.

### 6. Validation Boundary Objects
Each canvas type gets a `lib/boundary-objects/<entity>-cells.ts` file with validation constants and functions.

---

## Component Architecture

```
/components/admin/canvas/
├── index.ts                    (exports)
│
├── # Base (Existing - Reuse)
├── canvas-view-layout.tsx      ✓ Reusable
├── canvas-header.tsx           ✓ Reusable
├── canvas-surface.tsx          ✓ Reusable
├── ai-generate-menu.tsx        ✓ Reusable
│
├── # Story Map (Existing)
├── story-map-canvas.tsx        (entity-specific)
├── layer-header.tsx            (entity-specific)
├── activity-header.tsx         (entity-specific)
├── story-detail-panel.tsx      (entity-specific)
├── create-story-modal.tsx      (entity-specific)
│
├── # Timeline (New - Phase 1-2)
├── timeline-canvas.tsx         (shared for Blueprints + Journeys)
├── blueprint-canvas.tsx        (Blueprint wrapper)
├── blueprint-step-header.tsx   (Blueprint columns)
├── blueprint-lane-header.tsx   (Blueprint rows)
├── blueprint-cell.tsx          (Blueprint cell)
├── blueprint-cell-detail-panel.tsx
├── journey-canvas.tsx          (Journey wrapper - Phase 2)
├── journey-stage-header.tsx    (Journey columns - Phase 2)
├── journey-lane-header.tsx     (Journey rows - Phase 2)
├── journey-cell.tsx            (Journey cell - Phase 2)
│
├── # Block Grid (New - Phase 3-4)
├── block-grid-canvas.tsx       (shared for BMC, Profile, Value Map)
├── canvas-block.tsx            (block container)
├── block-item.tsx              (item card)
├── item-detail-panel.tsx       (side panel)
├── bmc-canvas.tsx              (BMC wrapper)
├── customer-profile-canvas.tsx (Profile wrapper)
├── value-map-canvas.tsx        (Value Map wrapper)
│
└── # Split View (New - Phase 5)
    └── vpc-canvas.tsx          (VPC split view)
```

---

## Routes to Add

| Entity | Current | Canvas Route | Phase |
|--------|---------|--------------|-------|
| Story Map | ✓ `/admin/story-maps/[id]/canvas` | Done | - |
| Blueprint | `/admin/blueprints/[id]/edit` | `/admin/blueprints/[id]/canvas` | 1 |
| Journey | `/admin/journeys/[id]` | `/admin/journeys/[id]/canvas` | 2 |
| BMC | `/admin/canvases/business-models/[id]/edit` | `/admin/canvases/business-models/[id]/canvas` | 3 |
| Customer Profile | `/admin/canvases/customer-profiles/[id]/edit` | `/admin/canvases/customer-profiles/[id]/canvas` | 4 |
| Value Map | `/admin/canvases/value-maps/[id]/edit` | `/admin/canvases/value-maps/[id]/canvas` | 4 |
| VPC | `/admin/canvases/value-propositions/[id]/edit` | `/admin/canvases/value-propositions/[id]/canvas` | 5 |

### URL Pattern Inconsistency (Known)

**Current state:** Routes are inconsistent:
- `/admin/blueprints/` - Top-level
- `/admin/journeys/` - Top-level
- `/admin/story-maps/` - Top-level
- `/admin/canvases/business-models/` - Nested under `/canvases/`
- `/admin/canvases/customer-profiles/` - Nested under `/canvases/`
- `/admin/canvases/value-maps/` - Nested under `/canvases/`
- `/admin/canvases/value-propositions/` - Nested under `/canvases/`

**Decision:** Accept inconsistency for now. These routes match the existing admin UI structure. URL cleanup is a separate refactor (would require migration of bookmarks, nav, etc.).

---

## Retrofitting Existing Implementations

### Story Map Canvas → TimelineCanvas

**When:** After Phase 1 (Blueprint) validates TimelineCanvas

**Current state:** `story-map-canvas.tsx` has custom grid implementation with:
- `activity-header.tsx` (column headers)
- `layer-header.tsx` (row headers)
- Custom grid rendering in StoryMapCanvas component

**Refactor plan:**
1. Wrap existing Story Map canvas with TimelineCanvas
2. Map activities → steps, layers → layers
3. Keep entity-specific components (StoryDetailPanel, CreateStoryModal)
4. Rename/generalize headers if beneficial:
   - `activity-header.tsx` → Keep (semantic for story maps)
   - `layer-header.tsx` → Keep (story map layers ≠ blueprint lanes)

**Validation:** Story Map canvas works identically after refactor, using shared TimelineCanvas base.

### Base Canvas Components

**When:** As patterns emerge during implementation

| Component | Current | Potential Updates |
|-----------|---------|-------------------|
| `CanvasViewLayout` | Generic | Likely no changes needed |
| `CanvasHeader` | Generic | May add standard action slots |
| `CanvasSurface` | Generic | Likely no changes needed |
| `AIGenerateMenu` | Generic | May need entity-type awareness |

### Component Extraction

As implementation progresses, evaluate extracting shared components:

| Candidate | From | To |
|-----------|------|-----|
| Inline editable header | ActivityHeader, LayerHeader | `InlineEditableHeader` |
| Three-dot menu | Activity, Step, Layer headers | `EntityOptionsMenu` |
| Cell selection state | Story, Blueprint cells | Shared hook or context |

**Principle:** Extract when pattern appears in 2+ implementations, not speculatively.

---

## Success Criteria

### Functional
1. **Coverage:** All 6 canvas types have visual canvas views
2. **Reuse:** 70%+ component code shared between similar types
3. **Consistency:** Same UX patterns (mode toggle, drag, AI generate) across all
4. **Performance:** Canvas renders 50+ items without lag
5. **AI Integration:** AI can generate content for each block/step type
6. **Retrofitting:** Story Map canvas uses TimelineCanvas after Phase 1

### Stability (P0 Tech Review)
7. **Pattern Consistency:** All phases follow Shared Patterns documented above
8. **RLS Security:** All new tables have RLS enabled with `TO authenticated` policies
9. **Type Safety:** ActionResult type used consistently across all canvas actions
10. **Validation:** All user inputs validated via boundary-object functions
11. **Entity Registration:** All AI entity types registered before implementation

---

## Dependencies

- Story Map canvas implementation (complete ✓)
- Entity data in Supabase (complete ✓)
- AI generation API (complete ✓)
- Entity generation prompts system (complete ✓)
- Entity link helper functions (upsert_entity_link, remove_entity_link) (complete ✓)
