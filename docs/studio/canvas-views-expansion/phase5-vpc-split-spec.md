# Phase 5: Value Proposition Canvas (Split View) Specification

> Detailed implementation spec for the Value Proposition Canvas view.
> Combines Value Map and Customer Profile in a side-by-side split view.

---

## Overview

**Route:** `/admin/canvases/value-propositions/[id]/canvas`
**Pattern:** Split view (Value Map left + Customer Profile right)
**Priority:** Fifth (final canvas, combines previous work)
**Depends on:** Phase 4 (Customer Profile and Value Map components)

---

## Concept

The Value Proposition Canvas (VPC) from Strategyzer shows product-market fit by placing:
- **Value Map** (what you offer) on the LEFT
- **Customer Profile** (what customers need) on the RIGHT

Visual alignment between the two sides indicates fit:
- Pain Relievers ↔ Pains
- Gain Creators ↔ Gains

---

## Data Model

### Existing Structure

VPC already has linked entities AND fit analysis fields:

```sql
-- value_proposition_canvases links to:
-- - customer_profile_id → customer_profiles
-- - value_map_id → value_maps
--
-- Existing fit analysis fields:
-- - addressed_jobs JSONB      -- Which jobs are addressed
-- - addressed_pains JSONB     -- Which pains are relieved
-- - addressed_gains JSONB     -- Which gains are created
-- - fit_score DECIMAL         -- Overall fit percentage
```

### Design Decision: Leverage Existing Fit Fields

**Current state:** VPC table already has `addressed_jobs`, `addressed_pains`, `addressed_gains` JSONB fields for explicit fit mapping, plus `fit_score`.

**Decision:** Canvas UI should surface and allow editing of these existing fit analysis fields, not create parallel structures.

**Implementation approach:**
1. Display existing fit mappings as visual connections
2. Allow interactive linking (Pain Reliever → Pain updates `addressed_pains`)
3. Calculate/update `fit_score` when mappings change
4. No new tables needed

**JSONB structure to leverage:**
```typescript
// Example addressed_pains structure
{
  "pain_reliever_id_1": ["pain_id_a", "pain_id_b"],
  "pain_reliever_id_2": ["pain_id_c"]
}
```

### No Migration Needed

VPC canvas renders existing Profile and Value Map data with fit analysis overlay. No schema changes required.

---

## UI Specification

### Split Layout

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    Value Proposition Canvas                              │
│                    [Fit Score: 72%] [Mode Toggle]                       │
├─────────────────────────────────┬───────────────────────────────────────┤
│          VALUE MAP              │          CUSTOMER PROFILE             │
│                                 │                                       │
│  ┌─────────┐ ┌───────────────┐  │  ┌───────────────┐ ┌─────────┐       │
│  │Products │ │Pain Relievers │  │  │     Jobs      │ │  Pains  │       │
│  │         │ │       ↔       │←─┼─→│               │ │    ↔    │       │
│  └─────────┘ └───────────────┘  │  └───────────────┘ └─────────┘       │
│              ┌───────────────┐  │  ┌───────────────┐                   │
│              │Gain Creators  │  │  │     Gains     │                   │
│              │       ↔       │←─┼─→│       ↔       │                   │
│              └───────────────┘  │  └───────────────┘                   │
│                                 │                                       │
└─────────────────────────────────┴───────────────────────────────────────┘
```

### Fit Indicators

Visual connections between corresponding blocks:
- Pain Relievers ↔ Pains (show fit lines or color coding)
- Gain Creators ↔ Gains (show fit lines or color coding)

### Fit Score

Calculation displayed in header:
```typescript
// Simple fit score based on coverage
const fitScore = calculateFitScore(valueMap, profile, addressedMappings)
// - % of pains addressed by pain relievers
// - % of gains addressed by gain creators
// - Weighted by severity/importance
```

---

## Components

### Split View Component (New)

#### `VPCCanvas`
**File:** `components/admin/canvas/vpc-canvas.tsx`

```typescript
interface VPCCanvasProps {
  vpc: ValuePropositionCanvas
  valueMap: ValueMap
  customerProfile: CustomerProfile
  mode: CanvasMode
  onUpdate: () => void
}
```

### Reused Components

| Component | Source | Side |
|-----------|--------|------|
| `ValueMapCanvas` | Phase 4 | Left |
| `CustomerProfileCanvas` | Phase 4 | Right |
| `BlockGridCanvas` | Phase 3 | Both sides |
| `CanvasBlock` | Phase 3 | Both sides |
| `BlockItem` | Phase 3 | Both sides |

### New Components

| Component | Purpose |
|-----------|---------|
| `VPCCanvas` | Split view container |
| `FitScoreDisplay` | Header fit percentage |
| `FitIndicator` | Visual connection between matched items |
| `SplitDivider` | Center divider with alignment cues |

---

## Interaction Model

### Mode Behavior

| Mode | Left Side | Right Side | Cross-Side |
|------|-----------|------------|------------|
| **Structured** | Edit Value Map items | Edit Profile items | View fit connections |
| **Drag** | Reorder Value Map | Reorder Profile | N/A |

### Item Linking (Fit Mapping)

For explicit fit mapping:
- In structured mode, select Pain Reliever → select Pain = creates fit link
- Fit links stored in VPC's `addressed_pains` JSONB
- Visual indicator shows linked items

---

## Server Actions

VPC canvas has its own actions plus delegates to existing Value Map and Customer Profile actions.

**File:** `app/(private)/admin/canvases/value-propositions/[id]/canvas/actions.ts`

### Type Definitions

```typescript
'use server'

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string; code?: string }

