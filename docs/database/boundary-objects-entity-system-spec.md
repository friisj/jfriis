# Boundary Objects Entity System Specification

**Version:** 3.0 (entity_links Unified)
**Date:** 2026-01-07
**Status:** Updated for entity_links Architecture
**Author:** Claude (Session: claude/audit-blueprint-crud-HhNZr)

## Executive Summary

This specification defines a **unified entity_links architecture** for managing boundary objects that bridge customer understanding and product delivery:

- **User Journeys** - Customer experience maps (stages → touchpoints)
- **Service Blueprints** - Service delivery design (steps with layers)
- **User Story Maps** - Product planning (activities → stories → releases)

These entities follow a **three-layer cascade**:
1. **Journey** (customer perspective) → 2. **Blueprint** (delivery design) → 3. **Story Map** (product implementation)

**KEY ARCHITECTURAL CHANGE**: All entity relationships now use the universal `entity_links` table instead of dedicated junction tables. This provides consistency, flexibility, and reduces table proliferation.

**Design Philosophy**: Table-first UX (spreadsheet-like), explicit hierarchy, practical over visual, unified relationship management.

## Problem Statement

### Current State

The existing system has:

1. **Rich Business Model Entities**
   - Business Model Canvas, Value Maps, Customer Profiles, Value Proposition Canvas
   - CanvasItems system for first-class reusable items
   - Assumptions, Hypotheses, Experiments for validation

2. **Universal entity_links System**
   - Single table for all loose associations between entities
   - Flexible metadata storage in JSONB
   - Validation rules for link types between entity pairs
   - Already supports touchpoint, user_journey, journey_stage, etc.

3. **Partial Journey Implementation (Phase 1/2)**
   - User Journeys, Stages, Touchpoints fully implemented
   - Evidence collection via touchpoint_evidence table
   - **INCONSISTENCY**: Dedicated junction tables (touchpoint_canvas_items, touchpoint_assumptions, etc.) instead of entity_links

### Gaps

- **Inconsistent relationship management** - Some use entity_links, some use dedicated junction tables
- **No service design layer** - Can't design how value is delivered
- **No product planning integration** - Story maps not connected to customer insights
- **Table proliferation** - Each new relationship creates a new junction table

## Design Principles

1. **Unified Relationship Management** - ALL entity relationships use entity_links (except hierarchical parent-child via foreign keys)
2. **Table-First UX** - Optimize for spreadsheet-like interactions (not freeform canvas)
3. **Explicit Hierarchy** - Clear parent-child relationships (Journey → Blueprint → Story Map)
4. **Practical Over Visual** - Simple structured views, bulk operations, inline editing
5. **Rich Cross-Linking** - Connect customer insights to product features via entity_links
6. **Validation-Driven** - Every artifact supports hypothesis testing
7. **Flexible Structure** - Core fields as columns, extensibility via JSONB metadata
8. **Export-Friendly** - Easy CSV/spreadsheet export for external tools

## Conceptual Hierarchy

### Three-Layer Cascade

```
┌─────────────────────────────────────────────────────┐
│ LAYER 1: USER JOURNEY (Customer Perspective)       │
│ "What does the customer experience?"               │
│                                                     │
│ Journey → Stages → Touchpoints                     │
│ Focus: Customer jobs, pains, gains, emotions       │
│                                                     │
│ Links (via entity_links):                          │
│ - Touchpoint → Canvas Item (addresses_job, etc.)   │
│ - Touchpoint → Assumption (tests, validates)       │
│ - Touchpoint → User Story (enables, fixes_pain)    │
└─────────────────────┬───────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────┐
│ LAYER 2: SERVICE BLUEPRINT (Delivery Design)       │
│ "How do we deliver that experience?"               │
│                                                     │
│ Blueprint → Steps → Layers (customer/front/back)   │
│ Focus: Service delivery, processes, touchpoints    │
│                                                     │
│ Links (via entity_links):                          │
│ - Blueprint Step → Touchpoint (delivers)           │
│ - Blueprint Step → User Story (implements)         │
└─────────────────────┬───────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────┐
│ LAYER 3: STORY MAP (Product Implementation)        │
│ "What do we build to enable the delivery?"         │
│                                                     │
│ Story Map → Activities → User Stories → Releases   │
│ Focus: Features, development, sprints              │
│                                                     │
│ Links (via entity_links):                          │
│ - User Story → Touchpoint (enables, improves)      │
│ - User Story → Blueprint Step (implements)         │
│ - User Story → Assumption (validates)              │
└─────────────────────────────────────────────────────┘
```

### Relationship Model

**ALL relationships use entity_links, except:**
- Parent-child hierarchies (via foreign keys):
  - Journey → Stages (cascade delete)
  - Stage → Touchpoints (cascade delete)
  - Blueprint → Steps (cascade delete)
  - Story Map → Activities → Stories (cascade delete)

