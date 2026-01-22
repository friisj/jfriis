# Phase 3: Business Model Canvas Specification

> Detailed implementation spec for the Business Model Canvas view.
> First BlockGridCanvas implementation, validates the pattern.

---

## Overview

**Route:** `/admin/canvases/business-models/[id]/canvas`
**Pattern:** Block grid (9 fixed blocks)
**Priority:** Third (validates BlockGridCanvas pattern)
**Depends on:** Phase 1-2 complete (shared patterns established)

---

## Data Model

### Existing Structure

BMC uses JSONB storage in `business_model_canvases` table:

```typescript
// Current JSONB structure per block
interface BlockData {
  items: Array<{
    id: string
    content: string
    priority?: 'high' | 'medium' | 'low'
    evidence?: string
    assumptions?: string[]
  }>
}
```

### Design Decision: Keep JSONB

Unlike Blueprint/Journey (which needed cells for grid intersection), BMC blocks are independent containers. JSONB is appropriate:

| Factor | Relational Tables | JSONB (Chosen) |
|--------|------------------|----------------|
| Data structure | Items need own table | Items are simple objects |
| Cross-block relations | Not needed | Not needed |
| Grid intersections | N/A (no step×layer) | N/A |
| Query patterns | Complex joins | Simple JSON operations |
| Existing data | Would need migration | Already in place |

**Pattern difference from Timeline canvases:**
- Timeline (Blueprint/Journey): Steps × Layers = cells → relational tables
- Block Grid (BMC/Profile/ValueMap): Independent item lists → JSONB appropriate

### No Migration Needed

Existing `business_model_canvases` table already has appropriate structure. No schema changes required.

---

## Block Structure (Standard BMC Layout)

```
┌─────────────┬─────────────┬─────────────┬─────────────┬─────────────┐
│   Key       │   Key       │   Value     │  Customer   │  Customer   │
│  Partners   │  Activities │ Propositions│ Relationships│  Segments   │
│             │             │             │             │             │
│             ├─────────────┤             ├─────────────┤             │
│             │   Key       │             │  Channels   │             │
│             │  Resources  │             │             │             │
├─────────────┴─────────────┴─────────────┴─────────────┴─────────────┤
│        Cost Structure                  │       Revenue Streams       │
└────────────────────────────────────────┴─────────────────────────────┘
```

### Block Definitions

| Block ID | Display Name | Grid Position | Color |
|----------|--------------|---------------|-------|
| `key_partners` | Key Partners | row 1, col 1, rowspan 2 | Blue |
| `key_activities` | Key Activities | row 1, col 2 | Orange |
| `key_resources` | Key Resources | row 2, col 2 | Orange |
| `value_propositions` | Value Propositions | row 1, col 3, rowspan 2 | Green |
| `customer_relationships` | Customer Relationships | row 1, col 4 | Pink |
| `channels` | Channels | row 2, col 4 | Pink |
| `customer_segments` | Customer Segments | row 1, col 5, rowspan 2 | Pink |
| `cost_structure` | Cost Structure | row 3, col 1-2 | Gray |
| `revenue_streams` | Revenue Streams | row 3, col 3-5 | Gray |

---

## UI Specification

### Grid Layout

Follows standard BMC proportions with CSS Grid:

```css
.bmc-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr 1fr 1fr;
  grid-template-rows: 1fr 1fr 1fr;
  gap: 0.5rem;
}
```

### Block Component

Each block shows:
- Block title with color indicator
- Items as cards
- Add item button
- Item count

### Item Card

Each item shows:
- Content text
- Priority indicator (optional dot)
- Click to open detail panel

### Mode Behavior

| Mode | Block Click | Item Click | Drag |
|------|-------------|------------|------|
| **Structured** | Add item | Opens detail panel | Disabled |
| **Drag** | No action | Selects item | Reorder within block |

---

## Components

### Shared Base (New)

#### `BlockGridCanvas`
**File:** `components/admin/canvas/block-grid-canvas.tsx`

