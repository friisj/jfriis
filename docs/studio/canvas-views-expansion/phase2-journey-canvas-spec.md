# Phase 2: Journey Canvas Specification

> Detailed implementation spec for the Customer Journey canvas view.
> Reuses TimelineCanvas from Phase 1.

---

## Overview

**Route:** `/admin/journeys/[id]/canvas`
**Pattern:** Timeline grid (stages × layers)
**Priority:** Second (validates TimelineCanvas reuse)
**Depends on:** Phase 1 (TimelineCanvas component)

---

## Data Model

### Existing Tables

Journeys already use proper relational tables:

```sql
-- customer_journeys (parent)
-- journey_stages (columns - sequence-ordered)
-- journey_touchpoints (content per stage)
```

### Design Decision: journey_cells vs Existing touchpoints

**Current state:** `journey_touchpoints` table exists with fields: `name`, `description`, `channel_type`, `interaction_type`, `pain_level`, `is_moment_of_truth`.

**Decision:** Create new `journey_cells` table for canvas grid; evaluate touchpoints relationship during implementation.

**Rationale:**

| Factor | Repurpose touchpoints | New journey_cells (Chosen) |
|--------|----------------------|---------------------------|
| Schema fit | touchpoints = single interaction point | cells = stage × layer grid intersections |
| Layer concept | No layer dimension | Explicit layer_type column |
| Emotion tracking | `pain_level` (0-5) on touchpoint | `emotion_score` (-5 to +5) per cell |
| Multi-layer per stage | One touchpoint per stage? | Multiple cells (one per layer) |
| Pattern consistency | Different from Blueprint | Matches Blueprint cells pattern |

**Touchpoints relationship options (decide during implementation):**
1. **Migrate:** Convert touchpoints → touchpoint-layer cells, deprecate table
2. **Coexist:** Touchpoints remain as "key moments", cells for full grid
3. **Embed:** Touchpoint layer references existing touchpoints table

**Recommendation:** Start with Option 1 (migrate) for consistency, but flag for review if touchpoints have significant user data.

### New Table: `journey_cells`

Following the Blueprint cells pattern:

```sql
-- ============================================================================
-- JOURNEY_CELLS TABLE
-- Migration file: supabase/migrations/YYYYMMDD_journey_cells.sql
-- ============================================================================

CREATE TABLE journey_cells (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_id UUID NOT NULL REFERENCES journey_stages(id) ON DELETE CASCADE,
  layer_type TEXT NOT NULL CHECK (layer_type IN ('touchpoint', 'emotion', 'pain_point', 'channel', 'opportunity')),
  content TEXT,
  -- Layer-specific fields
  emotion_score INTEGER CHECK (emotion_score BETWEEN -5 AND 5),  -- For emotion layer
  channel_type TEXT,  -- For channel layer
  sequence INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- One cell per stage × layer intersection
  UNIQUE(stage_id, layer_type)
);

CREATE INDEX idx_journey_cells_stage ON journey_cells(stage_id);

-- ============================================================================
-- RLS POLICIES (consistent with Blueprint cells)
-- ============================================================================

ALTER TABLE journey_cells ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view journey cells" ON journey_cells
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage journey cells" ON journey_cells
  FOR ALL TO authenticated USING (true);

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_name = 'journey_cells'
  ) THEN
    RAISE EXCEPTION 'journey_cells table not created';
  END IF;
  RAISE NOTICE 'journey_cells table created successfully';
END $$;
```

### UNIQUE Constraint Behavior

Same pattern as Blueprint: use upsert in `createCellAction` to handle one-cell-per-intersection constraint gracefully.

### Migration Notes
- No data migration needed if touchpoints table has no significant user data
- Recommendation: Start with Option 1 (migrate) for pattern consistency
- Keep touchpoints table temporarily for rollback safety

---

## Layer Structure

| # | Layer Type | Display Name | Color | Description |
|---|------------|--------------|-------|-------------|
| 1 | `touchpoint` | Touchpoints | Blue | Customer interaction points |
| 2 | `emotion` | Emotions | Pink/Red gradient | Emotional state (-5 to +5) |
| 3 | `pain_point` | Pain Points | Orange | Frustrations and problems |
| 4 | `channel` | Channels | Green | Communication channels used |
| 5 | `opportunity` | Opportunities | Purple | Improvement opportunities |

**Emotion Layer Special Behavior:**
- Displays emotion score as visual indicator (smile/frown scale)
- Cell background color gradient based on score
- Optional: Connected line chart across stages

