-- Migration: FK to entity_links Sync Triggers
-- Purpose: Automatically sync FK relationships to entity_links table
--
-- This ensures that when log_entries or specimens are created/updated with
-- studio_project_id or studio_experiment_id, corresponding entity_links are
-- automatically created/updated/deleted.
--
-- Architecture Decision:
-- - FKs remain the primary source for fast unidirectional queries
-- - entity_links becomes reliable for bidirectional and cross-entity queries
-- - Triggers keep them in sync automatically

-- ============================================================================
-- HELPER FUNCTION: Upsert entity link
-- ============================================================================

CREATE OR REPLACE FUNCTION upsert_entity_link(
  p_source_type TEXT,
  p_source_id UUID,
  p_target_type TEXT,
  p_target_id UUID,
  p_link_type TEXT
) RETURNS VOID AS $$
BEGIN
  INSERT INTO entity_links (source_type, source_id, target_type, target_id, link_type)
  VALUES (p_source_type, p_source_id, p_target_type, p_target_id, p_link_type)
  ON CONFLICT (source_type, source_id, target_type, target_id, link_type) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- HELPER FUNCTION: Remove entity link
-- ============================================================================

CREATE OR REPLACE FUNCTION remove_entity_link(
  p_source_type TEXT,
  p_source_id UUID,
  p_target_type TEXT,
  p_target_id UUID,
  p_link_type TEXT
) RETURNS VOID AS $$
BEGIN
  DELETE FROM entity_links
  WHERE source_type = p_source_type
    AND source_id = p_source_id
    AND target_type = p_target_type
    AND target_id = p_target_id
    AND link_type = p_link_type;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGER: log_entries → entity_links (studio_project_id)
-- ============================================================================

CREATE OR REPLACE FUNCTION sync_log_entry_project_link()
RETURNS TRIGGER AS $$
BEGIN
  -- Handle INSERT
  IF TG_OP = 'INSERT' THEN
    IF NEW.studio_project_id IS NOT NULL THEN
      PERFORM upsert_entity_link('log_entry', NEW.id, 'studio_project', NEW.studio_project_id, 'documents');
    END IF;
    RETURN NEW;
  END IF;

  -- Handle UPDATE
  IF TG_OP = 'UPDATE' THEN
    -- Remove old link if project changed
    IF OLD.studio_project_id IS DISTINCT FROM NEW.studio_project_id THEN
      IF OLD.studio_project_id IS NOT NULL THEN
        PERFORM remove_entity_link('log_entry', NEW.id, 'studio_project', OLD.studio_project_id, 'documents');
      END IF;
      IF NEW.studio_project_id IS NOT NULL THEN
        PERFORM upsert_entity_link('log_entry', NEW.id, 'studio_project', NEW.studio_project_id, 'documents');
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  -- Handle DELETE
  IF TG_OP = 'DELETE' THEN
    IF OLD.studio_project_id IS NOT NULL THEN
      PERFORM remove_entity_link('log_entry', OLD.id, 'studio_project', OLD.studio_project_id, 'documents');
    END IF;
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS log_entry_project_link_sync ON log_entries;
CREATE TRIGGER log_entry_project_link_sync
  AFTER INSERT OR UPDATE OR DELETE ON log_entries
  FOR EACH ROW EXECUTE FUNCTION sync_log_entry_project_link();

-- ============================================================================
-- TRIGGER: log_entries → entity_links (studio_experiment_id)
-- ============================================================================

