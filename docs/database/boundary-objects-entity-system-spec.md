# Boundary Objects Entity System Specification

**Version:** 1.0
**Date:** 2025-12-31
**Status:** Draft for Review
**Author:** Claude (Session: claude/entity-system-design-M9tkA)

## Executive Summary

This specification proposes a comprehensive entity system for managing **boundary objects** - artifacts that bridge customer understanding and value delivery. These include:

- **User Journeys** - End-to-end customer experience maps
- **Service Blueprints** - Multi-layer service delivery visualization
- **Process Flows** - Workflow and interaction sequences

These entities integrate with existing Strategyzer canvases (Business Model Canvas, Value Proposition Canvas, Customer Profiles) and the Studio infrastructure to enable hypothesis-driven experience design with the same rigor as business model validation.

## Problem Statement

### Current State

The existing system has:

1. **Rich Business Model Entities**
   - Business Model Canvas, Value Maps, Customer Profiles, Value Proposition Canvas
   - CanvasItems system for first-class reusable items
   - Assumptions, Hypotheses, Experiments for validation

2. **Limited Journey Modeling**
   - `journey_stages` field in CustomerProfile (simple JSONB array)
   - No structured touchpoint management
   - No service blueprint or process flow capabilities
   - No linking between journey moments and value propositions

3. **View System Ready for Expansion**
   - ViewType: 'table' | 'grid' | 'kanban' | 'canvas'
   - Canvas view placeholder awaiting implementation
   - AdminDataView component supports multiple view types

### Gaps

- **No first-class journey entities** - journeys embedded in customer profiles, not reusable
- **Missing service design artifacts** - no blueprints, touchpoint maps, service layers
- **Weak journey-to-value linkage** - can't map touchpoints to value propositions or assumptions
- **No journey validation** - can't test journey assumptions or track evidence
- **Limited cross-canvas insights** - hard to see how journeys relate to business model blocks

## Design Principles

Building on existing patterns:

1. **First-Class Entities** - Journeys, blueprints, flows as top-level records (not embedded JSONB)
2. **Reusable Components** - Journey stages, touchpoints, blueprint layers as composable entities
3. **Rich Relationships** - Link to customer profiles, value props, assumptions, experiments
4. **Validation-Driven** - Every artifact supports hypothesis testing with evidence
5. **Flexible Structure** - Core fields as columns, extensible data as JSONB
6. **View-Ready** - Design entities for multiple view types (table, kanban, canvas)
7. **CanvasItems Compatible** - Integrate with existing CanvasItems system where appropriate

## Entity Architecture

### Entity Hierarchy

```
Boundary Objects (Top Level)
├── UserJourney (end-to-end customer experience)
│   ├── JourneyStage (phase in journey: awareness, consideration, purchase, etc.)
│   │   └── Touchpoint (interaction moment)
│   │       ├── TouchpointAssumptions (junction to assumptions)
│   │       └── TouchpointEvidence (evidence for touchpoint)
│   └── JourneyMapping (links to canvas items, customer jobs, etc.)
│
├── ServiceBlueprint (service delivery design)
│   ├── BlueprintLayer (frontstage, backstage, support)
│   │   └── BlueprintActivity (action in layer)
│   │       └── BlueprintActivityLink (connects activities across layers)
│   └── BlueprintMapping (links to business model activities, resources)
│
└── ProcessFlow (workflow/interaction sequence)
    ├── FlowNode (step, decision, action)
    │   └── FlowConnection (edge between nodes)
    └── FlowMapping (links to assumptions, experiments)
```

### Relationships to Existing Entities

```
Boundary Objects Link To:
├── CustomerProfile (journey belongs to customer segment)
├── ValuePropositionCanvas (touchpoints deliver value props)
├── BusinessModelCanvas (blueprints implement BMC blocks)
├── CanvasItem (touchpoints use/deliver canvas items)
├── Assumption (journeys test assumptions)
├── Experiment (blueprints validated through experiments)
├── StudioProject (all boundary objects part of project)
└── Hypothesis (boundary objects validate hypotheses)
```

