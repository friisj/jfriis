-- Expand Entity Links for Studio Project Relationships
-- Adds support for studio project cross-references and strategic framework links

-- ============================================================================
-- UPDATE COMMENTS WITH EXPANDED LINK TYPES
-- ============================================================================

COMMENT ON COLUMN entity_links.source_type IS 'Entity type of the source: project, log_entry, backlog_item, specimen, studio_project, studio_hypothesis, studio_experiment, business_model_canvas, customer_profile, value_proposition_canvas, canvas_item, user_journey, journey_stage, touchpoint, assumption, service_blueprint, story_map';

COMMENT ON COLUMN entity_links.target_type IS 'Entity type of the target (same options as source_type)';

COMMENT ON COLUMN entity_links.link_type IS 'Relationship type:
  - Generic: related, references, contains, part_of
  - Evolution: evolved_from, inspired_by, derived_from, spin_off
  - Validation: validates, tests, supports, contradicts
  - Strategic: explores, improves, prototypes, informs
  - Documentation: documents, demonstrates
  - Jobs-to-be-Done: addresses_job, relieves_pain, creates_gain';

-- ============================================================================
-- ADD INDEXES FOR STUDIO PROJECT RELATIONSHIP QUERIES
-- ============================================================================

-- For forward relationships (studio_project is source)
-- Supports: WHERE source_type = 'studio_project' AND source_id = ?
CREATE INDEX IF NOT EXISTS idx_entity_links_studio_project_forward
ON entity_links (source_type, source_id, link_type)
WHERE source_type = 'studio_project';

-- For reverse relationships (studio_project is target)
-- Supports: WHERE target_type = 'studio_project' AND target_id = ?
CREATE INDEX IF NOT EXISTS idx_entity_links_studio_project_reverse
ON entity_links (target_type, target_id, link_type)
WHERE target_type = 'studio_project';

-- For link_type filtering across all relationships
-- Supports: WHERE link_type = ?
CREATE INDEX IF NOT EXISTS idx_entity_links_link_type
ON entity_links (link_type);

-- For metadata JSONB queries (if querying metadata fields)
-- Supports: WHERE metadata @> '{"key": "value"}'
CREATE INDEX IF NOT EXISTS idx_entity_links_metadata_gin
ON entity_links USING GIN (metadata);

COMMENT ON INDEX idx_entity_links_studio_project_forward IS 'Optimizes queries for studio project outbound relationships';
COMMENT ON INDEX idx_entity_links_studio_project_reverse IS 'Optimizes queries for studio project inbound relationships';
COMMENT ON INDEX idx_entity_links_link_type IS 'Optimizes filtering by relationship type';
COMMENT ON INDEX idx_entity_links_metadata_gin IS 'Enables efficient JSON queries on relationship metadata';

-- ============================================================================
-- CREATE HELPER VIEW FOR STUDIO PROJECT RELATIONSHIPS
-- ============================================================================

CREATE OR REPLACE VIEW studio_project_relationships AS
SELECT
  el.id,
  el.source_type,
  el.source_id,
  el.target_type,
  el.target_id,
  el.link_type,
  el.strength,
  el.notes,
  el.metadata,
  el.created_at,

  -- For studio_project → studio_project links
  CASE
    WHEN el.source_type = 'studio_project' AND el.target_type = 'studio_project' THEN 'project_cross_reference'
    WHEN el.source_type = 'studio_project' THEN 'project_outbound'
    WHEN el.target_type = 'studio_project' THEN 'project_inbound'
    ELSE 'other'
  END as relationship_category,

  -- Source project info
  sp_source.name as source_project_name,
  sp_source.slug as source_project_slug,

  -- Target project info
  sp_target.name as target_project_name,
  sp_target.slug as target_project_slug

FROM entity_links el
LEFT JOIN studio_projects sp_source
  ON el.source_type = 'studio_project' AND el.source_id = sp_source.id
LEFT JOIN studio_projects sp_target
  ON el.target_type = 'studio_project' AND el.target_id = sp_target.id

WHERE el.source_type = 'studio_project'
   OR el.target_type = 'studio_project';

COMMENT ON VIEW studio_project_relationships IS 'Helper view for querying studio project relationships in both directions with project names';

-- ============================================================================
-- ROW LEVEL SECURITY DOCUMENTATION
-- ============================================================================

-- RLS is ENABLED on entity_links table (see migration 20260102200001)
-- Current policies:
--   - Public READ access: All users can SELECT entity_links
--   - Admin WRITE access: Only admin users can INSERT/UPDATE/DELETE
--
-- Views inherit RLS from base tables:
--   - studio_project_relationships inherits entity_links policies
--   - Public users can query this view for any project relationships
--   - Only admins can modify relationships via entity_links table
--
-- Note: Current policy allows public to read ALL entity_links.
-- Consider adding entity-specific policies in future for:
--   - Hide links to draft/private studio_projects
--   - Hide links to unpublished log_entries
--   - Hide links to internal specimens
--
-- To tighten security later, update entity_links SELECT policy to check
-- visibility of both source and target entities before allowing read access.
