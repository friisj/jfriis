-- Phase 3: Service Blueprints
--
-- Creates tables for service blueprint design layer:
-- - service_blueprints: Service delivery design documents
-- - blueprint_steps: Time-sequenced steps with layer information
--
-- Part of Boundary Objects Entity System (see docs/database/boundary-objects-entity-system-spec.md)

-- ============================================================================
-- SERVICE BLUEPRINTS TABLE
-- ============================================================================

CREATE TABLE service_blueprints (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,

  -- Context
  studio_project_id UUID REFERENCES studio_projects(id) ON DELETE SET NULL,
  hypothesis_id UUID REFERENCES studio_hypotheses(id) ON DELETE SET NULL,

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

-- Indexes
CREATE INDEX idx_service_blueprints_project ON service_blueprints(studio_project_id);
CREATE INDEX idx_service_blueprints_status ON service_blueprints(status);
CREATE INDEX idx_service_blueprints_hypothesis ON service_blueprints(hypothesis_id);

-- Updated_at trigger
CREATE TRIGGER update_service_blueprints_updated_at
  BEFORE UPDATE ON service_blueprints
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE service_blueprints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service blueprints are viewable by everyone"
  ON service_blueprints FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create service blueprints"
  ON service_blueprints FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update service blueprints"
  ON service_blueprints FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete service blueprints"
  ON service_blueprints FOR DELETE
  TO authenticated
  USING (true);

-- ============================================================================
-- BLUEPRINT STEPS TABLE
-- ============================================================================

CREATE TABLE blueprint_steps (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_blueprint_id UUID NOT NULL REFERENCES service_blueprints(id) ON DELETE CASCADE,

  -- Step Info
  name TEXT NOT NULL,
  description TEXT,
  sequence INTEGER NOT NULL,

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

-- Indexes
CREATE INDEX idx_blueprint_steps_blueprint ON blueprint_steps(service_blueprint_id);
CREATE INDEX idx_blueprint_steps_sequence ON blueprint_steps(service_blueprint_id, sequence);

-- Updated_at trigger
CREATE TRIGGER update_blueprint_steps_updated_at
  BEFORE UPDATE ON blueprint_steps
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE blueprint_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Blueprint steps are viewable by everyone"
  ON blueprint_steps FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create blueprint steps"
  ON blueprint_steps FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update blueprint steps"
  ON blueprint_steps FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete blueprint steps"
  ON blueprint_steps FOR DELETE
  TO authenticated
  USING (true);

-- ============================================================================
-- ORPHAN CLEANUP TRIGGERS
-- ============================================================================

-- Cleanup entity_links when service_blueprints are deleted
CREATE OR REPLACE FUNCTION cleanup_service_blueprint_entity_links()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM entity_links
  WHERE (source_type = 'service_blueprint' AND source_id = OLD.id)
     OR (target_type = 'service_blueprint' AND target_id = OLD.id);
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER cleanup_service_blueprint_links
  AFTER DELETE ON service_blueprints
  FOR EACH ROW
  EXECUTE FUNCTION cleanup_service_blueprint_entity_links();

-- Cleanup entity_links when blueprint_steps are deleted
CREATE OR REPLACE FUNCTION cleanup_blueprint_step_entity_links()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM entity_links
  WHERE (source_type = 'blueprint_step' AND source_id = OLD.id)
     OR (target_type = 'blueprint_step' AND target_id = OLD.id);
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER cleanup_blueprint_step_links
  AFTER DELETE ON blueprint_steps
  FOR EACH ROW
  EXECUTE FUNCTION cleanup_blueprint_step_entity_links();

-- ============================================================================
-- UPDATE ENTITY_TYPE_TABLE_MAP
-- ============================================================================

COMMENT ON TABLE service_blueprints IS 'Service delivery design documents. Links to journeys via entity_links.';
COMMENT ON TABLE blueprint_steps IS 'Time-sequenced steps in a service blueprint with layer information.';
