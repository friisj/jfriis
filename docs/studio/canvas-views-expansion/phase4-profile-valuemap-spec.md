# Phase 4: Customer Profile & Value Map Canvas Specification

> Detailed implementation spec for Customer Profile and Value Map canvas views.
> Both use BlockGridCanvas from Phase 3 with 3-block layouts.

---

## Overview

| Canvas | Route | Blocks |
|--------|-------|--------|
| Customer Profile | `/admin/canvases/customer-profiles/[id]/canvas` | 3 (Jobs, Pains, Gains) |
| Value Map | `/admin/canvases/value-maps/[id]/canvas` | 3 (Products, Pain Relievers, Gain Creators) |

**Pattern:** Block grid (3 fixed blocks each)
**Priority:** Fourth (validates BlockGridCanvas reuse)
**Depends on:** Phase 3 (BlockGridCanvas component)

---

## Customer Profile Canvas

### Block Structure

```
┌─────────────────────────────────────────────────────────┐
│                    Customer Profile                      │
├───────────────────┬───────────────────┬─────────────────┤
│       Jobs        │      Pains        │     Gains       │
│                   │                   │                 │
│  • Job to be done │  • Frustration    │  • Desired      │
│  • Job to be done │  • Problem        │    outcome      │
│  • ...            │  • ...            │  • ...          │
│                   │                   │                 │
└───────────────────┴───────────────────┴─────────────────┘
```

### Block Definitions

| Block ID | Display Name | Color | Description |
|----------|--------------|-------|-------------|
| `jobs` | Customer Jobs | Blue | Tasks customers are trying to accomplish |
| `pains` | Pains | Red/Orange | Frustrations, risks, obstacles |
| `gains` | Gains | Green | Benefits customers want |

### Special Features

- **Severity indicator** on Pains (low/medium/high/extreme)
- **Importance indicator** on Jobs and Gains
- **Job types:** Functional, Social, Emotional (badge)

### Item Fields

```typescript
interface ProfileItem {
  id: string
  content: string
  type?: 'functional' | 'social' | 'emotional'  // Jobs only
  severity?: 'low' | 'medium' | 'high' | 'extreme'  // Pains only
  importance?: 'nice_to_have' | 'important' | 'critical'
  evidence?: string
}
```

---

## Value Map Canvas

### Block Structure

```
┌─────────────────────────────────────────────────────────┐
│                       Value Map                          │
├───────────────────┬───────────────────┬─────────────────┤
│ Products/Services │  Pain Relievers   │  Gain Creators  │
│                   │                   │                 │
│  • Product        │  • How it helps   │  • How it       │
│  • Service        │    with pain      │    creates gain │
│  • Feature        │  • ...            │  • ...          │
│                   │                   │                 │
└───────────────────┴───────────────────┴─────────────────┘
```

### Block Definitions

| Block ID | Display Name | Color | Description |
|----------|--------------|-------|-------------|
| `products_services` | Products & Services | Blue | What you offer |
| `pain_relievers` | Pain Relievers | Orange | How you address pains |
| `gain_creators` | Gain Creators | Green | How you create gains |

### Item Fields

```typescript
interface ValueMapItem {
  id: string
  content: string
  type?: 'product' | 'service' | 'feature'  // Products only
  effectiveness?: 'low' | 'medium' | 'high'
  evidence?: string
}
```

---

## Shared Components

Both canvases reuse Phase 3 components:

| Component | Source | Notes |
|-----------|--------|-------|
| `BlockGridCanvas` | Phase 3 | Base grid |
| `CanvasBlock` | Phase 3 | Block container |
| `BlockItem` | Phase 3 | Item card |
| `ItemDetailPanel` | Phase 3 | May need extension for severity/type fields |

### New Components

| Component | Purpose |
|-----------|---------|
| `CustomerProfileCanvas` | Profile-specific wrapper |
| `ValueMapCanvas` | Value Map-specific wrapper |
| `SeverityBadge` | Visual indicator for severity |
| `ImportanceBadge` | Visual indicator for importance |
| `TypeBadge` | Job/product type indicator |

---

## Server Actions

### Customer Profile
**File:** `app/(private)/admin/canvases/customer-profiles/[id]/canvas/actions.ts`

### Value Map
**File:** `app/(private)/admin/canvases/value-maps/[id]/canvas/actions.ts`

Both follow the same pattern as BMC (Phase 3):
```typescript
export async function addItemAction(canvasId: string, blockId: string, content: string): Promise<ActionResult>
export async function updateItemAction(canvasId: string, blockId: string, itemId: string, data: ItemData): Promise<ActionResult>
export async function deleteItemAction(canvasId: string, blockId: string, itemId: string): Promise<ActionResult>
export async function reorderItemsAction(canvasId: string, blockId: string, itemIds: string[]): Promise<ActionResult>
```

---

## AI Generation

### Customer Profile Generation Config

```typescript
customer_profile_items: {
  systemPrompt: `Generate items for a Customer Profile block.
Consider the block type:
- Jobs: What the customer is trying to accomplish (functional, social, emotional)
- Pains: Frustrations, obstacles, risks the customer faces
- Gains: Benefits and outcomes the customer desires
Be specific to the customer segment context.`,
  fieldsToGenerate: ['content', 'type', 'severity', 'importance'],
  contextFields: ['profile_name', 'block_type', 'persona_context', 'existing_items'],
  displayField: 'content',
}
```

### Value Map Generation Config

```typescript
value_map_items: {
  systemPrompt: `Generate items for a Value Map block.
Consider the block type:
- Products/Services: What you offer to customers
- Pain Relievers: How your offering addresses customer pains
- Gain Creators: How your offering creates customer gains
Connect to the linked customer profile if available.`,
  fieldsToGenerate: ['content', 'type', 'effectiveness'],
  contextFields: ['value_map_name', 'block_type', 'linked_profile', 'existing_items'],
  displayField: 'content',
}
```

---

## Route Structure

### Customer Profile
```
/app/(private)/admin/canvases/customer-profiles/[id]/
├── page.tsx
├── edit/
│   └── page.tsx
└── canvas/
    ├── page.tsx
    ├── customer-profile-canvas-view.tsx
    └── actions.ts
```

### Value Map
```
/app/(private)/admin/canvases/value-maps/[id]/
├── page.tsx
├── edit/
│   └── page.tsx
└── canvas/
    ├── page.tsx
    ├── value-map-canvas-view.tsx
    └── actions.ts
```

---

## Verification Checklist

### Customer Profile
- [ ] BlockGridCanvas reused successfully
- [ ] Can navigate to `/admin/canvases/customer-profiles/[id]/canvas`
- [ ] 3-block layout displays correctly (Jobs, Pains, Gains)
- [ ] Severity badges show on pain items
- [ ] Job type badges work
- [ ] Item CRUD works
- [ ] AI generation works

### Value Map
- [ ] Can navigate to `/admin/canvases/value-maps/[id]/canvas`
- [ ] 3-block layout displays correctly
- [ ] Product type badges work
- [ ] Item CRUD works
- [ ] AI generation works

---

## Dependencies

- Phase 3 complete (BlockGridCanvas exists) ✓
- Existing `customer_profiles` and `value_maps` tables ✓
