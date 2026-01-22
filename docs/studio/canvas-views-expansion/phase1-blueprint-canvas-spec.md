# Phase 1: Blueprint Canvas Specification

> Detailed implementation spec for the Service Blueprint canvas view.
> This is the first canvas type after Story Maps and validates the TimelineCanvas pattern.

---

## Overview

**Route:** `/admin/blueprints/[id]/canvas`
**Pattern:** Timeline grid (steps × layers)
**Priority:** First (most complex - if this works, others are easier)

---

## Data Model

### Design Decision: Relational Cells vs JSONB

**Current state:** `blueprint_steps.layers` stores layer data as JSONB (created for Phase 3 form-based CRUD with comment "JSONB for table-friendly editing").

**Decision:** Create new `blueprint_cells` relational table, deprecate JSONB.

**Rationale:**

| Factor | JSONB Approach | Relational Cells (Chosen) |
|--------|----------------|---------------------------|
| Per-cell identity | Implicit (array index) | Explicit UUID per cell |
| Selection/edit tracking | Complex JSON manipulation | Simple row operations |
| Future entity_links | Can't FK to JSONB items | Cells can be linked to evidence, assumptions |
| Query patterns | JSON extraction functions | Simple WHERE clauses |
| Pattern consistency | Different from Story Maps | Matches Story Maps (activities + user_stories) |
| Canvas UI paradigm | Unnatural fit | Natural grid → row mapping |

**Story Maps precedent:** Story Maps use fully relational structure (`activities` → `user_stories` with `layer_id` FK). Blueprint cells follow this validated pattern.

**Migration impact:** None. Current `blueprint_steps.layers` JSONB contains only default empty values—no user data to preserve.

### New Table: `blueprint_cells`

```sql
-- ============================================================================
-- BLUEPRINT_CELLS TABLE
-- Migration file: supabase/migrations/YYYYMMDD_blueprint_cells.sql
-- ============================================================================

CREATE TABLE blueprint_cells (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  step_id UUID NOT NULL REFERENCES blueprint_steps(id) ON DELETE CASCADE,
  layer_type TEXT NOT NULL CHECK (layer_type IN ('customer_action', 'frontstage', 'backstage', 'support_process')),
  content TEXT,
  sequence INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- One cell per step × layer intersection
  UNIQUE(step_id, layer_type)
);

-- Index for efficient queries
CREATE INDEX idx_blueprint_cells_step ON blueprint_cells(step_id);

-- ============================================================================
-- RLS POLICIES
-- Pattern: Authenticated users can view/manage all (admin-only feature for MVP)
-- ============================================================================

ALTER TABLE blueprint_cells ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view blueprint cells" ON blueprint_cells
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage blueprint cells" ON blueprint_cells
  FOR ALL TO authenticated USING (true);

-- ============================================================================
-- ENTITY_LINKS SYNC (Optional - for future evidence linking)
-- Uses existing helper functions from 20260114100000_fix_entity_links_sync_triggers.sql
-- ============================================================================

-- NOTE: Blueprint cells don't have FK relationships that need auto-sync.
-- Entity links for evidence/assumptions will be managed manually via UI.
-- This trigger is provided for future use if needed.

-- FUTURE: If blueprint_cells gets a FK like `evidence_id`, add trigger:
-- CREATE OR REPLACE FUNCTION sync_blueprint_cell_evidence_link()
-- RETURNS TRIGGER SECURITY DEFINER SET search_path = public AS $$
-- BEGIN
--   IF TG_OP = 'INSERT' AND NEW.evidence_id IS NOT NULL THEN
--     PERFORM upsert_entity_link('blueprint_cell', NEW.id, 'evidence', NEW.evidence_id, 'supports');
--   ELSIF TG_OP = 'UPDATE' AND OLD.evidence_id IS DISTINCT FROM NEW.evidence_id THEN
--     DELETE FROM entity_links WHERE source_type = 'blueprint_cell' AND source_id = NEW.id AND link_type = 'supports';
--     IF NEW.evidence_id IS NOT NULL THEN
--       PERFORM upsert_entity_link('blueprint_cell', NEW.id, 'evidence', NEW.evidence_id, 'supports');
--     END IF;
--   ELSIF TG_OP = 'DELETE' AND OLD.evidence_id IS NOT NULL THEN
--     PERFORM remove_entity_link('blueprint_cell', OLD.id, 'evidence', OLD.evidence_id, 'supports');
--   END IF;
--   IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
-- END;
-- $$ LANGUAGE plpgsql;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
  -- Verify table exists with correct columns
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'blueprint_cells'
  ) THEN
    RAISE EXCEPTION 'blueprint_cells table not created';
  END IF;

  -- Verify RLS is enabled
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables
    WHERE tablename = 'blueprint_cells' AND rowsecurity = true
  ) THEN
    RAISE EXCEPTION 'RLS not enabled on blueprint_cells';
  END IF;

  RAISE NOTICE 'blueprint_cells table created successfully';
END $$;
```

