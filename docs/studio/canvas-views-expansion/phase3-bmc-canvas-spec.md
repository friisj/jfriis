# Phase 3: Business Model Canvas Specification

> Detailed implementation spec for the Business Model Canvas view.
> First BlockGridCanvas implementation, validates the pattern.

---

## Overview

**Route:** `/admin/canvases/business-models/[id]/canvas`
**Pattern:** Block grid (9 fixed blocks)
**Priority:** Third (validates BlockGridCanvas pattern)

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

### Decision: Keep JSONB

Unlike Blueprint (which needed cells for grid intersection), BMC blocks are independent containers. JSONB is appropriate:
- Each block has its own items array
- No cross-block relationships at item level
- Simpler than creating additional tables

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
| `CreateItemModal` | Add item modal (shared) |

---

## Server Actions

**File:** `app/(private)/admin/canvases/business-models/[id]/canvas/actions.ts`

```typescript
// Item CRUD (operates on JSONB)
export async function addItemAction(canvasId: string, blockId: string, content: string): Promise<ActionResult>
export async function updateItemAction(canvasId: string, blockId: string, itemId: string, data: ItemData): Promise<ActionResult>
export async function deleteItemAction(canvasId: string, blockId: string, itemId: string): Promise<ActionResult>
export async function reorderItemsAction(canvasId: string, blockId: string, itemIds: string[]): Promise<ActionResult>
```

Note: These actions read/modify the JSONB `blocks` column on `business_model_canvases`.

---

## AI Generation

### Generation Options

| Option | Scope | Description |
|--------|-------|-------------|
| Generate Items | Single block | Generate items for selected block |
| Fill Canvas | Full canvas | Generate items for all blocks |
| Expand Item | Single item | Generate related items from one item |

### Entity Generation Config

```typescript
bmc_items: {
  systemPrompt: `Generate items for a Business Model Canvas block.
Consider the block type and generate appropriate content:
- Key Partners: Strategic partnerships
- Key Activities: Core business activities
- Key Resources: Essential assets
- Value Propositions: Customer value delivered
- Customer Relationships: How you interact with customers
- Channels: How you reach customers
- Customer Segments: Who you serve
- Cost Structure: Major costs
- Revenue Streams: How you make money`,
  fieldsToGenerate: ['content', 'priority'],
  contextFields: ['canvas_name', 'block_type', 'existing_items', 'venture_context'],
  displayField: 'content',
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

---

## Verification Checklist

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
- [ ] Build compiles without errors

---

## Dependencies

- Phase 1-2 complete (shared patterns established) ✓
- Existing `business_model_canvases` table ✓
