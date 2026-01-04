-- Add rationale column to studio_hypotheses
-- This column stores the reasoning behind each hypothesis

ALTER TABLE studio_hypotheses
ADD COLUMN IF NOT EXISTS rationale TEXT;

COMMENT ON COLUMN studio_hypotheses.rationale IS 'The reasoning behind this hypothesis - why we believe it';