CREATE OR REPLACE FUNCTION sync_log_entry_experiment_link()
RETURNS TRIGGER AS $$
BEGIN
  -- Handle INSERT
  IF TG_OP = 'INSERT' THEN
    IF NEW.studio_experiment_id IS NOT NULL THEN
      PERFORM upsert_entity_link('log_entry', NEW.id, 'studio_experiment', NEW.studio_experiment_id, 'documents');
    END IF;
    RETURN NEW;
  END IF;

  -- Handle UPDATE
  IF TG_OP = 'UPDATE' THEN
    IF OLD.studio_experiment_id IS DISTINCT FROM NEW.studio_experiment_id THEN
      IF OLD.studio_experiment_id IS NOT NULL THEN
        PERFORM remove_entity_link('log_entry', NEW.id, 'studio_experiment', OLD.studio_experiment_id, 'documents');
      END IF;
      IF NEW.studio_experiment_id IS NOT NULL THEN
        PERFORM upsert_entity_link('log_entry', NEW.id, 'studio_experiment', NEW.studio_experiment_id, 'documents');
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  -- Handle DELETE
  IF TG_OP = 'DELETE' THEN
    IF OLD.studio_experiment_id IS NOT NULL THEN
      PERFORM remove_entity_link('log_entry', OLD.id, 'studio_experiment', OLD.studio_experiment_id, 'documents');
    END IF;
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS log_entry_experiment_link_sync ON log_entries;
CREATE TRIGGER log_entry_experiment_link_sync
  AFTER INSERT OR UPDATE OR DELETE ON log_entries
  FOR EACH ROW EXECUTE FUNCTION sync_log_entry_experiment_link();

-- ============================================================================
-- TRIGGER: specimens → entity_links (studio_project_id)
-- ============================================================================

CREATE OR REPLACE FUNCTION sync_specimen_project_link()
RETURNS TRIGGER AS $$
BEGIN
  -- Handle INSERT
  IF TG_OP = 'INSERT' THEN
    IF NEW.studio_project_id IS NOT NULL THEN
      PERFORM upsert_entity_link('specimen', NEW.id, 'studio_project', NEW.studio_project_id, 'demonstrates');
    END IF;
    RETURN NEW;
  END IF;

  -- Handle UPDATE
  IF TG_OP = 'UPDATE' THEN
    IF OLD.studio_project_id IS DISTINCT FROM NEW.studio_project_id THEN
      IF OLD.studio_project_id IS NOT NULL THEN
        PERFORM remove_entity_link('specimen', NEW.id, 'studio_project', OLD.studio_project_id, 'demonstrates');
      END IF;
      IF NEW.studio_project_id IS NOT NULL THEN
        PERFORM upsert_entity_link('specimen', NEW.id, 'studio_project', NEW.studio_project_id, 'demonstrates');
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  -- Handle DELETE
  IF TG_OP = 'DELETE' THEN
    IF OLD.studio_project_id IS NOT NULL THEN
      PERFORM remove_entity_link('specimen', OLD.id, 'studio_project', OLD.studio_project_id, 'demonstrates');
    END IF;
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS specimen_project_link_sync ON specimens;
CREATE TRIGGER specimen_project_link_sync
  AFTER INSERT OR UPDATE OR DELETE ON specimens
  FOR EACH ROW EXECUTE FUNCTION sync_specimen_project_link();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON FUNCTION upsert_entity_link IS 'Helper to create entity_link if not exists';
COMMENT ON FUNCTION remove_entity_link IS 'Helper to remove entity_link';
COMMENT ON FUNCTION sync_log_entry_project_link IS 'Syncs log_entries.studio_project_id to entity_links';
COMMENT ON FUNCTION sync_log_entry_experiment_link IS 'Syncs log_entries.studio_experiment_id to entity_links';
COMMENT ON FUNCTION sync_specimen_project_link IS 'Syncs specimens.studio_project_id to entity_links';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
  trigger_count INT;
BEGIN
  SELECT COUNT(*) INTO trigger_count
  FROM pg_trigger t
  JOIN pg_class c ON t.tgrelid = c.oid
  WHERE t.tgname IN ('log_entry_project_link_sync', 'log_entry_experiment_link_sync', 'specimen_project_link_sync')
    AND NOT t.tgisinternal;

  IF trigger_count != 3 THEN
    RAISE EXCEPTION 'Expected 3 triggers, found %', trigger_count;
  END IF;

  RAISE NOTICE 'FK → entity_links sync triggers created successfully (% triggers)', trigger_count;
END $$;
