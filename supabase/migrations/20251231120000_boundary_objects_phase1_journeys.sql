-- Boundary Objects Phase 1: User Journeys
-- Customer experience mapping with stages and touchpoints
-- Part of the three-layer cascade: Journey → Blueprint → Story Map
-- Migration created: 2025-12-31

-- ============================================================================
-- 1. USER_JOURNEYS TABLE
-- ============================================================================

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

-- Indexes
CREATE INDEX idx_user_journeys_project ON user_journeys(studio_project_id);
CREATE INDEX idx_user_journeys_customer ON user_journeys(customer_profile_id);
CREATE INDEX idx_user_journeys_hypothesis ON user_journeys(hypothesis_id);
CREATE INDEX idx_user_journeys_status ON user_journeys(status);
CREATE INDEX idx_user_journeys_validation ON user_journeys(validation_status);
CREATE INDEX idx_user_journeys_version_lineage ON user_journeys(parent_version_id);

-- Trigger
CREATE TRIGGER update_user_journeys_updated_at
  BEFORE UPDATE ON user_journeys
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 2. JOURNEY_STAGES TABLE
-- ============================================================================

CREATE TABLE journey_stages (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_journey_id UUID NOT NULL REFERENCES user_journeys(id) ON DELETE CASCADE,

  -- Stage Info
  name TEXT NOT NULL, -- "Awareness", "Research", "Purchase", "Onboarding"
  description TEXT,
  sequence INTEGER NOT NULL, -- Order in journey

  -- Stage Details
  stage_type TEXT CHECK (
    stage_type IN ('pre_purchase', 'purchase', 'post_purchase', 'ongoing')
  ),

  -- Customer State
  customer_emotion TEXT, -- "frustrated", "excited", "confused", "confident"
  customer_mindset TEXT, -- What they're thinking
  customer_goal TEXT, -- What they want to accomplish

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

-- Indexes
CREATE INDEX idx_journey_stages_journey ON journey_stages(user_journey_id);
CREATE INDEX idx_journey_stages_sequence ON journey_stages(user_journey_id, sequence);
CREATE INDEX idx_journey_stages_type ON journey_stages(stage_type) WHERE stage_type IS NOT NULL;
CREATE INDEX idx_journey_stages_validation ON journey_stages(validation_status);

-- Trigger
CREATE TRIGGER update_journey_stages_updated_at
  BEFORE UPDATE ON journey_stages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 3. TOUCHPOINTS TABLE
-- ============================================================================

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

  -- Experience Metrics (for table sorting/filtering)
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

-- Indexes
CREATE INDEX idx_touchpoints_stage ON touchpoints(journey_stage_id);
CREATE INDEX idx_touchpoints_sequence ON touchpoints(journey_stage_id, sequence);
CREATE INDEX idx_touchpoints_channel ON touchpoints(channel_type) WHERE channel_type IS NOT NULL;
CREATE INDEX idx_touchpoints_interaction ON touchpoints(interaction_type) WHERE interaction_type IS NOT NULL;
CREATE INDEX idx_touchpoints_importance ON touchpoints(importance) WHERE importance IS NOT NULL;
CREATE INDEX idx_touchpoints_pain ON touchpoints(pain_level) WHERE pain_level IS NOT NULL;
CREATE INDEX idx_touchpoints_quality ON touchpoints(current_experience_quality) WHERE current_experience_quality IS NOT NULL;
CREATE INDEX idx_touchpoints_validation ON touchpoints(validation_status);

-- Trigger
CREATE TRIGGER update_touchpoints_updated_at
  BEFORE UPDATE ON touchpoints
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 4. TOUCHPOINT_MAPPINGS TABLE
-- ============================================================================

CREATE TABLE touchpoint_mappings (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Source (touchpoint)
  touchpoint_id UUID NOT NULL REFERENCES touchpoints(id) ON DELETE CASCADE,

  -- Target (canvas element) - polymorphic reference
  target_type TEXT NOT NULL CHECK (
    target_type IN ('canvas_item', 'customer_profile', 'value_proposition_canvas')
  ),
  target_id UUID NOT NULL,

  -- Mapping Details
  mapping_type TEXT NOT NULL CHECK (
    mapping_type IN (
      'addresses_job',       -- Touchpoint helps customer do a job
      'triggers_pain',       -- Touchpoint causes customer pain
      'delivers_gain',       -- Touchpoint delivers customer gain
      'tests_assumption',    -- Touchpoint tests an assumption
      'delivers_value_prop'  -- Touchpoint delivers value proposition
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
  CONSTRAINT unique_touchpoint_mapping UNIQUE (touchpoint_id, target_type, target_id, mapping_type)
);

-- Indexes
CREATE INDEX idx_touchpoint_mappings_touchpoint ON touchpoint_mappings(touchpoint_id);
CREATE INDEX idx_touchpoint_mappings_target ON touchpoint_mappings(target_type, target_id);
CREATE INDEX idx_touchpoint_mappings_type ON touchpoint_mappings(mapping_type);
CREATE INDEX idx_touchpoint_mappings_validated ON touchpoint_mappings(validated);

-- Trigger
CREATE TRIGGER update_touchpoint_mappings_updated_at
  BEFORE UPDATE ON touchpoint_mappings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 5. TOUCHPOINT_ASSUMPTIONS TABLE (Junction)
-- ============================================================================

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

-- Indexes
CREATE INDEX idx_touchpoint_assumptions_touchpoint ON touchpoint_assumptions(touchpoint_id);
CREATE INDEX idx_touchpoint_assumptions_assumption ON touchpoint_assumptions(assumption_id);
CREATE INDEX idx_touchpoint_assumptions_type ON touchpoint_assumptions(relationship_type) WHERE relationship_type IS NOT NULL;

-- ============================================================================
-- 6. TOUCHPOINT_EVIDENCE TABLE
-- ============================================================================

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

-- Indexes
CREATE INDEX idx_touchpoint_evidence_touchpoint ON touchpoint_evidence(touchpoint_id);
CREATE INDEX idx_touchpoint_evidence_type ON touchpoint_evidence(evidence_type);
CREATE INDEX idx_touchpoint_evidence_supports ON touchpoint_evidence(supports_design) WHERE supports_design IS NOT NULL;
CREATE INDEX idx_touchpoint_evidence_confidence ON touchpoint_evidence(confidence) WHERE confidence IS NOT NULL;

-- Trigger
CREATE TRIGGER update_touchpoint_evidence_updated_at
  BEFORE UPDATE ON touchpoint_evidence
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE user_journeys IS 'Customer experience maps showing how customers progress through stages';
COMMENT ON TABLE journey_stages IS 'Phases in a user journey (awareness, consideration, purchase, usage, etc.)';
COMMENT ON TABLE touchpoints IS 'Individual interaction moments in a journey stage';
COMMENT ON TABLE touchpoint_mappings IS 'Links touchpoints to canvas items (jobs, pains, gains, value propositions)';
COMMENT ON TABLE touchpoint_assumptions IS 'Links touchpoints to assumptions for validation';
COMMENT ON TABLE touchpoint_evidence IS 'Evidence collected about touchpoint experiences';

COMMENT ON COLUMN user_journeys.journey_type IS 'Scope: end_to_end (full journey), sub_journey (part of larger journey), micro_moment (single interaction)';
COMMENT ON COLUMN journey_stages.stage_type IS 'Customer lifecycle phase: pre_purchase, purchase, post_purchase, ongoing';
COMMENT ON COLUMN touchpoints.pain_level IS 'Customer pain experienced at this touchpoint (higher = more urgent to fix)';
COMMENT ON COLUMN touchpoints.delight_potential IS 'Opportunity to create positive emotion (higher = more impactful)';
COMMENT ON COLUMN touchpoint_mappings.mapping_type IS 'How touchpoint relates to canvas element (addresses_job, triggers_pain, delivers_gain, etc.)';