**All cross-entity associations use entity_links:**
- Touchpoint ↔ Canvas Item
- Touchpoint ↔ Assumption
- Touchpoint ↔ User Story
- Blueprint Step ↔ User Story
- Any entity ↔ Business Model Canvas, Value Proposition Canvas, etc.

## Database Schema

### Core Tables (Hierarchical)

#### 1. user_journeys

End-to-end customer experience maps.

```sql
CREATE TABLE user_journeys (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,

  -- Context
  studio_project_id UUID REFERENCES studio_projects(id) ON DELETE SET NULL,
  hypothesis_id UUID REFERENCES studio_hypotheses(id) ON DELETE SET NULL,

  -- Primary Customer Relationship
  customer_profile_id UUID REFERENCES customer_profiles(id) ON DELETE SET NULL,

  -- Journey Scope
  journey_type TEXT DEFAULT 'end_to_end' CHECK (
    journey_type IN ('end_to_end', 'sub_journey', 'micro_moment')
  ),

  -- Lifecycle
  status TEXT NOT NULL DEFAULT 'draft' CHECK (
    status IN ('draft', 'active', 'validated', 'archived')
  ),
  version INTEGER NOT NULL DEFAULT 1,
  parent_version_id UUID REFERENCES user_journeys(id) ON DELETE SET NULL,

  -- Journey Metadata
  goal TEXT,
  context JSONB DEFAULT '{}'::jsonb,
  duration_estimate TEXT,

  -- Validation
  validation_status TEXT DEFAULT 'untested' CHECK (
    validation_status IN ('untested', 'testing', 'validated', 'invalidated')
  ),
  validated_at TIMESTAMPTZ,
  validation_confidence TEXT CHECK (
    validation_confidence IN ('low', 'medium', 'high')
  ),

  -- Metadata
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Constraints
  CONSTRAINT unique_journey_slug_per_project UNIQUE (studio_project_id, slug)
);

-- Links to VPCs, BMCs via entity_links (not JSONB arrays)

CREATE INDEX idx_user_journeys_project ON user_journeys(studio_project_id);
CREATE INDEX idx_user_journeys_customer ON user_journeys(customer_profile_id);
CREATE INDEX idx_user_journeys_hypothesis ON user_journeys(hypothesis_id);
CREATE INDEX idx_user_journeys_status ON user_journeys(status);
CREATE INDEX idx_user_journeys_version_lineage ON user_journeys(parent_version_id);

CREATE TRIGGER update_user_journeys_updated_at
  BEFORE UPDATE ON user_journeys
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

#### 2. journey_stages

Phases in a user journey.

```sql
CREATE TABLE journey_stages (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_journey_id UUID NOT NULL REFERENCES user_journeys(id) ON DELETE CASCADE,

  -- Stage Info
  name TEXT NOT NULL,
  description TEXT,
  sequence INTEGER NOT NULL,

  -- Stage Details
  stage_type TEXT CHECK (
    stage_type IN ('pre_purchase', 'purchase', 'post_purchase', 'ongoing')
  ),

  -- Customer State
  customer_emotion TEXT,
  customer_mindset TEXT,
  customer_goal TEXT,

  -- Metrics
  duration_estimate TEXT,
  drop_off_risk TEXT CHECK (drop_off_risk IN ('low', 'medium', 'high')),

  -- Validation
  validation_status TEXT DEFAULT 'untested' CHECK (
    validation_status IN ('untested', 'testing', 'validated', 'invalidated')
  ),

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Constraints
  CONSTRAINT unique_stage_sequence UNIQUE (user_journey_id, sequence)
);

CREATE INDEX idx_journey_stages_journey ON journey_stages(user_journey_id);
CREATE INDEX idx_journey_stages_sequence ON journey_stages(user_journey_id, sequence);

CREATE TRIGGER update_journey_stages_updated_at
  BEFORE UPDATE ON journey_stages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

#### 3. touchpoints

Individual interaction moments in a journey stage.