```typescript
interface BlockGridCanvasProps<TBlock, TItem> {
  blocks: TBlock[]
  mode: CanvasMode

  // Configuration
  getBlockId: (block: TBlock) => string
  getBlockName: (block: TBlock) => string
  getBlockColor?: (block: TBlock) => string
  getBlockItems: (block: TBlock) => TItem[]
  getItemId: (item: TItem) => string

  // Layout
  gridLayout: GridLayoutConfig  // CSS grid positioning

  // Render slots
  renderBlock?: (block: TBlock, items: TItem[]) => ReactNode
  renderItem?: (item: TItem, block: TBlock) => ReactNode

  // Callbacks
  onBlockClick?: (blockId: string) => void
  onItemClick?: (itemId: string, blockId: string) => void
  onItemReorder?: (blockId: string, itemIds: string[]) => void
  onBackgroundClick?: () => void
}
```

### BMC-Specific (New)

| Component | Purpose |
|-----------|---------|
| `BMCCanvas` | Wrapper with BMC block config |
| `CanvasBlock` | Generic block container (shared) |
| `BlockItem` | Item card (shared) |
| `ItemDetailPanel` | Side panel for editing (shared) |

---

## Server Actions

**File:** `app/(private)/admin/canvases/business-models/[id]/canvas/actions.ts`

### Type Definitions

```typescript
'use server'

// ActionResult pattern (consistent with Timeline canvases)
type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string; code?: string }

interface ItemData {
  content: string
  priority?: 'high' | 'medium' | 'low'
  evidence?: string
  assumptions?: string[]
}
```

### Authorization Pattern

```typescript
async function verifyCanvasAccess(
  supabase: Awaited<ReturnType<typeof createClient>>,
  canvasId: string
): Promise<{ success: true; canvasId: string } | { success: false; error: string }> {
  const { data, error } = await supabase
    .from('business_model_canvases')
    .select('id')
    .eq('id', canvasId)
    .single()

  if (error || !data) {
    return { success: false, error: 'Canvas not found or access denied' }
  }
  return { success: true, canvasId: data.id }
}
```

### Action Signatures

```typescript
// Item CRUD (operates on JSONB)
export async function addItemAction(
  canvasId: string,
  blockId: string,
  content: string
): Promise<ActionResult<{ itemId: string }>>

export async function updateItemAction(
  canvasId: string,
  blockId: string,
  itemId: string,
  data: ItemData
): Promise<ActionResult>

export async function deleteItemAction(
  canvasId: string,
  blockId: string,
  itemId: string
): Promise<ActionResult>

export async function reorderItemsAction(
  canvasId: string,
  blockId: string,
  itemIds: string[]
): Promise<ActionResult>

// Bulk operations (for AI generation)
export async function bulkAddItemsAction(
  canvasId: string,
  blockId: string,
  items: Array<{ content: string; priority?: string }>
): Promise<ActionResult<{ count: number }>>
```

### JSONB Update Pattern

```typescript
// Example: Adding an item to a JSONB block
export async function addItemAction(
  canvasId: string,
  blockId: string,
  content: string
): Promise<ActionResult<{ itemId: string }>> {
  const supabase = await createClient()

  // Auth check
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Unauthorized', code: 'UNAUTHORIZED' }
  }

  // Access check
  const accessCheck = await verifyCanvasAccess(supabase, canvasId)
  if (!accessCheck.success) {
    return { success: false, error: accessCheck.error, code: 'ACCESS_DENIED' }
  }

  // Validate
  const contentResult = validateItemContent(content)
  if (!contentResult.success) {
    return { success: false, error: contentResult.error, code: 'VALIDATION_ERROR' }
  }

  // Generate item ID
  const itemId = crypto.randomUUID()

  // Update JSONB (append item to block's items array)
  const { error } = await supabase.rpc('append_bmc_item', {
    p_canvas_id: canvasId,
    p_block_id: blockId,
    p_item: { id: itemId, content: contentResult.data }
  })

  if (error) {
    console.error('[addItemAction] Database error:', error.code, error.message)
    return { success: false, error: 'Failed to add item', code: 'DATABASE_ERROR' }
  }

  revalidateCanvasPage(canvasId)
  return { success: true, data: { itemId } }
}
```

