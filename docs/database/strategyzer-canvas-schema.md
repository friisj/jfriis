# Strategyzer Canvas Database Schema Specification

**Version:** 1.0
**Date:** 2025-12-29
**Status:** Draft

## Overview

This specification defines database tables for Strategyzer methodology artifacts:
- **Business Model Canvas** - 9-block framework for describing business models
- **Value Proposition Canvas** - Customer profile + Value map alignment
- **Customer Profiles** - Detailed customer segment analysis

These tables extend the studio project infrastructure to support hypothesis-driven business model development, enabling teams to iterate on business strategy with the same rigor as product development.

## Design Principles

Based on existing studio infrastructure patterns:

1. **Queryable Core, Flexible Details** - Explicit columns for essential canvas metadata; JSONB for block content and extensibility
2. **Soft Linking** - Optional FKs to studio_projects, hypotheses, and experiments (SET NULL on delete)
3. **Versioning Support** - Track iterations as canvases evolve through validation
4. **Bidirectional References** - Canvases can reference each other (BMC ↔ VPC ↔ Customer Profile)
5. **Metadata-Rich Blocks** - Each canvas block stores content, assumptions, validation status, and evidence links
6. **Status Workflow** - draft → active → validated → archived lifecycle

## Table Schemas

### 1. business_model_canvases

Captures the 9-block Business Model Canvas framework.

```sql
CREATE TABLE business_model_canvases (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,

  -- Studio Context (optional soft links)
  studio_project_id UUID REFERENCES studio_projects(id) ON DELETE SET NULL,
  hypothesis_id UUID REFERENCES studio_hypotheses(id) ON DELETE SET NULL,

  -- Canvas Metadata
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'validated', 'archived')),
  version INTEGER NOT NULL DEFAULT 1,
  parent_version_id UUID REFERENCES business_model_canvases(id) ON DELETE SET NULL,

  -- Canvas Building Blocks (JSONB for flexible, evolving content)
  -- Each block: { items: [...], metadata: {...}, assumptions: [...], validation_status: 'untested'|'testing'|'validated'|'invalidated' }

  -- Value Side (What we create)
  key_partners JSONB DEFAULT '{"items": [], "assumptions": [], "validation_status": "untested"}'::jsonb,
  key_activities JSONB DEFAULT '{"items": [], "assumptions": [], "validation_status": "untested"}'::jsonb,
  key_resources JSONB DEFAULT '{"items": [], "assumptions": [], "validation_status": "untested"}'::jsonb,
  value_propositions JSONB DEFAULT '{"items": [], "assumptions": [], "validation_status": "untested"}'::jsonb,

  -- Customer Side (Who we serve)
  customer_segments JSONB DEFAULT '{"items": [], "assumptions": [], "validation_status": "untested"}'::jsonb,
  customer_relationships JSONB DEFAULT '{"items": [], "assumptions": [], "validation_status": "untested"}'::jsonb,
  channels JSONB DEFAULT '{"items": [], "assumptions": [], "validation_status": "untested"}'::jsonb,

  -- Financial Side
  cost_structure JSONB DEFAULT '{"items": [], "assumptions": [], "validation_status": "untested"}'::jsonb,
  revenue_streams JSONB DEFAULT '{"items": [], "assumptions": [], "validation_status": "untested"}'::jsonb,

  -- Cross-canvas Relationships
  related_value_proposition_ids UUID[] DEFAULT '{}',
  related_customer_profile_ids UUID[] DEFAULT '{}',

  -- Extended Metadata
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}'::jsonb, -- Custom fields, attachments, etc.

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Constraints
  CONSTRAINT unique_bmc_slug_per_project UNIQUE (studio_project_id, slug)
);

-- Indexes
CREATE INDEX idx_bmc_project ON business_model_canvases(studio_project_id);
CREATE INDEX idx_bmc_hypothesis ON business_model_canvases(hypothesis_id);
CREATE INDEX idx_bmc_status ON business_model_canvases(status);
CREATE INDEX idx_bmc_version_lineage ON business_model_canvases(parent_version_id);

-- Triggers
CREATE TRIGGER update_bmc_updated_at
  BEFORE UPDATE ON business_model_canvases
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

### 2. value_proposition_canvases

Captures the Value Proposition Canvas (customer profile + value map).

```sql
CREATE TABLE value_proposition_canvases (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,

  -- Studio Context (optional soft links)
  studio_project_id UUID REFERENCES studio_projects(id) ON DELETE SET NULL,
  hypothesis_id UUID REFERENCES studio_hypotheses(id) ON DELETE SET NULL,

  -- Canvas Metadata
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'validated', 'archived')),
  version INTEGER NOT NULL DEFAULT 1,
  parent_version_id UUID REFERENCES value_proposition_canvases(id) ON DELETE SET NULL,
  fit_score DECIMAL(3,2) CHECK (fit_score >= 0 AND fit_score <= 1), -- 0.0-1.0 alignment score

  -- Customer Profile (Right Side) - Understanding the customer
  -- Each block: { items: [...], evidence: [...], assumptions: [], validation_status: '...' }
  customer_jobs JSONB DEFAULT '{"items": [], "evidence": [], "assumptions": [], "validation_status": "untested"}'::jsonb,
  pains JSONB DEFAULT '{"items": [], "evidence": [], "assumptions": [], "validation_status": "untested"}'::jsonb,
  gains JSONB DEFAULT '{"items": [], "evidence": [], "assumptions": [], "validation_status": "untested"}'::jsonb,

  -- Value Map (Left Side) - What we offer
  products_services JSONB DEFAULT '{"items": [], "assumptions": [], "validation_status": "untested"}'::jsonb,
  pain_relievers JSONB DEFAULT '{"items": [], "assumptions": [], "validation_status": "untested"}'::jsonb,
  gain_creators JSONB DEFAULT '{"items": [], "assumptions": [], "validation_status": "untested"}'::jsonb,

  -- Cross-canvas Relationships
  business_model_canvas_id UUID REFERENCES business_model_canvases(id) ON DELETE SET NULL,
  customer_profile_id UUID REFERENCES customer_profiles(id) ON DELETE SET NULL,

  -- Extended Metadata
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Constraints
  CONSTRAINT unique_vpc_slug_per_project UNIQUE (studio_project_id, slug)
);