### UNIQUE Constraint Behavior

The `UNIQUE(step_id, layer_type)` constraint ensures exactly one cell per step × layer intersection. Server actions handle this:

```typescript
// createCellAction uses upsert pattern for idempotency
export async function createCellAction(
  stepId: string,
  layerType: string,
  content: string
): Promise<ActionResult> {
  // ... auth and validation ...

  // Upsert: create if not exists, update if exists
  const { error } = await supabase
    .from('blueprint_cells')
    .upsert(
      { step_id: stepId, layer_type: layerType, content },
      { onConflict: 'step_id,layer_type' }
    )

  // ... error handling ...
}
```

### Migration Notes
- No data migration needed (existing JSONB data can be dropped)
- Old `layers` JSONB field on `blueprint_steps` becomes unused
- Keep old field temporarily for rollback safety, remove in future cleanup

---

## Layer Structure

| # | Layer Type | Display Name | Color | Description |
|---|------------|--------------|-------|-------------|
| 1 | `customer_action` | Customer Actions | Blue | What the customer does |
| 2 | `frontstage` | Frontstage | Green | Visible employee actions |
| - | *(separator)* | Line of Visibility | Gray dashed | Visual separator only, no content |
| 3 | `backstage` | Backstage | Orange | Hidden employee actions |
| 4 | `support_process` | Support Process | Purple | Systems and infrastructure |

**Line of Visibility:** Visual separator between frontstage and backstage. Rendered as a dashed horizontal line with label. Not a data layer - no cells stored.

---

## UI Specification

### Grid Layout

```
┌─────────────┬───────────┬───────────┬───────────┬───────────┬─────┐
│             │  Step 1   │  Step 2   │  Step 3   │  Step 4   │  +  │
├─────────────┼───────────┼───────────┼───────────┼───────────┼─────┤
│ Customer    │   cell    │   cell    │   cell    │   cell    │     │
│ Actions     │           │           │           │           │     │
├─────────────┼───────────┼───────────┼───────────┼───────────┤     │
│ Frontstage  │   cell    │   cell    │   cell    │   cell    │     │
├─────────────┼───────────┼───────────┼───────────┼───────────┤     │
│ ─ ─ Line of Visibility ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─│     │
├─────────────┼───────────┼───────────┼───────────┼───────────┤     │
│ Backstage   │   cell    │   cell    │   cell    │   cell    │     │
├─────────────┼───────────┼───────────┼───────────┼───────────┤     │
│ Support     │   cell    │   cell    │   cell    │   cell    │     │
│ Process     │           │           │           │           │     │
└─────────────┴───────────┴───────────┴───────────┴───────────┴─────┘
```

### Visual Styling

| Element | Style |
|---------|-------|
| Layer rows | Color-coded swimlanes (subtle background tint per layer) |
| Step columns | Sequential numbers (1, 2, 3...) in header |
| Line of Visibility | Gray dashed border with centered label |
| Empty cells | Placeholder text "Click to add" + dashed border on drag |
| Cell content | Text only (clean, no metadata badges) |

### Mode Behavior

| Mode | Cell Click | Cell Double-Click | Drag |
|------|------------|-------------------|------|
| **Structured** | Opens detail panel | N/A | Disabled |
| **Drag** | Selects cell | Opens detail panel | Reorder steps |

### Step Reordering

- **Menu option:** Three-dot menu on step header → "Move left" / "Move right"
- **Drag mode:** Drag column header to reorder (visual feedback during drag)

