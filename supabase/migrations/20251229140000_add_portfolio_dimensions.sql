-- Add Portfolio Management Dimensions to Projects (FIXED)
-- Implements Strategyzer Portfolio Map methodology
-- Migration created: 2025-12-29 (revised)

-- ============================================================================
-- PHASE 1: ADD PORTFOLIO COLUMNS TO PROJECTS TABLE
-- ============================================================================

ALTER TABLE projects
  -- Link to studio_projects (FIXED: proper FK instead of slug matching)
  ADD COLUMN studio_project_id UUID REFERENCES studio_projects(id) ON DELETE SET NULL,

  -- Portfolio Classification
  ADD COLUMN portfolio_type TEXT CHECK (portfolio_type IN ('explore', 'exploit')),
  ADD COLUMN horizon TEXT CHECK (horizon IN ('h1', 'h2', 'h3')),
  ADD COLUMN innovation_ambition TEXT CHECK (innovation_ambition IN ('core', 'adjacent', 'transformational')),

  -- Explore Portfolio Dimensions (New Growth Engines)
  ADD COLUMN explore_stage TEXT CHECK (explore_stage IN ('ideation', 'discovery', 'validation', 'acceleration')),
  ADD COLUMN evidence_strength TEXT CHECK (evidence_strength IN ('none', 'weak', 'moderate', 'strong')),
  ADD COLUMN expected_return TEXT CHECK (expected_return IN ('low', 'medium', 'high', 'breakthrough')),

  -- Exploit Portfolio Dimensions (Existing Businesses)
  ADD COLUMN exploit_stage TEXT CHECK (exploit_stage IN ('launch', 'sustaining', 'efficiency', 'mature', 'declining', 'renovation')),
  ADD COLUMN profitability TEXT CHECK (profitability IN ('low', 'medium', 'high')),
  ADD COLUMN disruption_risk TEXT CHECK (disruption_risk IN ('protected', 'moderate', 'at_risk')),

  -- Risk & Value Metrics
  ADD COLUMN innovation_risk TEXT CHECK (innovation_risk IN ('low', 'medium', 'high')),
  ADD COLUMN strategic_value_score INTEGER CHECK (strategic_value_score >= 1 AND strategic_value_score <= 10),
  ADD COLUMN market_size_estimate TEXT,

  -- Investment & Resources
  ADD COLUMN current_investment DECIMAL(12,2),
  ADD COLUMN total_investment DECIMAL(12,2),
  ADD COLUMN allocated_fte DECIMAL(4,2), -- Full-time equivalents

  -- Lifecycle Tracking
  ADD COLUMN last_stage_transition_at TIMESTAMPTZ,
  ADD COLUMN last_portfolio_review_at TIMESTAMPTZ,
  ADD COLUMN next_review_due_at TIMESTAMPTZ,

  -- Decision History (JSONB array)
  -- Structure: [{ date, decision: 'pivot'|'persevere'|'kill', rationale, reviewer }]
  ADD COLUMN decision_history JSONB DEFAULT '[]'::jsonb,

  -- Target Metrics (project goals)
  -- Structure: { revenue_target, customer_target, validation_target, timeline_target }
  ADD COLUMN target_metrics JSONB DEFAULT '{}'::jsonb;