-- Indexes
CREATE INDEX idx_vpc_project ON value_proposition_canvases(studio_project_id);
CREATE INDEX idx_vpc_hypothesis ON value_proposition_canvases(hypothesis_id);
CREATE INDEX idx_vpc_status ON value_proposition_canvases(status);
CREATE INDEX idx_vpc_bmc ON value_proposition_canvases(business_model_canvas_id);
CREATE INDEX idx_vpc_customer_profile ON value_proposition_canvases(customer_profile_id);
CREATE INDEX idx_vpc_version_lineage ON value_proposition_canvases(parent_version_id);
CREATE INDEX idx_vpc_fit_score ON value_proposition_canvases(fit_score) WHERE fit_score IS NOT NULL;

-- Triggers
CREATE TRIGGER update_vpc_updated_at
  BEFORE UPDATE ON value_proposition_canvases
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

### 3. customer_profiles

Detailed customer segment profiles with demographics, psychographics, and behavioral data.

```sql
CREATE TABLE customer_profiles (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,

  -- Studio Context (optional soft links)
  studio_project_id UUID REFERENCES studio_projects(id) ON DELETE SET NULL,
  hypothesis_id UUID REFERENCES studio_hypotheses(id) ON DELETE SET NULL,

  -- Profile Metadata
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'validated', 'archived')),
  version INTEGER NOT NULL DEFAULT 1,
  parent_version_id UUID REFERENCES customer_profiles(id) ON DELETE SET NULL,
  profile_type TEXT CHECK (profile_type IN ('persona', 'segment', 'archetype', 'icp')), -- ideal customer profile

  -- Core Profile Data (flexible JSONB for evolving understanding)
  demographics JSONB DEFAULT '{}'::jsonb, -- { age_range, location, income, education, role, company_size, industry, ... }
  psychographics JSONB DEFAULT '{}'::jsonb, -- { values, attitudes, interests, lifestyle, personality_traits, ... }
  behaviors JSONB DEFAULT '{}'::jsonb, -- { buying_patterns, tool_usage, decision_making, information_sources, ... }

  -- Jobs-to-be-Done Framework
  -- Each job: { description, context, importance, satisfaction, frequency, type: 'functional'|'social'|'emotional' }
  jobs JSONB DEFAULT '{"items": [], "evidence": [], "validation_status": "untested"}'::jsonb,

  -- Pains & Gains (aligned with VPC)
  pains JSONB DEFAULT '{"items": [], "severity": {}, "evidence": [], "validation_status": "untested"}'::jsonb,
  gains JSONB DEFAULT '{"items": [], "importance": {}, "evidence": [], "validation_status": "untested"}'::jsonb,

  -- Contextual Information
  environment JSONB DEFAULT '{}'::jsonb, -- { tools, constraints, influencers, budget_authority, timeline_pressures, ... }
  journey_stages JSONB DEFAULT '{"items": []}'::jsonb, -- Customer journey touchpoints and stages

  -- Quantitative Metrics
  market_size_estimate TEXT, -- "10K-50K companies" or "2M individuals"
  addressable_percentage DECIMAL(5,2) CHECK (addressable_percentage >= 0 AND addressable_percentage <= 100),

  -- Evidence & Validation
  evidence_sources JSONB DEFAULT '{"items": []}'::jsonb, -- { type: 'interview'|'survey'|'analytics'|'observation', reference: '...', confidence: '...' }
  validation_confidence TEXT CHECK (validation_confidence IN ('low', 'medium', 'high')),
  last_validated_at TIMESTAMPTZ,

  -- Cross-canvas Relationships
  related_business_model_ids UUID[] DEFAULT '{}',
  related_value_proposition_ids UUID[] DEFAULT '{}',

  -- Extended Metadata
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Constraints
  CONSTRAINT unique_profile_slug_per_project UNIQUE (studio_project_id, slug)
);

-- Indexes
CREATE INDEX idx_customer_profile_project ON customer_profiles(studio_project_id);
CREATE INDEX idx_customer_profile_hypothesis ON customer_profiles(hypothesis_id);
CREATE INDEX idx_customer_profile_status ON customer_profiles(status);
CREATE INDEX idx_customer_profile_type ON customer_profiles(profile_type);
CREATE INDEX idx_customer_profile_version_lineage ON customer_profiles(parent_version_id);
CREATE INDEX idx_customer_profile_confidence ON customer_profiles(validation_confidence);

-- Triggers
CREATE TRIGGER update_customer_profile_updated_at
  BEFORE UPDATE ON customer_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

## JSONB Block Structure

### Standard Block Format

All canvas building blocks follow this structure:

```typescript
{
  items: [
    {
      id: string,              // Unique identifier within block
      content: string,         // The actual content/statement
      priority?: 'high' | 'medium' | 'low',
      created_at: string,
      metadata?: {
        source?: string,       // Where this came from (interview, brainstorm, data analysis)
        confidence?: 'low' | 'medium' | 'high',
        tags?: string[],
        [key: string]: any     // Extensible
      }
    }
  ],
  assumptions: [
    {
      id: string,
      statement: string,       // "We assume that..."
      criticality: 'high' | 'medium' | 'low',
      tested: boolean,
      hypothesis_id?: string   // Link to studio_hypotheses
    }
  ],
  evidence?: [                 // Supporting evidence
    {
      id: string,
      type: 'interview' | 'survey' | 'analytics' | 'experiment' | 'observation',
      reference: string,       // Link to log_entry, experiment, external source
      summary: string,
      confidence: 'low' | 'medium' | 'high',
      date: string
    }
  ],
  validation_status: 'untested' | 'testing' | 'validated' | 'invalidated',
  validated_at?: string,
  notes?: string
}
```

### Example: Value Propositions Block

```json
{
  "items": [
    {
      "id": "vp-001",
      "content": "Automated design token synchronization across platforms",
      "priority": "high",
      "created_at": "2025-01-15T10:00:00Z",
      "metadata": {
        "source": "customer-interview-2025-01-10",
        "confidence": "high",
        "tags": ["automation", "design-system"]
      }
    }
  ],
  "assumptions": [
    {
      "id": "assump-vp-001",
      "statement": "Design teams struggle with manual token updates",
      "criticality": "high",
      "tested": true,
      "hypothesis_id": "550e8400-e29b-41d4-a716-446655440000"
    }
  ],
  "evidence": [
    {
      "id": "ev-001",
      "type": "interview",
      "reference": "log-entry/customer-research-jan-2025",
      "summary": "5/5 design teams reported this as top pain point",
      "confidence": "high",
      "date": "2025-01-10"
    }
  ],
  "validation_status": "validated",
  "validated_at": "2025-01-12T14:30:00Z",
  "notes": "Confirmed through customer development interviews"
}
```

## Linking Patterns

### 1. Canvas → Studio Infrastructure

Each canvas table optionally links to:
- `studio_project_id` - Parent project context
- `hypothesis_id` - Specific hypothesis being tested

**Use case:** "This Business Model Canvas tests hypothesis H3 in the Design System Tool project"

### 2. Cross-Canvas References

**Business Model Canvas ↔ Value Proposition Canvas:**
```sql
-- BMC has many VPCs (one per customer segment)
SELECT * FROM value_proposition_canvases
WHERE business_model_canvas_id = '<bmc-id>';

