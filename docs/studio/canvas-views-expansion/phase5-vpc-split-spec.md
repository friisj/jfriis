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

No new tables needed. VPC canvas renders existing Profile and Value Map data with fit analysis overlay.

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

Optional calculation displayed in header:
```typescript
// Simple fit score based on coverage
const fitScore = calculateFitScore(valueMap, profile)
// - % of pains addressed by pain relievers
// - % of gains addressed by gain creators
// - Weighted by severity/importance
```

---

## Components

### New Split View Component

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

### Item Linking (Future Enhancement)

Optional: Allow explicit linking between items:
- Click Pain Reliever → Click Pain = Creates explicit fit link
- Explicit links override automatic fit calculation

---

## Server Actions

VPC canvas delegates to existing Value Map and Customer Profile actions.

**File:** `app/(private)/admin/canvases/value-propositions/[id]/canvas/actions.ts`

```typescript
// Re-export or wrap existing actions
// Value Map side
export { addItemAction as addValueMapItemAction } from '../../value-maps/[id]/canvas/actions'
export { updateItemAction as updateValueMapItemAction } from '../../value-maps/[id]/canvas/actions'
// etc.

// Customer Profile side
export { addItemAction as addProfileItemAction } from '../../customer-profiles/[id]/canvas/actions'
export { updateItemAction as updateProfileItemAction } from '../../customer-profiles/[id]/canvas/actions'
// etc.

// VPC-specific
export async function updateFitLinksAction(vpcId: string, links: FitLink[]): Promise<ActionResult>
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

### Entity Generation Config

```typescript
vpc_full: {
  systemPrompt: `Generate a complete Value Proposition Canvas.
Create both sides that align with each other:
- Customer Profile: Jobs, Pains, Gains for the target segment
- Value Map: Products/Services, Pain Relievers, Gain Creators
Ensure Pain Relievers address the Pains and Gain Creators address the Gains.`,
  fieldsToGenerate: ['profile_items', 'value_map_items'],
  contextFields: ['vpc_name', 'venture_context', 'target_segment'],
  displayField: 'name',
},

vpc_fit_suggestions: {
  systemPrompt: `Given existing customer Pains and Gains, suggest Pain Relievers and Gain Creators.
Each suggestion should directly address a specific pain or gain.
Reference the pain/gain being addressed.`,
  fieldsToGenerate: ['pain_relievers', 'gain_creators'],
  contextFields: ['existing_pains', 'existing_gains', 'products_services'],
  displayField: 'content',
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
const { data: vpc } = await supabase
  .from('value_proposition_canvases')
  .select(`
    *,
    value_map:value_maps(*),
    customer_profile:customer_profiles(*)
  `)
  .eq('id', params.id)
  .single()
```

---

## Verification Checklist

- [ ] Can navigate to `/admin/canvases/value-propositions/[id]/canvas`
- [ ] Split view displays Value Map (left) and Profile (right)
- [ ] Both sides are independently editable
- [ ] Fit score displays in header
- [ ] Visual alignment indicators between corresponding blocks
- [ ] Mode toggle works for both sides
- [ ] AI generation works for full VPC
- [ ] Fit suggestion AI works
- [ ] Changes to either side persist correctly
- [ ] Build compiles without errors

---

## Dependencies

- Phase 4 complete (Customer Profile and Value Map canvases exist) ✓
- Existing `value_proposition_canvases` table with FK links ✓

---

## Future Enhancements

After MVP:
- Explicit item linking (Pain Reliever → Pain)
- Fit score breakdown (which pains addressed, which gaps)
- Export to Strategyzer format
- Animated fit visualization
