-- Orphan Cleanup Triggers
-- Cleans up entity_links and evidence when parent entities are deleted
-- Part of Entity Relationship Simplification (OJI-5)
-- Migration created: 2026-01-02

-- ============================================================================
-- 1. CLEANUP FUNCTIONS
-- ============================================================================

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

-- ============================================================================
-- 2. TRIGGERS FOR EACH ENTITY TYPE
-- ============================================================================

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

-- Value Proposition Canvases (value_maps table)
CREATE TRIGGER cleanup_vpc_links
  BEFORE DELETE ON value_maps
  FOR EACH ROW EXECUTE FUNCTION cleanup_entity_links('value_proposition_canvas');

CREATE TRIGGER cleanup_vpc_evidence
  BEFORE DELETE ON value_maps
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

-- Ventures (portfolio ventures, formerly projects)
CREATE TRIGGER cleanup_venture_links
  BEFORE DELETE ON ventures
  FOR EACH ROW EXECUTE FUNCTION cleanup_entity_links('venture');

-- Studio Projects
CREATE TRIGGER cleanup_studio_project_links
  BEFORE DELETE ON studio_projects
  FOR EACH ROW EXECUTE FUNCTION cleanup_entity_links('studio_project');

-- ============================================================================
-- 3. COMMENTS
-- ============================================================================

COMMENT ON FUNCTION cleanup_entity_links() IS 'Cleans up entity_links when a source or target entity is deleted. Takes entity_type as argument.';
COMMENT ON FUNCTION cleanup_entity_evidence() IS 'Cleans up evidence when the parent entity is deleted. Takes entity_type as argument.';