-- VPC references parent BMC
SELECT * FROM business_model_canvases
WHERE id = (SELECT business_model_canvas_id FROM value_proposition_canvases WHERE id = '<vpc-id>');
```

**Value Proposition Canvas ↔ Customer Profile:**
```sql
-- VPC links to detailed customer profile
SELECT * FROM customer_profiles
WHERE id = (SELECT customer_profile_id FROM value_proposition_canvases WHERE id = '<vpc-id>');

-- Find all VPCs for a customer profile
SELECT * FROM value_proposition_canvases
WHERE customer_profile_id = '<profile-id>';
```

**Many-to-Many via Arrays:**
```sql
-- Find all customer profiles referenced in a BMC
SELECT * FROM customer_profiles
WHERE id = ANY(
  SELECT unnest(related_customer_profile_ids)
  FROM business_model_canvases
  WHERE id = '<bmc-id>'
);
```

### 3. Canvas → Experiments & Evidence

**Via log_entries:**
```sql
-- Find log entries documenting validation of a specific canvas
SELECT * FROM log_entries
WHERE studio_project_id = (SELECT studio_project_id FROM business_model_canvases WHERE id = '<bmc-id>')
AND metadata->>'canvas_id' = '<bmc-id>';
```

**Via studio_experiments:**
```sql
-- Find experiments testing assumptions from a canvas
SELECT se.*
FROM studio_experiments se
JOIN business_model_canvases bmc ON se.hypothesis_id = bmc.hypothesis_id
WHERE bmc.id = '<bmc-id>';
```

### 4. Block-level Evidence References

Within JSONB blocks, evidence items can reference:
- `log_entries` (customer interviews, research)
- `studio_experiments` (validation experiments)
- External URLs (market research, surveys)

```json
{
  "evidence": [
    {
      "type": "interview",
      "reference": "log-entry/<slug>",
      "summary": "..."
    },
    {
      "type": "experiment",
      "reference": "studio-experiment/<id>",
      "summary": "..."
    },
    {
      "type": "survey",
      "reference": "https://typeform.com/results/xyz",
      "summary": "..."
    }
  ]
}
```

## Versioning Strategy

### Creating New Versions

When iterating on a canvas based on new learnings:

```sql
-- Copy existing canvas as new version
INSERT INTO business_model_canvases (
  slug, name, description, studio_project_id, hypothesis_id,
  status, version, parent_version_id,
  key_partners, key_activities, /* ... other blocks */
)
SELECT
  slug || '-v' || (version + 1),
  name || ' (v' || (version + 1) || ')',
  description,
  studio_project_id,
  hypothesis_id,
  'draft',
  version + 1,
  id, -- Link to parent
  key_partners, key_activities, /* ... other blocks */