## Database Schema

### 1. user_journeys

End-to-end customer experience maps showing how customers progress through stages.

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
    journey_type IN ('end_to_end', 'sub_journey', 'micro_moment', 'service_journey')
  ),

  -- Lifecycle
  status TEXT NOT NULL DEFAULT 'draft' CHECK (
    status IN ('draft', 'active', 'validated', 'archived')
  ),
  version INTEGER NOT NULL DEFAULT 1,
  parent_version_id UUID REFERENCES user_journeys(id) ON DELETE SET NULL,

  -- Journey Metadata
  goal TEXT, -- What customer is trying to achieve
  context JSONB DEFAULT '{}'::jsonb, -- Situation, constraints, environment
  duration_estimate TEXT, -- "15 minutes", "3 days", "ongoing"

  -- Validation
  validation_status TEXT DEFAULT 'untested' CHECK (
    validation_status IN ('untested', 'testing', 'validated', 'invalidated')
  ),
  validated_at TIMESTAMPTZ,
  validation_confidence TEXT CHECK (
    validation_confidence IN ('low', 'medium', 'high')
  ),

  -- Cross-Canvas Links
  related_value_proposition_ids UUID[] DEFAULT '{}',
  related_business_model_ids UUID[] DEFAULT '{}',

  -- Metadata
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Constraints
  CONSTRAINT unique_journey_slug_per_project UNIQUE (studio_project_id, slug)
);

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

### 2. journey_stages

Phases in a user journey (awareness, consideration, purchase, usage, advocacy, etc.)

