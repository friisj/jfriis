# Relationship Simplification Specification

## Status: Complete
## Version: 1.2
## Date: 2026-01-03
## Completed: 2026-01-03

---

## 1. Executive Summary

This specification defines two universal tables that simplify relationship management across the codebase:

1. **`evidence`** - Universal evidence storage for any entity
2. **`entity_links`** - Universal relationship table for loose associations

These replace:
- 3 evidence tables → 1 universal table
- 6+ JSONB UUID arrays → junction table entries
- Future ad-hoc junction tables → standardized pattern

### 1.1 Key Trade-offs

**What we gain:**
- Single pattern for loose relationships
- Easier to add new relationship types (no new tables)
- Consistent query patterns across entities
- Evidence management in one place

**What we accept:**
- No database-enforced referential integrity (polymorphic references can't have FKs)
- Requires application-level or trigger-based orphan cleanup
- Slightly more complex queries (must filter by entity_type)
- Cannot use Supabase's automatic join syntax for target entities

**What this does NOT address:**
- Canvas item dual-storage (JSONB blocks + `canvas_items` table) - separate effort
- Consolidating all junction tables - only migrates simple ones
- User ownership/creator tracking

### 1.2 When to Use Each Pattern

| Pattern | Use When | Examples |
|---------|----------|----------|
| **Foreign Key** | Hierarchical ownership, parent-child | `hypothesis.project_id`, `touchpoint.stage_id` |
| **Specialized Junction** | M:M with rich metadata, domain logic | `canvas_item_mappings` (FIT analysis), `assumption_experiments` (results) |
| **`entity_links`** | Loose associations, cross-entity references | BMC↔VPC, backlog→assumptions, log→specimens |
| **`evidence`** | Any entity needing validation evidence | assumptions, touchpoints, canvas items |

**Rule of thumb:** If the relationship needs more than `notes` and `strength` metadata, keep it as a specialized junction table.

---

## 2. Universal Evidence Table

### 2.1 Problem Statement

Currently, evidence is stored in three separate tables with identical schemas:
- `assumption_evidence`
- `canvas_item_evidence`
- `touchpoint_evidence`

Adding evidence support to any new entity requires creating a new table.

### 2.2 Schema Definition

```sql
CREATE TABLE evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Polymorphic reference to parent entity
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,

  -- Evidence classification
  evidence_type TEXT NOT NULL,

  -- Content
  title TEXT,
  content TEXT,
  source_url TEXT,
  source_reference TEXT,

  -- Quality indicators
  confidence DECIMAL(3,2) CHECK (confidence >= 0 AND confidence <= 1),
  supports BOOLEAN DEFAULT true,

  -- Collection metadata
  collected_at TIMESTAMPTZ,
  collector_notes TEXT,

  -- Flexible metadata
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_evidence_entity ON evidence (entity_type, entity_id);
CREATE INDEX idx_evidence_type ON evidence (evidence_type);
CREATE INDEX idx_evidence_tags ON evidence USING GIN (tags);
CREATE INDEX idx_evidence_created ON evidence (created_at DESC);

-- Trigger for updated_at
CREATE TRIGGER update_evidence_updated_at
  BEFORE UPDATE ON evidence
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

### 2.3 Supported Entity Types

```typescript
type EvidenceEntityType =
  | 'assumption'
  | 'canvas_item'
  | 'touchpoint'
  | 'hypothesis'
  | 'experiment'
  | 'journey'
  | 'journey_stage'
  | 'customer_profile'
  | 'value_proposition_canvas'
  | 'business_model_canvas';
```

### 2.4 Evidence Types

```typescript
type EvidenceType =
  // Research methods
  | 'interview'
  | 'survey'
  | 'observation'
  | 'research'

  // Quantitative
  | 'analytics'
  | 'metrics'
  | 'ab_test'

  // Validation
  | 'experiment'
  | 'prototype'
  | 'user_test'
  | 'heuristic_eval'

  // External
  | 'competitor'
  | 'expert'
  | 'market_research'

  // Internal
  | 'team_discussion'
  | 'stakeholder_feedback';
```

### 2.5 TypeScript Interface

```typescript
interface Evidence {
  id: string;
  entity_type: EvidenceEntityType;
  entity_id: string;
  evidence_type: EvidenceType;
  title?: string;
  content?: string;
  source_url?: string;
  source_reference?: string;
  confidence?: number; // 0.0 - 1.0
  supports: boolean;
  collected_at?: string;
  collector_notes?: string;
  tags: string[];
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}
```

### 2.6 Query Patterns

```typescript
// Get all evidence for an entity
const { data } = await supabase
  .from('evidence')
  .select('*')
  .eq('entity_type', 'assumption')
  .eq('entity_id', assumptionId)
  .order('created_at', { ascending: false });

// Get evidence by type
const { data } = await supabase
  .from('evidence')
  .select('*')
  .eq('entity_type', 'touchpoint')
  .eq('entity_id', touchpointId)
  .eq('evidence_type', 'user_test');

// Get supporting vs refuting evidence
const { data: supporting } = await supabase
  .from('evidence')
  .select('*')
  .eq('entity_type', 'assumption')
  .eq('entity_id', assumptionId)
  .eq('supports', true);

// Count evidence by entity
const { count } = await supabase
  .from('evidence')
  .select('*', { count: 'exact', head: true })
  .eq('entity_type', 'canvas_item')
  .eq('entity_id', itemId);
```

### 2.7 RLS Policies

```sql
-- Read: authenticated users can read all evidence
CREATE POLICY "Evidence readable by authenticated users"
  ON evidence FOR SELECT
  TO authenticated
  USING (true);

-- Insert: authenticated users can add evidence
CREATE POLICY "Evidence insertable by authenticated users"
  ON evidence FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Update: authenticated users can update evidence
CREATE POLICY "Evidence updatable by authenticated users"
  ON evidence FOR UPDATE
  TO authenticated
  USING (true);

-- Delete: authenticated users can delete evidence
CREATE POLICY "Evidence deletable by authenticated users"
  ON evidence FOR DELETE
  TO authenticated
  USING (true);
```

---

## 3. Universal Entity Links Table

### 3.1 Problem Statement

Relationships between entities are implemented inconsistently:
- Some use junction tables (11 total)
- Some use JSONB UUID arrays (6+ fields)
- Some use direct FKs

JSONB arrays lack referential integrity and are hard to query.

### 3.2 Schema Definition

```sql
CREATE TABLE entity_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Source entity (the "from" side)
  source_type TEXT NOT NULL,
  source_id UUID NOT NULL,

  -- Target entity (the "to" side)
  target_type TEXT NOT NULL,
  target_id UUID NOT NULL,

  -- Relationship classification
  link_type TEXT NOT NULL DEFAULT 'related',

  -- Optional relationship metadata
  strength TEXT CHECK (strength IN ('strong', 'moderate', 'weak', 'tentative')),
  notes TEXT,
  metadata JSONB DEFAULT '{}',

  -- Ordering (for ordered relationships like gallery items)
  position INTEGER,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Prevent duplicate links
  UNIQUE(source_type, source_id, target_type, target_id, link_type)
);

-- Indexes for efficient querying in both directions
CREATE INDEX idx_entity_links_source ON entity_links (source_type, source_id);
CREATE INDEX idx_entity_links_target ON entity_links (target_type, target_id);
CREATE INDEX idx_entity_links_type ON entity_links (link_type);
CREATE INDEX idx_entity_links_position ON entity_links (source_type, source_id, position)
  WHERE position IS NOT NULL;
