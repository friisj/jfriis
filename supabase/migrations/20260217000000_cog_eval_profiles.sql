-- Cog Eval Profiles: pluggable art director perspectives for remix vision eval
-- Supports custom criteria, weights, system prompts, and post-hoc re-evaluation

-- Eval profile: an "art director" perspective
CREATE TABLE cog_eval_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  system_prompt TEXT NOT NULL DEFAULT '',
  criteria JSONB NOT NULL DEFAULT '[]',
  selection_threshold FLOAT NOT NULL DEFAULT 7.0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_cog_eval_profiles_user ON cog_eval_profiles(user_id);

CREATE TRIGGER update_cog_eval_profiles_updated_at
  BEFORE UPDATE ON cog_eval_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Link remix jobs to an eval profile (optional)
ALTER TABLE cog_remix_jobs
  ADD COLUMN eval_profile_id UUID REFERENCES cog_eval_profiles(id) ON DELETE SET NULL;

-- Eval runs: post-hoc re-evaluation of a completed job with a different profile
CREATE TABLE cog_remix_eval_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES cog_remix_jobs(id) ON DELETE CASCADE,
  eval_profile_id UUID NOT NULL REFERENCES cog_eval_profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_cog_remix_eval_runs_job ON cog_remix_eval_runs(job_id);
CREATE INDEX idx_cog_remix_eval_runs_profile ON cog_remix_eval_runs(eval_profile_id);

-- Eval results: per-candidate scores for a run
CREATE TABLE cog_remix_eval_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES cog_remix_eval_runs(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES cog_remix_candidates(id) ON DELETE CASCADE,
  score FLOAT,
  reasoning TEXT,
  criterion_scores JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_cog_remix_eval_results_run ON cog_remix_eval_results(run_id);
CREATE INDEX idx_cog_remix_eval_results_candidate ON cog_remix_eval_results(candidate_id);

-- RLS: admin-only (same pattern as all cog tables)
ALTER TABLE cog_eval_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE cog_remix_eval_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE cog_remix_eval_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access to cog_eval_profiles"
  ON cog_eval_profiles FOR ALL USING (is_admin());

CREATE POLICY "Admin full access to cog_remix_eval_runs"
  ON cog_remix_eval_runs FOR ALL USING (is_admin());

CREATE POLICY "Admin full access to cog_remix_eval_results"
  ON cog_remix_eval_results FOR ALL USING (is_admin());