```sql
CREATE TABLE touchpoints (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journey_stage_id UUID NOT NULL REFERENCES journey_stages(id) ON DELETE CASCADE,

  -- Touchpoint Info
  name TEXT NOT NULL,
  description TEXT,
  sequence INTEGER NOT NULL,

  -- Touchpoint Type
  channel_type TEXT CHECK (
    channel_type IN (
      'web', 'mobile_app', 'phone', 'email', 'in_person',
      'chat', 'social', 'physical_location', 'mail', 'other'
    )
  ),

  interaction_type TEXT CHECK (
    interaction_type IN (
      'browse', 'search', 'read', 'watch', 'listen',
      'form', 'transaction', 'conversation', 'notification', 'passive'
    )
  ),

  -- Experience Metrics
  importance TEXT CHECK (importance IN ('critical', 'high', 'medium', 'low')),
  current_experience_quality TEXT CHECK (
    current_experience_quality IN ('poor', 'fair', 'good', 'excellent', 'unknown')
  ),
  pain_level TEXT CHECK (pain_level IN ('none', 'minor', 'moderate', 'major', 'critical')),
  delight_potential TEXT CHECK (delight_potential IN ('low', 'medium', 'high')),

  -- Details
  user_actions JSONB DEFAULT '[]'::jsonb,
  system_response JSONB DEFAULT '{}'::jsonb,

  -- Validation
  validation_status TEXT DEFAULT 'untested' CHECK (
    validation_status IN ('untested', 'testing', 'validated', 'invalidated')
  ),
  validated_at TIMESTAMPTZ,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Constraints
  CONSTRAINT unique_touchpoint_sequence UNIQUE (journey_stage_id, sequence)
);

-- Links to canvas_items, assumptions, user_stories via entity_links

CREATE INDEX idx_touchpoints_stage ON touchpoints(journey_stage_id);
CREATE INDEX idx_touchpoints_sequence ON touchpoints(journey_stage_id, sequence);
CREATE INDEX idx_touchpoints_channel ON touchpoints(channel_type);
CREATE INDEX idx_touchpoints_importance ON touchpoints(importance);
CREATE INDEX idx_touchpoints_pain ON touchpoints(pain_level);

CREATE TRIGGER update_touchpoints_updated_at
  BEFORE UPDATE ON touchpoints
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

#### 4. touchpoint_evidence

Evidence collected about touchpoint experiences. Kept as dedicated table due to domain-specific fields.

```sql
CREATE TABLE touchpoint_evidence (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  touchpoint_id UUID NOT NULL REFERENCES touchpoints(id) ON DELETE CASCADE,

  -- Evidence Details
  evidence_type TEXT NOT NULL CHECK (
    evidence_type IN (
      'user_test', 'interview', 'survey', 'analytics',
      'observation', 'prototype', 'ab_test', 'heuristic_eval'
    )
  ),

  title TEXT NOT NULL,
  summary TEXT,
  url TEXT,

  -- Assessment
  supports_design BOOLEAN,
  confidence TEXT CHECK (confidence IN ('low', 'medium', 'high')),

  collected_at TIMESTAMPTZ,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_touchpoint_evidence_touchpoint ON touchpoint_evidence(touchpoint_id);
CREATE INDEX idx_touchpoint_evidence_type ON touchpoint_evidence(evidence_type);

CREATE TRIGGER update_touchpoint_evidence_updated_at
  BEFORE UPDATE ON touchpoint_evidence
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

#### 5. service_blueprints

Service delivery design (bridges journey to story map).

```sql
CREATE TABLE service_blueprints (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,

  -- Context
  studio_project_id UUID REFERENCES studio_projects(id) ON DELETE SET NULL,
  hypothesis_id UUID REFERENCES studio_hypotheses(id) ON DELETE SET NULL,

  -- HIERARCHY: Blueprint implements a Journey (via entity_links with link_type='implements')
  -- NOTE: No FK here, use entity_links for flexibility

  -- Blueprint Type
  blueprint_type TEXT DEFAULT 'service' CHECK (
    blueprint_type IN ('service', 'product', 'hybrid', 'digital', 'physical')
  ),

  -- Lifecycle
  status TEXT NOT NULL DEFAULT 'draft' CHECK (
    status IN ('draft', 'active', 'validated', 'archived')
  ),
  version INTEGER NOT NULL DEFAULT 1,
  parent_version_id UUID REFERENCES service_blueprints(id) ON DELETE SET NULL,

  -- Service Scope
  service_scope TEXT,
  service_duration TEXT,

  -- Validation
  validation_status TEXT DEFAULT 'untested' CHECK (
    validation_status IN ('untested', 'testing', 'validated', 'invalidated')
  ),
  validated_at TIMESTAMPTZ,

  -- Metadata
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Constraints
  CONSTRAINT unique_blueprint_slug_per_project UNIQUE (studio_project_id, slug)
);

-- Links to journeys, BMCs via entity_links

CREATE INDEX idx_service_blueprints_project ON service_blueprints(studio_project_id);
CREATE INDEX idx_service_blueprints_status ON service_blueprints(status);

CREATE TRIGGER update_service_blueprints_updated_at
  BEFORE UPDATE ON service_blueprints
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

#### 6. blueprint_steps

Time-sequenced steps in a blueprint.

```sql
CREATE TABLE blueprint_steps (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_blueprint_id UUID NOT NULL REFERENCES service_blueprints(id) ON DELETE CASCADE,

  -- Step Info
  name TEXT NOT NULL,
  description TEXT,
  sequence INTEGER NOT NULL,

  -- HIERARCHY: Link to touchpoint via entity_links (not FK)
  -- This allows flexibility for steps that don't map 1:1 to touchpoints

  -- Service Layers (JSONB for table-friendly editing)
  layers JSONB NOT NULL DEFAULT '{
    "customer_action": null,
    "frontstage": null,
    "backstage": null,
    "support_process": null
  }'::jsonb,

  -- Actors (who performs each layer)
  actors JSONB DEFAULT '{}'::jsonb,

  -- Business Impact
  duration_estimate TEXT,
  cost_implication TEXT CHECK (cost_implication IN ('none', 'low', 'medium', 'high')),
  customer_value_delivery TEXT CHECK (
    customer_value_delivery IN ('none', 'low', 'medium', 'high')
  ),

  -- Risk
  failure_risk TEXT CHECK (failure_risk IN ('low', 'medium', 'high', 'critical')),
  failure_impact TEXT,

  -- Validation
  validation_status TEXT DEFAULT 'untested' CHECK (
    validation_status IN ('untested', 'testing', 'validated', 'invalidated')
  ),

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Constraints
  CONSTRAINT unique_blueprint_step_sequence UNIQUE (service_blueprint_id, sequence)
);

