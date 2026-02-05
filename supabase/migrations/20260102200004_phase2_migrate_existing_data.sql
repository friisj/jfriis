-- Phase 2: Migrate Existing Data to Universal Tables
-- Part of Entity Relationship Simplification (OJI-5)
-- Migration created: 2026-01-02

-- ============================================================================
-- 1. MIGRATE EVIDENCE DATA
-- ============================================================================
-- Note: All evidence tables are currently empty, but this migration will
-- handle any data that exists and establish the pattern for future use.

-- Migrate assumption_evidence
-- Columns: assumption_id, evidence_type, title, summary, url, confidence, supports_assumption, collected_at, metadata
INSERT INTO evidence (
  entity_type, entity_id, evidence_type, title, content, source_url,
  confidence, supports, collected_at, tags, metadata, created_at, updated_at
)
SELECT
  'assumption',
  ae.assumption_id,
  ae.evidence_type,
  ae.title,
  ae.summary,  -- assumption_evidence uses 'summary'
  ae.url,      -- assumption_evidence uses 'url'
  CASE
    WHEN ae.confidence = 'high' THEN 0.9
    WHEN ae.confidence = 'medium' THEN 0.6
    WHEN ae.confidence = 'low' THEN 0.3
    ELSE NULL
  END::decimal(3,2),
  ae.supports_assumption,  -- assumption_evidence uses 'supports_assumption'
  ae.collected_at,
  '{}',
  COALESCE(ae.metadata, '{}'),
  ae.created_at,
  ae.updated_at
FROM assumption_evidence ae
WHERE EXISTS (SELECT 1 FROM assumptions a WHERE a.id = ae.assumption_id);

-- Migrate canvas_item_evidence
-- Columns: canvas_item_id, evidence_type, title, summary, url, confidence, supports_item, collected_at, metadata
INSERT INTO evidence (
  entity_type, entity_id, evidence_type, title, content, source_url,
  confidence, supports, collected_at, tags, metadata, created_at, updated_at
)
SELECT
  'canvas_item',
  cie.canvas_item_id,
  cie.evidence_type,
  cie.title,
  cie.summary,
  cie.url,
  CASE
    WHEN cie.confidence = 'high' THEN 0.9
    WHEN cie.confidence = 'medium' THEN 0.6
    WHEN cie.confidence = 'low' THEN 0.3
    ELSE NULL
  END::decimal(3,2),
  cie.supports_item,  -- canvas_item_evidence uses 'supports_item'
  cie.collected_at,
  '{}',
  COALESCE(cie.metadata, '{}'),
  cie.created_at,
  cie.updated_at
FROM canvas_item_evidence cie
WHERE EXISTS (SELECT 1 FROM canvas_items ci WHERE ci.id = cie.canvas_item_id);

-- Migrate touchpoint_evidence
-- Columns: touchpoint_id, evidence_type, title, summary, url, confidence, supports_design, collected_at, metadata
INSERT INTO evidence (
  entity_type, entity_id, evidence_type, title, content, source_url,
  confidence, supports, collected_at, tags, metadata, created_at, updated_at
)
SELECT
  'touchpoint',
  te.touchpoint_id,
  te.evidence_type,
  te.title,
  te.summary,
  te.url,
  CASE
    WHEN te.confidence = 'high' THEN 0.9
    WHEN te.confidence = 'medium' THEN 0.6
    WHEN te.confidence = 'low' THEN 0.3
    ELSE NULL
  END::decimal(3,2),
  te.supports_design,
  te.collected_at,
  '{}',
  COALESCE(te.metadata, '{}'),
  te.created_at,
  te.updated_at
FROM touchpoint_evidence te
WHERE EXISTS (SELECT 1 FROM touchpoints t WHERE t.id = te.touchpoint_id);

-- ============================================================================
-- 2. MIGRATE JSONB UUID ARRAYS TO entity_links
-- ============================================================================