```

### 3.2.1 Direction Convention

Links are stored in ONE direction only. The direction follows semantic meaning:

| Link Type | Direction | Example |
|-----------|-----------|---------|
| `related` | Either (pick one, be consistent) | BMC → VPC |
| `inspired_by` | Child → Parent | backlog_item → assumption |
| `evolved_from` | New → Old | canvas_item → backlog_item |
| `validates` | Evidence → Claim | experiment → hypothesis |
| `tests` | Test → Subject | experiment → hypothesis |
| `documents` | Record → Subject | log_entry → assumption |
| `demonstrates` | Proof → Claim | specimen → assumption |
| `contains` | Parent → Child | gallery → specimen |

**Querying both directions:** For `related` links, always query both directions:

```typescript
// Get all related entities (bidirectional)
async function getRelatedEntities(entity: { type: string; id: string }) {
  const [outgoing, incoming] = await Promise.all([
    supabase.from('entity_links').select('*')
      .eq('source_type', entity.type).eq('source_id', entity.id)
      .eq('link_type', 'related'),
    supabase.from('entity_links').select('*')
      .eq('target_type', entity.type).eq('target_id', entity.id)
      .eq('link_type', 'related'),
  ]);
  return { outgoing: outgoing.data, incoming: incoming.data };
}
```

### 3.3 Supported Entity Types

```typescript
type LinkableEntityType =
  // Portfolio
  | 'project'
  | 'log_entry'
  | 'backlog_item'
  | 'specimen'

  // Studio
  | 'studio_project'
  | 'hypothesis'
  | 'experiment'

  // Canvases
  | 'business_model_canvas'
  | 'customer_profile'
  | 'value_proposition_canvas'
  | 'canvas_item'

  // Journeys
  | 'user_journey'
  | 'journey_stage'
  | 'touchpoint'

  // Validation
  | 'assumption';
```

### 3.4 Link Types

```typescript
type LinkType =
  // Generic associations
  | 'related'           // General relationship
  | 'references'        // One references another

  // Derivation/evolution
  | 'evolved_from'      // Backlog item became canvas item
  | 'inspired_by'       // One inspired another
  | 'derived_from'      // Direct derivation

  // Validation relationships
  | 'validates'         // Evidence validates assumption
  | 'tests'             // Experiment tests hypothesis
  | 'supports'          // Supports a claim
  | 'contradicts'       // Contradicts a claim

  // Composition
  | 'contains'          // Parent contains child
  | 'part_of'           // Child is part of parent

  // Canvas-specific
  | 'addresses_job'     // Value prop addresses customer job
  | 'relieves_pain'     // Pain reliever addresses pain
  | 'creates_gain'      // Gain creator delivers gain

  // Documentation
  | 'documents'         // Log entry documents work on entity
  | 'demonstrates';     // Specimen demonstrates assumption
```

### 3.5 TypeScript Interface

```typescript
interface EntityLink {
  id: string;
  source_type: LinkableEntityType;
  source_id: string;
  target_type: LinkableEntityType;
  target_id: string;
  link_type: LinkType;
  strength?: 'strong' | 'moderate' | 'weak' | 'tentative';
  notes?: string;
  metadata: Record<string, unknown>;
  position?: number;
  created_at: string;
}
```

### 3.6 Link Type Validation

Not all link types make sense between all entity types. The application layer MUST validate links before insertion.

```typescript
// lib/entity-links-validation.ts

/**
 * Defines which link types are valid from each source type to each target type.
 * If a source→target pair isn't listed, only 'related' and 'references' are allowed.
 */
const VALID_LINK_TYPES: Record<string, Record<string, LinkType[]>> = {
  backlog_item: {
    assumption: ['inspired_by', 'related'],
    canvas_item: ['evolved_from'],
    log_entry: ['related', 'references'],
  },
  log_entry: {
    assumption: ['documents', 'related'],
    experiment: ['documents', 'related'],
    specimen: ['contains', 'related'],
    project: ['references', 'related'],
  },
  specimen: {
    assumption: ['demonstrates', 'validates'],
    project: ['related'],
  },
  experiment: {
    hypothesis: ['tests', 'validates'],
    assumption: ['tests', 'validates'],
    canvas_item: ['validates', 'related'],
  },
  business_model_canvas: {
    value_proposition_canvas: ['related'],
    customer_profile: ['related'],
  },
  value_proposition_canvas: {
    business_model_canvas: ['related'],
    customer_profile: ['related'],
  },
  customer_profile: {
    business_model_canvas: ['related'],
    value_proposition_canvas: ['related'],
  },
  user_journey: {
    business_model_canvas: ['related'],
    value_proposition_canvas: ['related'],
    customer_profile: ['related'],
  },
  gallery_sequence: {
    specimen: ['contains'],
  },
};

// Default allowed types when no specific rule exists
const DEFAULT_LINK_TYPES: LinkType[] = ['related', 'references'];

export function isValidLinkType(
  sourceType: LinkableEntityType,
  targetType: LinkableEntityType,
  linkType: LinkType
): boolean {
  const sourceRules = VALID_LINK_TYPES[sourceType];
  if (!sourceRules) {
    return DEFAULT_LINK_TYPES.includes(linkType);
  }

  const targetRules = sourceRules[targetType];
  if (!targetRules) {
    return DEFAULT_LINK_TYPES.includes(linkType);
  }

  return targetRules.includes(linkType);
}

export function getValidLinkTypes(
  sourceType: LinkableEntityType,
  targetType: LinkableEntityType
): LinkType[] {
  const sourceRules = VALID_LINK_TYPES[sourceType];
  if (!sourceRules || !sourceRules[targetType]) {
    return DEFAULT_LINK_TYPES;
  }
  return sourceRules[targetType];
}
```

**Usage in linkEntities helper:**

```typescript
export async function linkEntities(
  source: { type: LinkableEntityType; id: string },
  target: { type: LinkableEntityType; id: string },
  linkType: LinkType = 'related',
  options?: { strength?: string; notes?: string; position?: number }
) {
  // Validate link type
  if (!isValidLinkType(source.type, target.type, linkType)) {
    throw new Error(
      `Invalid link type '${linkType}' from ${source.type} to ${target.type}. ` +
      `Valid types: ${getValidLinkTypes(source.type, target.type).join(', ')}`
    );
  }

  // ... proceed with insert
}
```

### 3.7 Query Patterns

```typescript
// Get all entities linked FROM a source
const { data: outgoing } = await supabase
  .from('entity_links')
  .select('*')
  .eq('source_type', 'assumption')
  .eq('source_id', assumptionId);

// Get all entities linked TO a target
const { data: incoming } = await supabase
  .from('entity_links')
  .select('*')
  .eq('target_type', 'canvas_item')
  .eq('target_id', canvasItemId);

// Get specific relationship type
const { data } = await supabase
  .from('entity_links')
  .select('*')
  .eq('source_type', 'experiment')
  .eq('source_id', experimentId)
  .eq('link_type', 'tests');

// Get ordered relationships
const { data } = await supabase
  .from('entity_links')
  .select('*')
  .eq('source_type', 'gallery_sequence')
  .eq('source_id', galleryId)
  .eq('link_type', 'contains')
  .order('position');
```

### 3.8 Helper Functions

```typescript
// lib/entity-links.ts

import { supabase } from './supabase';
import { isValidLinkType, getValidLinkTypes } from './entity-links-validation';