FROM business_model_canvases
WHERE id = '<canvas-id>';
```

### Tracking Version Lineage

```sql
-- Get full version history
WITH RECURSIVE version_tree AS (
  SELECT id, name, version, parent_version_id, created_at, status
  FROM business_model_canvases
  WHERE id = '<latest-version-id>'

  UNION ALL

  SELECT c.id, c.name, c.version, c.parent_version_id, c.created_at, c.status
  FROM business_model_canvases c
  JOIN version_tree vt ON c.id = vt.parent_version_id
)
SELECT * FROM version_tree ORDER BY version DESC;
```

## Row Level Security (RLS)

Following existing studio patterns:

```sql
-- Enable RLS
ALTER TABLE business_model_canvases ENABLE ROW LEVEL SECURITY;
ALTER TABLE value_proposition_canvases ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_profiles ENABLE ROW LEVEL SECURITY;

-- Public read access for active/validated canvases
CREATE POLICY "Public read access to published canvases" ON business_model_canvases
  FOR SELECT USING (status IN ('active', 'validated'));

CREATE POLICY "Public read access to published VPCs" ON value_proposition_canvases
  FOR SELECT USING (status IN ('active', 'validated'));

CREATE POLICY "Public read access to published profiles" ON customer_profiles
  FOR SELECT USING (status IN ('active', 'validated'));