```sql
CREATE TABLE journey_stages (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_journey_id UUID NOT NULL REFERENCES user_journeys(id) ON DELETE CASCADE,

  -- Stage Info
  name TEXT NOT NULL, -- "Awareness", "Research", "Purchase", "Onboarding", etc.
  description TEXT,
  sequence INTEGER NOT NULL, -- Order in journey

  -- Stage Details
  stage_type TEXT CHECK (
    stage_type IN ('pre_purchase', 'purchase', 'post_purchase', 'ongoing')
  ),

  -- Customer State
  customer_emotion TEXT, -- "frustrated", "excited", "confused", "confident"
  customer_mindset TEXT, -- What they're thinking
  customer_goal TEXT, -- What they want to accomplish in this stage

  -- Metrics
  duration_estimate TEXT, -- "5 minutes", "2 hours"
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

### 3. touchpoints

Individual interaction moments in a journey stage.

```sql
CREATE TABLE touchpoints (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journey_stage_id UUID NOT NULL REFERENCES journey_stages(id) ON DELETE CASCADE,

  -- Touchpoint Info
  name TEXT NOT NULL, -- "Homepage Visit", "Support Call", "Email Receipt"
  description TEXT,
  sequence INTEGER NOT NULL, -- Order within stage

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
  user_actions JSONB DEFAULT '[]'::jsonb, -- What customer does
  system_response JSONB DEFAULT '{}'::jsonb, -- What system does

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

CREATE INDEX idx_touchpoints_stage ON touchpoints(journey_stage_id);
CREATE INDEX idx_touchpoints_sequence ON touchpoints(journey_stage_id, sequence);
CREATE INDEX idx_touchpoints_channel ON touchpoints(channel_type);
CREATE INDEX idx_touchpoints_importance ON touchpoints(importance);

CREATE TRIGGER update_touchpoints_updated_at
  BEFORE UPDATE ON touchpoints
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

### 4. journey_mappings

Links journey elements to canvas items, customer jobs, value propositions, etc.

```sql
CREATE TABLE journey_mappings (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Source (journey element)
  source_type TEXT NOT NULL CHECK (
    source_type IN ('user_journey', 'journey_stage', 'touchpoint')
  ),
  source_id UUID NOT NULL, -- Polymorphic reference

  -- Target (canvas element)
  target_type TEXT NOT NULL CHECK (
    target_type IN (
      'canvas_item', 'customer_profile', 'value_proposition_canvas',
      'business_model_canvas', 'value_map'
    )
  ),
  target_id UUID NOT NULL, -- Polymorphic reference

  -- Mapping Details
  mapping_type TEXT NOT NULL CHECK (
    mapping_type IN (
      'addresses_job', 'triggers_pain', 'delivers_gain',
      'uses_channel', 'requires_resource', 'performed_by_partner',
      'generates_revenue', 'incurs_cost', 'builds_relationship'
    )
  ),

  strength TEXT CHECK (strength IN ('weak', 'moderate', 'strong')),
  validated BOOLEAN DEFAULT false,

  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Constraints
  CONSTRAINT unique_journey_mapping UNIQUE (source_type, source_id, target_type, target_id, mapping_type)
);

CREATE INDEX idx_journey_mappings_source ON journey_mappings(source_type, source_id);
CREATE INDEX idx_journey_mappings_target ON journey_mappings(target_type, target_id);
CREATE INDEX idx_journey_mappings_type ON journey_mappings(mapping_type);

CREATE TRIGGER update_journey_mappings_updated_at
  BEFORE UPDATE ON journey_mappings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

### 5. service_blueprints

Service delivery design showing frontstage (customer-facing), backstage (internal), and support layers.

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

  -- Blueprint Relationships
  user_journey_id UUID REFERENCES user_journeys(id) ON DELETE SET NULL,
  business_model_canvas_id UUID REFERENCES business_model_canvases(id) ON DELETE SET NULL,

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

CREATE INDEX idx_service_blueprints_project ON service_blueprints(studio_project_id);
CREATE INDEX idx_service_blueprints_journey ON service_blueprints(user_journey_id);
CREATE INDEX idx_service_blueprints_bmc ON service_blueprints(business_model_canvas_id);

CREATE TRIGGER update_service_blueprints_updated_at
  BEFORE UPDATE ON service_blueprints
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

### 6. blueprint_layers

Horizontal layers in service blueprint (customer actions, frontstage, backstage, support)

```sql
CREATE TABLE blueprint_layers (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_blueprint_id UUID NOT NULL REFERENCES service_blueprints(id) ON DELETE CASCADE,

  -- Layer Info
  name TEXT NOT NULL,
  layer_type TEXT NOT NULL CHECK (
    layer_type IN (
      'customer_actions',     -- What customer does
      'frontstage',          -- Visible service delivery
      'backstage',           -- Invisible service delivery
      'support_processes',   -- Enabling systems/processes
      'technology'           -- Technology layer (optional)
    )
  ),
  sequence INTEGER NOT NULL, -- Order from top (customer) to bottom (support)

  -- Layer Details
  description TEXT,
  visibility_to_customer BOOLEAN DEFAULT false,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Constraints
  CONSTRAINT unique_layer_sequence UNIQUE (service_blueprint_id, sequence),
  CONSTRAINT unique_layer_type_per_blueprint UNIQUE (service_blueprint_id, layer_type)
);

CREATE INDEX idx_blueprint_layers_blueprint ON blueprint_layers(service_blueprint_id);
CREATE INDEX idx_blueprint_layers_sequence ON blueprint_layers(service_blueprint_id, sequence);
```

### 7. blueprint_activities

Actions/steps within blueprint layers

```sql
CREATE TABLE blueprint_activities (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blueprint_layer_id UUID NOT NULL REFERENCES blueprint_layers(id) ON DELETE CASCADE,

  -- Activity Info
  name TEXT NOT NULL,
  description TEXT,
  sequence INTEGER NOT NULL, -- Horizontal position (time order)

  -- Activity Details
  actor TEXT, -- Who performs: "Customer", "Agent", "System", "Partner"
  duration_estimate TEXT,

  -- Business Impact
  cost_implication TEXT CHECK (cost_implication IN ('none', 'low', 'medium', 'high')),
  customer_value_delivery TEXT CHECK (
    customer_value_delivery IN ('none', 'low', 'medium', 'high')
  ),

  -- Risk
  failure_risk TEXT CHECK (failure_risk IN ('low', 'medium', 'high', 'critical')),
  failure_impact TEXT, -- What happens if this fails

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
  CONSTRAINT unique_activity_sequence UNIQUE (blueprint_layer_id, sequence)
);

CREATE INDEX idx_blueprint_activities_layer ON blueprint_activities(blueprint_layer_id);
CREATE INDEX idx_blueprint_activities_sequence ON blueprint_activities(blueprint_layer_id, sequence);

CREATE TRIGGER update_blueprint_activities_updated_at
  BEFORE UPDATE ON blueprint_activities
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

### 8. blueprint_activity_links

Connections between activities (across layers or within layer)

```sql
CREATE TABLE blueprint_activity_links (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Link endpoints
  from_activity_id UUID NOT NULL REFERENCES blueprint_activities(id) ON DELETE CASCADE,
  to_activity_id UUID NOT NULL REFERENCES blueprint_activities(id) ON DELETE CASCADE,

  -- Link Type
  link_type TEXT NOT NULL CHECK (
    link_type IN (
      'triggers',        -- From activity triggers to activity
      'enables',         -- From activity enables to activity
      'depends_on',      -- From activity depends on to activity
      'informs',         -- From activity informs to activity
      'validates'        -- From activity validates to activity
    )
  ),

  -- Link Details
  description TEXT,
  is_critical BOOLEAN DEFAULT false, -- Critical path

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Constraints
  CONSTRAINT no_self_links CHECK (from_activity_id != to_activity_id),
  CONSTRAINT unique_activity_link UNIQUE (from_activity_id, to_activity_id, link_type)
);

CREATE INDEX idx_blueprint_activity_links_from ON blueprint_activity_links(from_activity_id);
CREATE INDEX idx_blueprint_activity_links_to ON blueprint_activity_links(to_activity_id);
CREATE INDEX idx_blueprint_activity_links_type ON blueprint_activity_links(link_type);
```

### 9. process_flows

Workflow and interaction sequences (can be linked to journeys or blueprints)

```sql
CREATE TABLE process_flows (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,

  -- Context
  studio_project_id UUID REFERENCES studio_projects(id) ON DELETE SET NULL,
  hypothesis_id UUID REFERENCES studio_hypotheses(id) ON DELETE SET NULL,

  -- Flow Type
  flow_type TEXT DEFAULT 'process' CHECK (
    flow_type IN (
      'process',          -- Business process
      'user_interaction', -- UI/UX flow
      'decision',         -- Decision tree
      'data',             -- Data flow
      'system'            -- System integration
    )
  ),

  -- Relationships
  user_journey_id UUID REFERENCES user_journeys(id) ON DELETE SET NULL,
  service_blueprint_id UUID REFERENCES service_blueprints(id) ON DELETE SET NULL,

  -- Lifecycle
  status TEXT NOT NULL DEFAULT 'draft' CHECK (
    status IN ('draft', 'active', 'validated', 'archived')
  ),
  version INTEGER NOT NULL DEFAULT 1,
  parent_version_id UUID REFERENCES process_flows(id) ON DELETE SET NULL,

  -- Flow Details
  start_trigger TEXT, -- What initiates this flow
  end_condition TEXT, -- How flow completes

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
  CONSTRAINT unique_flow_slug_per_project UNIQUE (studio_project_id, slug)
);

CREATE INDEX idx_process_flows_project ON process_flows(studio_project_id);
CREATE INDEX idx_process_flows_journey ON process_flows(user_journey_id);
CREATE INDEX idx_process_flows_blueprint ON process_flows(service_blueprint_id);

CREATE TRIGGER update_process_flows_updated_at
  BEFORE UPDATE ON process_flows
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

### 10. flow_nodes

Individual steps/actions in a process flow

```sql
CREATE TABLE flow_nodes (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  process_flow_id UUID NOT NULL REFERENCES process_flows(id) ON DELETE CASCADE,

  -- Node Info
  name TEXT NOT NULL,
  description TEXT,

  -- Node Type
  node_type TEXT NOT NULL CHECK (
    node_type IN (
      'start', 'end', 'action', 'decision',
      'wait', 'parallel', 'merge', 'subprocess'
    )
  ),

  -- Position (for canvas view)
  position_x DECIMAL(10,2),
  position_y DECIMAL(10,2),

  -- Node Details
  actor TEXT, -- Who/what performs this
  duration_estimate TEXT,

  -- Decision node specifics
  decision_criteria JSONB, -- For decision nodes

  -- Validation
  validation_status TEXT DEFAULT 'untested' CHECK (
    validation_status IN ('untested', 'testing', 'validated', 'invalidated')
  ),

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_flow_nodes_flow ON flow_nodes(process_flow_id);
CREATE INDEX idx_flow_nodes_type ON flow_nodes(node_type);

CREATE TRIGGER update_flow_nodes_updated_at
  BEFORE UPDATE ON flow_nodes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

### 11. flow_connections

Edges between flow nodes

```sql
CREATE TABLE flow_connections (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Connection endpoints
  from_node_id UUID NOT NULL REFERENCES flow_nodes(id) ON DELETE CASCADE,
  to_node_id UUID NOT NULL REFERENCES flow_nodes(id) ON DELETE CASCADE,

  -- Connection Details
  label TEXT, -- For decision branches: "Yes", "No", "Error"
  condition TEXT, -- Condition for this path

  -- Metrics
  probability DECIMAL(5,2) CHECK (probability >= 0 AND probability <= 100),

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Constraints
  CONSTRAINT no_self_connections CHECK (from_node_id != to_node_id),
  CONSTRAINT unique_flow_connection UNIQUE (from_node_id, to_node_id, label)
);

CREATE INDEX idx_flow_connections_from ON flow_connections(from_node_id);
CREATE INDEX idx_flow_connections_to ON flow_connections(to_node_id);
```

### 12. touchpoint_assumptions (Junction Table)

Links touchpoints to assumptions for validation

```sql
CREATE TABLE touchpoint_assumptions (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  touchpoint_id UUID NOT NULL REFERENCES touchpoints(id) ON DELETE CASCADE,
  assumption_id UUID NOT NULL REFERENCES assumptions(id) ON DELETE CASCADE,

  -- Relationship
  relationship_type TEXT CHECK (
    relationship_type IN ('tests', 'depends_on', 'validates', 'challenges')
  ),

  notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Constraints
  CONSTRAINT unique_touchpoint_assumption UNIQUE (touchpoint_id, assumption_id)
);

CREATE INDEX idx_touchpoint_assumptions_touchpoint ON touchpoint_assumptions(touchpoint_id);
CREATE INDEX idx_touchpoint_assumptions_assumption ON touchpoint_assumptions(assumption_id);
```

### 13. touchpoint_evidence

Evidence collected about touchpoint experiences

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
  url TEXT, -- Link to full evidence

  -- Assessment
  supports_design BOOLEAN, -- true = validates, false = contradicts, null = unclear
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

## TypeScript Type Definitions

### Core Types

```typescript
// lib/types/boundary-objects.ts

export type JourneyType = 'end_to_end' | 'sub_journey' | 'micro_moment' | 'service_journey'
export type ChannelType = 'web' | 'mobile_app' | 'phone' | 'email' | 'in_person' | 'chat' | 'social' | 'physical_location' | 'mail' | 'other'
export type InteractionType = 'browse' | 'search' | 'read' | 'watch' | 'listen' | 'form' | 'transaction' | 'conversation' | 'notification' | 'passive'
export type ExperienceQuality = 'poor' | 'fair' | 'good' | 'excellent' | 'unknown'
export type PainLevel = 'none' | 'minor' | 'moderate' | 'major' | 'critical'
export type DelightPotential = 'low' | 'medium' | 'high'
export type StageType = 'pre_purchase' | 'purchase' | 'post_purchase' | 'ongoing'
export type BlueprintType = 'service' | 'product' | 'hybrid' | 'digital' | 'physical'
export type LayerType = 'customer_actions' | 'frontstage' | 'backstage' | 'support_processes' | 'technology'
export type FlowType = 'process' | 'user_interaction' | 'decision' | 'data' | 'system'
export type NodeType = 'start' | 'end' | 'action' | 'decision' | 'wait' | 'parallel' | 'merge' | 'subprocess'
export type MappingType = 'addresses_job' | 'triggers_pain' | 'delivers_gain' | 'uses_channel' | 'requires_resource' | 'performed_by_partner' | 'generates_revenue' | 'incurs_cost' | 'builds_relationship'

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
  validation_confidence?: 'low' | 'medium' | 'high'
  related_value_proposition_ids: string[]
  related_business_model_ids: string[]
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

export interface JourneyMapping extends BaseRecord {
  source_type: 'user_journey' | 'journey_stage' | 'touchpoint'
  source_id: string
  target_type: 'canvas_item' | 'customer_profile' | 'value_proposition_canvas' | 'business_model_canvas' | 'value_map'
  target_id: string
  mapping_type: MappingType
  strength?: 'weak' | 'moderate' | 'strong'
  validated: boolean
  notes?: string
  metadata: Record<string, any>
}

export interface ServiceBlueprint extends BaseRecord {
  slug: string
  name: string
  description?: string
  studio_project_id?: string
  hypothesis_id?: string
  user_journey_id?: string
  business_model_canvas_id?: string
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

export interface BlueprintLayer extends BaseRecord {
  service_blueprint_id: string
  name: string
  layer_type: LayerType
  sequence: number
  description?: string
  visibility_to_customer: boolean
  metadata: Record<string, any>
}

export interface BlueprintActivity extends BaseRecord {
  blueprint_layer_id: string
  name: string
  description?: string
  sequence: number
  actor?: string
  duration_estimate?: string
  cost_implication?: 'none' | 'low' | 'medium' | 'high'
  customer_value_delivery?: 'none' | 'low' | 'medium' | 'high'
  failure_risk?: 'low' | 'medium' | 'high' | 'critical'
  failure_impact?: string
  validation_status: ValidationStatus
  metadata: Record<string, any>
}

export interface ProcessFlow extends BaseRecord {
  slug: string
  name: string
  description?: string
  studio_project_id?: string
  hypothesis_id?: string
  flow_type: FlowType
  user_journey_id?: string
  service_blueprint_id?: string
  status: 'draft' | 'active' | 'validated' | 'archived'
  version: number
  parent_version_id?: string
  start_trigger?: string
  end_condition?: string
  validation_status: ValidationStatus
  validated_at?: string
  tags: string[]
  metadata: Record<string, any>
}

export interface FlowNode extends BaseRecord {
  process_flow_id: string
  name: string
  description?: string
  node_type: NodeType
  position_x?: number
  position_y?: number
  actor?: string
  duration_estimate?: string
  decision_criteria?: Record<string, any>
  validation_status: ValidationStatus
  metadata: Record<string, any>
}

// Insert/Update types
export type UserJourneyInsert = Omit<UserJourney, keyof BaseRecord>
export type UserJourneyUpdate = Partial<UserJourneyInsert>

export type JourneyStageInsert = Omit<JourneyStage, keyof BaseRecord>
export type JourneyStageUpdate = Partial<JourneyStageInsert>

export type TouchpointInsert = Omit<Touchpoint, keyof BaseRecord>
export type TouchpointUpdate = Partial<TouchpointInsert>

// ... similar for other entities
```

## Integration with Existing Systems

### 1. Canvas Items Integration

Touchpoints and blueprint activities can reference CanvasItems:

```sql
-- Add to journey_mappings examples
INSERT INTO journey_mappings (
  source_type, source_id,
  target_type, target_id,
  mapping_type
) VALUES (
  'touchpoint', '...touchpoint-uuid...',
  'canvas_item', '...canvas-item-uuid...',
  'delivers_gain'
);
```

### 2. Assumptions & Evidence

Link journey elements to assumptions for hypothesis testing:

```sql
-- Touchpoint validates an assumption
INSERT INTO touchpoint_assumptions (
  touchpoint_id, assumption_id, relationship_type
) VALUES (
  '...touchpoint-uuid...',
  '...assumption-uuid...',
  'tests'
);

-- Collect evidence
INSERT INTO touchpoint_evidence (
  touchpoint_id, evidence_type, title, summary, supports_design, confidence
) VALUES (
  '...touchpoint-uuid...',
  'user_test',
  'Usability test of checkout flow',
  '8/10 users completed successfully',
  true,
  'high'
);
```

### 3. View System Integration

Boundary objects work with all view types:

**Table View** (default)
- List journeys, blueprints, flows
- Sort/filter by status, validation, customer profile

**Kanban View**
- Group by status (draft → active → validated)
- Group by validation_status
- Drag to progress

**Canvas View**
- Journey: Linear/swimlane visualization
- Blueprint: Layered swimlane (frontstage/backstage)
- Flow: Node-edge diagram with FlowNode positions

**Grid View**
- Card-based display with key metrics
- Visual indicators for pain points, validation status

## Admin UI Components

### New Admin Routes

```
/admin/journeys              - List user journeys
/admin/journeys/new          - Create journey
/admin/journeys/[id]         - View journey (canvas)
/admin/journeys/[id]/edit    - Edit journey

/admin/blueprints            - List service blueprints
/admin/blueprints/new        - Create blueprint
/admin/blueprints/[id]       - View blueprint (canvas)
/admin/blueprints/[id]/edit  - Edit blueprint

/admin/flows                 - List process flows
/admin/flows/new             - Create flow
/admin/flows/[id]            - View flow (canvas)
/admin/flows/[id]/edit       - Edit flow
```

### Form Components

```typescript
// components/admin/user-journey-form.tsx
// components/admin/service-blueprint-form.tsx
// components/admin/process-flow-form.tsx
```

Each follows the pattern of existing canvas forms with AI-assisted field generation.

### Canvas Visualizations

```typescript
// components/canvas/journey-canvas.tsx
// - Horizontal swimlane with stages
// - Touchpoints as cards within stages
// - Emotion curve overlay
// - Pain/delight indicators

// components/canvas/blueprint-canvas.tsx
// - Multi-layer swimlane
// - Activities aligned vertically by time
// - Connection lines between layers
// - Line of visibility marker

// components/canvas/flow-canvas.tsx
// - Node-edge diagram
// - React Flow or similar library
// - Zoomable/pannable
// - Real-time layout
```

## Migration Strategy

### Phase 1: Core Journey Entities (Week 1)
- [ ] Create database migration for user_journeys, journey_stages, touchpoints
- [ ] Add TypeScript types
- [ ] Create basic CRUD operations
- [ ] Admin table views for journeys

### Phase 2: Journey Mappings & Evidence (Week 1-2)
- [ ] journey_mappings table
- [ ] touchpoint_assumptions junction
- [ ] touchpoint_evidence
- [ ] Integration with CanvasItems
- [ ] Journey detail view with mappings

### Phase 3: Service Blueprints (Week 2-3)
- [ ] Blueprint tables (service_blueprints, blueprint_layers, blueprint_activities, activity_links)
- [ ] Blueprint CRUD
- [ ] Blueprint admin views
- [ ] Blueprint canvas visualization

### Phase 4: Process Flows (Week 3-4)
- [ ] Flow tables (process_flows, flow_nodes, flow_connections)
- [ ] Flow CRUD
- [ ] Flow admin views
- [ ] Flow canvas visualization (React Flow integration)

### Phase 5: Canvas Views & Visualization (Week 4-5)
- [ ] Journey canvas component
- [ ] Blueprint canvas component
- [ ] Flow canvas component
- [ ] View switcher integration
- [ ] Export/sharing capabilities

### Phase 6: Polish & Integration (Week 5-6)
- [ ] AI-assisted journey creation
- [ ] Cross-entity navigation
- [ ] Validation dashboards
- [ ] Evidence aggregation views
- [ ] Documentation

## Example Use Cases

### Use Case 1: E-commerce Checkout Journey

```typescript
// Create journey
const journey = await createUserJourney({
  name: "E-commerce Checkout",
  customer_profile_id: "customer-profile-uuid",
  journey_type: "sub_journey",
  goal: "Complete purchase with minimal friction"
})

// Add stages
const stage1 = await createJourneyStage({
  user_journey_id: journey.id,
  name: "Cart Review",
  sequence: 1,
  stage_type: "purchase",
  customer_emotion: "cautious",
  customer_goal: "Verify items and pricing"
})

// Add touchpoints
const touchpoint1 = await createTouchpoint({
  journey_stage_id: stage1.id,
  name: "View Cart Summary",
  sequence: 1,
  channel_type: "web",
  interaction_type: "browse",
  importance: "high",
  current_experience_quality: "good",
  pain_level: "minor"
})

// Link to canvas item (e.g., "Fast Checkout" value proposition)
await createJourneyMapping({
  source_type: "touchpoint",
  source_id: touchpoint1.id,
  target_type: "canvas_item",
  target_id: "canvas-item-uuid",
  mapping_type: "delivers_gain"
})
```

### Use Case 2: Service Blueprint for Customer Support

```typescript
// Create blueprint
const blueprint = await createServiceBlueprint({
  name: "Live Chat Support",
  blueprint_type: "service",
  user_journey_id: "journey-uuid"
})

// Add layers
const customerLayer = await createBlueprintLayer({
  service_blueprint_id: blueprint.id,
  name: "Customer Actions",
  layer_type: "customer_actions",
  sequence: 1,
  visibility_to_customer: true
})

const frontstageLayer = await createBlueprintLayer({
  service_blueprint_id: blueprint.id,
  name: "Support Agent",
  layer_type: "frontstage",
  sequence: 2,
  visibility_to_customer: true
})

const backstageLayer = await createBlueprintLayer({
  service_blueprint_id: blueprint.id,
  name: "Knowledge Base System",
  layer_type: "backstage",
  sequence: 3,
  visibility_to_customer: false
})

// Add activities
const customerActivity = await createBlueprintActivity({
  blueprint_layer_id: customerLayer.id,
  name: "Initiate chat",
  sequence: 1,
  actor: "Customer"
})

const agentActivity = await createBlueprintActivity({
  blueprint_layer_id: frontstageLayer.id,
  name: "Greet customer, gather issue",
  sequence: 1,
  actor: "Support Agent",
  customer_value_delivery: "high"
})

// Link activities
await createActivityLink({
  from_activity_id: customerActivity.id,
  to_activity_id: agentActivity.id,
  link_type: "triggers"
})
```

## Open Questions & Decisions Needed

1. **CanvasItems Extension**: Should touchpoints be CanvasItems themselves? Or keep separate?
   - **Recommendation**: Keep separate - touchpoints are temporal/sequential, canvas items are abstract

2. **Journey Stage Templates**: Create predefined stage templates (e.g., "Awareness-Consideration-Purchase")?
   - **Recommendation**: Yes, add to metadata with common patterns

3. **Emotion Tracking**: Use structured emotion taxonomy or free text?
   - **Recommendation**: Start with free text, evolve to taxonomy based on usage

4. **Blueprint Visualization**: Build custom or use library like React Flow?
   - **Recommendation**: React Flow for flows, custom SVG for blueprints (layered swimlanes)

5. **AI Assistance**: Generate journey stages from customer profile? Suggest touchpoints?
   - **Recommendation**: Phase 6 - yes, similar to canvas AI assistance

## Success Metrics

- **Adoption**: 5+ journeys mapped per active project
- **Integration**: 80%+ of touchpoints linked to canvas items
- **Validation**: 60%+ of journey assumptions tested with evidence
- **Usage**: Canvas view used for 40%+ of journey/blueprint sessions
- **Insight**: Cross-references between journeys and value props used in planning

## References

- Existing canvas system: `/docs/database/strategyzer-canvas-schema.md`
- Canvas items spec: `/docs/database/canvas-items-spec.md`
- View system: `/components/admin/admin-data-view.tsx`
- Experience systems research: `/docs/studio/experience-systems/exploration/`

---

**Next Steps**: Review this spec, gather feedback, prioritize phases, begin Phase 1 implementation.
