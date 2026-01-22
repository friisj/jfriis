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

## Data Model

### Design Decision: JSONB (Same as BMC)

Both Customer Profile and Value Map use JSONB storage, consistent with BMC:

```typescript
// customer_profiles table
interface CustomerProfileBlocks {
  jobs: { items: JobItem[] }
  pains: { items: PainItem[] }
  gains: { items: GainItem[] }
}

// value_maps table
interface ValueMapBlocks {
  products_services: { items: ProductItem[] }
  pain_relievers: { items: PainRelieverItem[] }
  gain_creators: { items: GainCreatorItem[] }
}
```

**Rationale:** Same as BMC - blocks are independent containers, no cross-block relationships at item level, JSONB is simpler.

### No Migration Needed

Existing tables (`customer_profiles`, `value_maps`) already have JSONB block structure.

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

### Item Types

```typescript
interface JobItem {
  id: string
  content: string
  type?: 'functional' | 'social' | 'emotional'
  importance?: 'nice_to_have' | 'important' | 'critical'
  evidence?: string
}

interface PainItem {
  id: string
  content: string
  severity?: 'low' | 'medium' | 'high' | 'extreme'
  evidence?: string
}

interface GainItem {
  id: string
  content: string
  importance?: 'nice_to_have' | 'important' | 'critical'
  evidence?: string
}
```

### Special Features

- **Job type badges**: Functional, Social, Emotional (color-coded)
- **Severity indicator** on Pains (low/medium/high/extreme with color gradient)
- **Importance indicator** on Jobs and Gains

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

### Item Types

```typescript
interface ProductItem {
  id: string
  content: string
  type?: 'product' | 'service' | 'feature'
  evidence?: string
}

interface PainRelieverItem {
  id: string
  content: string
  effectiveness?: 'low' | 'medium' | 'high'
  linked_pain_id?: string  // Optional link to Customer Profile pain
  evidence?: string
}

interface GainCreatorItem {
  id: string
  content: string
  effectiveness?: 'low' | 'medium' | 'high'
  linked_gain_id?: string  // Optional link to Customer Profile gain
  evidence?: string
}
```

---

## Components

### Reused from Phase 3

| Component | Source | Notes |
|-----------|--------|-------|
| `BlockGridCanvas` | Phase 3 | Base grid |
| `CanvasBlock` | Phase 3 | Block container |
| `BlockItem` | Phase 3 | Item card |
| `ItemDetailPanel` | Phase 3 | Extended for severity/type fields |

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

### Type Definitions

```typescript
'use server'

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string; code?: string }
```

### Authorization Pattern

```typescript
// Customer Profile
async function verifyProfileAccess(
  supabase: Awaited<ReturnType<typeof createClient>>,
  profileId: string
): Promise<{ success: true; profileId: string } | { success: false; error: string }> {
  const { data, error } = await supabase
    .from('customer_profiles')
    .select('id')
    .eq('id', profileId)
    .single()

  if (error || !data) {
    return { success: false, error: 'Profile not found or access denied' }
  }
  return { success: true, profileId: data.id }
}

// Value Map
async function verifyValueMapAccess(
  supabase: Awaited<ReturnType<typeof createClient>>,
  valueMapId: string
): Promise<{ success: true; valueMapId: string } | { success: false; error: string }> {
  const { data, error } = await supabase
    .from('value_maps')
    .select('id')
    .eq('id', valueMapId)
    .single()

  if (error || !data) {
    return { success: false, error: 'Value Map not found or access denied' }
  }
  return { success: true, valueMapId: data.id }
}
```

### Action Signatures

```typescript
// Same pattern for both Profile and Value Map
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
  items: Array<{ content: string; type?: string; severity?: string }>
): Promise<ActionResult<{ count: number }>>
```

### Revalidation Pattern

```typescript
// Customer Profile
function revalidateProfileCanvas(profileId: string) {
  revalidatePath(`/admin/canvases/customer-profiles/${profileId}/canvas`, 'page')
  revalidatePath(`/admin/canvases/customer-profiles/${profileId}`, 'layout')
}

// Value Map
function revalidateValueMapCanvas(valueMapId: string) {
  revalidatePath(`/admin/canvases/value-maps/${valueMapId}/canvas`, 'page')
  revalidatePath(`/admin/canvases/value-maps/${valueMapId}`, 'layout')
}
```