### Empty State Behavior

- Placeholder text: "Click to add content"
- In drag mode: Shows dashed border as drop target
- In structured mode: Click triggers detail panel with empty form

---

## Components

### Shared Base (New)

#### `TimelineCanvas`
**File:** `components/admin/canvas/timeline-canvas.tsx`

```typescript
interface TimelineCanvasProps<TStep, TLayer> {
  steps: TStep[]
  layers: TLayer[]
  mode: CanvasMode

  // Configuration
  getStepId: (step: TStep) => string
  getStepName: (step: TStep) => string
  getStepSequence: (step: TStep) => number
  getLayerId: (layer: TLayer) => string
  getLayerName: (layer: TLayer) => string
  getLayerColor?: (layer: TLayer) => string

  // Render slots
  renderCell: (step: TStep, layer: TLayer) => ReactNode
  renderStepHeader?: (step: TStep) => ReactNode
  renderLaneHeader?: (layer: TLayer) => ReactNode
  renderVisibilitySeparator?: () => ReactNode

  // Callbacks
  onStepReorder?: (stepIds: string[]) => void
  onCellClick?: (stepId: string, layerId: string) => void
  onBackgroundClick?: () => void
}
```

### Blueprint-Specific

#### `BlueprintCanvas`
**File:** `components/admin/canvas/blueprint-canvas.tsx`

Wraps TimelineCanvas with blueprint-specific configuration:
- Defines 4 content layers + visibility separator
- Provides cell renderer with blueprint cell data
- Handles step reorder via server action

#### `BlueprintStepHeader`
**File:** `components/admin/canvas/blueprint-step-header.tsx`

- Step number + name display
- Inline rename on click
- Three-dot menu: Rename, Move left, Move right, Delete
- Add step button at end of row

#### `BlueprintLaneHeader`
**File:** `components/admin/canvas/blueprint-lane-header.tsx`

- Layer name with color indicator
- Non-editable (fixed layer structure)

#### `BlueprintCell`
**File:** `components/admin/canvas/blueprint-cell.tsx`

- Displays cell content (text)
- Mode-dependent click behavior
- Empty state with placeholder
- Selected state highlight

#### `BlueprintCellDetailPanel`
**File:** `components/admin/canvas/blueprint-cell-detail-panel.tsx`

Side panel (like StoryDetailPanel) for editing selected cell:

**Fields:**
- Content (textarea, main edit field)
- Actors involved (text input, comma-separated)
- Duration/time estimate (text input)
- Cost implication (select: low/medium/high/none)
- Failure risk (select: low/medium/high/none)
- Evidence links (future: link to evidence records)

**Actions:**
- Save, Cancel, Clear content

---

## Server Actions

**File:** `app/(private)/admin/blueprints/[id]/canvas/actions.ts`

### Type Definitions

```typescript
'use server'

// ActionResult pattern (matches story-map-canvas)
type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string; code?: string }

// Error codes for client handling
type ErrorCode =
  | 'UNAUTHORIZED'
  | 'ACCESS_DENIED'
  | 'VALIDATION_ERROR'
  | 'DATABASE_ERROR'
  | 'DUPLICATE_ERROR'
  | 'NOT_FOUND'

// Data types
interface CellUpdateData {
  content?: string
  actors?: string
  duration?: string
  cost_implication?: 'none' | 'low' | 'medium' | 'high'
  failure_risk?: 'none' | 'low' | 'medium' | 'high'
}

interface StepUpdateData {
  name?: string
  description?: string
}

interface CellCreateData {
  layer_type: 'customer_action' | 'frontstage' | 'backstage' | 'support_process'
  content: string
}

interface StepCreateData {
  name: string
  description?: string
}
```

### Authorization Pattern