-- Migrate business_model_canvases.related_value_proposition_ids
INSERT INTO entity_links (source_type, source_id, target_type, target_id, link_type, metadata)
SELECT DISTINCT
  'business_model_canvas',
  bmc.id,
  'value_proposition_canvas',
  vpc_id::uuid,
  'related',
  '{}'::jsonb
FROM business_model_canvases bmc,
     unnest(bmc.related_value_proposition_ids) AS vpc_id
WHERE bmc.related_value_proposition_ids IS NOT NULL
  AND array_length(bmc.related_value_proposition_ids, 1) > 0
  AND EXISTS (SELECT 1 FROM value_proposition_canvases vpc WHERE vpc.id = vpc_id::uuid)
ON CONFLICT (source_type, source_id, target_type, target_id, link_type) DO NOTHING;

-- Migrate business_model_canvases.related_customer_profile_ids
INSERT INTO entity_links (source_type, source_id, target_type, target_id, link_type, metadata)
SELECT DISTINCT
  'business_model_canvas',
  bmc.id,
  'customer_profile',
  cp_id::uuid,
  'related',
  '{}'::jsonb
FROM business_model_canvases bmc,
     unnest(bmc.related_customer_profile_ids) AS cp_id
WHERE bmc.related_customer_profile_ids IS NOT NULL
  AND array_length(bmc.related_customer_profile_ids, 1) > 0
  AND EXISTS (SELECT 1 FROM customer_profiles cp WHERE cp.id = cp_id::uuid)
ON CONFLICT (source_type, source_id, target_type, target_id, link_type) DO NOTHING;

-- Migrate customer_profiles.related_business_model_ids
INSERT INTO entity_links (source_type, source_id, target_type, target_id, link_type, metadata)
SELECT DISTINCT
  'customer_profile',
  cp.id,
  'business_model_canvas',
  bmc_id::uuid,
  'related',
  '{}'::jsonb
FROM customer_profiles cp,
     unnest(cp.related_business_model_ids) AS bmc_id
WHERE cp.related_business_model_ids IS NOT NULL
  AND array_length(cp.related_business_model_ids, 1) > 0
  AND EXISTS (SELECT 1 FROM business_model_canvases bmc WHERE bmc.id = bmc_id::uuid)
ON CONFLICT (source_type, source_id, target_type, target_id, link_type) DO NOTHING;

-- Migrate customer_profiles.related_value_proposition_ids
INSERT INTO entity_links (source_type, source_id, target_type, target_id, link_type, metadata)
SELECT DISTINCT
  'customer_profile',
  cp.id,
  'value_proposition_canvas',
  vpc_id::uuid,
  'related',
  '{}'::jsonb
FROM customer_profiles cp,
     unnest(cp.related_value_proposition_ids) AS vpc_id
WHERE cp.related_value_proposition_ids IS NOT NULL
  AND array_length(cp.related_value_proposition_ids, 1) > 0
  AND EXISTS (SELECT 1 FROM value_proposition_canvases vpc WHERE vpc.id = vpc_id::uuid)
ON CONFLICT (source_type, source_id, target_type, target_id, link_type) DO NOTHING;

-- Migrate user_journeys.related_value_proposition_ids
INSERT INTO entity_links (source_type, source_id, target_type, target_id, link_type, metadata)
SELECT DISTINCT
  'user_journey',
  uj.id,
  'value_proposition_canvas',
  vpc_id::uuid,
  'related',
  '{}'::jsonb
FROM user_journeys uj,
     unnest(uj.related_value_proposition_ids) AS vpc_id
WHERE uj.related_value_proposition_ids IS NOT NULL
  AND array_length(uj.related_value_proposition_ids, 1) > 0
  AND EXISTS (SELECT 1 FROM value_proposition_canvases vpc WHERE vpc.id = vpc_id::uuid)
ON CONFLICT (source_type, source_id, target_type, target_id, link_type) DO NOTHING;

