# Canvas Views Expansion Project

## Overview

Extend the reusable canvas UI pattern (established with Story Maps) to all strategic planning entities: Blueprints, Journeys, BMC, VPC, Customer Profiles, and Value Maps.

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
- Data stored in JSONB blocks (items arrays)

---

## Project Hypotheses

### H1: Reusable Canvas Framework
**Statement:** The base canvas components (CanvasViewLayout, CanvasHeader, CanvasSurface, AIGenerateMenu) can be reused without modification for all new canvas types.

**Validation:** Successfully implement 2+ canvas types using only entity-specific components.

### H2: JSONB Block Pattern
**Statement:** Canvases storing data as JSONB blocks (BMC, VPC, Customer Profile, Value Map) can share a common "block grid" component pattern.

**Validation:** Create a shared BlockGridCanvas component used by 2+ canvas types.

### H3: Step-Sequence Pattern
**Statement:** Blueprints and Journeys (both sequence-based with steps/stages) can share a common "timeline grid" component pattern.

**Validation:** Create a shared TimelineCanvas component used by both Blueprints and Journeys.

### H4: AI Generation Scalability
**Statement:** The AIGenerateMenu pattern can generate content for any canvas type by configuring entity-generation prompts.

**Validation:** AI generation works for all 6 canvas types with appropriate prompt configs.

---

## Canvas Types Analysis

### Type A: Fixed Block Grid (Strategyzer Canvases)

**Entities:** Business Model Canvas, Value Proposition Canvas, Customer Profile, Value Map

**Common Pattern:**
- Fixed number of "blocks" (sections) with semantic meaning
- Each block contains items array (JSONB)
- Items have: content, priority/importance, evidence, assumptions
- No sequence/ordering between blocks (spatial layout)

**Grid Structure:**
```
┌──────────────┬──────────────┬──────────────┐
│   Block 1    │   Block 2    │   Block 3    │
│   (items)    │   (items)    │   (items)    │
├──────────────┼──────────────┼──────────────┤
│   Block 4    │   Block 5    │   Block 6    │
│   (items)    │   (items)    │   (items)    │
└──────────────┴──────────────┴──────────────┘
```

**Shared Components Needed:**
- `BlockGridCanvas` - Renders fixed grid of blocks
- `CanvasBlock` - Individual block with items
- `BlockItem` - Item card with content, evidence, actions
- `CreateItemModal` - Add item to block
- `ItemDetailPanel` - Edit item details

### Type B: Timeline Grid (Sequence-Based)

**Entities:** Service Blueprints, Customer Journeys

**Common Pattern:**
- Sequence of steps/stages (horizontal axis)
- Layers/lanes per step (vertical axis)
- Each cell contains content for that step × layer intersection
- Ordered sequence matters

**Grid Structure:**
```
           Step 1    Step 2    Step 3    Step 4
         ┌─────────┬─────────┬─────────┬─────────┐
Layer 1  │ Cell 1  │ Cell 2  │ Cell 3  │ Cell 4  │
         ├─────────┼─────────┼─────────┼─────────┤
Layer 2  │ Cell 5  │ Cell 6  │ Cell 7  │ Cell 8  │
         ├─────────┼─────────┼─────────┼─────────┤
Layer 3  │ Cell 9  │ Cell 10 │ Cell 11 │ Cell 12 │
         └─────────┴─────────┴─────────┴─────────┘
```

**Shared Components Needed:**
- `TimelineCanvas` - Renders steps × layers grid
- `StepHeader` - Column header with step controls
- `LaneHeader` - Row header with lane controls
- `TimelineCell` - Cell content with inline editing
- `StepDetailPanel` - Edit full step details

---

## Implementation Plan

### Phase 1: Block Grid Foundation

**Experiment 1.1: BlockGridCanvas Component**
- Create `components/admin/canvas/block-grid-canvas.tsx`
- Generic block grid renderer
- Props: blocks config, items data, handlers

**Experiment 1.2: Business Model Canvas View**
- Implement BMC using BlockGridCanvas
- Route: `/admin/canvases/business-models/[id]/canvas`
- 9-block layout per BMC specification
- AI generation for block items

**Experiment 1.3: Value Map Canvas View**
- 3-block layout (products, pain relievers, gain creators)
- Route: `/admin/canvases/value-maps/[id]/canvas`
- Reuse BlockGridCanvas + block components

**Experiment 1.4: Customer Profile Canvas View**
- 3-block layout (jobs, pains, gains)
- Route: `/admin/canvases/customer-profiles/[id]/canvas`
- Add severity/importance visualization

### Phase 2: Value Proposition Canvas