-- Links to touchpoints, user_stories via entity_links

CREATE INDEX idx_blueprint_steps_blueprint ON blueprint_steps(service_blueprint_id);
CREATE INDEX idx_blueprint_steps_sequence ON blueprint_steps(service_blueprint_id, sequence);

CREATE TRIGGER update_blueprint_steps_updated_at
  BEFORE UPDATE ON blueprint_steps
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

#### 7. story_maps

Product planning and feature organization.

```sql
CREATE TABLE story_maps (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,

  -- Context
  studio_project_id UUID REFERENCES studio_projects(id) ON DELETE SET NULL,
  hypothesis_id UUID REFERENCES studio_hypotheses(id) ON DELETE SET NULL,

  -- HIERARCHY: Links to blueprints/journeys via entity_links (not FK)

  -- Map Type
  map_type TEXT DEFAULT 'feature' CHECK (
    map_type IN ('feature', 'product', 'release', 'discovery')
  ),

  -- Lifecycle
  status TEXT NOT NULL DEFAULT 'draft' CHECK (
    status IN ('draft', 'active', 'validated', 'archived')
  ),
  version INTEGER NOT NULL DEFAULT 1,
  parent_version_id UUID REFERENCES story_maps(id) ON DELETE SET NULL,

  -- Validation
  validation_status TEXT DEFAULT 'untested' CHECK (
    validation_status IN ('untested', 'testing', 'validated', 'invalidated')
  ),
  validated_at TIMESTAMPTZ,

  -- Metadata
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Constraints
  CONSTRAINT unique_story_map_slug_per_project UNIQUE (studio_project_id, slug)
);

-- Links to blueprints, journeys via entity_links

CREATE INDEX idx_story_maps_project ON story_maps(studio_project_id);
CREATE INDEX idx_story_maps_status ON story_maps(status);

CREATE TRIGGER update_story_maps_updated_at
  BEFORE UPDATE ON story_maps
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

#### 8. activities

High-level user activities in a story map (backbone).

```sql
CREATE TABLE activities (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_map_id UUID NOT NULL REFERENCES story_maps(id) ON DELETE CASCADE,

  -- Activity Info
  name TEXT NOT NULL,
  description TEXT,
  sequence INTEGER NOT NULL,

  -- Activity Details
  user_goal TEXT,

  -- Optional link to journey stage via entity_links (not FK)

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Constraints
  CONSTRAINT unique_activity_sequence UNIQUE (story_map_id, sequence)
);

CREATE INDEX idx_activities_story_map ON activities(story_map_id);
CREATE INDEX idx_activities_sequence ON activities(story_map_id, sequence);

CREATE TRIGGER update_activities_updated_at
  BEFORE UPDATE ON activities
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

#### 9. user_stories

Individual features/tasks under activities.

```sql
CREATE TABLE user_stories (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,

  -- Story Info
  title TEXT NOT NULL,
  description TEXT,
  acceptance_criteria TEXT,

  -- Story Details
  story_type TEXT CHECK (
    story_type IN ('feature', 'enhancement', 'bug', 'tech_debt', 'spike')
  ),

  -- Priority & Effort
  priority TEXT CHECK (priority IN ('critical', 'high', 'medium', 'low')),
  story_points INTEGER CHECK (story_points > 0),

  -- Status
  status TEXT DEFAULT 'backlog' CHECK (
    status IN ('backlog', 'ready', 'in_progress', 'review', 'done', 'archived')
  ),

  -- Vertical Position (for story map visualization)
  vertical_position INTEGER,

  -- Validation
  validation_status TEXT DEFAULT 'untested' CHECK (
    validation_status IN ('untested', 'testing', 'validated', 'invalidated')
  ),
  validated_at TIMESTAMPTZ,

  -- Metadata
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Links to touchpoints, blueprint_steps, assumptions via entity_links

CREATE INDEX idx_user_stories_activity ON user_stories(activity_id);
CREATE INDEX idx_user_stories_priority ON user_stories(priority);
CREATE INDEX idx_user_stories_status ON user_stories(status);
CREATE INDEX idx_user_stories_vertical_position ON user_stories(activity_id, vertical_position);

CREATE TRIGGER update_user_stories_updated_at
  BEFORE UPDATE ON user_stories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

#### 10. story_releases

Maps stories to releases/sprints.

```sql
CREATE TABLE story_releases (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_story_id UUID NOT NULL REFERENCES user_stories(id) ON DELETE CASCADE,

  -- Release Info
  release_name TEXT NOT NULL,
  release_date DATE,
  release_order INTEGER,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Constraints
  CONSTRAINT unique_story_release UNIQUE (user_story_id, release_name)
);