interface FitLink {
  sourceId: string   // Pain Reliever or Gain Creator ID
  targetIds: string[] // Pain or Gain IDs
}
```

### Authorization Pattern

```typescript
async function verifyVPCAccess(
  supabase: Awaited<ReturnType<typeof createClient>>,
  vpcId: string
): Promise<{ success: true; vpcId: string; valueMapId: string; profileId: string } | { success: false; error: string }> {
  const { data, error } = await supabase
    .from('value_proposition_canvases')
    .select('id, value_map_id, customer_profile_id')
    .eq('id', vpcId)
    .single()

  if (error || !data) {
    return { success: false, error: 'VPC not found or access denied' }
  }
  return {
    success: true,
    vpcId: data.id,
    valueMapId: data.value_map_id,
    profileId: data.customer_profile_id
  }
}
```

### Action Signatures

```typescript
// VPC-specific actions
export async function updateFitLinksAction(
  vpcId: string,
  linkType: 'pains' | 'gains',
  links: FitLink[]
): Promise<ActionResult>

export async function addFitLinkAction(
  vpcId: string,
  linkType: 'pains' | 'gains',
  sourceId: string,
  targetId: string
): Promise<ActionResult>

export async function removeFitLinkAction(
  vpcId: string,
  linkType: 'pains' | 'gains',
  sourceId: string,
  targetId: string
): Promise<ActionResult>

export async function recalculateFitScoreAction(
  vpcId: string
): Promise<ActionResult<{ fitScore: number }>>

// Re-export or wrap existing actions for convenience
export { addItemAction as addValueMapItemAction } from '../../value-maps/[id]/canvas/actions'
export { addItemAction as addProfileItemAction } from '../../customer-profiles/[id]/canvas/actions'
// etc.
```

### Revalidation Pattern

```typescript
function revalidateVPCCanvas(vpcId: string) {
  revalidatePath(`/admin/canvases/value-propositions/${vpcId}/canvas`, 'page')
  revalidatePath(`/admin/canvases/value-propositions/${vpcId}`, 'layout')
}
```

### Validation Constants

**File:** `lib/boundary-objects/vpc-canvas.ts`

```typescript
export const FIT_LINK_TYPES = ['pains', 'gains'] as const
export type FitLinkType = typeof FIT_LINK_TYPES[number]

export function validateFitLinkType(linkType: string): DataResult<FitLinkType> {
  if (!FIT_LINK_TYPES.includes(linkType as FitLinkType)) {
    return { success: false, error: `Invalid fit link type: ${linkType}` }
  }
  return { success: true, data: linkType as FitLinkType }
}

export function calculateFitScore(
  profile: CustomerProfile,
  addressedPains: Record<string, string[]>,
  addressedGains: Record<string, string[]>
): number {
  const totalPains = profile.pains?.items?.length || 0
  const totalGains = profile.gains?.items?.length || 0

  const addressedPainIds = new Set(Object.values(addressedPains).flat())
  const addressedGainIds = new Set(Object.values(addressedGains).flat())

  const painsCovered = totalPains > 0 ? addressedPainIds.size / totalPains : 0
  const gainsCovered = totalGains > 0 ? addressedGainIds.size / totalGains : 0

  // Simple average, can be weighted by severity/importance in future
  return Math.round(((painsCovered + gainsCovered) / 2) * 100)
}
```

---

## AI Generation

### Generation Options

| Option | Scope | Description |
|--------|-------|-------------|
| Generate Full VPC | Both sides | Generate Value Map and Profile together |
| Suggest Fit | Cross-side | Suggest Pain Relievers for existing Pains |
| Complete Value Map | Left side | Generate missing Value Map items |
| Complete Profile | Right side | Generate missing Profile items |

### Entity Type Registration (REQUIRED)

**File:** `lib/ai/prompts/entity-generation.ts`

Add VPC-specific configs:

```typescript
vpc_full: {
  systemPrompt: `Generate a complete Value Proposition Canvas.
Create both sides that align with each other:
- Customer Profile: Jobs, Pains, Gains for the target segment
- Value Map: Products/Services, Pain Relievers, Gain Creators
Ensure Pain Relievers address the Pains and Gain Creators address the Gains.`,
  fieldsToGenerate: ['profile_items', 'value_map_items'],
  defaultValues: {},
  contextFields: ['vpc_name', 'venture_context', 'target_segment'],
  displayField: 'name',
  editableFields: ['profile_items', 'value_map_items'],
  fieldHints: {
    profile_items: 'Items for Jobs, Pains, Gains blocks',
    value_map_items: 'Items for Products, Pain Relievers, Gain Creators'
  }
},