-- Migrate user_journeys.related_business_model_ids
INSERT INTO entity_links (source_type, source_id, target_type, target_id, link_type, metadata)
SELECT DISTINCT
  'user_journey',
  uj.id,
  'business_model_canvas',
  bmc_id::uuid,
  'related',
  '{}'::jsonb
FROM user_journeys uj,
     unnest(uj.related_business_model_ids) AS bmc_id
WHERE uj.related_business_model_ids IS NOT NULL
  AND array_length(uj.related_business_model_ids, 1) > 0
  AND EXISTS (SELECT 1 FROM business_model_canvases bmc WHERE bmc.id = bmc_id::uuid)
ON CONFLICT (source_type, source_id, target_type, target_id, link_type) DO NOTHING;

-- ============================================================================
-- 3. MIGRATE JUNCTION TABLES TO entity_links
-- ============================================================================

-- Migrate canvas_item_assumptions (if any exist)
-- Columns: id, canvas_item_id, assumption_id, relationship_type, notes, created_at
INSERT INTO entity_links (source_type, source_id, target_type, target_id, link_type, notes, metadata, created_at)
SELECT DISTINCT
  'canvas_item',
  cia.canvas_item_id,
  'assumption',
  cia.assumption_id,
  COALESCE(cia.relationship_type, 'related'),
  cia.notes,
  '{}'::jsonb,
  cia.created_at
FROM canvas_item_assumptions cia
WHERE EXISTS (SELECT 1 FROM canvas_items ci WHERE ci.id = cia.canvas_item_id)
  AND EXISTS (SELECT 1 FROM assumptions a WHERE a.id = cia.assumption_id)
ON CONFLICT (source_type, source_id, target_type, target_id, link_type) DO NOTHING;

-- Migrate log_entry_specimens
INSERT INTO entity_links (source_type, source_id, target_type, target_id, link_type, metadata, created_at)
SELECT DISTINCT
  'log_entry',
  les.log_entry_id,
  'specimen',
  les.specimen_id,
  'contains',
  '{}'::jsonb,
  les.created_at
FROM log_entry_specimens les
WHERE EXISTS (SELECT 1 FROM log_entries le WHERE le.id = les.log_entry_id)
  AND EXISTS (SELECT 1 FROM specimens s WHERE s.id = les.specimen_id)
ON CONFLICT (source_type, source_id, target_type, target_id, link_type) DO NOTHING;

-- Migrate log_entry_ventures (formerly log_entry_projects)
INSERT INTO entity_links (source_type, source_id, target_type, target_id, link_type, metadata, created_at)
SELECT DISTINCT
  'log_entry',
  lev.log_entry_id,
  'venture',
  lev.venture_id,
  'references',
  '{}'::jsonb,
  lev.created_at
FROM log_entry_ventures lev
WHERE EXISTS (SELECT 1 FROM log_entries le WHERE le.id = lev.log_entry_id)
  AND EXISTS (SELECT 1 FROM ventures v WHERE v.id = lev.venture_id)
ON CONFLICT (source_type, source_id, target_type, target_id, link_type) DO NOTHING;

-- ============================================================================
-- 4. VERIFICATION COMMENTS
-- ============================================================================

COMMENT ON TABLE evidence IS 'Universal evidence storage. Phase 2 migration complete.';
COMMENT ON TABLE entity_links IS 'Universal entity links. Phase 2 migration complete.';

-- ============================================================================
-- 5. LOG MIGRATION RESULTS
-- ============================================================================

DO $$
DECLARE
  evidence_count INTEGER;
  links_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO evidence_count FROM evidence;
  SELECT COUNT(*) INTO links_count FROM entity_links;

  RAISE NOTICE 'Phase 2 Migration Complete:';
  RAISE NOTICE '  - Evidence records: %', evidence_count;
  RAISE NOTICE '  - Entity links: %', links_count;
END $$;
