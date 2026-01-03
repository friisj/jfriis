-- Critical Fixes Phase 2
-- Addresses issues from technical review
-- Migration created: 2026-01-02

-- ============================================================================
-- 1. CRITICAL-6: Add missing orphan cleanup trigger for gallery_sequences
-- ============================================================================

CREATE TRIGGER cleanup_gallery_sequence_links
  BEFORE DELETE ON gallery_sequences
  FOR EACH ROW EXECUTE FUNCTION cleanup_entity_links('gallery_sequence');

-- ============================================================================
-- 2. CRITICAL-4: Strengthen RLS policies with auth.uid() null checks
-- ============================================================================

-- Evidence table policies - drop and recreate with stronger checks
DROP POLICY IF EXISTS "Authenticated insert access to evidence" ON evidence;
DROP POLICY IF EXISTS "Authenticated update access to evidence" ON evidence;
DROP POLICY IF EXISTS "Authenticated delete access to evidence" ON evidence;
DROP POLICY IF EXISTS "Public read access to evidence" ON evidence;

CREATE POLICY "Public read access to evidence"
  ON evidence FOR SELECT
  USING (true);

CREATE POLICY "Authenticated insert access to evidence"
  ON evidence FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated update access to evidence"
  ON evidence FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated delete access to evidence"
  ON evidence FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- Entity links table policies - drop and recreate with stronger checks
DROP POLICY IF EXISTS "Authenticated insert access to entity_links" ON entity_links;
DROP POLICY IF EXISTS "Authenticated update access to entity_links" ON entity_links;
DROP POLICY IF EXISTS "Authenticated delete access to entity_links" ON entity_links;
DROP POLICY IF EXISTS "Public read access to entity_links" ON entity_links;

CREATE POLICY "Public read access to entity_links"
  ON entity_links FOR SELECT
  USING (true);

CREATE POLICY "Authenticated insert access to entity_links"
  ON entity_links FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated update access to entity_links"
  ON entity_links FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated delete access to entity_links"
  ON entity_links FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- ============================================================================
-- 3. CRITICAL-5: Add CHECK constraints on entity_type columns
-- ============================================================================

-- Evidence entity_type constraint
ALTER TABLE evidence DROP CONSTRAINT IF EXISTS evidence_entity_type_valid;
ALTER TABLE evidence ADD CONSTRAINT evidence_entity_type_valid
  CHECK (entity_type IN (
    'assumption',
    'canvas_item',
    'touchpoint',
    'hypothesis',
    'experiment',
    'user_journey',
    'journey_stage',
    'customer_profile',
    'value_proposition_canvas',
    'value_map',
    'business_model_canvas'
  ));

-- Entity links source_type constraint
ALTER TABLE entity_links DROP CONSTRAINT IF EXISTS entity_links_source_type_valid;
ALTER TABLE entity_links ADD CONSTRAINT entity_links_source_type_valid
  CHECK (source_type IN (
    'project',
    'log_entry',
    'backlog_item',
    'specimen',
    'studio_project',
    'hypothesis',
    'experiment',
    'business_model_canvas',
    'customer_profile',
    'value_proposition_canvas',
    'value_map',
    'canvas_item',
    'user_journey',
    'journey_stage',
    'touchpoint',
    'assumption',
    'gallery_sequence'
  ));

-- Entity links target_type constraint (same values)
ALTER TABLE entity_links DROP CONSTRAINT IF EXISTS entity_links_target_type_valid;
ALTER TABLE entity_links ADD CONSTRAINT entity_links_target_type_valid
  CHECK (target_type IN (
    'project',
    'log_entry',
    'backlog_item',
    'specimen',
    'studio_project',
    'hypothesis',
    'experiment',
    'business_model_canvas',
    'customer_profile',
    'value_proposition_canvas',
    'value_map',
    'canvas_item',
    'user_journey',
    'journey_stage',
    'touchpoint',
    'assumption',
    'gallery_sequence'
  ));

-- Entity links link_type constraint
ALTER TABLE entity_links DROP CONSTRAINT IF EXISTS entity_links_link_type_valid;
ALTER TABLE entity_links ADD CONSTRAINT entity_links_link_type_valid
  CHECK (link_type IN (
    'related',
    'references',
    'evolved_from',
    'inspired_by',
    'derived_from',
    'validates',
    'tests',
    'supports',
    'contradicts',
    'contains',
    'part_of',
    'addresses_job',
    'relieves_pain',
    'creates_gain',
    'documents',
    'demonstrates'
  ));

-- ============================================================================
-- 4. Comments
-- ============================================================================

COMMENT ON CONSTRAINT evidence_entity_type_valid ON evidence IS
  'Ensures entity_type is a valid entity type that can have evidence attached';

COMMENT ON CONSTRAINT entity_links_source_type_valid ON entity_links IS
  'Ensures source_type is a valid linkable entity type';

COMMENT ON CONSTRAINT entity_links_target_type_valid ON entity_links IS
  'Ensures target_type is a valid linkable entity type';

COMMENT ON CONSTRAINT entity_links_link_type_valid ON entity_links IS
  'Ensures link_type is a valid relationship type';

COMMENT ON TRIGGER cleanup_gallery_sequence_links ON gallery_sequences IS
  'Cleanup entity_links when a gallery_sequence is deleted';