### Revalidation Pattern

```typescript
function revalidateCanvasPage(canvasId: string) {
  revalidatePath(`/admin/canvases/business-models/${canvasId}/canvas`, 'page')
  revalidatePath(`/admin/canvases/business-models/${canvasId}`, 'layout')
}
```

### Validation Constants

**File:** `lib/boundary-objects/bmc-canvas.ts`

```typescript
export const BMC_BLOCK_IDS = [
  'key_partners',
  'key_activities',
  'key_resources',
  'value_propositions',
  'customer_relationships',
  'channels',
  'customer_segments',
  'cost_structure',
  'revenue_streams'
] as const

export type BMCBlockId = typeof BMC_BLOCK_IDS[number]

export const ITEM_CONTENT_MAX_LENGTH = 500
export const ITEM_EVIDENCE_MAX_LENGTH = 1000

export function validateBlockId(blockId: string): DataResult<BMCBlockId> {
  if (!BMC_BLOCK_IDS.includes(blockId as BMCBlockId)) {
    return { success: false, error: `Invalid block ID: ${blockId}` }
  }
  return { success: true, data: blockId as BMCBlockId }
}

export function validateItemContent(content: string): DataResult<string> {
  const trimmed = content.trim()
  if (!trimmed) {
    return { success: false, error: 'Item content is required' }
  }
  if (trimmed.length > ITEM_CONTENT_MAX_LENGTH) {
    return { success: false, error: `Content must be ${ITEM_CONTENT_MAX_LENGTH} characters or less` }
  }
  return { success: true, data: trimmed }
}
```

---

## AI Generation

### Generation Options

| Option | Scope | Description |
|--------|-------|-------------|
| Generate Items | Single block | Generate items for selected block |
| Fill Canvas | Full canvas | Generate items for all blocks |
| Expand Item | Single item | Generate related items from one item |

### Entity Type Registration (REQUIRED)

**File:** `lib/ai/prompts/entity-generation.ts`

Add `bmc_items` to `ENTITY_GENERATION_CONFIGS`:

```typescript
bmc_items: {
  systemPrompt: `Generate items for a Business Model Canvas block.
Consider the block type and generate appropriate content:
- Key Partners: Strategic partnerships and suppliers
- Key Activities: Core business activities required to deliver value
- Key Resources: Essential assets (physical, intellectual, human, financial)
- Value Propositions: Customer value delivered
- Customer Relationships: How you interact with and retain customers
- Channels: How you reach and deliver value to customers
- Customer Segments: Who you serve (target markets)
- Cost Structure: Major costs in operating the business model
- Revenue Streams: How you generate income from each customer segment`,
  fieldsToGenerate: ['content', 'priority'],
  defaultValues: {},
  contextFields: ['canvas_name', 'block_type', 'existing_items', 'venture_context'],
  displayField: 'content',
  editableFields: ['content', 'priority', 'evidence'],
  fieldHints: {
    content: 'Concise description of the item',
    priority: 'Importance level (high, medium, low)',
    evidence: 'Supporting evidence or validation'
  }
}
```

---

## Route Structure

```
/app/(private)/admin/canvases/business-models/[id]/
├── page.tsx                    # Existing detail view
├── edit/
│   └── page.tsx                # Existing form edit
└── canvas/
    ├── page.tsx                # Canvas page
    ├── bmc-canvas-view.tsx     # Client orchestration
    └── actions.ts              # Server actions
```

### Page Component

```typescript
// app/(private)/admin/canvases/business-models/[id]/canvas/page.tsx
export default async function BMCCanvasPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()

  const { data: canvas } = await supabase
    .from('business_model_canvases')
    .select('*')
    .eq('id', params.id)
    .single()

  if (!canvas) notFound()

  return <BMCCanvasView canvas={canvas} />
}
```