CREATE INDEX idx_story_releases_story ON story_releases(user_story_id);
CREATE INDEX idx_story_releases_name ON story_releases(release_name);
CREATE INDEX idx_story_releases_order ON story_releases(release_order);
```

### Relationship Management via entity_links

**All cross-entity relationships use the existing `entity_links` table.**

The `entity_links` table (already deployed) provides:

```sql
CREATE TABLE entity_links (
  id UUID PRIMARY KEY,
  source_type TEXT NOT NULL,  -- e.g., 'touchpoint', 'user_story', 'blueprint_step'
  source_id UUID NOT NULL,
  target_type TEXT NOT NULL,  -- e.g., 'canvas_item', 'assumption', 'touchpoint'
  target_id UUID NOT NULL,
  link_type TEXT NOT NULL,    -- Relationship semantic (see below)
  strength TEXT,              -- 'strong', 'moderate', 'weak', 'tentative'
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  position INTEGER,
  created_at TIMESTAMPTZ,
  UNIQUE(source_type, source_id, target_type, target_id, link_type)
);
```

#### New Entity Types (to add to entity_links system)

Add these to `lib/types/entity-relationships.ts`:

```typescript
export type LinkableEntityType =
  | ... existing types ...
  | 'service_blueprint'
  | 'blueprint_step'
  | 'story_map'
  | 'activity'
  | 'user_story'
  | 'story_release'
```

#### New Link Types (to add to entity_links system)

Add these to `lib/types/entity-relationships.ts`:

```typescript
export type LinkType =
  | ... existing types ...
  // Journey-to-product relationships
  | 'enables'        // Story enables touchpoint/blueprint
  | 'improves'       // Story improves experience
  | 'fixes_pain'     // Story fixes customer pain
  | 'delivers_gain'  // Story delivers customer gain
  | 'implements'     // Story implements blueprint step
  | 'delivers'       // Blueprint delivers touchpoint
```

#### Example Relationships via entity_links

**Touchpoint → Canvas Item:**
```javascript
linkEntities(
  { type: 'touchpoint', id: touchpointId },
  { type: 'canvas_item', id: canvasItemId },
  'addresses_job',  // or 'relieves_pain', 'creates_gain'
  { strength: 'strong', notes: 'Critical pain point' }
)
```

**Touchpoint → Assumption:**
```javascript
linkEntities(
  { type: 'touchpoint', id: touchpointId },
  { type: 'assumption', id: assumptionId },
  'tests',  // or 'validates', 'challenges', 'depends_on'
  { notes: 'Tests usability assumption' }
)
```

**Touchpoint → User Story:**
```javascript
linkEntities(
  { type: 'touchpoint', id: touchpointId },
  { type: 'user_story', id: storyId },
  'fixes_pain',  // or 'enables', 'improves', 'delivers_gain'
  {
    strength: 'strong',
    notes: 'Fixes checkout pain point',
    metadata: { impact_type: 'fixes_pain', priority: 'high' }
  }
)
```

**Blueprint Step → Touchpoint:**
```javascript
linkEntities(
  { type: 'blueprint_step', id: stepId },
  { type: 'touchpoint', id: touchpointId },
  'delivers',
  { notes: 'This step delivers the checkout touchpoint' }
)
```

**Blueprint Step → User Story:**
```javascript
linkEntities(
  { type: 'blueprint_step', id: stepId },
  { type: 'user_story', id: storyId },
  'implements',
  {
    notes: 'Implements frontstage layer',
    metadata: { implements_layer: 'frontstage' }
  }
)
```

**Service Blueprint → User Journey:**
```javascript
linkEntities(
  { type: 'service_blueprint', id: blueprintId },
  { type: 'user_journey', id: journeyId },
  'implements',
  { notes: 'Blueprint implements checkout journey' }
)
```

**Story Map → Service Blueprint:**
```javascript
linkEntities(
  { type: 'story_map', id: storyMapId },
  { type: 'service_blueprint', id: blueprintId },
  'implements',
  { notes: 'Story map implements blueprint features' }
)
```

## Migration from Dedicated Junction Tables

### Current Phase 1/2 Implementation

**Existing dedicated tables to migrate:**
- `touchpoint_canvas_items` → entity_links
- `touchpoint_customer_profiles` → entity_links
- `touchpoint_value_propositions` → entity_links
- `touchpoint_assumptions` → entity_links

### Migration Strategy (No Data Migration Needed)

Since we're in early implementation:

1. **Drop existing junction tables** in next migration
2. **Update CRUD operations** to use entity_links
3. **Update UI components** to use entity_links helpers
4. **Update validation rules** in `lib/entity-links-validation.ts`

### Migration SQL (Phase 2 Cleanup)

```sql
-- Drop dedicated junction tables
DROP TABLE IF EXISTS touchpoint_canvas_items CASCADE;
DROP TABLE IF EXISTS touchpoint_customer_profiles CASCADE;
DROP TABLE IF EXISTS touchpoint_value_propositions CASCADE;
DROP TABLE IF EXISTS touchpoint_assumptions CASCADE;
DROP TABLE IF EXISTS touchpoint_mappings CASCADE;

