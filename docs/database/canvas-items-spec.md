# Canvas Items: First-Class Entity Specification

## Overview

This spec defines the implementation of canvas items as first-class entities, enabling:
- Individual validation tracking per item
- Assumptions linked to specific items (not just blocks)
- Cross-canvas item reuse
- FIT analysis mappings between Value Map and Customer Profile items
- Evidence attached directly to items

## Schema Summary

### Tables

| Table | Purpose |
|-------|---------|
| `canvas_items` | The items themselves with type, importance, validation |
| `canvas_item_placements` | Where items appear (which canvas, which block) |
| `canvas_item_assumptions` | Links items → assumptions |
| `canvas_item_mappings` | FIT mappings (pain_reliever → pain, etc.) |
| `canvas_item_evidence` | Direct evidence on items |

### Item Types

```
BMC Blocks:              Item Types:
- key_partners        → partner
- key_activities      → activity
- key_resources       → resource
- value_propositions  → value_proposition
- customer_segments   → segment
- customer_relationships → relationship
- channels            → channel
- cost_structure      → cost
- revenue_streams     → revenue

Customer Profile:        Item Types:
- jobs                → job
- pains               → pain
- gains               → gain

Value Map:               Item Types:
- products_services   → product_service
- pain_relievers      → pain_reliever
- gain_creators       → gain_creator
```

---

## Implementation Phases

### Phase 1: Database & Types

**Files to create/update:**

1. **Migration** (DONE)
   - `supabase/migrations/20251229230000_canvas_items.sql`

2. **TypeScript types**
   - `lib/types/canvas-items.ts` (new)
   ```typescript
   export type CanvasItemType =
     | 'partner' | 'activity' | 'resource' | 'value_proposition'
     | 'segment' | 'relationship' | 'channel' | 'cost' | 'revenue'
     | 'job' | 'pain' | 'gain'
     | 'product_service' | 'pain_reliever' | 'gain_creator'

   export type JobType = 'functional' | 'social' | 'emotional' | 'supporting'
   export type Intensity = 'minor' | 'moderate' | 'major' | 'extreme'
   export type FitStrength = 'weak' | 'partial' | 'strong' | 'perfect'

   export interface CanvasItem {
     id: string
     studio_project_id?: string
     title: string
     description?: string
     item_type: CanvasItemType
     importance: 'critical' | 'high' | 'medium' | 'low'
     validation_status: 'untested' | 'testing' | 'validated' | 'invalidated'
     job_type?: JobType
     job_context?: string
     intensity?: Intensity
     frequency?: 'rarely' | 'sometimes' | 'often' | 'always'
     notes?: string
     tags: string[]
     metadata: Record<string, unknown>
     created_at: string
     updated_at: string
   }

   export interface CanvasItemPlacement {
     id: string
     canvas_item_id: string
     canvas_type: 'business_model_canvas' | 'customer_profile' | 'value_map'
     canvas_id: string
     block_name: string
     position: number
     validation_status_override?: string
   }

   export interface CanvasItemMapping {
     id: string
     source_item_id: string
     target_item_id: string
     mapping_type: 'relieves' | 'creates' | 'addresses' | 'enables'
     fit_strength: FitStrength
     validation_method?: 'assumed' | 'interviewed' | 'tested' | 'measured'
     notes?: string
   }
   ```

3. **Update database.ts**
   - Add canvas_items, canvas_item_placements, etc. to Database type

4. **MCP schemas**
   - `lib/mcp/schemas/canvas-items.ts` (new)
   - Register in `lib/mcp/tables.ts`

---

### Phase 2: Admin UI - Items List

**Purpose:** Standalone item management (view all items, filter, bulk operations)

**Files:**
```
app/(private)/admin/items/
├── page.tsx              # List view with filters
├── new/page.tsx          # Create new item
└── [id]/edit/page.tsx    # Edit item

components/admin/
├── canvas-item-form.tsx      # Item create/edit form
└── views/items-list-view.tsx # Client list component
```

**List View Features:**
- Filter by: item_type, validation_status, importance, project
- Group by: item_type or canvas
- Show: placement count, assumption count, evidence count
- Bulk actions: change status, delete

