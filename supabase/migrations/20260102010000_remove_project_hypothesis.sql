-- Remove hypothesis column from studio_projects
-- Hypothesis is now tracked via linked studio_hypotheses records

ALTER TABLE studio_projects
DROP COLUMN IF EXISTS hypothesis;

COMMENT ON TABLE studio_projects IS 'Studio workshop projects with PRD fields. Hypotheses tracked via studio_hypotheses table.';