```typescript
// All actions follow this pattern (from story-map-canvas):

async function verifyBlueprintAccess(
  supabase: Awaited<ReturnType<typeof createClient>>,
  blueprintId: string
): Promise<{ success: true; blueprintId: string } | { success: false; error: string }> {
  const { data, error } = await supabase
    .from('service_blueprints')
    .select('id')
    .eq('id', blueprintId)
    .single()

  if (error || !data) {
    return { success: false, error: 'Blueprint not found or access denied' }
  }
  return { success: true, blueprintId: data.id }
}

async function verifyStepAccess(
  supabase: Awaited<ReturnType<typeof createClient>>,
  stepId: string
): Promise<{ success: true; blueprintId: string } | { success: false; error: string }> {
  const { data, error } = await supabase
    .from('blueprint_steps')
    .select('id, blueprint_id')
    .eq('id', stepId)
    .single()

  if (error || !data) {
    return { success: false, error: 'Step not found or access denied' }
  }
  return { success: true, blueprintId: data.blueprint_id }
}

async function verifyCellAccess(
  supabase: Awaited<ReturnType<typeof createClient>>,
  cellId: string
): Promise<{ success: true; blueprintId: string } | { success: false; error: string }> {
  const { data, error } = await supabase
    .from('blueprint_cells')
    .select('id, step:blueprint_steps(blueprint_id)')
    .eq('id', cellId)
    .single()

  if (error || !data || !data.step) {
    return { success: false, error: 'Cell not found or access denied' }
  }
  const step = data.step as { blueprint_id: string }
  return { success: true, blueprintId: step.blueprint_id }
}
```

### Action Signatures

```typescript
// Cell CRUD (upsert for create to handle UNIQUE constraint)
export async function createCellAction(stepId: string, layerType: string, content: string): Promise<ActionResult>
export async function updateCellAction(cellId: string, data: CellUpdateData): Promise<ActionResult>
export async function deleteCellAction(cellId: string): Promise<ActionResult>

// Step management
export async function createStepAction(blueprintId: string, name: string, sequence: number): Promise<ActionResult>
export async function updateStepAction(stepId: string, data: StepUpdateData): Promise<ActionResult>
export async function deleteStepAction(stepId: string): Promise<ActionResult>
export async function reorderStepsAction(blueprintId: string, stepIds: string[]): Promise<ActionResult>

// Bulk operations (for AI generation)
export async function bulkCreateCellsAction(stepId: string, cells: CellCreateData[]): Promise<ActionResult<{ count: number }>>
export async function bulkCreateStepsAction(blueprintId: string, steps: StepCreateData[]): Promise<ActionResult<{ count: number }>>
```

### Revalidation Pattern

```typescript
function revalidateBlueprintCanvas(blueprintId: string) {
  revalidatePath(`/admin/blueprints/${blueprintId}/canvas`, 'page')
  revalidatePath(`/admin/blueprints/${blueprintId}`, 'layout')
}
```

### Validation Constants

**File:** `lib/boundary-objects/blueprint-cells.ts`

```typescript
export const CELL_CONTENT_MAX_LENGTH = 2000
export const STEP_NAME_MAX_LENGTH = 100
export const STEP_DESCRIPTION_MAX_LENGTH = 1000

export const LAYER_TYPES = ['customer_action', 'frontstage', 'backstage', 'support_process'] as const
export type LayerType = typeof LAYER_TYPES[number]

export function validateCellContent(content: string): DataResult<string> {
  const trimmed = content.trim()
  if (trimmed.length > CELL_CONTENT_MAX_LENGTH) {
    return { success: false, error: `Content must be ${CELL_CONTENT_MAX_LENGTH} characters or less` }
  }
  return { success: true, data: trimmed }
}

export function validateStepName(name: string): DataResult<string> {
  const trimmed = name.trim()
  if (!trimmed) {
    return { success: false, error: 'Step name is required' }
  }
  if (trimmed.length > STEP_NAME_MAX_LENGTH) {
    return { success: false, error: `Step name must be ${STEP_NAME_MAX_LENGTH} characters or less` }
  }
  return { success: true, data: trimmed }
}

export function validateLayerType(layerType: string): DataResult<LayerType> {
  if (!LAYER_TYPES.includes(layerType as LayerType)) {
    return { success: false, error: `Invalid layer type: ${layerType}` }
  }
  return { success: true, data: layerType as LayerType }
}
```

---

## AI Generation

### Generation Options