---

## UI Specification

### Grid Layout

```
┌─────────────┬───────────┬───────────┬───────────┬───────────┬─────┐
│             │  Stage 1  │  Stage 2  │  Stage 3  │  Stage 4  │  +  │
├─────────────┼───────────┼───────────┼───────────┼───────────┼─────┤
│ Touchpoints │   cell    │   cell    │   cell    │   cell    │     │
├─────────────┼───────────┼───────────┼───────────┼───────────┤     │
│ Emotions    │   😊 +3   │   😐 0    │   😔 -2   │   😊 +4   │     │
├─────────────┼───────────┼───────────┼───────────┼───────────┤     │
│ Pain Points │   cell    │   cell    │   cell    │   cell    │     │
├─────────────┼───────────┼───────────┼───────────┼───────────┤     │
│ Channels    │   cell    │   cell    │   cell    │   cell    │     │
├─────────────┼───────────┼───────────┼───────────┼───────────┤     │
│ Opportunities│  cell    │   cell    │   cell    │   cell    │     │
└─────────────┴───────────┴───────────┴───────────┴───────────┴─────┘
```

### Visual Styling

| Element | Style |
|---------|-------|
| Stage columns | Stage name in header |
| Layer rows | Color-coded swimlanes |
| Emotion cells | Score + emoji + gradient background |
| Channel cells | Channel type badge + content |
| Empty cells | "Click to add" placeholder |

### Mode Behavior

Same as Blueprint (Phase 1):
- **Structured mode:** Click opens detail panel
- **Drag mode:** Click selects, drag reorders stages

---

## Components

### Reused from Phase 1

- `TimelineCanvas` - Base grid component
- Pattern: All step/layer getters and renderCell

### Journey-Specific (New)

| Component | Purpose |
|-----------|---------|
| `JourneyCanvas` | Wrapper with journey config |
| `JourneyStageHeader` | Stage column header |
| `JourneyLaneHeader` | Layer row header |
| `JourneyCell` | Cell with layer-specific rendering |
| `JourneyCellDetailPanel` | Side panel for editing |
| `EmotionScoreInput` | Special input for emotion score |

---

## Server Actions

**File:** `app/(private)/admin/journeys/[id]/canvas/actions.ts`

Follows the same patterns as Blueprint (Phase 1):

### Type Definitions

```typescript
'use server'

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string; code?: string }

interface CellData {
  content: string
  emotion_score?: number  // -5 to +5 for emotion layer
  channel_type?: string   // For channel layer
}
```

### Authorization Pattern

```typescript
// Same pattern as Blueprint - verify via parent journey
async function verifyJourneyAccess(supabase, journeyId): Promise<{ success: true; journeyId: string } | { success: false; error: string }>
async function verifyStageAccess(supabase, stageId): Promise<{ success: true; journeyId: string } | { success: false; error: string }>
async function verifyCellAccess(supabase, cellId): Promise<{ success: true; journeyId: string } | { success: false; error: string }>
```

### Action Signatures

```typescript
// Cell CRUD (upsert for create)
export async function createCellAction(stageId: string, layerType: string, data: CellData): Promise<ActionResult>
export async function updateCellAction(cellId: string, data: CellUpdateData): Promise<ActionResult>
export async function deleteCellAction(cellId: string): Promise<ActionResult>

// Stage management
export async function createStageAction(journeyId: string, name: string, sequence: number): Promise<ActionResult>
export async function updateStageAction(stageId: string, data: StageUpdateData): Promise<ActionResult>
export async function deleteStageAction(stageId: string): Promise<ActionResult>
export async function reorderStagesAction(journeyId: string, stageIds: string[]): Promise<ActionResult>

// Bulk operations
export async function bulkCreateCellsAction(stageId: string, cells: CellData[]): Promise<ActionResult<{ count: number }>>
export async function bulkCreateStagesAction(journeyId: string, stages: StageCreateData[]): Promise<ActionResult<{ count: number }>>
```

### Validation Constants

**File:** `lib/boundary-objects/journey-cells.ts`

```typescript
export const JOURNEY_LAYER_TYPES = ['touchpoint', 'emotion', 'pain_point', 'channel', 'opportunity'] as const
export const EMOTION_SCORE_MIN = -5
export const EMOTION_SCORE_MAX = 5
export const CELL_CONTENT_MAX_LENGTH = 2000
export const STAGE_NAME_MAX_LENGTH = 100
```