**Experiment 2.1: VPC Split Canvas**
- Combined view: Value Map (left) + Customer Profile (right)
- Route: `/admin/canvases/value-propositions/[id]/canvas`
- Visual alignment indicators between sides
- Fit score calculation display

### Phase 3: Timeline Foundation

**Experiment 3.1: TimelineCanvas Component**
- Create `components/admin/canvas/timeline-canvas.tsx`
- Steps × Layers grid with horizontal scroll
- Reorderable steps, fixed layers per entity type

**Experiment 3.2: Service Blueprint Canvas View**
- Route: `/admin/blueprints/[id]/canvas`
- 4 layers: Customer Action, Frontstage, Backstage, Support
- Steps with sequence numbering
- AI generation for step content

**Experiment 3.3: Customer Journey Canvas View**
- Route: `/admin/journeys/[id]/canvas`
- Stages as columns, touchpoints as content
- Emotion/pain curve visualization
- Channel type indicators

### Phase 4: AI Generation & Polish

**Experiment 4.1: Entity Generation Prompts**
- Add generation configs for all canvas types
- Block items, step content, touchpoint details

**Experiment 4.2: Cross-Canvas Linking**
- Visual indicators for linked canvases
- Quick navigation between related canvases

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
├── # Block Grid (New - Phase 1)
├── block-grid-canvas.tsx       (shared for Type A)
├── canvas-block.tsx            (block container)
├── block-item.tsx              (item card)
├── item-detail-panel.tsx       (side panel)
├── create-item-modal.tsx       (add item)
│
├── # Timeline (New - Phase 3)
├── timeline-canvas.tsx         (shared for Type B)
├── step-header.tsx             (column header)
├── lane-header.tsx             (row header)
├── timeline-cell.tsx           (cell content)
├── step-detail-panel.tsx       (side panel)
│
└── # Entity-Specific Wrappers
    ├── bmc-canvas.tsx          (BMC-specific config)
    ├── vpc-canvas.tsx          (VPC-specific config)
    ├── customer-profile-canvas.tsx
    ├── value-map-canvas.tsx
    ├── blueprint-canvas.tsx
    └── journey-canvas.tsx
```

---

## Routes to Add

| Entity | Current | Canvas Route |
|--------|---------|--------------|
| Story Map | ✓ `/admin/story-maps/[id]/canvas` | Done |
| BMC | `/admin/canvases/business-models/[id]/edit` | `/admin/canvases/business-models/[id]/canvas` |
| VPC | `/admin/canvases/value-propositions/[id]/edit` | `/admin/canvases/value-propositions/[id]/canvas` |
| Customer Profile | `/admin/canvases/customer-profiles/[id]/edit` | `/admin/canvases/customer-profiles/[id]/canvas` |
| Value Map | `/admin/canvases/value-maps/[id]/edit` | `/admin/canvases/value-maps/[id]/canvas` |
| Blueprint | `/admin/blueprints/[id]/edit` | `/admin/blueprints/[id]/canvas` |
| Journey | `/admin/journeys/[id]` | `/admin/journeys/[id]/canvas` |

---

## Entity Generation Prompts to Add

```typescript
// lib/ai/prompts/entity-generation.ts

// Block Grid Types
bmc_items: { ... }           // BMC block items
value_map_items: { ... }     // Value map items
customer_profile_items: { ... }  // Profile items

// Timeline Types
blueprint_steps: { ... }     // Blueprint step content
journey_touchpoints: { ... } // Journey touchpoints
```

---

## Success Criteria

1. **Coverage:** All 6 canvas types have visual canvas views
2. **Reuse:** 70%+ component code shared between similar types
3. **Consistency:** Same UX patterns (mode toggle, drag, AI generate) across all
4. **Performance:** Canvas renders 50+ items without lag
5. **AI Integration:** AI can generate content for each block/step type

---

## Dependencies

- Story Map canvas implementation (complete ✓)
- Entity data in Supabase (complete ✓)
- AI generation API (complete ✓)
- Entity generation prompts system (complete ✓)

---

## Risks

| Risk | Mitigation |
|------|------------|
| JSONB structure varies | Create adapter functions per entity type |
| VPC needs two canvases side-by-side | Design split-view component |
| Blueprint layers are JSONB, not relations | Extract to proper cells structure |
| Journey has nested touchpoints | Flatten to grid representation |

---

## Estimated Scope

| Phase | Experiments | New Components | Routes |
|-------|-------------|----------------|--------|
| 1 | 4 | 5 | 3 |
| 2 | 1 | 1 | 1 |
| 3 | 3 | 5 | 2 |
| 4 | 2 | 0 | 0 |
| **Total** | **10** | **11** | **6** |