| Option | Scope | Description |
|--------|-------|-------------|
| Generate Steps | Full canvas | Generate step sequence for the blueprint |
| Generate Cell Content | Single cell | Generate content for selected cell based on context |
| Fill Row | Single layer | Generate content for all cells in one layer |
| Fill Column | Single step | Generate content for all layers in one step |

### Entity Type Registration (REQUIRED)

**File:** `lib/ai/prompts/entity-generation.ts`

Add both `blueprint_steps` and `blueprint_cells` to `ENTITY_GENERATION_CONFIGS`:

```typescript
import { ENTITY_GENERATION_CONFIGS } from './entity-generation'

// REQUIRED: Register both entity types before use
// Verify in lib/ai/prompts/entity-generation.ts:

export const ENTITY_GENERATION_CONFIGS: Record<EntityType, EntityGenerationConfig> = {
  // ... existing configs ...

  blueprint_steps: {
    systemPrompt: `Generate steps for a service blueprint that map the customer journey through service delivery.
Each step represents a moment in the service experience. Steps should:
- Flow logically left-to-right as a sequence
- Cover the full service encounter
- Be specific enough to map actions at each layer
- Use concise names (2-4 words)`,
    fieldsToGenerate: ['name', 'description'],
    defaultValues: {},
    contextFields: ['blueprint_name', 'blueprint_description', 'blueprint_type', 'existing_steps'],
    displayField: 'name',
    editableFields: ['name', 'description'],
    fieldHints: {
      name: 'Short action phrase (e.g., "Enter store", "Browse products")',
      description: 'What happens during this step'
    }
  },

  blueprint_cells: {
    systemPrompt: `Generate content for a service blueprint cell at the intersection of a step and layer.
Consider:
- Step context: what moment in the journey
- Layer type: customer action / frontstage / backstage / support process
- Adjacent cells: maintain consistency with neighboring content
Write concise, actionable descriptions of what happens at this intersection.`,
    fieldsToGenerate: ['content'],
    defaultValues: {},
    contextFields: ['step_name', 'layer_type', 'blueprint_context', 'adjacent_cells'],
    displayField: 'content',
    editableFields: ['content'],
    fieldHints: {
      content: 'Description of what happens at this step for this layer'
    }
  },
}
```

### Verification

Before implementing, verify entity types are registered:

```typescript
// In canvas-view component or test:
import { ENTITY_GENERATION_CONFIGS } from '@/lib/ai/prompts/entity-generation'

// This should not throw
if (!ENTITY_GENERATION_CONFIGS.blueprint_steps) {
  throw new Error('blueprint_steps not registered in ENTITY_GENERATION_CONFIGS')
}
if (!ENTITY_GENERATION_CONFIGS.blueprint_cells) {
  throw new Error('blueprint_cells not registered in ENTITY_GENERATION_CONFIGS')
}
```

---

## Route Structure

```
/app/(private)/admin/blueprints/[id]/
├── page.tsx                    # Existing detail/list view
├── edit/
│   └── page.tsx                # Existing form edit
└── canvas/
    ├── page.tsx                # Canvas page (server component, data fetch)
    ├── blueprint-canvas-view.tsx  # Client orchestration component
    └── actions.ts              # Server actions
```

### Page Component

```typescript
// app/(private)/admin/blueprints/[id]/canvas/page.tsx
export default async function BlueprintCanvasPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()

  // Fetch blueprint with steps and cells
  const { data: blueprint } = await supabase
    .from('service_blueprints')
    .select(`
      *,
      steps:blueprint_steps(
        *,
        cells:blueprint_cells(*)
      )
    `)
    .eq('id', params.id)
    .single()

  if (!blueprint) notFound()

  return <BlueprintCanvasView blueprint={blueprint} />
}
```

### Navigation Integration

Users need to access the canvas from existing blueprint pages:

```typescript
// Add link in blueprint detail page or edit page
// Example: app/(private)/admin/blueprints/[id]/page.tsx or edit/page.tsx

import Link from 'next/link'
import { LayoutGrid } from 'lucide-react'
import { Button } from '@/components/ui/button'

// In page header or actions area:
<Button asChild variant="outline">
  <Link href={`/admin/blueprints/${blueprint.id}/canvas`}>
    <LayoutGrid className="h-4 w-4 mr-2" />
    Canvas View
  </Link>
</Button>
```