---

## AI Generation

### Generation Options

| Option | Scope | Description |
|--------|-------|-------------|
| Generate Stages | Full canvas | Generate journey stages |
| Generate Cell Content | Single cell | Generate content for selected cell |
| Fill Row | Single layer | Generate content for all cells in layer |
| Fill Column | Single stage | Generate content for all layers in stage |

### Entity Type Registration (REQUIRED)

**File:** `lib/ai/prompts/entity-generation.ts`

Add both `journey_stages` and `journey_cells` to `ENTITY_GENERATION_CONFIGS`:

```typescript
journey_stages: {
  systemPrompt: `Generate stages for a customer journey that map the progression through an experience.
Each stage represents a distinct phase. Stages should:
- Flow logically as temporal sequence
- Cover the full experience arc
- Have clear entry/exit criteria`,
  fieldsToGenerate: ['name', 'description'],
  defaultValues: {},
  contextFields: ['journey_name', 'journey_description', 'persona_context', 'existing_stages'],
  displayField: 'name',
  editableFields: ['name', 'description'],
  fieldHints: {
    name: 'Short stage name (e.g., "Discovery", "Evaluation")',
    description: 'What happens during this stage'
  }
},

journey_cells: {
  systemPrompt: `Generate content for a customer journey cell at the intersection of a stage and layer.
Consider:
- Stage context: what phase of the journey
- Layer type: touchpoint / emotion / pain_point / channel / opportunity
Write appropriate content for the layer type.`,
  fieldsToGenerate: ['content', 'emotion_score', 'channel_type'],
  defaultValues: {},
  contextFields: ['stage_name', 'layer_type', 'journey_context', 'persona_context'],
  displayField: 'content',
  editableFields: ['content', 'emotion_score', 'channel_type'],
  fieldHints: {
    content: 'Description for this stage and layer',
    emotion_score: 'Customer emotional state (-5 to +5)',
    channel_type: 'Communication channel (email, phone, web, etc.)'
  }
}
```

---

## Route Structure

```
/app/(private)/admin/journeys/[id]/
├── page.tsx                    # Existing detail view
├── edit/
│   └── page.tsx                # Existing form edit
└── canvas/
    ├── page.tsx                # Canvas page
    ├── journey-canvas-view.tsx # Client orchestration
    └── actions.ts              # Server actions
```

### Navigation Integration

```typescript
// Add link in journey detail/edit page
<Button asChild variant="outline">
  <Link href={`/admin/journeys/${journey.id}/canvas`}>
    <LayoutGrid className="h-4 w-4 mr-2" />
    Canvas View
  </Link>
</Button>
```

---

## Verification Checklist

### Core Functionality
- [ ] TimelineCanvas successfully reused from Phase 1
- [ ] Can navigate to `/admin/journeys/[id]/canvas`
- [ ] Grid displays stages as columns, 5 layers as rows
- [ ] Emotion layer shows score with visual indicator
- [ ] Can add/edit/delete stages
- [ ] Can reorder stages
- [ ] Cell editing works via detail panel (upsert behavior)
- [ ] AI generation works for stages and cells
- [ ] Mode toggle works

### P0 Fixes (Tech Review)
- [ ] RLS policies use `TO authenticated` pattern
- [ ] ActionResult type matches Phase 1 pattern
- [ ] Authorization helpers verify access before mutations
- [ ] Validation constants in boundary-objects
- [ ] Entity types registered in ENTITY_GENERATION_CONFIGS
- [ ] Navigation link added to existing journey pages
- [ ] Build compiles without errors

---

## Dependencies

- Phase 1 complete (TimelineCanvas exists) ✓
- Existing `customer_journeys` and `journey_stages` tables ✓

---

## Pattern Reuse from Phase 1

| Pattern | Source | Reuse |
|---------|--------|-------|
| TimelineCanvas | `components/admin/canvas/timeline-canvas.tsx` | Direct reuse |
| ActionResult type | Phase 1 actions | Copy pattern |
| Authorization helpers | Phase 1 actions | Adapt for journey entities |
| Validation boundary-object | Phase 1 | New file with journey constants |
| RLS policy | Phase 1 migration | Same pattern |
| Navigation integration | Phase 1 | Same pattern |

**Stability Principle:** Phase 2 validates that Phase 1 patterns are truly reusable. Any friction indicates patterns need refinement.