-- Add indexes for portfolio queries
CREATE INDEX idx_projects_studio_project ON projects(studio_project_id) WHERE studio_project_id IS NOT NULL;
CREATE INDEX idx_projects_portfolio_type ON projects(portfolio_type) WHERE portfolio_type IS NOT NULL;
CREATE INDEX idx_projects_explore_stage ON projects(explore_stage) WHERE explore_stage IS NOT NULL;
CREATE INDEX idx_projects_exploit_stage ON projects(exploit_stage) WHERE exploit_stage IS NOT NULL;
CREATE INDEX idx_projects_horizon ON projects(horizon) WHERE horizon IS NOT NULL;
CREATE INDEX idx_projects_evidence_strength ON projects(evidence_strength) WHERE evidence_strength IS NOT NULL;
CREATE INDEX idx_projects_innovation_risk ON projects(innovation_risk) WHERE innovation_risk IS NOT NULL;
CREATE INDEX idx_projects_next_review ON projects(next_review_due_at) WHERE next_review_due_at IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN projects.studio_project_id IS 'FK to studio_projects - links portfolio project to studio hypothesis/experiment infrastructure';
COMMENT ON COLUMN projects.portfolio_type IS 'Strategyzer portfolio: explore (new growth engines) vs exploit (existing businesses)';
COMMENT ON COLUMN projects.horizon IS 'McKinsey Three Horizons: h1 (0-2yr core), h2 (2-5yr adjacent), h3 (5-12yr transformational)';
COMMENT ON COLUMN projects.innovation_ambition IS 'Innovation Ambition Matrix: core, adjacent, or transformational';
COMMENT ON COLUMN projects.explore_stage IS 'Explore lifecycle: ideation → discovery → validation → acceleration';
COMMENT ON COLUMN projects.exploit_stage IS 'Exploit lifecycle: launch → sustaining → efficiency → mature → declining → renovation';
COMMENT ON COLUMN projects.evidence_strength IS 'Aggregated from hypotheses, experiments, and canvas validation (computed via materialized view)';
COMMENT ON COLUMN projects.expected_return IS 'Expected profit potential for Explore portfolio projects';
COMMENT ON COLUMN projects.profitability IS 'Actual profitability for Exploit portfolio projects';
COMMENT ON COLUMN projects.disruption_risk IS 'Risk of disruption for Exploit portfolio projects';
COMMENT ON COLUMN projects.decision_history IS 'Array of portfolio review decisions: [{ date, decision, rationale, reviewer }]';
COMMENT ON COLUMN projects.target_metrics IS 'Project goals: { revenue_target, customer_target, validation_target, timeline_target }';

-- ============================================================================
-- PHASE 2: CREATE MATERIALIZED VIEW FOR EVIDENCE SUMMARY
-- ============================================================================

