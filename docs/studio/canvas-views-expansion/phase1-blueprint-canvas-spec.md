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

### New Table: `blueprint_cells`

```sql
CREATE TABLE blueprint_cells (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  step_id UUID NOT NULL REFERENCES blueprint_steps(id) ON DELETE CASCADE,
  layer_type TEXT NOT NULL CHECK (layer_type IN ('customer_action', 'frontstage', 'backstage', 'support_process')),
  content TEXT,
  sequence INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(step_id, layer_type)
);

-- Index for efficient queries
CREATE INDEX idx_blueprint_cells_step ON blueprint_cells(step_id);

-- RLS policies (match blueprint_steps pattern)
ALTER TABLE blueprint_cells ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view blueprint cells" ON blueprint_cells
  FOR SELECT USING (true);

CREATE POLICY "Users can manage blueprint cells" ON blueprint_cells
  FOR ALL USING (true);
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

```typescript
// Cell CRUD
export async function createCellAction(stepId: string, layerType: string, content: string): Promise<ActionResult>
export async function updateCellAction(cellId: string, data: CellUpdateData): Promise<ActionResult>
export async function deleteCellAction(cellId: string): Promise<ActionResult>

// Step management
export async function createStepAction(blueprintId: string, name: string, sequence: number): Promise<ActionResult>
export async function updateStepAction(stepId: string, data: StepUpdateData): Promise<ActionResult>
export async function deleteStepAction(stepId: string): Promise<ActionResult>
export async function reorderStepsAction(blueprintId: string, stepIds: string[]): Promise<ActionResult>

// Bulk operations (for AI generation)
export async function bulkCreateCellsAction(stepId: string, cells: CellCreateData[]): Promise<ActionResult>
export async function bulkCreateStepsAction(blueprintId: string, steps: StepCreateData[]): Promise<ActionResult>
```

**Authorization:** All actions verify user has access to the parent blueprint (follow story-map-canvas pattern).

---

## AI Generation

### Generation Options

| Option | Scope | Description |
|--------|-------|-------------|
| Generate Steps | Full canvas | Generate step sequence for the blueprint |
| Generate Cell Content | Single cell | Generate content for selected cell based on context |
| Fill Row | Single layer | Generate content for all cells in one layer |
| Fill Column | Single step | Generate content for all layers in one step |

### Entity Generation Config

**File:** `lib/ai/prompts/entity-generation.ts`

```typescript
blueprint_steps: {
  systemPrompt: `Generate steps for a service blueprint that map the customer journey through service delivery.
Each step represents a moment in the service experience. Steps should:
- Flow logically left-to-right as a sequence
- Cover the full service encounter
- Be specific enough to map actions at each layer
- Use concise names (2-4 words)`,
  fieldsToGenerate: ['name', 'description'],
  contextFields: ['blueprint_name', 'blueprint_description', 'blueprint_type', 'existing_steps'],
  displayField: 'name',
},

blueprint_cells: {
  systemPrompt: `Generate content for a service blueprint cell at the intersection of a step and layer.
Consider:
- Step context: what moment in the journey
- Layer type: customer action / frontstage / backstage / support process
- Adjacent cells: maintain consistency with neighboring content
Write concise, actionable descriptions of what happens at this intersection.`,
  fieldsToGenerate: ['content'],
  contextFields: ['step_name', 'layer_type', 'blueprint_context', 'adjacent_cells'],
  displayField: 'content',
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
| `lib/ai/prompts/entity-generation.ts` | Add blueprint configs |

---

## Verification Checklist

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
- [ ] Can save cell changes
- [ ] Empty cells show placeholder
- [ ] AI generation menu appears in toolbar
- [ ] Can generate steps for blueprint
- [ ] Can generate content for single cell
- [ ] Mode toggle works (drag/structured)
- [ ] Build compiles without errors

---

## Dependencies

- Story Map canvas implementation (patterns to follow) ✓
- Existing `service_blueprints` and `blueprint_steps` tables ✓
- AI generation API (`/api/ai/generate`) ✓
- Canvas base components (CanvasViewLayout, etc.) ✓