vpc_fit_suggestions: {
  systemPrompt: `Given existing customer Pains and Gains, suggest Pain Relievers and Gain Creators.
Each suggestion should directly address a specific pain or gain.
Reference the pain/gain being addressed.`,
  fieldsToGenerate: ['pain_relievers', 'gain_creators'],
  defaultValues: {},
  contextFields: ['existing_pains', 'existing_gains', 'products_services'],
  displayField: 'content',
  editableFields: ['pain_relievers', 'gain_creators'],
  fieldHints: {
    pain_relievers: 'How your offering addresses specific pains',
    gain_creators: 'How your offering creates specific gains'
  }
}
```

---

## Route Structure

```
/app/(private)/admin/canvases/value-propositions/[id]/
├── page.tsx                    # Existing detail view
├── edit/
│   └── page.tsx                # Existing form edit
└── canvas/
    ├── page.tsx                # Canvas page (fetches VPC + linked entities)
    ├── vpc-canvas-view.tsx     # Client orchestration
    └── actions.ts              # Server actions
```

### Page Data Fetching

```typescript
// Fetch VPC with linked entities
export default async function VPCCanvasPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()

  const { data: vpc } = await supabase
    .from('value_proposition_canvases')
    .select(`
      *,
      value_map:value_maps(*),
      customer_profile:customer_profiles(*)
    `)
    .eq('id', params.id)
    .single()

  if (!vpc) notFound()

  return <VPCCanvasView vpc={vpc} />
}
```

### Navigation Integration

```typescript
// Add link in VPC detail/edit page
<Button asChild variant="outline">
  <Link href={`/admin/canvases/value-propositions/${vpc.id}/canvas`}>
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
| `components/admin/canvas/vpc-canvas.tsx` | Component | Split view container |
| `components/admin/canvas/fit-score-display.tsx` | Component | Header fit percentage |
| `components/admin/canvas/fit-indicator.tsx` | Component | Visual connection lines |
| `components/admin/canvas/split-divider.tsx` | Component | Center divider |
| `app/(private)/admin/canvases/value-propositions/[id]/canvas/page.tsx` | Page | Route entry point |
| `app/(private)/admin/canvases/value-propositions/[id]/canvas/vpc-canvas-view.tsx` | Component | Client orchestration |
| `app/(private)/admin/canvases/value-propositions/[id]/canvas/actions.ts` | Actions | Server actions |
| `lib/boundary-objects/vpc-canvas.ts` | Utility | Validation & fit calculation |

### Files to Modify

| File | Change |
|------|--------|
| `components/admin/canvas/index.ts` | Export new components |
| `lib/ai/prompts/entity-generation.ts` | Add `vpc_full` and `vpc_fit_suggestions` |
| `app/(private)/admin/canvases/value-propositions/[id]/page.tsx` | Add "Canvas View" link |

---

## Verification Checklist

### Core Functionality
- [ ] Can navigate to `/admin/canvases/value-propositions/[id]/canvas`
- [ ] Split view displays Value Map (left) and Profile (right)
- [ ] Both sides are independently editable
- [ ] Fit score displays in header
- [ ] Visual alignment indicators between corresponding blocks
- [ ] Mode toggle works for both sides
- [ ] AI generation works for full VPC
- [ ] Fit suggestion AI works
- [ ] Changes to either side persist correctly

### P0 Fixes (Tech Review)
- [ ] ActionResult type matches Phase 3/4 pattern
- [ ] Authorization helper verifies VPC access including linked entities
- [ ] Validation functions exist in boundary-objects
- [ ] Entity types registered in ENTITY_GENERATION_CONFIGS
- [ ] Navigation link added to existing VPC pages
- [ ] Build compiles without errors

---

## Dependencies

- Phase 4 complete (Customer Profile and Value Map canvases exist) ✓
- Existing `value_proposition_canvases` table with FK links ✓
- Existing fit analysis fields (`addressed_pains`, `addressed_gains`, `fit_score`) ✓

---

## Pattern Reuse from Phase 4

| Pattern | Source | Reuse |
|---------|--------|-------|
| CustomerProfileCanvas | Phase 4 | Embedded in right side |
| ValueMapCanvas | Phase 4 | Embedded in left side |
| BlockGridCanvas | Phase 3 | Via Profile/ValueMap |
| ActionResult type | Phase 3/4 | Copy pattern |
| Authorization helpers | Phase 4 | Extend for linked entities |
| Validation boundary-object | Phase 4 | New file for VPC-specific |

**Stability Principle:** Phase 5 is primarily composition - it wraps existing Profile and Value Map canvases in a split view. The main new work is the fit visualization and linking UI.

---

## Future Enhancements

After MVP:
- Explicit item linking (Pain Reliever → Pain with drag or click)
- Fit score breakdown (which pains addressed, which gaps)
- Export to Strategyzer format
- Animated fit visualization
- Suggest missing items based on fit gaps