-- entity_links already has cleanup triggers for touchpoints
-- No further action needed
```

### Updated Validation Rules

Add to `lib/entity-links-validation.ts`:

```typescript
const VALID_LINK_TYPES: Partial<Record<LinkableEntityType, Partial<Record<LinkableEntityType, LinkType[]>>>> = {
  // ... existing rules ...

  // Touchpoint relationships
  touchpoint: {
    canvas_item: ['addresses_job', 'relieves_pain', 'creates_gain', 'related'],
    customer_profile: ['addresses_job', 'triggers_pain', 'delivers_gain', 'related'],
    value_proposition_canvas: ['delivers', 'tests', 'related'],
    assumption: ['tests', 'validates', 'challenges', 'depends_on', 'related'],
    user_story: ['enables', 'improves', 'fixes_pain', 'delivers_gain', 'related'],
  },

  // Blueprint relationships
  service_blueprint: {
    user_journey: ['implements', 'supports', 'related'],
    business_model_canvas: ['implements', 'related'],
  },

  blueprint_step: {
    touchpoint: ['delivers', 'supports', 'related'],
    user_story: ['implements', 'enables', 'supports', 'related'],
  },

  // Story map relationships
  story_map: {
    service_blueprint: ['implements', 'supports', 'related'],
    user_journey: ['implements', 'related'],
  },

  activity: {
    journey_stage: ['maps_to', 'related'],
  },

  user_story: {
    touchpoint: ['enables', 'improves', 'fixes_pain', 'delivers_gain', 'related'],
    blueprint_step: ['implements', 'enables', 'supports', 'related'],
    assumption: ['validates', 'tests', 'related'],
    canvas_item: ['validates', 'related'],
  },
}
```

## TypeScript Type Definitions

### Core Types (Updated)

```typescript
// lib/types/boundary-objects.ts

import type { BaseRecord } from './database'

// ============================================================================
// ENUMS & CONSTANTS
// ============================================================================

export type JourneyType = 'end_to_end' | 'sub_journey' | 'micro_moment'
export type StageType = 'pre_purchase' | 'purchase' | 'post_purchase' | 'ongoing'
export type ChannelType = 'web' | 'mobile_app' | 'phone' | 'email' | 'in_person' | 'chat' | 'social' | 'physical_location' | 'mail' | 'other'
export type InteractionType = 'browse' | 'search' | 'read' | 'watch' | 'listen' | 'form' | 'transaction' | 'conversation' | 'notification' | 'passive'
export type Importance = 'critical' | 'high' | 'medium' | 'low'
export type ExperienceQuality = 'poor' | 'fair' | 'good' | 'excellent' | 'unknown'
export type PainLevel = 'none' | 'minor' | 'moderate' | 'major' | 'critical'
export type DelightPotential = 'low' | 'medium' | 'high'
export type ValidationStatus = 'untested' | 'testing' | 'validated' | 'invalidated'
export type ValidationConfidence = 'low' | 'medium' | 'high'

export type EvidenceType =
  | 'user_test'
  | 'interview'
  | 'survey'
  | 'analytics'
  | 'observation'
  | 'prototype'
  | 'ab_test'
  | 'heuristic_eval'

export type BlueprintType = 'service' | 'product' | 'hybrid' | 'digital' | 'physical'
export type CostImplication = 'none' | 'low' | 'medium' | 'high'
export type ValueDelivery = 'none' | 'low' | 'medium' | 'high'
export type FailureRisk = 'low' | 'medium' | 'high' | 'critical'

export type StoryMapType = 'feature' | 'product' | 'release' | 'discovery'
export type StoryType = 'feature' | 'enhancement' | 'bug' | 'tech_debt' | 'spike'
export type StoryStatus = 'backlog' | 'ready' | 'in_progress' | 'review' | 'done' | 'archived'