**Also consider:** Adding "Canvas View" to blueprint list actions dropdown for quick access.

---

## File Summary

### Files to Create

| File | Type | Purpose |
|------|------|---------|
| `supabase/migrations/YYYYMMDD_blueprint_cells.sql` | Migration | Create blueprint_cells table |
| `components/admin/canvas/timeline-canvas.tsx` | Component | Shared timeline grid base |
| `components/admin/canvas/blueprint-canvas.tsx` | Component | Blueprint-specific wrapper |
| `components/admin/canvas/blueprint-step-header.tsx` | Component | Step column header |
| `components/admin/canvas/blueprint-lane-header.tsx` | Component | Layer row header |
| `components/admin/canvas/blueprint-cell.tsx` | Component | Cell content display |
| `components/admin/canvas/blueprint-cell-detail-panel.tsx` | Component | Side panel for editing |
| `app/(private)/admin/blueprints/[id]/canvas/page.tsx` | Page | Route entry point |
| `app/(private)/admin/blueprints/[id]/canvas/blueprint-canvas-view.tsx` | Component | Client orchestration |
| `app/(private)/admin/blueprints/[id]/canvas/actions.ts` | Actions | Server actions |
| `lib/boundary-objects/blueprint-cells.ts` | Utility | Validation & data ops |

### Files to Modify

| File | Change |
|------|--------|
| `components/admin/canvas/index.ts` | Export new components |
| `lib/ai/prompts/entity-generation.ts` | Add `blueprint_steps` and `blueprint_cells` configs |
| `app/(private)/admin/blueprints/[id]/page.tsx` | Add "Canvas View" link |

---

## Verification Checklist

### Core Functionality
- [ ] Can navigate to `/admin/blueprints/[id]/canvas`
- [ ] Grid displays steps as columns, 4 layers as rows
- [ ] Line of visibility separator renders between frontstage and backstage
- [ ] Can add new step via "+" button
- [ ] Can rename step via inline edit
- [ ] Can delete step via menu
- [ ] Can reorder steps via menu (move left/right)
- [ ] Can reorder steps via drag-drop in drag mode
- [ ] Clicking cell in structured mode opens detail panel
- [ ] Can edit cell content in detail panel
- [ ] Can save cell changes (upsert behavior works)
- [ ] Empty cells show placeholder
- [ ] AI generation menu appears in toolbar
- [ ] Can generate steps for blueprint
- [ ] Can generate content for single cell
- [ ] Mode toggle works (drag/structured)

### P0 Fixes (Tech Review)
- [ ] RLS policies use `TO authenticated` pattern
- [ ] ActionResult type defined with error codes
- [ ] Authorization helpers verify access before mutations
- [ ] Validation functions exist in boundary-objects
- [ ] Entity types registered in ENTITY_GENERATION_CONFIGS
- [ ] Navigation link added to existing blueprint pages
- [ ] Build compiles without errors

---

## Dependencies

- Story Map canvas implementation (patterns to follow) ✓
- Existing `service_blueprints` and `blueprint_steps` tables ✓
- AI generation API (`/api/ai/generate`) ✓
- Canvas base components (CanvasViewLayout, etc.) ✓
- Entity link helper functions (upsert_entity_link, remove_entity_link) ✓

---

## P0 Tech Review Fixes Summary

This spec addresses the following critical and high issues identified in tech review:

| Issue | Category | Resolution |
|-------|----------|------------|
| Entity links sync triggers | P0-CRITICAL | Trigger pattern documented; not needed for MVP (no FK auto-sync) |
| UNIQUE constraint behavior | P0-CRITICAL | Upsert pattern in createCellAction handles gracefully |
| AI generation types not registered | P0-CRITICAL | Entity type registration requirement documented with verification |
| RLS policy inconsistency | P0-CRITICAL | Explicit `TO authenticated` pattern in migration |
| ActionResult type undefined | P1-HIGH | Type definition provided matching story-map-canvas pattern |
| Missing validation | P1-HIGH | Validation constants and functions in boundary-objects |
| Navigation integration | P1-HIGH | Link pattern documented for existing pages |

**Stability Principle:** Following established patterns from story-map-canvas ensures inter-operability and reduces future maintenance burden.