-- Admin full access
CREATE POLICY "Admin full access to BMC" ON business_model_canvases
  FOR ALL USING (is_admin());

CREATE POLICY "Admin full access to VPC" ON value_proposition_canvases
  FOR ALL USING (is_admin());

CREATE POLICY "Admin full access to profiles" ON customer_profiles
  FOR ALL USING (is_admin());
```

## TypeScript Type Definitions

### Database Interfaces

```typescript
// lib/types/database.ts

interface BaseCanvas {
  id: string
  slug: string
  name: string
  description?: string
  studio_project_id?: string
  hypothesis_id?: string
  status: 'draft' | 'active' | 'validated' | 'archived'
  version: number
  parent_version_id?: string
  tags: string[]
  metadata: Record<string, any>
  created_at: string
  updated_at: string
}

interface CanvasBlock {
  items: CanvasBlockItem[]
  assumptions: Assumption[]
  evidence?: Evidence[]
  validation_status: 'untested' | 'testing' | 'validated' | 'invalidated'
  validated_at?: string
  notes?: string
}

interface CanvasBlockItem {
  id: string
  content: string
  priority?: 'high' | 'medium' | 'low'
  created_at: string
  metadata?: {
    source?: string
    confidence?: 'low' | 'medium' | 'high'
    tags?: string[]
    [key: string]: any
  }
}

interface Assumption {
  id: string
  statement: string
  criticality: 'high' | 'medium' | 'low'
  tested: boolean
  hypothesis_id?: string
}

interface Evidence {
  id: string
  type: 'interview' | 'survey' | 'analytics' | 'experiment' | 'observation'
  reference: string
  summary: string
  confidence: 'low' | 'medium' | 'high'
  date: string
}

export interface BusinessModelCanvas extends BaseCanvas {
  key_partners: CanvasBlock
  key_activities: CanvasBlock
  key_resources: CanvasBlock
  value_propositions: CanvasBlock
  customer_segments: CanvasBlock
  customer_relationships: CanvasBlock
  channels: CanvasBlock
  cost_structure: CanvasBlock
  revenue_streams: CanvasBlock
  related_value_proposition_ids: string[]
  related_customer_profile_ids: string[]
}

export interface ValuePropositionCanvas extends BaseCanvas {
  fit_score?: number
  customer_jobs: CanvasBlock
  pains: CanvasBlock
  gains: CanvasBlock
  products_services: CanvasBlock
  pain_relievers: CanvasBlock
  gain_creators: CanvasBlock
  business_model_canvas_id?: string
  customer_profile_id?: string
}

export interface CustomerProfile extends BaseCanvas {
  profile_type?: 'persona' | 'segment' | 'archetype' | 'icp'
  demographics: Record<string, any>
  psychographics: Record<string, any>
  behaviors: Record<string, any>
  jobs: CanvasBlock
  pains: CanvasBlock & { severity?: Record<string, 'high' | 'medium' | 'low'> }
  gains: CanvasBlock & { importance?: Record<string, 'high' | 'medium' | 'low'> }
  environment: Record<string, any>
  journey_stages: { items: any[] }
  market_size_estimate?: string
  addressable_percentage?: number
  evidence_sources: { items: Evidence[] }
  validation_confidence?: 'low' | 'medium' | 'high'
  last_validated_at?: string
  related_business_model_ids: string[]
  related_value_proposition_ids: string[]
}
```

## Query Examples

### 1. Get Complete Business Model with Related Canvases

```sql
SELECT
  bmc.*,
  json_agg(DISTINCT vpc.*) FILTER (WHERE vpc.id IS NOT NULL) as value_propositions,
  json_agg(DISTINCT cp.*) FILTER (WHERE cp.id IS NOT NULL) as customer_profiles
