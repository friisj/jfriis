-- Arena Skill Model v2: Tiered skills with open dimensions
--
-- Changes:
-- 1. arena_projects: add substrate, foundation (JSONB), config (JSONB) columns
-- 2. arena_skills: rename source → tier, update values (base→template, figma/manual→project)
-- 3. Drop dimension CHECK constraints across all tables (open dimensions)

-- =============================================================================
-- arena_projects: new fields
-- =============================================================================

ALTER TABLE arena_projects
  ADD COLUMN substrate TEXT,
  ADD COLUMN foundation JSONB,
  ADD COLUMN config JSONB NOT NULL DEFAULT '{}';

-- =============================================================================
-- arena_skills: source → tier
-- =============================================================================

ALTER TABLE arena_skills RENAME COLUMN source TO tier;
UPDATE arena_skills SET tier = 'template' WHERE tier = 'base';
UPDATE arena_skills SET tier = 'project' WHERE tier IN ('figma', 'manual');
ALTER TABLE arena_skills DROP CONSTRAINT IF EXISTS arena_skills_source_check;
ALTER TABLE arena_skills ADD CONSTRAINT arena_skills_tier_check
  CHECK (tier IN ('template', 'project', 'refined'));
DROP INDEX IF EXISTS idx_arena_skills_source;
CREATE INDEX idx_arena_skills_tier ON arena_skills(tier);

-- =============================================================================
-- Drop dimension CHECK constraints (open dimensions)
-- =============================================================================

ALTER TABLE arena_skills DROP CONSTRAINT IF EXISTS arena_skills_dimension_check;
ALTER TABLE arena_project_assembly DROP CONSTRAINT IF EXISTS arena_project_assembly_dimension_check;
ALTER TABLE arena_sessions DROP CONSTRAINT IF EXISTS arena_sessions_target_dimension_check;
ALTER TABLE arena_session_feedback DROP CONSTRAINT IF EXISTS arena_session_feedback_dimension_check;