### Navigation Integration

```typescript
// Add link in BMC detail/edit page
<Button asChild variant="outline">
  <Link href={`/admin/canvases/business-models/${canvas.id}/canvas`}>
    <LayoutGrid className="h-4 w-4 mr-2" />
    Canvas View
  </Link>
</Button>
```

---

## File Summary

### Files to Create

| File | Type | Purpose |
|------|------|---------|
| `components/admin/canvas/block-grid-canvas.tsx` | Component | Shared block grid base |
| `components/admin/canvas/canvas-block.tsx` | Component | Block container |
| `components/admin/canvas/block-item.tsx` | Component | Item card |
| `components/admin/canvas/item-detail-panel.tsx` | Component | Side panel for editing |
| `components/admin/canvas/bmc-canvas.tsx` | Component | BMC-specific wrapper |
| `app/(private)/admin/canvases/business-models/[id]/canvas/page.tsx` | Page | Route entry point |
| `app/(private)/admin/canvases/business-models/[id]/canvas/bmc-canvas-view.tsx` | Component | Client orchestration |
| `app/(private)/admin/canvases/business-models/[id]/canvas/actions.ts` | Actions | Server actions |
| `lib/boundary-objects/bmc-canvas.ts` | Utility | Validation & constants |

### Files to Modify

| File | Change |
|------|--------|
| `components/admin/canvas/index.ts` | Export new components |
| `lib/ai/prompts/entity-generation.ts` | Add `bmc_items` config |
| `app/(private)/admin/canvases/business-models/[id]/page.tsx` | Add "Canvas View" link |

### Optional: JSONB Helper RPC

For cleaner JSONB operations, consider adding a PostgreSQL function:

```sql
-- supabase/migrations/YYYYMMDD_bmc_jsonb_helpers.sql

CREATE OR REPLACE FUNCTION append_bmc_item(
  p_canvas_id UUID,
  p_block_id TEXT,
  p_item JSONB
) RETURNS VOID AS $$
BEGIN
  UPDATE business_model_canvases
  SET blocks = jsonb_set(
    COALESCE(blocks, '{}'::jsonb),
    ARRAY[p_block_id, 'items'],
    COALESCE(blocks->p_block_id->'items', '[]'::jsonb) || p_item
  )
  WHERE id = p_canvas_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## Verification Checklist

### Core Functionality
- [ ] BlockGridCanvas component created and working
- [ ] Can navigate to `/admin/canvases/business-models/[id]/canvas`
- [ ] 9-block BMC layout displays correctly
- [ ] Blocks have correct proportions (some span 2 rows)
- [ ] Can add items to blocks
- [ ] Can edit items via detail panel
- [ ] Can delete items
- [ ] Can reorder items within block (drag mode)
- [ ] AI generation works for block items
- [ ] Mode toggle works

### P0 Fixes (Tech Review)
- [ ] ActionResult type matches Timeline canvas pattern
- [ ] Authorization helpers verify access before mutations
- [ ] Validation functions exist in boundary-objects
- [ ] Entity type `bmc_items` registered in ENTITY_GENERATION_CONFIGS
- [ ] Navigation link added to existing BMC pages
- [ ] Build compiles without errors

---

## Dependencies

- Phase 1-2 complete (shared patterns established) ✓
- Existing `business_model_canvases` table ✓

---

## Pattern Differences from Timeline Canvases

| Aspect | Timeline (Blueprint/Journey) | Block Grid (BMC) |
|--------|------------------------------|------------------|
| Data model | Relational cells table | JSONB blocks |
| Grid structure | Steps × Layers | Fixed block layout |
| Cell identity | UUID per cell | UUID per item (in JSONB) |
| Reorder scope | Steps (columns) | Items within block |
| AI generation | Per-cell content | Per-block items |

**Shared patterns (must match):**
- ActionResult type
- Authorization helpers
- Validation boundary-objects
- Entity type registration
- Navigation integration