### Validation Constants

**File:** `lib/boundary-objects/customer-profile-canvas.ts`

```typescript
export const PROFILE_BLOCK_IDS = ['jobs', 'pains', 'gains'] as const
export type ProfileBlockId = typeof PROFILE_BLOCK_IDS[number]

export const JOB_TYPES = ['functional', 'social', 'emotional'] as const
export const IMPORTANCE_LEVELS = ['nice_to_have', 'important', 'critical'] as const
export const SEVERITY_LEVELS = ['low', 'medium', 'high', 'extreme'] as const

export const ITEM_CONTENT_MAX_LENGTH = 500

export function validateProfileBlockId(blockId: string): DataResult<ProfileBlockId> {
  if (!PROFILE_BLOCK_IDS.includes(blockId as ProfileBlockId)) {
    return { success: false, error: `Invalid block ID: ${blockId}` }
  }
  return { success: true, data: blockId as ProfileBlockId }
}
```

**File:** `lib/boundary-objects/value-map-canvas.ts`

```typescript
export const VALUE_MAP_BLOCK_IDS = ['products_services', 'pain_relievers', 'gain_creators'] as const
export type ValueMapBlockId = typeof VALUE_MAP_BLOCK_IDS[number]

export const PRODUCT_TYPES = ['product', 'service', 'feature'] as const
export const EFFECTIVENESS_LEVELS = ['low', 'medium', 'high'] as const

export const ITEM_CONTENT_MAX_LENGTH = 500

export function validateValueMapBlockId(blockId: string): DataResult<ValueMapBlockId> {
  if (!VALUE_MAP_BLOCK_IDS.includes(blockId as ValueMapBlockId)) {
    return { success: false, error: `Invalid block ID: ${blockId}` }
  }
  return { success: true, data: blockId as ValueMapBlockId }
}
```

---

## AI Generation

### Entity Type Registration (REQUIRED)

**File:** `lib/ai/prompts/entity-generation.ts`

Add both `customer_profile_items` and `value_map_items` to `ENTITY_GENERATION_CONFIGS`:

```typescript
customer_profile_items: {
  systemPrompt: `Generate items for a Customer Profile block.
Consider the block type:
- Jobs: What the customer is trying to accomplish
  - Functional jobs: practical tasks
  - Social jobs: how they want to be perceived
  - Emotional jobs: how they want to feel
- Pains: Frustrations, obstacles, risks the customer faces
- Gains: Benefits and outcomes the customer desires
Be specific to the customer segment context.`,
  fieldsToGenerate: ['content', 'type', 'severity', 'importance'],
  defaultValues: {},
  contextFields: ['profile_name', 'block_type', 'persona_context', 'existing_items'],
  displayField: 'content',
  editableFields: ['content', 'type', 'severity', 'importance', 'evidence'],
  fieldHints: {
    content: 'Description of the job, pain, or gain',
    type: 'Job type (functional, social, emotional)',
    severity: 'Pain severity (low to extreme)',
    importance: 'How important this is to the customer'
  }
},

value_map_items: {
  systemPrompt: `Generate items for a Value Map block.
Consider the block type:
- Products/Services: What you offer to customers
- Pain Relievers: How your offering addresses customer pains
- Gain Creators: How your offering creates customer gains
Connect to the linked customer profile if available.`,
  fieldsToGenerate: ['content', 'type', 'effectiveness'],
  defaultValues: {},
  contextFields: ['value_map_name', 'block_type', 'linked_profile', 'existing_items'],
  displayField: 'content',
  editableFields: ['content', 'type', 'effectiveness', 'evidence'],
  fieldHints: {
    content: 'Description of the product, reliever, or creator',
    type: 'Product type (product, service, feature)',
    effectiveness: 'How well this addresses the pain/creates the gain'
  }
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

### Navigation Integration

```typescript
// Customer Profile - Add link in detail/edit page
<Button asChild variant="outline">
  <Link href={`/admin/canvases/customer-profiles/${profile.id}/canvas`}>
    <LayoutGrid className="h-4 w-4 mr-2" />
    Canvas View
  </Link>