// ============================================================================
// USER JOURNEY ENTITIES
// ============================================================================

export interface UserJourney extends BaseRecord {
  slug: string
  name: string
  description?: string
  studio_project_id?: string
  hypothesis_id?: string
  customer_profile_id?: string
  journey_type: JourneyType
  status: 'draft' | 'active' | 'validated' | 'archived'
  version: number
  parent_version_id?: string
  goal?: string
  context: Record<string, any>
  duration_estimate?: string
  validation_status: ValidationStatus
  validated_at?: string
  validation_confidence?: ValidationConfidence
  tags: string[]
  metadata: Record<string, any>
}

export interface JourneyStage extends BaseRecord {
  user_journey_id: string
  name: string
  description?: string
  sequence: number
  stage_type?: StageType
  customer_emotion?: string
  customer_mindset?: string
  customer_goal?: string
  duration_estimate?: string
  drop_off_risk?: 'low' | 'medium' | 'high'
  validation_status: ValidationStatus
  metadata: Record<string, any>
}

export interface Touchpoint extends BaseRecord {
  journey_stage_id: string
  name: string
  description?: string
  sequence: number
  channel_type?: ChannelType
  interaction_type?: InteractionType
  importance?: Importance
  current_experience_quality?: ExperienceQuality
  pain_level?: PainLevel
  delight_potential?: DelightPotential
  user_actions: any[]
  system_response: Record<string, any>
  validation_status: ValidationStatus
  validated_at?: string
  metadata: Record<string, any>
}

export interface TouchpointEvidence extends BaseRecord {
  touchpoint_id: string
  evidence_type: EvidenceType
  title: string
  summary?: string
  url?: string
  supports_design?: boolean
  confidence?: ValidationConfidence
  collected_at?: string
  metadata: Record<string, any>
}

// ============================================================================
// SERVICE BLUEPRINT ENTITIES
// ============================================================================

export interface BlueprintLayers {
  customer_action?: string
  frontstage?: string
  backstage?: string
  support_process?: string
}

export interface ServiceBlueprint extends BaseRecord {
  slug: string
  name: string
  description?: string
  studio_project_id?: string
  hypothesis_id?: string
  blueprint_type: BlueprintType
  status: 'draft' | 'active' | 'validated' | 'archived'
  version: number
  parent_version_id?: string
  service_scope?: string
  service_duration?: string
  validation_status: ValidationStatus
  validated_at?: string
  tags: string[]
  metadata: Record<string, any>
}

export interface BlueprintStep extends BaseRecord {
  service_blueprint_id: string
  name: string
  description?: string
  sequence: number
  layers: BlueprintLayers
  actors: Record<string, string>
  duration_estimate?: string
  cost_implication?: CostImplication
  customer_value_delivery?: ValueDelivery
  failure_risk?: FailureRisk
  failure_impact?: string
  validation_status: ValidationStatus
  metadata: Record<string, any>
}

// ============================================================================
// STORY MAP ENTITIES
// ============================================================================

export interface StoryMap extends BaseRecord {
  slug: string
  name: string
  description?: string
  studio_project_id?: string
  hypothesis_id?: string
  map_type: StoryMapType
  status: 'draft' | 'active' | 'validated' | 'archived'
  version: number
  parent_version_id?: string
  validation_status: ValidationStatus
  validated_at?: string
  tags: string[]
  metadata: Record<string, any>
}

export interface Activity extends BaseRecord {
  story_map_id: string
  name: string
  description?: string
  sequence: number
  user_goal?: string
  metadata: Record<string, any>
}

export interface UserStory extends BaseRecord {
  activity_id: string
  title: string
  description?: string
  acceptance_criteria?: string
  story_type?: StoryType
  priority?: Importance
  story_points?: number
  status: StoryStatus
  vertical_position?: number
  validation_status: ValidationStatus
  validated_at?: string
  tags: string[]
  metadata: Record<string, any>
}

export interface StoryRelease {
  id: string
  user_story_id: string
  release_name: string
  release_date?: string
  release_order?: number
  metadata: Record<string, any>
  created_at: string
}

// ============================================================================
// INSERT/UPDATE TYPES
// ============================================================================

export type UserJourneyInsert = Omit<UserJourney, keyof BaseRecord>
export type UserJourneyUpdate = Partial<UserJourneyInsert>

export type JourneyStageInsert = Omit<JourneyStage, keyof BaseRecord>
export type JourneyStageUpdate = Partial<JourneyStageInsert>

export type TouchpointInsert = Omit<Touchpoint, keyof BaseRecord>
export type TouchpointUpdate = Partial<TouchpointInsert>

export type ServiceBlueprintInsert = Omit<ServiceBlueprint, keyof BaseRecord>
export type ServiceBlueprintUpdate = Partial<ServiceBlueprintInsert>

