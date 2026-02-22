-- Evolve evidence table to feedback
--
-- The evidence entity is upgraded to a first-class feedback entity.
-- Feedback is a richer signal container: it can act as evidence for
-- experiment validation/invalidation or represent other signals about
-- the conditions of a record.
--
-- Changes:
-- 1. Add hat_type column — De Bono thinking hats derivative for framing
--    white=data/facts, black=risk/caution, yellow=value/optimism,
--    red=intuition/emotion, green=creative/generative, blue=process/meta
-- 2. Make supports nullable — hat carries the primary framing; supports
--    is now explicit valence, inapplicable for red/green/blue hats
-- 3. Drop the default on supports (was DEFAULT true)
-- 4. Rename evidence_type column to feedback_type
-- 5. Rename table evidence → feedback
-- 6. Update indexes, trigger, RLS policies, and comments

-- ============================================================================
-- 1. ADD hat_type COLUMN
-- ============================================================================

ALTER TABLE evidence
  ADD COLUMN hat_type TEXT NOT NULL DEFAULT 'white'
  CHECK (hat_type IN ('white', 'black', 'yellow', 'red', 'green', 'blue'));

-- ============================================================================
-- 2. MAKE supports NULLABLE AND DROP DEFAULT
-- ============================================================================

ALTER TABLE evidence ALTER COLUMN supports DROP NOT NULL;
ALTER TABLE evidence ALTER COLUMN supports DROP DEFAULT;

-- ============================================================================
-- 3. RENAME evidence_type → feedback_type
-- ============================================================================

ALTER TABLE evidence RENAME COLUMN evidence_type TO feedback_type;

-- ============================================================================
-- 4. RENAME TABLE evidence → feedback
-- ============================================================================

ALTER TABLE evidence RENAME TO feedback;

-- ============================================================================
-- 5. RENAME INDEXES
-- ============================================================================

ALTER INDEX idx_evidence_entity  RENAME TO idx_feedback_entity;
ALTER INDEX idx_evidence_type    RENAME TO idx_feedback_type;
ALTER INDEX idx_evidence_tags    RENAME TO idx_feedback_tags;
ALTER INDEX idx_evidence_created RENAME TO idx_feedback_created;
ALTER INDEX idx_evidence_supports RENAME TO idx_feedback_supports;

-- ============================================================================
-- 6. RENAME TRIGGER
-- ============================================================================

ALTER TRIGGER update_evidence_updated_at ON feedback
  RENAME TO update_feedback_updated_at;

-- ============================================================================
-- 7. RENAME RLS POLICIES
-- ============================================================================

ALTER POLICY "Public read access to evidence"  ON feedback RENAME TO "Public read access to feedback";
ALTER POLICY "Admin insert access to evidence" ON feedback RENAME TO "Admin insert access to feedback";
ALTER POLICY "Admin update access to evidence" ON feedback RENAME TO "Admin update access to feedback";
ALTER POLICY "Admin delete access to evidence" ON feedback RENAME TO "Admin delete access to feedback";

-- ============================================================================
-- 8. ADD INDEX FOR hat_type
-- ============================================================================

CREATE INDEX idx_feedback_hat ON feedback (hat_type);

-- ============================================================================
-- 9. UPDATE COMMENTS
-- ============================================================================

COMMENT ON TABLE feedback IS 'Universal feedback storage for any entity type. Evolved from evidence table. Supports De Bono thinking hats framing for richer signal classification.';
COMMENT ON COLUMN feedback.entity_type IS 'Type of entity this feedback is for: assumption, canvas_item, touchpoint, hypothesis, experiment, etc.';
COMMENT ON COLUMN feedback.entity_id IS 'UUID of the entity this feedback pertains to';
COMMENT ON COLUMN feedback.hat_type IS 'De Bono thinking hat: white=data/facts, black=risk/caution, yellow=value/optimism, red=intuition/emotion, green=creative/generative, blue=process/meta';
COMMENT ON COLUMN feedback.feedback_type IS 'Signal source: interview, survey, analytics, experiment, observation, research, competitor, expert, user_test, prototype, ab_test, heuristic_eval, etc.';
COMMENT ON COLUMN feedback.confidence IS 'Confidence level 0.0-1.0';
COMMENT ON COLUMN feedback.supports IS 'true=supports, false=refutes, null=not applicable (typical for red/green/blue hats)';