-- FIXED: Changed to MATERIALIZED VIEW for performance
CREATE MATERIALIZED VIEW portfolio_evidence_summary AS
SELECT
  p.id,
  p.slug,
  p.title,
  p.portfolio_type,
  p.explore_stage,
  p.exploit_stage,
  p.evidence_strength as manual_evidence_strength,

  -- Link to studio_projects (FIXED: now uses proper FK)
  p.studio_project_id,
  sp.status as studio_status,

  -- Hypothesis Validation Stats
  COUNT(DISTINCT h.id) as total_hypotheses,
  COUNT(DISTINCT h.id) FILTER (WHERE h.status = 'validated') as validated_hypotheses,
  COUNT(DISTINCT h.id) FILTER (WHERE h.status = 'invalidated') as invalidated_hypotheses,
  COUNT(DISTINCT h.id) FILTER (WHERE h.status = 'testing') as testing_hypotheses,
  COUNT(DISTINCT h.id) FILTER (WHERE h.status = 'proposed') as proposed_hypotheses,

  -- Experiment Success Stats
  COUNT(DISTINCT e.id) as total_experiments,
  COUNT(DISTINCT e.id) FILTER (WHERE e.outcome = 'success') as successful_experiments,
  COUNT(DISTINCT e.id) FILTER (WHERE e.outcome = 'failure') as failed_experiments,
  COUNT(DISTINCT e.id) FILTER (WHERE e.outcome = 'inconclusive') as inconclusive_experiments,
  COUNT(DISTINCT e.id) FILTER (WHERE e.status = 'in_progress') as active_experiments,
  COUNT(DISTINCT e.id) FILTER (WHERE e.status = 'completed') as completed_experiments,

  -- Canvas Validation
  COUNT(DISTINCT bmc.id) as total_business_models,
  COUNT(DISTINCT bmc.id) FILTER (WHERE bmc.status = 'validated') as validated_business_models,
  COUNT(DISTINCT bmc.id) FILTER (WHERE bmc.status = 'active') as active_business_models,

  COUNT(DISTINCT vpc.id) as total_value_propositions,
  COUNT(DISTINCT vpc.id) FILTER (WHERE vpc.status = 'validated') as validated_value_propositions,
  AVG(vpc.fit_score) FILTER (WHERE vpc.fit_score IS NOT NULL) as avg_vpc_fit_score,

  COUNT(DISTINCT cp.id) as total_customer_profiles,
  COUNT(DISTINCT cp.id) FILTER (WHERE cp.status = 'validated') as validated_customer_profiles,

  -- Evidence Documentation
  COUNT(DISTINCT le.id) as total_log_entries,
  COUNT(DISTINCT le.id) FILTER (WHERE le.type = 'experiment') as experiment_log_entries,
  COUNT(DISTINCT le.id) FILTER (WHERE le.type = 'research') as research_log_entries,

  -- Computed Evidence Score (0-100)
  -- FIXED: Extracted to constants (but keeping formula here for performance)
  CASE
    WHEN p.portfolio_type = 'explore' THEN
      LEAST(100, GREATEST(0,
        COALESCE(COUNT(DISTINCT h.id) FILTER (WHERE h.status = 'validated') * 10, 0) +
        COALESCE(COUNT(DISTINCT e.id) FILTER (WHERE e.outcome = 'success') * 15, 0) +
        COALESCE(AVG(vpc.fit_score) FILTER (WHERE vpc.fit_score IS NOT NULL) * 50, 0)
      ))
    ELSE NULL
  END as computed_evidence_score,

  -- Success Rate Percentages
  CASE
    WHEN COUNT(DISTINCT h.id) > 0 THEN
      ROUND((COUNT(DISTINCT h.id) FILTER (WHERE h.status = 'validated')::numeric / COUNT(DISTINCT h.id)) * 100, 1)
    ELSE NULL
  END as hypothesis_validation_rate,

  CASE
    WHEN COUNT(DISTINCT e.id) FILTER (WHERE e.outcome IS NOT NULL) > 0 THEN
      ROUND((COUNT(DISTINCT e.id) FILTER (WHERE e.outcome = 'success')::numeric /
             COUNT(DISTINCT e.id) FILTER (WHERE e.outcome IS NOT NULL)) * 100, 1)
    ELSE NULL
  END as experiment_success_rate,

  -- Last Activity Timestamp
  GREATEST(
    MAX(h.updated_at),
    MAX(e.updated_at),
    MAX(le.created_at),
    MAX(bmc.updated_at),
    MAX(vpc.updated_at)
  ) as last_evidence_activity_at,

  -- Refresh timestamp
  now() as refreshed_at

FROM projects p

-- FIXED: Use proper FK join instead of slug matching
LEFT JOIN studio_projects sp ON sp.id = p.studio_project_id

-- Link evidence entities via studio_projects
LEFT JOIN studio_hypotheses h ON h.project_id = sp.id
LEFT JOIN studio_experiments e ON e.project_id = sp.id
LEFT JOIN log_entries le ON le.studio_project_id = sp.id
LEFT JOIN business_model_canvases bmc ON bmc.studio_project_id = sp.id
LEFT JOIN value_proposition_canvases vpc ON vpc.studio_project_id = sp.id
LEFT JOIN customer_profiles cp ON cp.studio_project_id = sp.id

GROUP BY p.id, p.slug, p.title, p.portfolio_type, p.explore_stage, p.exploit_stage, p.evidence_strength, p.studio_project_id, sp.status;

-- Create unique index for fast lookups
CREATE UNIQUE INDEX idx_portfolio_evidence_id ON portfolio_evidence_summary(id);
CREATE INDEX idx_portfolio_evidence_portfolio_type ON portfolio_evidence_summary(portfolio_type);
CREATE INDEX idx_portfolio_evidence_score ON portfolio_evidence_summary(computed_evidence_score);