export async function linkEntities(
  source: { type: LinkableEntityType; id: string },
  target: { type: LinkableEntityType; id: string },
  linkType: LinkType = 'related',
  options?: {
    strength?: 'strong' | 'moderate' | 'weak' | 'tentative';
    notes?: string;
    metadata?: Record<string, unknown>;
    position?: number;
  }
) {
  // Validate link type before insert
  if (!isValidLinkType(source.type, target.type, linkType)) {
    throw new Error(
      `Invalid link type '${linkType}' from ${source.type} to ${target.type}. ` +
      `Valid types: ${getValidLinkTypes(source.type, target.type).join(', ')}`
    );
  }

  const { data, error } = await supabase
    .from('entity_links')
    .insert({
      source_type: source.type,
      source_id: source.id,
      target_type: target.type,
      target_id: target.id,
      link_type: linkType,
      ...options
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function unlinkEntities(
  source: { type: LinkableEntityType; id: string },
  target: { type: LinkableEntityType; id: string },
  linkType?: LinkType
) {
  let query = supabase
    .from('entity_links')
    .delete()
    .eq('source_type', source.type)
    .eq('source_id', source.id)
    .eq('target_type', target.type)
    .eq('target_id', target.id);

  if (linkType) {
    query = query.eq('link_type', linkType);
  }

  const { error } = await query;
  if (error) throw error;
}

export async function getLinkedEntities(
  entity: { type: LinkableEntityType; id: string },
  direction: 'outgoing' | 'incoming' | 'both' = 'both',
  linkType?: LinkType
) {
  const results: EntityLink[] = [];

  if (direction === 'outgoing' || direction === 'both') {
    let query = supabase
      .from('entity_links')
      .select('*')
      .eq('source_type', entity.type)
      .eq('source_id', entity.id);

    if (linkType) query = query.eq('link_type', linkType);

    const { data } = await query;
    if (data) results.push(...data);
  }

  if (direction === 'incoming' || direction === 'both') {
    let query = supabase
      .from('entity_links')
      .select('*')
      .eq('target_type', entity.type)
      .eq('target_id', entity.id);

    if (linkType) query = query.eq('link_type', linkType);

    const { data } = await query;
    if (data) results.push(...data);
  }

  return results;
}

export async function updateLinkPosition(
  linkId: string,
  newPosition: number
) {
  const { error } = await supabase
    .from('entity_links')
    .update({ position: newPosition })
    .eq('id', linkId);

  if (error) throw error;
}
```

### 3.9 RLS Policies

```sql
-- Read: authenticated users can read all links
CREATE POLICY "Entity links readable by authenticated users"
  ON entity_links FOR SELECT
  TO authenticated
  USING (true);

-- Insert: authenticated users can create links
CREATE POLICY "Entity links insertable by authenticated users"
  ON entity_links FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Delete: authenticated users can remove links
CREATE POLICY "Entity links deletable by authenticated users"
  ON entity_links FOR DELETE
  TO authenticated
  USING (true);

-- Update: authenticated users can update links (for position, notes)
CREATE POLICY "Entity links updatable by authenticated users"
  ON entity_links FOR UPDATE
  TO authenticated
  USING (true);
```

### 3.10 Displaying Linked Entities

A key challenge with polymorphic links: you can't use Supabase's automatic join syntax because the target table varies. Here are patterns for fetching and displaying linked entities.

#### Pattern 1: Fetch Links, Then Fetch Targets (Simple)

```typescript
// lib/entity-links.ts

interface LinkedEntity {
  link: EntityLink;
  entity: Record<string, unknown>;
}

/**
 * Fetches linked entities with their full data.
 * Use when you need to display linked items with their details.
 */
export async function getLinkedEntitiesWithData(
  source: { type: LinkableEntityType; id: string },
  targetType: LinkableEntityType,
  linkType?: LinkType
): Promise<LinkedEntity[]> {
  // 1. Get the links
  let query = supabase
    .from('entity_links')
    .select('*')
    .eq('source_type', source.type)
    .eq('source_id', source.id)
    .eq('target_type', targetType);

  if (linkType) {
    query = query.eq('link_type', linkType);
  }

  const { data: links } = await query.order('position', { nullsFirst: false });
  if (!links?.length) return [];

  // 2. Get target entity table name
  const tableName = getTableNameForType(targetType);
  const targetIds = links.map(l => l.target_id);

  // 3. Fetch the target entities
  const { data: entities } = await supabase
    .from(tableName)
    .select('*')
    .in('id', targetIds);

  if (!entities) return [];

  // 4. Combine links with entities
  const entityMap = new Map(entities.map(e => [e.id, e]));
  return links
    .map(link => ({
      link,
      entity: entityMap.get(link.target_id),
    }))
    .filter((le): le is LinkedEntity => le.entity !== undefined);
}

/**
 * Maps entity types to their Supabase table names.
 */
function getTableNameForType(type: LinkableEntityType): string {
  const mapping: Record<LinkableEntityType, string> = {
    project: 'projects',
    log_entry: 'log_entries',
    backlog_item: 'backlog_items',
    specimen: 'specimens',
    studio_project: 'studio_projects',
    hypothesis: 'studio_hypotheses',
    experiment: 'studio_experiments',
    business_model_canvas: 'business_model_canvases',
    customer_profile: 'customer_profiles',
    value_proposition_canvas: 'value_proposition_canvases',
    canvas_item: 'canvas_items',
    user_journey: 'user_journeys',
    journey_stage: 'journey_stages',
    touchpoint: 'touchpoints',
    assumption: 'assumptions',
  };
  return mapping[type];
}
```

#### Pattern 2: Display Component with Built-in Fetching

```typescript
// components/admin/linked-entities-display.tsx

interface LinkedEntitiesDisplayProps {
  sourceType: LinkableEntityType;
  sourceId: string;
  targetType: LinkableEntityType;
  linkType?: LinkType;
  displayField?: string;
  emptyMessage?: string;
}

export function LinkedEntitiesDisplay({
  sourceType,
  sourceId,
  targetType,
  linkType,
  displayField = 'name',
  emptyMessage = 'No linked items',
}: LinkedEntitiesDisplayProps) {
  const [linkedEntities, setLinkedEntities] = useState<LinkedEntity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getLinkedEntitiesWithData({ type: sourceType, id: sourceId }, targetType, linkType)
      .then(setLinkedEntities)
      .finally(() => setLoading(false));
  }, [sourceType, sourceId, targetType, linkType]);

  if (loading) return <Skeleton />;
  if (!linkedEntities.length) return <p className="text-muted">{emptyMessage}</p>;

  return (
    <ul className="space-y-1">
      {linkedEntities.map(({ link, entity }) => (
        <li key={link.id} className="flex items-center gap-2">
          <span>{entity[displayField] as string}</span>
          {link.strength && (
            <Badge variant="outline">{link.strength}</Badge>
          )}
        </li>
      ))}
    </ul>
  );
}
```

#### Pattern 3: Summary Counts (For Lists)

```typescript
// When you just need counts, not full data

export async function getLinkedEntityCounts(
  source: { type: LinkableEntityType; id: string }
): Promise<Record<string, number>> {
  const { data } = await supabase
    .from('entity_links')
    .select('target_type')
    .eq('source_type', source.type)
    .eq('source_id', source.id);

  if (!data) return {};

  return data.reduce((acc, link) => {
    acc[link.target_type] = (acc[link.target_type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
}

// Usage in a list view:
// "3 assumptions, 2 experiments linked"
```

---

## 4. UI Component: EntityLinkField

> **Note:** This component is named `EntityLinkField` to distinguish it from `RelationshipField` which handles direct FK relationships. Both may appear in the same form sidebar.

### 4.1 Purpose

A reusable component for managing `entity_links` relationships in forms. Handles both edit mode (entity exists) and create mode (pending links saved after entity creation).

### 4.2 Interface

```typescript
interface EntityLinkFieldProps {
  // Source entity (the form's entity)
  sourceType: LinkableEntityType;
  sourceId?: string;  // undefined for create mode

  // Target configuration
  targetType: LinkableEntityType;
  targetTableName: string;
  targetDisplayField?: string;  // Default: 'name'
  targetSubtitleField?: string; // Secondary info

  // Relationship semantics
  linkType: LinkType;
  allowMultiple?: boolean;  // Default: true
  ordered?: boolean;        // Default: false

  // UI
  label: string;
  placeholder?: string;
  helperText?: string;
  disabled?: boolean;

  // For create mode (controlled)
  pendingLinks?: PendingLink[];
  onPendingLinksChange?: (links: PendingLink[]) => void;
}

interface PendingLink {
  targetId: string;
  targetLabel: string;  // For display before save
  linkType: LinkType;
  position?: number;
  notes?: string;
}
```

### 4.3 Usage Example

```tsx
<EntityLinkField
  sourceType="backlog_item"
  sourceId={backlogItem?.id}
  targetType="assumption"
  targetTableName="assumptions"
  targetDisplayField="statement"
  linkType="inspired_by"
  label="Related Assumptions"
  helperText="Link assumptions that this idea implies or addresses"
  pendingLinks={pendingAssumptionLinks}
  onPendingLinksChange={setPendingAssumptionLinks}
/>
```

---

## 5. Admin UI Component System

The admin forms have been upgraded with a consistent sidebar layout pattern that surfaces relationship management prominently. This section documents how these components integrate with the universal relationship tables.

### 5.1 Current Component Architecture

```
components/admin/
├── admin-form-layout.tsx     # Page wrapper with sidebar slot
├── sidebar-card.tsx          # Consistent sidebar section styling
├── form-actions.tsx          # Standard submit/cancel/delete footer
├── relationship-field.tsx    # FK relationship selector (existing tables)
├── entity-link-field.tsx     # entity_links manager (NEW)
├── linked-entities-display.tsx # Read-only display of links (NEW)
├── evidence-manager.tsx      # Universal evidence UI (NEW)
└── [entity]-form.tsx         # Entity-specific forms
```

### 5.2 Existing: RelationshipField

Manages foreign key relationships to existing tables. Loads data internally via Supabase.

```typescript
interface RelationshipFieldProps {
  label: string;
  value: string | string[];
  onChange: (value: string | string[]) => void;
  tableName: string;           // Supabase table name
  displayField?: string;       // Default: 'name'
  subtitleField?: string;      // Secondary display field
  mode: 'single' | 'multi';
  filterBy?: { field: string; value: string | null };  // Dependent filtering
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  helperText?: string;
  options?: RelationshipItem[]; // Pre-loaded options (optional)
}
```

**Use Case:** Direct FK relationships like `studio_project_id`, `hypothesis_id`

```tsx
<RelationshipField
  label="Studio Project"
  value={formData.studio_project_id}
  onChange={(id) => setFormData({ ...formData, studio_project_id: id as string })}
  tableName="studio_projects"
  displayField="name"
  mode="single"
  placeholder="Select project..."
/>
```

### 5.3 New: EntityLinkField

Manages relationships via the universal `entity_links` table. Supports any entity-to-entity relationship.

> See Section 4 for detailed interface and usage examples.

```typescript
interface EntityLinkFieldProps {
  // Source entity (the form's entity)
  sourceType: LinkableEntityType;
  sourceId?: string;  // undefined for create mode

  // Target configuration
  targetType: LinkableEntityType;
  targetTableName: string;
  targetDisplayField?: string;
  targetSubtitleField?: string;

  // Relationship semantics
  linkType: LinkType;
  allowMultiple?: boolean;  // Default: true
  ordered?: boolean;        // Default: false

  // UI
  label: string;
  placeholder?: string;
  helperText?: string;
  disabled?: boolean;

  // For controlled mode (create forms)
  pendingLinks?: PendingLink[];
  onPendingLinksChange?: (links: PendingLink[]) => void;
}
```

**Use Cases:**
- Cross-canvas relationships (BMC ↔ VPC)
- New relationship types (backlog → assumptions)
- Specimen/log entry relationships

```tsx
// In backlog-item-form.tsx sidebar
<EntityLinkField
  sourceType="backlog_item"
  sourceId={backlogItem?.id}
  targetType="assumption"
  targetTableName="assumptions"
  targetDisplayField="statement"
  linkType="inspired_by"
  allowMultiple={true}
  label="Related Assumptions"
  helperText="Assumptions this idea implies or relates to"
  pendingLinks={pendingAssumptionLinks}
  onPendingLinksChange={setPendingAssumptionLinks}
/>
```

### 5.4 New: EvidenceManager

Manages evidence via the universal `evidence` table. Provides inline evidence collection.

```typescript
interface EvidenceManagerProps {
  // Entity this evidence supports
  entityType: EvidenceEntityType;
  entityId?: string;  // undefined for create mode

  // UI configuration
  label?: string;
  compact?: boolean;  // Sidebar mode vs full mode
  allowedTypes?: EvidenceType[];  // Restrict evidence types

  // For controlled mode (create forms)
  pendingEvidence?: PendingEvidence[];
  onPendingEvidenceChange?: (evidence: PendingEvidence[]) => void;
}

interface PendingEvidence {
  evidence_type: EvidenceType;
  title?: string;
  content?: string;
  source_url?: string;
  confidence?: number;
  supports: boolean;
}
```

**Use Cases:**
- Assumption validation evidence
- Touchpoint research evidence
- Canvas item evidence

```tsx
// In assumption-form.tsx sidebar
<SidebarCard title="Evidence">
  <EvidenceManager
    entityType="assumption"
    entityId={assumption?.id}
    compact={true}
    allowedTypes={['interview', 'survey', 'analytics', 'experiment']}
    pendingEvidence={pendingEvidence}
    onPendingEvidenceChange={setPendingEvidence}
  />
</SidebarCard>
```

### 5.5 Sidebar Layout Convention

All admin forms follow this sidebar structure:

```tsx
<form onSubmit={handleSubmit} className="space-y-6">
  {error && <ErrorBanner error={error} />}

  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
    {/* Main Content - 2/3 width */}
    <div className="lg:col-span-2 space-y-6">
      {/* Primary fields: name, slug, description */}
      {/* Entity-specific content */}
    </div>

    {/* Sidebar - 1/3 width */}
    <div className="space-y-6">
      <SidebarCard title="Relationships">
        {/* RelationshipField for FK relationships */}
        {/* EntityLinkField for entity_links relationships */}
      </SidebarCard>

      <SidebarCard title="Status">
        {/* Status dropdowns */}
      </SidebarCard>

      <SidebarCard title="Evidence">
        {/* EvidenceManager (if applicable) */}
      </SidebarCard>

      <SidebarCard title="Tags">
        {/* Tag input */}
      </SidebarCard>
    </div>
  </div>

  <FormActions
    isSubmitting={saving}
    submitLabel={entity ? 'Save Changes' : 'Create Entity'}
    onCancel={() => router.back()}
    onDelete={entity ? handleDelete : undefined}
  />
</form>
```

### 5.6 Form Save Pattern with Universal Tables

For forms using `entity_links` and `evidence`, the save pattern involves:

```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setSaving(true);
  setError(null);

  try {
    // 1. Save the main entity
    let entityId = existingEntity?.id;

    if (existingEntity) {
      await supabase.from('entities').update(entityData).eq('id', entityId);
    } else {
      const { data } = await supabase
        .from('entities')
        .insert([entityData])
        .select()
        .single();
      entityId = data.id;
    }

    // 2. Sync entity_links (if using EntityLinkField)
    if (pendingAssumptionLinks) {
      await syncEntityLinks(
        { type: 'backlog_item', id: entityId },
        'assumption',
        'inspired_by',
        pendingAssumptionLinks.map(l => l.targetId)
      );
    }

    // 3. Sync evidence (if using EvidenceManager)
    if (pendingEvidence) {
      await syncEvidence(
        { type: 'assumption', id: entityId },
        pendingEvidence
      );
    }

    router.push(`/admin/entities/${entityId}`);
    router.refresh();
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Failed to save');
  } finally {
    setSaving(false);
  }
};
```

### 5.7 Helper Functions for Sync

```typescript
// lib/entity-links.ts

export async function syncEntityLinks(
  source: { type: LinkableEntityType; id: string },
  targetType: LinkableEntityType,
  linkType: LinkType,
  targetIds: string[]
) {
  // Get existing links of this type
  const { data: existing } = await supabase
    .from('entity_links')
    .select('id, target_id')
    .eq('source_type', source.type)
    .eq('source_id', source.id)
    .eq('target_type', targetType)
    .eq('link_type', linkType);

  const existingIds = new Set(existing?.map(e => e.target_id) || []);
  const newIds = new Set(targetIds);

  // Delete removed links
  const toDelete = existing?.filter(e => !newIds.has(e.target_id)) || [];
  if (toDelete.length > 0) {
    await supabase
      .from('entity_links')
      .delete()
      .in('id', toDelete.map(e => e.id));
  }

  // Add new links
  const toAdd = targetIds.filter(id => !existingIds.has(id));
  if (toAdd.length > 0) {
    await supabase.from('entity_links').insert(
      toAdd.map((targetId, index) => ({
        source_type: source.type,
        source_id: source.id,
        target_type: targetType,
        target_id: targetId,
        link_type: linkType,
        position: index,
      }))
    );
  }
}
```

```typescript
// lib/evidence.ts

export async function syncEvidence(
  entity: { type: EvidenceEntityType; id: string },
  pendingEvidence: PendingEvidence[]
) {
  // For new evidence items (no id), insert them
  const newEvidence = pendingEvidence.filter(e => !e.id);

  if (newEvidence.length > 0) {
    await supabase.from('evidence').insert(
      newEvidence.map(e => ({
        entity_type: entity.type,
        entity_id: entity.id,
        evidence_type: e.evidence_type,
        title: e.title,
        content: e.content,
        source_url: e.source_url,
        confidence: e.confidence,
        supports: e.supports,
      }))
    );
  }
}

export async function deleteEvidence(evidenceId: string) {
  await supabase.from('evidence').delete().eq('id', evidenceId);
}
```

### 5.8 Component Migration Plan

| Form | Current Relationship UI | After Migration |
|------|------------------------|-----------------|
| `assumption-form` | RelationshipField (project) | + EvidenceManager |
| `journey-form` | RelationshipField (project, profile) | + EntityLinkField (related BMC/VPC) |
| `touchpoint-form` | Custom selectors | + EvidenceManager, EntityLinkField |
| `business-model-canvas-form` | JSONB arrays for related | EntityLinkField (VPC, profiles) |
| `value-proposition-canvas-form` | JSONB arrays, custom FIT | EntityLinkField (BMC), EvidenceManager |
| `customer-profile-form` | JSONB arrays | EntityLinkField (BMC, VPC) |
| `backlog-item-form` | RelationshipField (log entries) | + EntityLinkField (assumptions) |
| `experiment-form` | RelationshipField (project, hypothesis) | + EntityLinkField (canvas items) |
| `specimen-form` | RelationshipField (project) | + EntityLinkField (assumptions) |
| `log-entry-form` | RelationshipField (project, experiment) | + EntityLinkField (assumptions) |

### 5.9 Visual Design

**EntityLinkField (Single Select)**
```
┌─────────────────────────────────────┐
│ Related Business Model         ▼  │
├─────────────────────────────────────┤
│ 🔍 Search...                        │
├─────────────────────────────────────┤
│ ☑ Q4 2024 Business Model           │
│   Draft • Studio Project A          │
├─────────────────────────────────────┤
│   Initial Business Model            │
│   Archived • Studio Project A       │
└─────────────────────────────────────┘
```

**EntityLinkField (Multi Select)**
```
┌─────────────────────────────────────┐
│ Related Assumptions                 │
├─────────────────────────────────────┤
│ ┌───────────────────────────────┐   │
│ │ Users want self-service    ✕ │   │
│ └───────────────────────────────┘   │
│ ┌───────────────────────────────┐   │
│ │ Price sensitivity is high  ✕ │   │
│ └───────────────────────────────┘   │
├─────────────────────────────────────┤
│ 🔍 Search assumptions...            │
├─────────────────────────────────────┤
│ ☐ Technical feasibility proven     │
│ ☐ Market size is sufficient        │
└─────────────────────────────────────┘
```

**EvidenceManager (Compact Sidebar)**
```
┌─────────────────────────────────────┐
│ Evidence                    + Add   │
├─────────────────────────────────────┤
│ 📊 Analytics • 85% confidence       │
│    User engagement data...    ✕     │
├─────────────────────────────────────┤
│ 🎤 Interview • 70% confidence       │
│    Customer feedback call...  ✕     │
├─────────────────────────────────────┤
│ No evidence yet. Add some to        │
│ validate this assumption.           │
└─────────────────────────────────────┘
```

---

## 6. Migration Plan

### 6.1 Phase 1: Create Universal Tables (Non-Breaking)

```sql
-- Migration: 20260102200000_create_universal_evidence.sql

-- Create universal evidence table
CREATE TABLE evidence (...);

-- Create indexes and policies
...

-- DO NOT drop old tables yet
```

```sql
-- Migration: 20260102200001_create_entity_links.sql

-- Create entity links table
CREATE TABLE entity_links (...);

-- Create indexes and policies
...
```

### 6.2 Phase 1b: Create Orphan Cleanup Triggers

Since polymorphic references cannot have FK constraints, we MUST create triggers to clean up orphaned records when parent entities are deleted.

```sql
-- Migration: 20260102200002_create_orphan_cleanup.sql

-- Generic function to clean up entity_links when an entity is deleted
CREATE OR REPLACE FUNCTION cleanup_entity_links()
RETURNS TRIGGER AS $$
DECLARE
  entity_type_name TEXT;
BEGIN
  -- Get the entity type from the trigger argument
  entity_type_name := TG_ARGV[0];

  -- Delete links where this entity is the source
  DELETE FROM entity_links
  WHERE source_type = entity_type_name AND source_id = OLD.id;

  -- Delete links where this entity is the target
  DELETE FROM entity_links
  WHERE target_type = entity_type_name AND target_id = OLD.id;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Generic function to clean up evidence when an entity is deleted
CREATE OR REPLACE FUNCTION cleanup_entity_evidence()
RETURNS TRIGGER AS $$
DECLARE
  entity_type_name TEXT;
BEGIN
  entity_type_name := TG_ARGV[0];

  DELETE FROM evidence
  WHERE entity_type = entity_type_name AND entity_id = OLD.id;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for each entity type
-- Assumptions
CREATE TRIGGER cleanup_assumption_links
  BEFORE DELETE ON assumptions
  FOR EACH ROW EXECUTE FUNCTION cleanup_entity_links('assumption');

CREATE TRIGGER cleanup_assumption_evidence
  BEFORE DELETE ON assumptions
  FOR EACH ROW EXECUTE FUNCTION cleanup_entity_evidence('assumption');

-- Canvas Items
CREATE TRIGGER cleanup_canvas_item_links
  BEFORE DELETE ON canvas_items
  FOR EACH ROW EXECUTE FUNCTION cleanup_entity_links('canvas_item');

CREATE TRIGGER cleanup_canvas_item_evidence
  BEFORE DELETE ON canvas_items
  FOR EACH ROW EXECUTE FUNCTION cleanup_entity_evidence('canvas_item');

-- Touchpoints
CREATE TRIGGER cleanup_touchpoint_links
  BEFORE DELETE ON touchpoints
  FOR EACH ROW EXECUTE FUNCTION cleanup_entity_links('touchpoint');

CREATE TRIGGER cleanup_touchpoint_evidence
  BEFORE DELETE ON touchpoints
  FOR EACH ROW EXECUTE FUNCTION cleanup_entity_evidence('touchpoint');

-- Hypotheses
CREATE TRIGGER cleanup_hypothesis_links
  BEFORE DELETE ON studio_hypotheses
  FOR EACH ROW EXECUTE FUNCTION cleanup_entity_links('hypothesis');

CREATE TRIGGER cleanup_hypothesis_evidence
  BEFORE DELETE ON studio_hypotheses
  FOR EACH ROW EXECUTE FUNCTION cleanup_entity_evidence('hypothesis');

-- Experiments
CREATE TRIGGER cleanup_experiment_links
  BEFORE DELETE ON studio_experiments
  FOR EACH ROW EXECUTE FUNCTION cleanup_entity_links('experiment');

CREATE TRIGGER cleanup_experiment_evidence
  BEFORE DELETE ON studio_experiments
  FOR EACH ROW EXECUTE FUNCTION cleanup_entity_evidence('experiment');

-- Business Model Canvases
CREATE TRIGGER cleanup_bmc_links
  BEFORE DELETE ON business_model_canvases
  FOR EACH ROW EXECUTE FUNCTION cleanup_entity_links('business_model_canvas');

CREATE TRIGGER cleanup_bmc_evidence
  BEFORE DELETE ON business_model_canvases
  FOR EACH ROW EXECUTE FUNCTION cleanup_entity_evidence('business_model_canvas');

-- Value Proposition Canvases
CREATE TRIGGER cleanup_vpc_links
  BEFORE DELETE ON value_proposition_canvases
  FOR EACH ROW EXECUTE FUNCTION cleanup_entity_links('value_proposition_canvas');

CREATE TRIGGER cleanup_vpc_evidence
  BEFORE DELETE ON value_proposition_canvases
  FOR EACH ROW EXECUTE FUNCTION cleanup_entity_evidence('value_proposition_canvas');

-- Customer Profiles
CREATE TRIGGER cleanup_profile_links
  BEFORE DELETE ON customer_profiles
  FOR EACH ROW EXECUTE FUNCTION cleanup_entity_links('customer_profile');

CREATE TRIGGER cleanup_profile_evidence
  BEFORE DELETE ON customer_profiles
  FOR EACH ROW EXECUTE FUNCTION cleanup_entity_evidence('customer_profile');

-- User Journeys
CREATE TRIGGER cleanup_journey_links
  BEFORE DELETE ON user_journeys
  FOR EACH ROW EXECUTE FUNCTION cleanup_entity_links('user_journey');

CREATE TRIGGER cleanup_journey_evidence
  BEFORE DELETE ON user_journeys
  FOR EACH ROW EXECUTE FUNCTION cleanup_entity_evidence('user_journey');

-- Journey Stages
CREATE TRIGGER cleanup_stage_links
  BEFORE DELETE ON journey_stages
  FOR EACH ROW EXECUTE FUNCTION cleanup_entity_links('journey_stage');

CREATE TRIGGER cleanup_stage_evidence
  BEFORE DELETE ON journey_stages
  FOR EACH ROW EXECUTE FUNCTION cleanup_entity_evidence('journey_stage');

-- Backlog Items
CREATE TRIGGER cleanup_backlog_links
  BEFORE DELETE ON backlog_items
  FOR EACH ROW EXECUTE FUNCTION cleanup_entity_links('backlog_item');

-- Log Entries
CREATE TRIGGER cleanup_log_entry_links
  BEFORE DELETE ON log_entries
  FOR EACH ROW EXECUTE FUNCTION cleanup_entity_links('log_entry');

-- Specimens
CREATE TRIGGER cleanup_specimen_links
  BEFORE DELETE ON specimens
  FOR EACH ROW EXECUTE FUNCTION cleanup_entity_links('specimen');

-- Projects
CREATE TRIGGER cleanup_project_links
  BEFORE DELETE ON projects
  FOR EACH ROW EXECUTE FUNCTION cleanup_entity_links('project');

-- Studio Projects
CREATE TRIGGER cleanup_studio_project_links
  BEFORE DELETE ON studio_projects
  FOR EACH ROW EXECUTE FUNCTION cleanup_entity_links('studio_project');

-- Gallery Sequences
CREATE TRIGGER cleanup_gallery_links
  BEFORE DELETE ON gallery_sequences
  FOR EACH ROW EXECUTE FUNCTION cleanup_entity_links('gallery_sequence');
```

### 6.3 Phase 2: Migrate Existing Data

#### 6.3.1 Pre-Migration Validation

Before migrating JSONB arrays, validate that referenced entities exist. This prevents creating orphan links during migration.

```sql
-- Migration: 20260102100000_validate_jsonb_references.sql
-- Run this BEFORE the actual migration to identify problems

-- Find orphan VPC references in BMC
SELECT bmc.id, bmc.name, orphan_id
FROM business_model_canvases bmc,
     unnest(bmc.related_value_proposition_ids) AS orphan_id
WHERE NOT EXISTS (
  SELECT 1 FROM value_proposition_canvases vpc WHERE vpc.id = orphan_id
);

-- Find orphan profile references in BMC
SELECT bmc.id, bmc.name, orphan_id
FROM business_model_canvases bmc,
     unnest(bmc.related_customer_profile_ids) AS orphan_id
WHERE NOT EXISTS (
  SELECT 1 FROM customer_profiles cp WHERE cp.id = orphan_id
);

-- Find orphan BMC references in customer_profiles
SELECT cp.id, cp.name, orphan_id
FROM customer_profiles cp,
     unnest(cp.related_business_model_ids) AS orphan_id
WHERE NOT EXISTS (
  SELECT 1 FROM business_model_canvases bmc WHERE bmc.id = orphan_id
);

-- Find orphan VPC references in customer_profiles
SELECT cp.id, cp.name, orphan_id
FROM customer_profiles cp,
     unnest(cp.related_value_proposition_ids) AS orphan_id
WHERE NOT EXISTS (
  SELECT 1 FROM value_proposition_canvases vpc WHERE vpc.id = orphan_id
);

-- Find orphan references in user_journeys
SELECT uj.id, uj.name, orphan_id, 'vpc' as type
FROM user_journeys uj,
     unnest(uj.related_value_proposition_ids) AS orphan_id
WHERE NOT EXISTS (
  SELECT 1 FROM value_proposition_canvases vpc WHERE vpc.id = orphan_id
)
UNION ALL
SELECT uj.id, uj.name, orphan_id, 'bmc' as type
FROM user_journeys uj,
     unnest(uj.related_business_model_ids) AS orphan_id
WHERE NOT EXISTS (
  SELECT 1 FROM business_model_canvases bmc WHERE bmc.id = orphan_id
);
```

**Action:** If orphans are found, either:
1. Clean them up before migration (remove from JSONB arrays)
2. Skip orphans in migration (use EXISTS check in INSERT)

#### 6.3.2 Evidence Migration

```sql
-- Migration: 20260103000000_migrate_evidence_data.sql

-- Migrate assumption_evidence
INSERT INTO evidence (
  entity_type, entity_id, evidence_type, content, source_url,
  source_reference, confidence, supports, collected_at,
  collector_notes, created_at, updated_at
)
SELECT
  'assumption', assumption_id, evidence_type, content, source_url,
  source_reference, confidence, supports, collected_at,
  collector_notes, created_at, updated_at
FROM assumption_evidence;

-- Migrate canvas_item_evidence
INSERT INTO evidence (...)
SELECT 'canvas_item', canvas_item_id, ...
FROM canvas_item_evidence;

-- Migrate touchpoint_evidence
INSERT INTO evidence (...)
SELECT 'touchpoint', touchpoint_id, ...
FROM touchpoint_evidence;
```

#### 6.3.3 JSONB Array Migration (With Orphan Protection)

```sql
-- Migration: 20260103000001_migrate_jsonb_arrays_to_links.sql

-- Migrate business_model_canvases.related_value_proposition_ids
-- Only migrate references to existing VPCs
INSERT INTO entity_links (source_type, source_id, target_type, target_id, link_type)
SELECT
  'business_model_canvas',
  bmc.id,
  'value_proposition_canvas',
  vpc_id,
  'related'
FROM business_model_canvases bmc,
     unnest(bmc.related_value_proposition_ids) AS vpc_id
WHERE bmc.related_value_proposition_ids IS NOT NULL
  AND array_length(bmc.related_value_proposition_ids, 1) > 0
  AND EXISTS (SELECT 1 FROM value_proposition_canvases vpc WHERE vpc.id = vpc_id);

-- Migrate business_model_canvases.related_customer_profile_ids
INSERT INTO entity_links (source_type, source_id, target_type, target_id, link_type)
SELECT
  'business_model_canvas',
  bmc.id,
  'customer_profile',
  cp_id,
  'related'
FROM business_model_canvases bmc,
     unnest(bmc.related_customer_profile_ids) AS cp_id
WHERE bmc.related_customer_profile_ids IS NOT NULL
  AND array_length(bmc.related_customer_profile_ids, 1) > 0
  AND EXISTS (SELECT 1 FROM customer_profiles cp WHERE cp.id = cp_id);

-- Migrate customer_profiles.related_business_model_ids
INSERT INTO entity_links (source_type, source_id, target_type, target_id, link_type)
SELECT
  'customer_profile',
  cp.id,
  'business_model_canvas',
  bmc_id,
  'related'
FROM customer_profiles cp,
     unnest(cp.related_business_model_ids) AS bmc_id
WHERE cp.related_business_model_ids IS NOT NULL
  AND array_length(cp.related_business_model_ids, 1) > 0
  AND EXISTS (SELECT 1 FROM business_model_canvases bmc WHERE bmc.id = bmc_id);

-- Migrate customer_profiles.related_value_proposition_ids
INSERT INTO entity_links (source_type, source_id, target_type, target_id, link_type)
SELECT
  'customer_profile',
  cp.id,
  'value_proposition_canvas',
  vpc_id,
  'related'
FROM customer_profiles cp,
     unnest(cp.related_value_proposition_ids) AS vpc_id
WHERE cp.related_value_proposition_ids IS NOT NULL
  AND array_length(cp.related_value_proposition_ids, 1) > 0
  AND EXISTS (SELECT 1 FROM value_proposition_canvases vpc WHERE vpc.id = vpc_id);

-- Migrate user_journeys.related_value_proposition_ids
INSERT INTO entity_links (source_type, source_id, target_type, target_id, link_type)
SELECT
  'user_journey',
  uj.id,
  'value_proposition_canvas',
  vpc_id,
  'related'
FROM user_journeys uj,
     unnest(uj.related_value_proposition_ids) AS vpc_id
WHERE uj.related_value_proposition_ids IS NOT NULL
  AND array_length(uj.related_value_proposition_ids, 1) > 0
  AND EXISTS (SELECT 1 FROM value_proposition_canvases vpc WHERE vpc.id = vpc_id);

-- Migrate user_journeys.related_business_model_ids
INSERT INTO entity_links (source_type, source_id, target_type, target_id, link_type)
SELECT
  'user_journey',
  uj.id,
  'business_model_canvas',
  bmc_id,
  'related'
FROM user_journeys uj,
     unnest(uj.related_business_model_ids) AS bmc_id
WHERE uj.related_business_model_ids IS NOT NULL
  AND array_length(uj.related_business_model_ids, 1) > 0
  AND EXISTS (SELECT 1 FROM business_model_canvases bmc WHERE bmc.id = bmc_id);
```

### 6.4 Phase 3: Update Application Code

1. Create `lib/evidence.ts` with helper functions
2. Create `lib/entity-links.ts` with helper functions
3. Create `lib/entity-links-validation.ts` with link type validation
4. Create `components/admin/entity-link-field.tsx` component
5. Create `components/admin/linked-entities-display.tsx` component
6. Create `components/admin/evidence-manager.tsx` component
7. Update forms to use new components
8. Update queries to use new tables

### 6.5 Phase 4: Deprecation Period (30+ Days)

**IMPORTANT:** Do NOT drop old tables immediately after code migration. Maintain a deprecation period of at least 30 days to:
1. Catch any edge cases or bugs in the new implementation
2. Allow rollback if issues are discovered
3. Verify data integrity between old and new tables

#### 6.5.1 During Deprecation Period

- Old tables remain in place, read-only (queries redirected to new tables)
- Run daily data integrity checks:

```sql
-- Verify evidence counts match
SELECT
  (SELECT COUNT(*) FROM assumption_evidence) as old_assumption,
  (SELECT COUNT(*) FROM evidence WHERE entity_type = 'assumption') as new_assumption,
  (SELECT COUNT(*) FROM canvas_item_evidence) as old_canvas_item,
  (SELECT COUNT(*) FROM evidence WHERE entity_type = 'canvas_item') as new_canvas_item,
  (SELECT COUNT(*) FROM touchpoint_evidence) as old_touchpoint,
  (SELECT COUNT(*) FROM evidence WHERE entity_type = 'touchpoint') as new_touchpoint;

-- Verify JSONB array contents migrated
SELECT
  bmc.id,
  array_length(bmc.related_value_proposition_ids, 1) as jsonb_count,
  (SELECT COUNT(*) FROM entity_links el
   WHERE el.source_type = 'business_model_canvas'
     AND el.source_id = bmc.id
     AND el.target_type = 'value_proposition_canvas') as links_count
FROM business_model_canvases bmc
WHERE bmc.related_value_proposition_ids IS NOT NULL
  AND array_length(bmc.related_value_proposition_ids, 1) > 0
HAVING array_length(bmc.related_value_proposition_ids, 1) !=
  (SELECT COUNT(*) FROM entity_links el
   WHERE el.source_type = 'business_model_canvas'
     AND el.source_id = bmc.id
     AND el.target_type = 'value_proposition_canvas');
```

#### 6.5.2 After Deprecation Period (Cleanup)

```sql
-- Migration: 20260301000000_cleanup_deprecated_tables.sql
-- Only run AFTER 30+ day deprecation period with no issues

-- Drop old evidence tables
DROP TABLE IF EXISTS assumption_evidence;
DROP TABLE IF EXISTS canvas_item_evidence;
DROP TABLE IF EXISTS touchpoint_evidence;

-- Remove JSONB UUID array columns
ALTER TABLE business_model_canvases DROP COLUMN IF EXISTS related_value_proposition_ids;
ALTER TABLE business_model_canvases DROP COLUMN IF EXISTS related_customer_profile_ids;
ALTER TABLE customer_profiles DROP COLUMN IF EXISTS related_business_model_ids;
ALTER TABLE customer_profiles DROP COLUMN IF EXISTS related_value_proposition_ids;
ALTER TABLE user_journeys DROP COLUMN IF EXISTS related_value_proposition_ids;
ALTER TABLE user_journeys DROP COLUMN IF EXISTS related_business_model_ids;
```

---

## 7. New Relationships Enabled

With `entity_links`, we can now easily create relationships that were previously missing:

### 7.1 Backlog → Assumptions

```typescript
// When a backlog idea implies assumptions
await linkEntities(
  { type: 'backlog_item', id: backlogId },
  { type: 'assumption', id: assumptionId },
  'inspired_by',
  { notes: 'This assumption emerged from reviewing this idea' }
);
```

### 7.2 Experiments → Canvas Items

```typescript
// When an experiment validates specific canvas items
await linkEntities(
  { type: 'experiment', id: experimentId },
  { type: 'canvas_item', id: canvasItemId },
  'validates',
  { strength: 'strong' }
);
```

### 7.3 Log Entries → Assumptions

```typescript
// When a log entry documents assumption validation work
await linkEntities(
  { type: 'log_entry', id: logEntryId },
  { type: 'assumption', id: assumptionId },
  'documents'
);
```

### 7.4 Specimens → Assumptions

```typescript
// When a working specimen proves a feasibility assumption
await linkEntities(
  { type: 'specimen', id: specimenId },
  { type: 'assumption', id: assumptionId },
  'demonstrates',
  { strength: 'strong', notes: 'Working prototype proves technical feasibility' }
);
```

---

## 8. What Remains Unchanged

### 8.1 Keep Foreign Keys For

- `studio_hypotheses.project_id` → `studio_projects.id`
- `studio_experiments.project_id` → `studio_projects.id`
- `studio_experiments.hypothesis_id` → `studio_hypotheses.id`
- `journey_stages.user_journey_id` → `user_journeys.id`
- `touchpoints.journey_stage_id` → `journey_stages.id`
- All hierarchical ownership relationships

### 8.2 Keep Specialized Junction Tables For

| Table | Reason |
|-------|--------|
| `canvas_item_placements` | Complex polymorphic with block_name |
| `canvas_item_mappings` | FIT analysis with fit_strength, validation_method |
| `canvas_item_assumptions` | Has relationship_type semantics |
| `assumption_experiments` | Has result, confidence fields |
| `touchpoint_mappings` | Complex polymorphic with mapping_type |
| `touchpoint_assumptions` | Has relationship_type semantics |

### 8.3 Migrate to entity_links

| Current | Becomes |
|---------|---------|
| `gallery_specimen_items` | `entity_links` (gallery_sequence → specimen, contains, with position) |
| `log_entry_specimens` | `entity_links` (log_entry → specimen, contains, with position) |
| `project_specimens` | `entity_links` (project → specimen, contains, with position) |
| `log_entry_projects` | `entity_links` (log_entry → project, references) |
| `backlog_log_entries` | `entity_links` (backlog_item → log_entry, with link_type) |
| All JSONB UUID arrays | `entity_links` (source → target, related) |

---

## 9. Success Metrics

| Metric | Before | After |
|--------|--------|-------|
| Evidence tables | 3 | 1 |
| Junction tables | 11 | 6 |
| JSONB UUID array fields | 6+ | 0 |
| Relationship patterns to learn | 5+ | 3 |
| New relationship creation time | New table/column | Single INSERT |

---

## 10. Implementation Checklist

### Phase 1: Foundation (Database)
- [ ] Create `evidence` table migration
- [ ] Create `entity_links` table migration
- [ ] Create orphan cleanup trigger migration
- [ ] Run pre-migration validation for JSONB arrays
- [ ] Create `lib/evidence.ts` helper functions
- [ ] Create `lib/entity-links.ts` helper functions
- [ ] Create `lib/entity-links-validation.ts` validation rules
- [ ] Create TypeScript types in `lib/types/`

### Phase 2: UI Components
- [ ] Create `EntityLinkField` component
- [ ] Create `LinkedEntitiesDisplay` component
- [ ] Create `EvidenceManager` component
- [ ] Add to admin component exports (`components/admin/index.ts`)

### Phase 3: Data Migration
- [ ] Migrate assumption_evidence data
- [ ] Migrate canvas_item_evidence data
- [ ] Migrate touchpoint_evidence data
- [ ] Migrate JSONB UUID arrays to entity_links (with EXISTS checks)

### Phase 4: Form Updates
- [ ] Update assumption form to use EvidenceManager
- [ ] Update canvas item forms to use EvidenceManager
- [ ] Update touchpoint forms to use EvidenceManager
- [ ] Update BMC form to use EntityLinkField (replace JSONB arrays)
- [ ] Update VPC form to use EntityLinkField
- [ ] Update customer profile form to use EntityLinkField
- [ ] Update journey form to use EntityLinkField
- [ ] Update backlog form to use EntityLinkField (assumptions)
- [ ] Update experiment form to use EntityLinkField (canvas items)
- [ ] Update log entry form to use EntityLinkField (assumptions)
- [ ] Update specimen form to use EntityLinkField (assumptions)

### Phase 5: Deprecation Period (30+ Days)
- [ ] Run daily data integrity checks
- [ ] Monitor for edge case bugs
- [ ] Verify data consistency between old and new tables
- [ ] Document any issues and fixes

### Phase 6: Cleanup (After Deprecation)
- [ ] Remove old evidence tables
- [ ] Remove JSONB UUID array columns
- [ ] Remove deprecated junction tables
- [ ] Update documentation

---

## 11. Rollback Procedures

This section documents how to roll back the entity relationship simplification if critical issues are discovered.

### 11.1 When to Consider Rollback

Consider rollback if:
- Data integrity issues are discovered (orphaned links, duplicate entries)
- Performance degradation in production (slow polymorphic queries)
- Critical bugs in EvidenceManager or EntityLinkField components
- Migration corrupted existing data

**Do NOT rollback for:**
- Minor UI bugs (fix forward)
- Missing features (add incrementally)
- Documentation gaps (update docs)

### 11.2 Rollback Levels

#### Level 1: Code-Only Rollback (No Data Loss)

Revert to reading from old tables while keeping new tables in sync.

```typescript
// lib/evidence.ts - Add fallback to old tables
export async function getEvidence(entity: EntityRef) {
  const { data: newEvidence } = await supabase
    .from('evidence')
    .select('*')
    .eq('entity_type', entity.type)
    .eq('entity_id', entity.id);

  // Fallback: also check old tables
  if (newEvidence?.length === 0) {
    const tableName = `${entity.type}_evidence`;
    const { data: oldEvidence } = await supabase
      .from(tableName)
      .select('*')
      .eq(`${entity.type}_id`, entity.id);
    return oldEvidence;
  }

  return newEvidence;
}
```

**When:** Use when new queries have bugs but data is intact.

#### Level 2: UI Component Rollback

Revert forms to use previous component patterns.

```tsx
// Before: EntityLinkField
<EntityLinkField
  sourceType="backlog_item"
  sourceId={id}
  targetType="assumption"
  ...
/>

// After: Revert to JSONB array handling
<MultiSelect
  value={formData.related_assumption_ids || []}
  onChange={(ids) => setFormData({ ...formData, related_assumption_ids: ids })}
  options={assumptions}
/>
```

**When:** Use when new components have critical bugs.

#### Level 3: Full Database Rollback

Restore old tables and abandon new tables.

```sql
-- Migration: 20260XXX_rollback_entity_relationships.sql

-- 1. Restore evidence to old tables (if modified since migration)
INSERT INTO assumption_evidence (assumption_id, evidence_type, content, ...)
SELECT entity_id, evidence_type, content, ...
FROM evidence
WHERE entity_type = 'assumption'
  AND created_at > (SELECT MAX(created_at) FROM assumption_evidence);

INSERT INTO canvas_item_evidence (...)
SELECT ... FROM evidence WHERE entity_type = 'canvas_item' AND ...;

INSERT INTO touchpoint_evidence (...)
SELECT ... FROM evidence WHERE entity_type = 'touchpoint' AND ...;

-- 2. Restore JSONB arrays from entity_links
UPDATE business_model_canvases bmc
SET related_value_proposition_ids = (
  SELECT array_agg(el.target_id)
  FROM entity_links el
  WHERE el.source_type = 'business_model_canvas'
    AND el.source_id = bmc.id
    AND el.target_type = 'value_proposition_canvas'
);

UPDATE business_model_canvases bmc
SET related_customer_profile_ids = (
  SELECT array_agg(el.target_id)
  FROM entity_links el
  WHERE el.source_type = 'business_model_canvas'
    AND el.source_id = bmc.id
    AND el.target_type = 'customer_profile'
);

-- Similar for customer_profiles, user_journeys...

-- 3. Drop new tables and triggers (DESTRUCTIVE)
-- Only do this after confirming old tables are restored!
DROP TRIGGER IF EXISTS cleanup_assumption_links ON assumptions;
DROP TRIGGER IF EXISTS cleanup_assumption_evidence ON assumptions;
-- ... drop all cleanup triggers

DROP TABLE IF EXISTS entity_links;
DROP TABLE IF EXISTS evidence;

DROP FUNCTION IF EXISTS cleanup_entity_links();
DROP FUNCTION IF EXISTS cleanup_entity_evidence();
```

**When:** Use only as last resort when data corruption is severe.

### 11.3 Emergency Rollback Checklist

If rollback is needed during deprecation period:

1. **Stop deployments** - Prevent new code from shipping
2. **Assess scope** - Determine which level of rollback is needed
3. **Create backup** - `pg_dump` of current state
4. **Execute rollback migration** - Apply appropriate rollback SQL
5. **Deploy reverted code** - Ship code that uses old tables
6. **Verify data integrity** - Run validation queries
7. **Update monitoring** - Add alerts for the rolled-back state
8. **Document incident** - Record what went wrong

### 11.4 Data Integrity Verification

Before and after any rollback, run these verification queries:

```sql
-- Verify evidence counts match expectations
SELECT
  'assumption_evidence' as source,
  (SELECT COUNT(*) FROM assumption_evidence) as old_count,
  (SELECT COUNT(*) FROM evidence WHERE entity_type = 'assumption') as new_count
UNION ALL
SELECT
  'canvas_item_evidence',
  (SELECT COUNT(*) FROM canvas_item_evidence),
  (SELECT COUNT(*) FROM evidence WHERE entity_type = 'canvas_item')
UNION ALL
SELECT
  'touchpoint_evidence',
  (SELECT COUNT(*) FROM touchpoint_evidence),
  (SELECT COUNT(*) FROM evidence WHERE entity_type = 'touchpoint');

-- Check for orphaned entity_links (links to non-existent entities)
SELECT
  el.id,
  el.source_type,
  el.source_id,
  el.target_type,
  el.target_id
FROM entity_links el
WHERE NOT EXISTS (
  SELECT 1 FROM (
    SELECT id FROM assumptions WHERE el.source_type = 'assumption'
    UNION ALL SELECT id FROM canvas_items WHERE el.source_type = 'canvas_item'
    UNION ALL SELECT id FROM business_model_canvases WHERE el.source_type = 'business_model_canvas'
    -- Add all entity tables...
  ) sources WHERE sources.id = el.source_id
);

-- Check for duplicate links
SELECT
  source_type, source_id, target_type, target_id, link_type,
  COUNT(*) as duplicates
FROM entity_links
GROUP BY source_type, source_id, target_type, target_id, link_type
HAVING COUNT(*) > 1;
```

### 11.5 Post-Rollback Recovery

After rollback stabilizes:

1. **Analyze root cause** - Why did rollback become necessary?
2. **Create fix plan** - How to address the issues
3. **Add tests** - Prevent regression
4. **Re-migrate carefully** - Apply fixed migration in stages
5. **Extended monitoring** - Watch for issues longer this time

---

## 12. Appendix: Full SQL Migrations

See `supabase/migrations/` for implementation:
- `20260102200000_create_universal_evidence.sql`
- `20260102200001_create_entity_links.sql`
- `20260102200002_create_orphan_cleanup.sql`
- `20260102200003_fix_critical_issues.sql` (value_map triggers, RLS fixes)
- `20260102200004_phase2_migrate_existing_data.sql` (data migration)
- `20260102200005_critical_fixes_phase2.sql` (CHECK constraints, gallery_sequence trigger)
- Future: `20260301000000_cleanup_deprecated_tables.sql` (after 30+ day deprecation)
