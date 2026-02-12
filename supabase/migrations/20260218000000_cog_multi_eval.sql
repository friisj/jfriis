-- Multi-eval profiles: allow remix jobs to use multiple eval profiles simultaneously
-- Each profile independently scores and selects candidates

-- Add array column for multiple eval profile IDs
ALTER TABLE cog_remix_jobs
  ADD COLUMN eval_profile_ids UUID[] DEFAULT '{}';

-- Migrate existing single eval_profile_id data to the array
UPDATE cog_remix_jobs
  SET eval_profile_ids = ARRAY[eval_profile_id]
  WHERE eval_profile_id IS NOT NULL;

-- Add initial-run flag to distinguish inline eval runs from post-hoc re-evals
ALTER TABLE cog_remix_eval_runs
  ADD COLUMN is_initial BOOLEAN NOT NULL DEFAULT FALSE;

-- Add per-profile selection tracking
ALTER TABLE cog_remix_eval_runs
  ADD COLUMN selected_candidate_id UUID REFERENCES cog_remix_candidates(id) ON DELETE SET NULL;