export type BlueprintStepInsert = Omit<BlueprintStep, keyof BaseRecord>
export type BlueprintStepUpdate = Partial<BlueprintStepInsert>

export type StoryMapInsert = Omit<StoryMap, keyof BaseRecord>
export type StoryMapUpdate = Partial<StoryMapInsert>

export type ActivityInsert = Omit<Activity, keyof BaseRecord>
export type ActivityUpdate = Partial<ActivityInsert>

export type UserStoryInsert = Omit<UserStory, keyof BaseRecord>
export type UserStoryUpdate = Partial<UserStoryInsert>

// ============================================================================
// EXTENDED VIEWS (with relationships via entity_links)
// ============================================================================

export interface TouchpointWithRelations extends Touchpoint {
  // Fetched via entity_links
  canvas_items: LinkedEntity<CanvasItem>[]
  assumptions: LinkedEntity<Assumption>[]
  stories: LinkedEntity<UserStory>[]
  evidence: TouchpointEvidence[]

  // Counts
  canvas_item_count: number
  assumption_count: number
  story_count: number
  evidence_count: number
}

export interface BlueprintStepWithRelations extends BlueprintStep {
  // Fetched via entity_links
  touchpoints: LinkedEntity<Touchpoint>[]
  stories: LinkedEntity<UserStory>[]

  // Counts
  touchpoint_count: number
  story_count: number
}

export interface UserStoryWithRelations extends UserStory {
  // Fetched via entity_links
  touchpoints: LinkedEntity<Touchpoint>[]
  blueprint_steps: LinkedEntity<BlueprintStep>[]
  assumptions: LinkedEntity<Assumption>[]
  releases: StoryRelease[]

  // Counts
  touchpoint_count: number
  blueprint_count: number
  assumption_count: number
}
```

## Implementation Progress

### Completed (Phase 1/2)

**✅ User Journeys - COMPLETE**
- Database tables: user_journeys, journey_stages, touchpoints, touchpoint_evidence
- Full CRUD operations
- Admin UI with list, detail, form views
- Dedicated junction tables (to be migrated to entity_links)

### Migration Plan (Updated)

### Phase 2B: Migrate to entity_links (Week 1)
- [ ] Drop dedicated junction tables
- [ ] Add new entity types to `lib/types/entity-relationships.ts`
- [ ] Add new link types to `lib/types/entity-relationships.ts`
- [ ] Add validation rules to `lib/entity-links-validation.ts`
- [ ] Update CRUD operations in `lib/boundary-objects/mappings.ts` to use entity_links
- [ ] Update UI components (TouchpointMappingLinker, etc.) to use entity_links
- [ ] Update table name mapping for new entities

### Phase 3: Service Blueprints (Week 2-3)
- [ ] service_blueprints, blueprint_steps tables
- [ ] Blueprint CRUD using entity_links for relationships
- [ ] Blueprint grid view (layer × time table)
- [ ] Link blueprint steps to touchpoints via entity_links
- [ ] Link blueprint steps to user stories via entity_links

### Phase 4: Story Maps (Week 3-4)
- [ ] story_maps, activities, user_stories, story_releases tables
- [ ] Story map CRUD using entity_links for relationships
- [ ] Grouped table view (by activity)
- [ ] Release planning interface
- [ ] Link stories to touchpoints/blueprints via entity_links

### Phase 5: Cross-Reference Views (Week 5)
- [ ] Touchpoint → Stories view
- [ ] Blueprint → Stories view
- [ ] Story → Touchpoints/Blueprints view
- [ ] Impact visualization (pain → story → implementation)
- [ ] Entity graph explorer

### Phase 6: Polish & Integration (Week 6)
- [ ] AI-assisted journey → story suggestions
- [ ] Validation dashboards
- [ ] Evidence aggregation
- [ ] Export improvements
- [ ] Documentation

## Success Metrics

- **Consistency**: 100% of cross-entity relationships use entity_links
- **Table Count**: Reduced from 14+ dedicated junction tables to 1 universal table
- **Integration**: 70%+ of touchpoints linked to stories
- **Validation**: 60%+ of touchpoints have evidence
- **Traceability**: Can trace from customer pain → touchpoint → blueprint → story → implementation

## References

- Entity Relationships Analysis: `/docs/infrastructure/ENTITY_RELATIONSHIPS.md`
- Entity Links Migration: `/supabase/migrations/20260102200001_create_entity_links.sql`
- Relationship Simplification: `/docs/infrastructure/RELATIONSHIP_SIMPLIFICATION_SPEC.md`
- Original spec (v2.0): `/docs/database/boundary-objects-entity-system-spec.md` (previous version)

---

**Status**: Spec Updated for entity_links Architecture
**Next Steps**: Phase 2B migration, then Phase 3/4/5 implementation