FROM business_model_canvases bmc
LEFT JOIN value_proposition_canvases vpc ON vpc.business_model_canvas_id = bmc.id
LEFT JOIN customer_profiles cp ON cp.id = ANY(bmc.related_customer_profile_ids)
WHERE bmc.id = '<bmc-id>'
GROUP BY bmc.id;
```

### 2. Find Canvases with Untested Assumptions

```sql
SELECT id, name, slug,
       jsonb_path_query_array(
         to_jsonb(business_model_canvases.*),
         '$.*[*].assumptions[*] ? (@.tested == false)'
       ) as untested_assumptions
FROM business_model_canvases
WHERE status = 'active'
AND EXISTS (
  SELECT 1 FROM jsonb_each(to_jsonb(business_model_canvases.*))
  WHERE value::jsonb @> '[{"assumptions": [{"tested": false}]}]'::jsonb
);
```

### 3. Calculate Canvas Validation Progress

```sql
SELECT
  id,
  name,
  (
    SELECT COUNT(*)
    FROM jsonb_each(to_jsonb(business_model_canvases.*))
    WHERE key != 'id'
    AND key LIKE '%_propositions' OR key LIKE '%_segments'
    AND value->>'validation_status' = 'validated'
  ) * 100.0 / 9 as validation_percentage
FROM business_model_canvases
WHERE status = 'active';
```

### 4. Find High-Confidence Customer Pain Points

```sql
SELECT
  cp.name as customer_profile,
  pain_item->>'content' as pain,
  pain_item->'metadata'->>'confidence' as confidence,
  (
    SELECT jsonb_agg(ev)
    FROM jsonb_array_elements(cp.pains->'evidence') ev
    WHERE ev->>'confidence' = 'high'
  ) as evidence
FROM customer_profiles cp,
     jsonb_array_elements(cp.pains->'items') pain_item
WHERE pain_item->'metadata'->>'confidence' = 'high'
AND cp.status = 'validated'
ORDER BY cp.validation_confidence DESC, cp.last_validated_at DESC;
```

## Migration Roadmap

### Phase 1: Core Tables (Priority 1)
- Create `business_model_canvases` table
- Create `value_proposition_canvases` table
- Create `customer_profiles` table
- Add indexes and triggers
- Enable RLS policies

### Phase 2: Integration (Priority 2)
- Add TypeScript types to `lib/types/database.ts`
- Create Zod schemas in `lib/mcp/schemas/strategyzer.ts`
- Add MCP server endpoints for CRUD operations
- Update studio-mgr agent with canvas awareness

### Phase 3: UI Components (Priority 3)
- Admin UI for canvas management (similar to `app/admin/studio/page.tsx`)
- Canvas visualization components
- Evidence linking interface
- Version comparison views

### Phase 4: Advanced Features (Future)
- Auto-calculation of VPC fit scores
- Assumption tracking dashboard
- Evidence aggregation from experiments
- Canvas export/import (JSON, PDF)
- Template library for common business models

## Open Questions

1. **Granular Permissions:** Should individual canvases support team-based access control, or rely on project-level permissions?

2. **Snapshot Frequency:** Should we auto-snapshot canvases at key milestones (e.g., when hypothesis status changes)?

3. **AI Integration:** Should we add fields for AI-generated insights or recommendations on canvases?

4. **Template System:** Should we create a separate `canvas_templates` table, or store templates as regular canvases with a `is_template` flag?

5. **Multi-tenant Support:** Current design assumes single-user (is_admin()). Future multi-tenant needs?

## References

- [Strategyzer Business Model Canvas](https://www.strategyzer.com/canvas/business-model-canvas)
- [Strategyzer Value Proposition Canvas](https://www.strategyzer.com/canvas/value-proposition-canvas)
- Existing migration: `supabase/migrations/20251229050053_studio_projects.sql`
- Studio protocol: `docs/infrastructure/STUDIO_PROJECT_PROTOCOL.md`
- Database types: `lib/types/database.ts`

---

**Next Steps:**
1. Review and approve specification
2. Create migration file: `supabase/migrations/YYYYMMDDHHMMSS_strategyzer_canvases.sql`
3. Implement TypeScript types and Zod schemas
4. Add MCP endpoints for canvas management
5. Create seed data for testing