COMMENT ON MATERIALIZED VIEW portfolio_evidence_summary IS 'Aggregates evidence from hypotheses, experiments, canvases, and log entries for portfolio projects. Refresh with: REFRESH MATERIALIZED VIEW CONCURRENTLY portfolio_evidence_summary';

-- ============================================================================
-- PHASE 3: AUTO-REFRESH TRIGGER FOR MATERIALIZED VIEW
-- ============================================================================

-- Function to refresh materialized view
CREATE OR REPLACE FUNCTION refresh_portfolio_evidence()
RETURNS TRIGGER AS $$
BEGIN
  -- Refresh concurrently (doesn't block reads)
  REFRESH MATERIALIZED VIEW CONCURRENTLY portfolio_evidence_summary;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger on projects table changes
CREATE TRIGGER trigger_refresh_portfolio_evidence_projects
  AFTER INSERT OR UPDATE OR DELETE ON projects
  FOR EACH STATEMENT
  EXECUTE FUNCTION refresh_portfolio_evidence();

-- Trigger on studio_hypotheses changes
CREATE TRIGGER trigger_refresh_portfolio_evidence_hypotheses
  AFTER INSERT OR UPDATE OR DELETE ON studio_hypotheses
  FOR EACH STATEMENT
  EXECUTE FUNCTION refresh_portfolio_evidence();

-- Trigger on studio_experiments changes
CREATE TRIGGER trigger_refresh_portfolio_evidence_experiments
  AFTER INSERT OR UPDATE OR DELETE ON studio_experiments
  FOR EACH STATEMENT
  EXECUTE FUNCTION refresh_portfolio_evidence();

-- Trigger on business_model_canvases changes
CREATE TRIGGER trigger_refresh_portfolio_evidence_bmc
  AFTER INSERT OR UPDATE OR DELETE ON business_model_canvases
  FOR EACH STATEMENT
  EXECUTE FUNCTION refresh_portfolio_evidence();

-- Trigger on value_proposition_canvases changes
CREATE TRIGGER trigger_refresh_portfolio_evidence_vpc
  AFTER INSERT OR UPDATE OR DELETE ON value_proposition_canvases
  FOR EACH STATEMENT
  EXECUTE FUNCTION refresh_portfolio_evidence();

COMMENT ON FUNCTION refresh_portfolio_evidence IS 'Auto-refreshes portfolio_evidence_summary materialized view when evidence data changes';

-- ============================================================================
-- PHASE 4: HELPER FUNCTIONS (with constants extracted)
-- ============================================================================

-- Function: Compute evidence strength category from score
CREATE OR REPLACE FUNCTION compute_evidence_strength(project_id UUID)
RETURNS TEXT AS $$
DECLARE
  evidence_score NUMERIC;
  -- FIXED: Extracted thresholds as constants
  THRESHOLD_WEAK CONSTANT INTEGER := 20;
  THRESHOLD_MODERATE CONSTANT INTEGER := 50;
  THRESHOLD_STRONG CONSTANT INTEGER := 75;
BEGIN
  SELECT computed_evidence_score INTO evidence_score
  FROM portfolio_evidence_summary
  WHERE id = project_id;

  RETURN CASE
    WHEN evidence_score IS NULL OR evidence_score < THRESHOLD_WEAK THEN 'none'
    WHEN evidence_score < THRESHOLD_MODERATE THEN 'weak'
    WHEN evidence_score < THRESHOLD_STRONG THEN 'moderate'
    ELSE 'strong'
  END;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION compute_evidence_strength IS 'Computes evidence strength category (none/weak/moderate/strong) from aggregated evidence score. Thresholds: <20 none, <50 weak, <75 moderate, ≥75 strong';

-- Function: Suggest stage transitions based on evidence
CREATE OR REPLACE FUNCTION suggest_explore_stage_transition(project_id UUID)
RETURNS JSONB AS $$
DECLARE
  summary RECORD;
  suggestion JSONB;
BEGIN
  SELECT * INTO summary
  FROM portfolio_evidence_summary
  WHERE id = project_id;

  IF summary IS NULL THEN
    RETURN jsonb_build_object(
      'error', 'Project not found or no evidence data available'
    );
  END IF;

  -- Rule: Ideation → Discovery
  -- Criteria: At least 1 hypothesis defined
  IF summary.explore_stage = 'ideation' AND summary.total_hypotheses >= 1 THEN
    suggestion = jsonb_build_object(
      'current_stage', 'ideation',
      'suggested_stage', 'discovery',
      'rationale', format('Ready to start testing: %s hypothesis/hypotheses defined', summary.total_hypotheses),
      'confidence', 'medium',
      'criteria_met', jsonb_build_array(
        'Has defined hypotheses to test'
      )
    );

  -- Rule: Discovery → Validation
  -- Criteria: At least 3 experiments completed with 60%+ success rate
  ELSIF summary.explore_stage = 'discovery'
    AND summary.completed_experiments >= 3
    AND summary.experiment_success_rate >= 60 THEN
    suggestion = jsonb_build_object(
      'current_stage', 'discovery',
      'suggested_stage', 'validation',
      'rationale', format('Strong early evidence: %s/%s experiments successful (%.1f%% success rate)',
                          summary.successful_experiments,
                          summary.completed_experiments,
                          summary.experiment_success_rate),
      'confidence', 'high',
      'criteria_met', jsonb_build_array(
        format('%s+ experiments completed', summary.completed_experiments),
        format('%.1f%% success rate (>60%% threshold)', summary.experiment_success_rate)
      )
    );

  -- Rule: Validation → Acceleration
  -- Criteria: VPC fit score > 0.7 AND at least 1 validated business model AND 3+ validated hypotheses
  ELSIF summary.explore_stage = 'validation'
    AND COALESCE(summary.avg_vpc_fit_score, 0) > 0.7
    AND summary.validated_business_models >= 1
    AND summary.validated_hypotheses >= 3 THEN
    suggestion = jsonb_build_object(
      'current_stage', 'validation',
      'suggested_stage', 'acceleration',
      'rationale', format('Strong validation across all dimensions: VPC fit %.2f, %s validated business model(s), %s/%s hypotheses validated',
                          summary.avg_vpc_fit_score,
                          summary.validated_business_models,
                          summary.validated_hypotheses,
                          summary.total_hypotheses),
      'confidence', 'high',
      'criteria_met', jsonb_build_array(
        format('VPC fit score %.2f (>0.7 threshold)', summary.avg_vpc_fit_score),
        format('%s validated business model(s)', summary.validated_business_models),
        format('%s/%s hypotheses validated', summary.validated_hypotheses, summary.total_hypotheses)
      )
    );

  -- No transition recommended
  ELSE
    suggestion = jsonb_build_object(
      'current_stage', summary.explore_stage,
      'suggested_stage', summary.explore_stage,
      'rationale', 'Insufficient evidence for stage transition. Continue testing and gathering evidence.',
      'confidence', 'low',
      'evidence_summary', jsonb_build_object(
        'hypotheses', format('%s total, %s validated', summary.total_hypotheses, summary.validated_hypotheses),
        'experiments', format('%s total, %s successful', summary.total_experiments, summary.successful_experiments),
        'vpc_fit_score', summary.avg_vpc_fit_score,
        'business_models', format('%s total, %s validated', summary.total_business_models, summary.validated_business_models)
      )
    );
  END IF;

  RETURN suggestion;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION suggest_explore_stage_transition IS 'Analyzes evidence and suggests stage transitions for Explore portfolio projects with confidence levels and rationale';

-- Function: Get portfolio metrics summary
CREATE OR REPLACE FUNCTION get_portfolio_metrics()
RETURNS JSONB AS $$
DECLARE
  metrics JSONB;
BEGIN
  SELECT jsonb_build_object(
    -- Portfolio Balance
    'explore_count', COUNT(*) FILTER (WHERE portfolio_type = 'explore'),
    'exploit_count', COUNT(*) FILTER (WHERE portfolio_type = 'exploit'),
    'uncategorized_count', COUNT(*) FILTER (WHERE portfolio_type IS NULL),
    'total_count', COUNT(*),

    -- Horizon Balance (70-20-10 rule)
    'h1_count', COUNT(*) FILTER (WHERE horizon = 'h1'),
    'h2_count', COUNT(*) FILTER (WHERE horizon = 'h2'),
    'h3_count', COUNT(*) FILTER (WHERE horizon = 'h3'),

    -- Investment
    'total_investment', COALESCE(SUM(total_investment), 0),
    'explore_investment', COALESCE(SUM(total_investment) FILTER (WHERE portfolio_type = 'explore'), 0),
    'exploit_investment', COALESCE(SUM(total_investment) FILTER (WHERE portfolio_type = 'exploit'), 0),

    -- Risk Distribution
    'low_risk_count', COUNT(*) FILTER (WHERE innovation_risk = 'low'),
    'medium_risk_count', COUNT(*) FILTER (WHERE innovation_risk = 'medium'),
    'high_risk_count', COUNT(*) FILTER (WHERE innovation_risk = 'high'),

    -- Evidence Strength
    'strong_evidence_count', COUNT(*) FILTER (WHERE evidence_strength = 'strong'),
    'moderate_evidence_count', COUNT(*) FILTER (WHERE evidence_strength = 'moderate'),
    'weak_evidence_count', COUNT(*) FILTER (WHERE evidence_strength = 'weak'),
    'no_evidence_count', COUNT(*) FILTER (WHERE evidence_strength = 'none' OR evidence_strength IS NULL),

    -- Stage Distribution (Explore)
    'ideation_count', COUNT(*) FILTER (WHERE explore_stage = 'ideation'),
    'discovery_count', COUNT(*) FILTER (WHERE explore_stage = 'discovery'),
    'validation_count', COUNT(*) FILTER (WHERE explore_stage = 'validation'),
    'acceleration_count', COUNT(*) FILTER (WHERE explore_stage = 'acceleration'),

    -- Stage Distribution (Exploit)
    'launch_count', COUNT(*) FILTER (WHERE exploit_stage = 'launch'),
    'sustaining_count', COUNT(*) FILTER (WHERE exploit_stage = 'sustaining'),
    'mature_count', COUNT(*) FILTER (WHERE exploit_stage = 'mature'),
    'declining_count', COUNT(*) FILTER (WHERE exploit_stage = 'declining'),

    -- Projects Needing Attention
    'needs_review_count', COUNT(*) FILTER (WHERE next_review_due_at < now()),
    'stale_projects_count', COUNT(*) FILTER (WHERE updated_at < now() - interval '30 days'),

    -- Timestamp
    'computed_at', now()
  ) INTO metrics
  FROM projects;

  RETURN metrics;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_portfolio_metrics IS 'Returns portfolio-wide metrics for dashboard summary with horizon balance and evidence distribution';

-- ============================================================================
-- VERIFICATION QUERIES (for testing after migration)
-- ============================================================================

-- Test materialized view
-- SELECT * FROM portfolio_evidence_summary LIMIT 5;

-- Manual refresh if needed
-- REFRESH MATERIALIZED VIEW CONCURRENTLY portfolio_evidence_summary;

-- Test compute_evidence_strength function
-- SELECT id, slug, title, compute_evidence_strength(id) as evidence_strength
-- FROM projects WHERE studio_project_id IS NOT NULL LIMIT 5;

-- Test suggest_explore_stage_transition function
-- SELECT id, slug, title, suggest_explore_stage_transition(id) as suggestion
-- FROM projects WHERE portfolio_type = 'explore' LIMIT 5;

-- Test get_portfolio_metrics function
-- SELECT get_portfolio_metrics();