</Button>

// Value Map - Add link in detail/edit page
<Button asChild variant="outline">
  <Link href={`/admin/canvases/value-maps/${valueMap.id}/canvas`}>
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
| `components/admin/canvas/customer-profile-canvas.tsx` | Component | Profile-specific wrapper |
| `components/admin/canvas/value-map-canvas.tsx` | Component | Value Map-specific wrapper |
| `components/admin/canvas/severity-badge.tsx` | Component | Severity indicator |
| `components/admin/canvas/importance-badge.tsx` | Component | Importance indicator |
| `components/admin/canvas/type-badge.tsx` | Component | Type indicator |
| `app/(private)/admin/canvases/customer-profiles/[id]/canvas/page.tsx` | Page | Profile canvas route |
| `app/(private)/admin/canvases/customer-profiles/[id]/canvas/customer-profile-canvas-view.tsx` | Component | Profile client orchestration |
| `app/(private)/admin/canvases/customer-profiles/[id]/canvas/actions.ts` | Actions | Profile server actions |
| `app/(private)/admin/canvases/value-maps/[id]/canvas/page.tsx` | Page | Value Map canvas route |
| `app/(private)/admin/canvases/value-maps/[id]/canvas/value-map-canvas-view.tsx` | Component | Value Map client orchestration |
| `app/(private)/admin/canvases/value-maps/[id]/canvas/actions.ts` | Actions | Value Map server actions |
| `lib/boundary-objects/customer-profile-canvas.ts` | Utility | Profile validation |
| `lib/boundary-objects/value-map-canvas.ts` | Utility | Value Map validation |

### Files to Modify

| File | Change |
|------|--------|
| `components/admin/canvas/index.ts` | Export new components |
| `lib/ai/prompts/entity-generation.ts` | Add `customer_profile_items` and `value_map_items` |
| `app/(private)/admin/canvases/customer-profiles/[id]/page.tsx` | Add "Canvas View" link |
| `app/(private)/admin/canvases/value-maps/[id]/page.tsx` | Add "Canvas View" link |

---

## Verification Checklist

### Customer Profile
- [ ] BlockGridCanvas reused successfully from Phase 3
- [ ] Can navigate to `/admin/canvases/customer-profiles/[id]/canvas`
- [ ] 3-block layout displays correctly (Jobs, Pains, Gains)
- [ ] Severity badges show on pain items
- [ ] Importance badges work
- [ ] Job type badges work (functional, social, emotional)
- [ ] Item CRUD works
- [ ] AI generation works
- [ ] Mode toggle works

### Value Map
- [ ] Can navigate to `/admin/canvases/value-maps/[id]/canvas`
- [ ] 3-block layout displays correctly
- [ ] Product type badges work
- [ ] Effectiveness indicators work
- [ ] Item CRUD works
- [ ] AI generation works
- [ ] Mode toggle works

### P0 Fixes (Tech Review)
- [ ] ActionResult type matches Phase 3 pattern
- [ ] Authorization helpers verify access before mutations
- [ ] Validation constants in boundary-objects
- [ ] Entity types registered in ENTITY_GENERATION_CONFIGS
- [ ] Navigation links added to existing pages
- [ ] Build compiles without errors

---

## Dependencies

- Phase 3 complete (BlockGridCanvas exists) ✓
- Existing `customer_profiles` and `value_maps` tables ✓

---

## Pattern Reuse from Phase 3

| Pattern | Source | Reuse |
|---------|--------|-------|
| BlockGridCanvas | `components/admin/canvas/block-grid-canvas.tsx` | Direct reuse |
| CanvasBlock | Phase 3 | Direct reuse |
| BlockItem | Phase 3 | Extended for badges |
| ItemDetailPanel | Phase 3 | Extended for type/severity fields |
| ActionResult type | Phase 3 | Copy pattern |
| Authorization helpers | Phase 3 | Adapt for Profile/ValueMap |
| Validation boundary-object | Phase 3 | New files with specific constants |

**Stability Principle:** Phase 4 validates that Phase 3 BlockGridCanvas is truly reusable. The 3-block layouts should require minimal new code beyond entity-specific wrappers and badges.
