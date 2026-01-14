-- Backfill entity_links from Studio Project Direct FKs
-- Keeps FKs in place, adds entity_links for bidirectional queries
-- Part of Entity Relationship Simplification

BEGIN;

-- ============================================================================
-- BACKFILL ENTITY_LINKS FROM DIRECT FKs
-- ============================================================================

-- Log entries → studio_projects
INSERT INTO entity_links (source_type, source_id, target_type, target_id, link_type)
SELECT 'log_entry', id, 'studio_project', studio_project_id, 'documents'
FROM log_entries
WHERE studio_project_id IS NOT NULL
ON CONFLICT (source_type, source_id, target_type, target_id, link_type) DO NOTHING;

-- Log entries → studio_experiments
INSERT INTO entity_links (source_type, source_id, target_type, target_id, link_type)
SELECT 'log_entry', id, 'studio_experiment', studio_experiment_id, 'documents'
FROM log_entries
WHERE studio_experiment_id IS NOT NULL
ON CONFLICT (source_type, source_id, target_type, target_id, link_type) DO NOTHING;

-- Specimens → studio_projects
INSERT INTO entity_links (source_type, source_id, target_type, target_id, link_type)
SELECT 'specimen', id, 'studio_project', studio_project_id, 'demonstrates'
FROM specimens
WHERE studio_project_id IS NOT NULL
ON CONFLICT (source_type, source_id, target_type, target_id, link_type) DO NOTHING;

-- ============================================================================
-- VALIDATION
-- ============================================================================

-- Validate that we backfilled the expected number of records
DO $$
DECLARE
  expected_log_project_links INT;
  actual_log_project_links INT;
  expected_log_experiment_links INT;
  actual_log_experiment_links INT;
  expected_specimen_links INT;
  actual_specimen_links INT;
BEGIN
  -- Count expected links from FKs
  SELECT COUNT(*) INTO expected_log_project_links
  FROM log_entries WHERE studio_project_id IS NOT NULL;

  SELECT COUNT(*) INTO expected_log_experiment_links
  FROM log_entries WHERE studio_experiment_id IS NOT NULL;

  SELECT COUNT(*) INTO expected_specimen_links
  FROM specimens WHERE studio_project_id IS NOT NULL;

  -- Count actual links created
  SELECT COUNT(*) INTO actual_log_project_links
  FROM entity_links
  WHERE source_type = 'log_entry'
    AND target_type = 'studio_project'
    AND link_type = 'documents';

  SELECT COUNT(*) INTO actual_log_experiment_links
  FROM entity_links
  WHERE source_type = 'log_entry'
    AND target_type = 'studio_experiment'
    AND link_type = 'documents';

  SELECT COUNT(*) INTO actual_specimen_links
  FROM entity_links
  WHERE source_type = 'specimen'
    AND target_type = 'studio_project'
    AND link_type = 'demonstrates';

  -- Validate counts match
  IF actual_log_project_links < expected_log_project_links THEN
    RAISE EXCEPTION 'Backfill validation failed: expected % log->project links, got %',
      expected_log_project_links, actual_log_project_links;
  END IF;

  IF actual_log_experiment_links < expected_log_experiment_links THEN
    RAISE EXCEPTION 'Backfill validation failed: expected % log->experiment links, got %',
      expected_log_experiment_links, actual_log_experiment_links;
  END IF;

  IF actual_specimen_links < expected_specimen_links THEN
    RAISE EXCEPTION 'Backfill validation failed: expected % specimen->project links, got %',
      expected_specimen_links, actual_specimen_links;
  END IF;

  RAISE NOTICE 'Backfill validation passed: % log->project, % log->experiment, % specimen->project links created',
    actual_log_project_links, actual_log_experiment_links, actual_specimen_links;
END $$;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE entity_links IS 'Universal relationship table. Direct FKs remain for fast queries; entity_links enables bidirectional queries, richer relationships, and studio project cross-references.';

COMMIT;