**Form Fields:**
- Title (required)
- Description
- Item Type (required, determines available fields)
- Importance (critical/high/medium/low)
- Validation Status
- Job-specific: job_type, job_context (shown when type=job)
- Pain/Gain-specific: intensity (shown when type=pain|gain)
- Frequency
- Notes, Tags

---

### Phase 3: Canvas Form Integration

**Goal:** Replace textarea-based item entry with item picker/creator

**Component:** `components/admin/canvas-item-selector.tsx`

```typescript
interface CanvasItemSelectorProps {
  // Which items are currently in this block
  placedItemIds: string[]
  // Canvas context for creating placements
  canvasType: 'business_model_canvas' | 'customer_profile' | 'value_map'
  canvasId: string
  blockName: string
  // Which item types are valid for this block
  allowedTypes: CanvasItemType[]
  // Project scope
  projectId?: string
  // Callbacks
  onItemsChange: (itemIds: string[]) => void
}
```

**Features:**
1. **Search existing items** - Filter by type, project
2. **Create inline** - Quick-add new item
3. **Reorder items** - Drag to change position
4. **Item pills** - Click to expand details in popover
5. **Unplace item** - Remove from this block (doesn't delete item)

**Block → Allowed Types Mapping:**
```typescript
const BLOCK_ITEM_TYPES: Record<string, CanvasItemType[]> = {
  // BMC
  key_partners: ['partner'],
  key_activities: ['activity'],
  key_resources: ['resource'],
  value_propositions: ['value_proposition'],
  customer_segments: ['segment'],
  customer_relationships: ['relationship'],
  channels: ['channel'],
  cost_structure: ['cost'],
  revenue_streams: ['revenue'],
  // Customer Profile
  jobs: ['job'],
  pains: ['pain'],
  gains: ['gain'],
  // Value Map
  products_services: ['product_service'],
  pain_relievers: ['pain_reliever'],
  gain_creators: ['gain_creator'],
}
```

**Migration from textarea:**
- Keep legacy `items: string[]` for backward compatibility initially
- Add `item_ids: string[]` to blocks
- UI shows items from item_ids, with option to "migrate" text items
- Eventually deprecate text items

---

### Phase 4: Assumption Linking

**Update AssumptionLinker:**
- Currently links assumptions to canvas blocks
- Update to link assumptions to specific items

**New flow:**
1. In CanvasItemSelector, each item pill has "Link Assumption" action
2. Opens AssumptionLinker scoped to that item
3. Creates `canvas_item_assumptions` record

**Display:**
- Item pill shows assumption count badge
- Popover shows linked assumptions with status

---

### Phase 5: FIT Mapping UI

**Purpose:** Connect Value Map items to Customer Profile items

**Location:** Could be:
1. Standalone "FIT Analysis" page per project
2. Inline in Value Proposition Canvas form
3. Visual mapping interface

**Recommended: Inline in VPC form**

When viewing/editing a Value Proposition Canvas:
- Left side: Value Map items (from linked value_map_id)
- Right side: Customer Profile items (from linked customer_profile_id)
- Center: Draw connections with fit_strength

**Component:** `components/admin/fit-mapping-editor.tsx`

```typescript
interface FitMappingEditorProps {
  valueMapId: string
  customerProfileId: string
  existingMappings: CanvasItemMapping[]
  onMappingsChange: (mappings: CanvasItemMapping[]) => void
}
```

**Features:**
1. Show pain_relievers on left, pains on right
2. Click item on left, then item on right to create mapping
3. Click existing mapping to edit fit_strength
4. Visual lines show connections with color by fit_strength
5. Calculate overall FIT score from mappings

---

### Phase 6: Evidence on Items

**Add to item form/popover:**
- Evidence section (collapsible)
- Add evidence: type, title, summary, url
- Shows supports/contradicts indicator

**Component reuse:**
- Similar to assumption evidence, could share EvidenceForm component

---

## Data Migration Strategy

**For existing canvases with text-based items:**

1. **Don't auto-migrate** - Text items work fine for brainstorming
2. **Provide "Promote to Items" action** - Per block or per canvas
3. **Promotion creates:**
   - canvas_item for each text item
   - canvas_item_placement linking to the block
4. **After promotion:**
   - Block shows items from placements
   - Text items hidden but preserved

**Migration helper function:**
```sql
-- Function to promote text items to canvas_items
CREATE OR REPLACE FUNCTION promote_block_items(
  p_canvas_type TEXT,
  p_canvas_id UUID,
  p_block_name TEXT,
  p_item_type TEXT,
  p_project_id UUID
) RETURNS INTEGER AS $$
DECLARE
  v_items TEXT[];
  v_item TEXT;
  v_item_id UUID;
  v_position INTEGER := 0;
  v_count INTEGER := 0;
BEGIN
  -- Get items array from the block (implementation depends on canvas type)
  -- Create canvas_item and placement for each
  -- Return count of items created
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;
```

---

## UI Mockups

### Item Pill (in block)
```
┌─────────────────────────────────────────────────────┐
│ [grip] Small Business Owners  [2🔗] [⚠️] [×]        │
└─────────────────────────────────────────────────────┘
         │                       │    │    │
         title                   │    │    unplace
                                 │    validation status
                                 assumption count
```

### Item Popover
```
┌──────────────────────────────────────┐
│ Small Business Owners                │
│ segment · high importance            │
├──────────────────────────────────────┤
│ Companies with 10-50 employees       │
│ seeking productivity tools           │
├──────────────────────────────────────┤
│ Validation: testing                  │
│ Assumptions: 2 linked                │
│ Evidence: 1 interview                │
├──────────────────────────────────────┤
│ [Edit] [Link Assumption] [View Full] │
└──────────────────────────────────────┘
```

### FIT Mapping View
```
Value Map                    Customer Profile
─────────────────────────────────────────────
Pain Relievers               Pains
┌──────────────┐    ═══════> ┌──────────────┐
│ Auto-backup  │──── strong ─│ Data loss    │
└──────────────┘             └──────────────┘
┌──────────────┐    ───────> ┌──────────────┐
│ One-click    │── partial ──│ Complex UI   │
│ export       │             └──────────────┘
└──────────────┘             ┌──────────────┐
                             │ Slow perf    │ (unmapped!)
                             └──────────────┘
```

---

## Implementation Order

| Phase | Effort | Dependencies |
|-------|--------|--------------|
| 1. Database & Types | Small | None |
| 2. Items Admin List | Medium | Phase 1 |
| 3. Canvas Form Integration | Large | Phase 2 |
| 4. Assumption Linking | Small | Phase 3 |
| 5. FIT Mapping | Medium | Phase 3 |
| 6. Evidence on Items | Small | Phase 2 |

**Recommended sequence:** 1 → 2 → 3 → 4 → 5 → 6

Phase 3 is the largest and most impactful - it changes how canvas forms work.

---

## Questions to Resolve

1. **Reuse across projects?**
   - Current: Items scoped to studio_project_id
   - Alternative: Global items, placements scoped to project
   - Recommendation: Keep project-scoped for now, simpler mental model

2. **Segment ↔ Customer Profile relationship?**
   - A segment item could link to a full customer_profile
   - Or customer_profile could auto-create a segment item
   - Recommendation: Keep separate, link via metadata

3. **Value Proposition ↔ Value Map relationship?**
   - Similar question
   - Recommendation: Keep separate, VPC links both

4. **Ordering within blocks?**
   - Use position field in placements
   - Or importance ranking as implicit order?
   - Recommendation: Explicit position, importance is separate

---

## Files Summary

**New files:**
- `lib/types/canvas-items.ts`
- `lib/mcp/schemas/canvas-items.ts`
- `app/(private)/admin/items/page.tsx`
- `app/(private)/admin/items/new/page.tsx`
- `app/(private)/admin/items/[id]/edit/page.tsx`
- `components/admin/canvas-item-form.tsx`
- `components/admin/canvas-item-selector.tsx`
- `components/admin/fit-mapping-editor.tsx`
- `components/admin/views/items-list-view.tsx`

**Updated files:**
- `lib/types/database.ts` - Add new table types
- `lib/mcp/tables.ts` - Register new tables
- `components/admin/business-model-canvas-form.tsx` - Use CanvasItemSelector
- `components/admin/customer-profile-form.tsx` - Use CanvasItemSelector
- `components/admin/value-map-form.tsx` - Use CanvasItemSelector
- `components/admin/assumption-linker.tsx` - Support item-level linking
