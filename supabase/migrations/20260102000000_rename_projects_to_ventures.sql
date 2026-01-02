-- ============================================================================
-- MIGRATION: Rename projects → ventures
-- Created: 2026-01-02
-- Purpose: Rename portfolio "projects" entity to "ventures" to better reflect
--          their identity as businesses/products/services and create clearer
--          semantic distinction from studio_projects (R&D workshop)
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: RENAME MAIN TABLE
-- ============================================================================

ALTER TABLE projects RENAME TO ventures;

-- ============================================================================
-- STEP 2: RENAME INDEXES
-- ============================================================================

-- Core indexes from initial schema
ALTER INDEX IF EXISTS idx_projects_slug RENAME TO idx_ventures_slug;
ALTER INDEX IF EXISTS idx_projects_status RENAME TO idx_ventures_status;
ALTER INDEX IF EXISTS idx_projects_published RENAME TO idx_ventures_published;
ALTER INDEX IF EXISTS idx_projects_created_at RENAME TO idx_ventures_created_at;

-- Portfolio management indexes (if they exist)
ALTER INDEX IF EXISTS idx_projects_studio_project RENAME TO idx_ventures_studio_project;
ALTER INDEX IF EXISTS idx_projects_portfolio_type RENAME TO idx_ventures_portfolio_type;
ALTER INDEX IF EXISTS idx_projects_explore_stage RENAME TO idx_ventures_explore_stage;
ALTER INDEX IF EXISTS idx_projects_exploit_stage RENAME TO idx_ventures_exploit_stage;
ALTER INDEX IF EXISTS idx_projects_horizon RENAME TO idx_ventures_horizon;
ALTER INDEX IF EXISTS idx_projects_evidence_strength RENAME TO idx_ventures_evidence_strength;
ALTER INDEX IF EXISTS idx_projects_innovation_risk RENAME TO idx_ventures_innovation_risk;
ALTER INDEX IF EXISTS idx_projects_next_review RENAME TO idx_ventures_next_review;

-- ============================================================================
-- STEP 3: RENAME TRIGGERS
-- ============================================================================

-- Drop old trigger and recreate with new name
DROP TRIGGER IF EXISTS update_projects_updated_at ON ventures;
CREATE TRIGGER update_ventures_updated_at
    BEFORE UPDATE ON ventures
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Portfolio evidence refresh trigger (only if function exists)
DROP TRIGGER IF EXISTS trigger_refresh_portfolio_evidence_projects ON ventures;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'refresh_portfolio_evidence') THEN
        CREATE TRIGGER trigger_refresh_portfolio_evidence_ventures
            AFTER INSERT OR UPDATE OR DELETE ON ventures
            FOR EACH STATEMENT
            EXECUTE FUNCTION refresh_portfolio_evidence();
    END IF;
END $$;

-- ============================================================================
-- STEP 4: RENAME JUNCTION TABLES
-- ============================================================================

ALTER TABLE project_specimens RENAME TO venture_specimens;
ALTER TABLE log_entry_projects RENAME TO log_entry_ventures;

-- ============================================================================
-- STEP 5: RENAME COLUMNS IN JUNCTION TABLES
-- ============================================================================

ALTER TABLE venture_specimens RENAME COLUMN project_id TO venture_id;
ALTER TABLE log_entry_ventures RENAME COLUMN project_id TO venture_id;

-- ============================================================================
-- STEP 6: RENAME JUNCTION TABLE INDEXES
-- ============================================================================

-- Venture specimens indexes
ALTER INDEX IF EXISTS idx_project_specimens_project_id RENAME TO idx_venture_specimens_venture_id;
ALTER INDEX IF EXISTS idx_project_specimens_specimen_id RENAME TO idx_venture_specimens_specimen_id;
ALTER INDEX IF EXISTS project_specimens_pkey RENAME TO venture_specimens_pkey;

-- Log entry ventures indexes
ALTER INDEX IF EXISTS idx_log_entry_projects_log_entry_id RENAME TO idx_log_entry_ventures_log_entry_id;
ALTER INDEX IF EXISTS idx_log_entry_projects_project_id RENAME TO idx_log_entry_ventures_venture_id;
ALTER INDEX IF EXISTS log_entry_projects_pkey RENAME TO log_entry_ventures_pkey;

-- ============================================================================
-- STEP 7: UPDATE RLS POLICIES
-- ============================================================================

-- Ventures table policies
DROP POLICY IF EXISTS "Public can view published projects" ON ventures;
CREATE POLICY "Public can view published ventures"
    ON ventures FOR SELECT
    USING (published = true);

DROP POLICY IF EXISTS "Admin can do everything with projects" ON ventures;
CREATE POLICY "Admin can do everything with ventures"
    ON ventures FOR ALL
    USING (auth.jwt() ->> 'role' = 'authenticated');

-- Venture specimens policies
DROP POLICY IF EXISTS "Public can view project specimens" ON venture_specimens;
CREATE POLICY "Public can view venture specimens"
    ON venture_specimens FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Admin can manage project specimens" ON venture_specimens;
CREATE POLICY "Admin can manage venture specimens"
    ON venture_specimens FOR ALL
    USING (auth.jwt() ->> 'role' = 'authenticated');

-- Log entry ventures policies
DROP POLICY IF EXISTS "Public can view log entry projects" ON log_entry_ventures;
CREATE POLICY "Public can view log entry ventures"
    ON log_entry_ventures FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Admin can manage log entry projects" ON log_entry_ventures;
CREATE POLICY "Admin can manage log entry ventures"
    ON log_entry_ventures FOR ALL
    USING (auth.jwt() ->> 'role' = 'authenticated');

-- ============================================================================
-- STEP 8: UPDATE MATERIALIZED VIEW (if exists)
-- ============================================================================

-- Drop and recreate materialized view with ventures table
DROP MATERIALIZED VIEW IF EXISTS portfolio_evidence_summary CASCADE;

CREATE MATERIALIZED VIEW portfolio_evidence_summary AS
SELECT
  v.id as venture_id,
  v.title,
  v.slug,
  v.portfolio_type,
  v.horizon,
  v.explore_stage,
  v.exploit_stage,
  v.evidence_strength as manual_evidence_strength,
  v.innovation_risk,
  v.strategic_value_score,
  v.studio_project_id,
  v.expected_return,
  v.profitability,
  v.sustainability,
  v.disruption_risk,
  v.total_investment,
  v.current_investment,
  v.allocated_fte,
  v.next_review_due_at,

  -- Studio project status
  sp.status as studio_status,

  -- Hypothesis counts
  COUNT(DISTINCT CASE WHEN h.status = 'validated' THEN h.id END) as validated_hypotheses,
  COUNT(DISTINCT CASE WHEN h.status = 'invalidated' THEN h.id END) as invalidated_hypotheses,
  COUNT(DISTINCT CASE WHEN h.status = 'testing' THEN h.id END) as testing_hypotheses,
  COUNT(DISTINCT CASE WHEN h.status = 'proposed' THEN h.id END) as proposed_hypotheses,
  COUNT(DISTINCT h.id) as total_hypotheses,

  -- Experiment counts
  COUNT(DISTINCT CASE WHEN e.outcome = 'success' THEN e.id END) as successful_experiments,
  COUNT(DISTINCT CASE WHEN e.outcome = 'failure' THEN e.id END) as failed_experiments,
  COUNT(DISTINCT CASE WHEN e.outcome = 'inconclusive' THEN e.id END) as inconclusive_experiments,
  COUNT(DISTINCT CASE WHEN e.status = 'in_progress' THEN e.id END) as active_experiments,
  COUNT(DISTINCT CASE WHEN e.status = 'completed' THEN e.id END) as completed_experiments,
  COUNT(DISTINCT e.id) as total_experiments,

  -- Canvas validation
  COUNT(DISTINCT bmc.id) as total_business_models,
  COUNT(DISTINCT CASE WHEN bmc.status = 'validated' THEN bmc.id END) as validated_business_models,
  COUNT(DISTINCT CASE WHEN bmc.status = 'active' THEN bmc.id END) as active_business_models,

  COUNT(DISTINCT vpc.id) as total_value_propositions,
  COUNT(DISTINCT CASE WHEN vpc.status = 'validated' THEN vpc.id END) as validated_value_propositions,
  AVG(vpc.fit_score) as avg_vpc_fit_score,

  COUNT(DISTINCT cp.id) as total_customer_profiles,
  COUNT(DISTINCT CASE WHEN cp.status = 'validated' THEN cp.id END) as validated_customer_profiles,

  -- Log entry counts
  COUNT(DISTINCT le.id) as total_log_entries,
  COUNT(DISTINCT CASE WHEN le.type = 'experiment' THEN le.id END) as experiment_log_entries,
  COUNT(DISTINCT CASE WHEN le.type = 'research' THEN le.id END) as research_log_entries,

  -- Computed metrics
  CASE
    WHEN v.portfolio_type = 'explore' THEN
      LEAST(100, GREATEST(0,
        COALESCE(COUNT(DISTINCT CASE WHEN h.status = 'validated' THEN h.id END) * 10, 0) +
        COALESCE(COUNT(DISTINCT CASE WHEN e.outcome = 'success' THEN e.id END) * 15, 0) +
        COALESCE(AVG(vpc.fit_score) * 50, 0)
      ))
    ELSE NULL
  END as computed_evidence_score,

  -- Rates
  CASE
    WHEN COUNT(DISTINCT h.id) > 0 THEN
      ROUND((COUNT(DISTINCT CASE WHEN h.status = 'validated' THEN h.id END)::numeric / COUNT(DISTINCT h.id)) * 100, 1)
    ELSE NULL
  END as hypothesis_validation_rate,

  CASE
    WHEN COUNT(DISTINCT e.id) FILTER (WHERE e.outcome IS NOT NULL) > 0 THEN
      ROUND((COUNT(DISTINCT CASE WHEN e.outcome = 'success' THEN e.id END)::numeric /
             COUNT(DISTINCT e.id) FILTER (WHERE e.outcome IS NOT NULL)) * 100, 1)
    ELSE NULL
  END as experiment_success_rate,

  -- Timestamps
  GREATEST(
    MAX(h.updated_at),
    MAX(e.updated_at),
    MAX(le.created_at),
    MAX(bmc.updated_at),
    MAX(vpc.updated_at)
  ) as last_evidence_activity_at,

  v.created_at,
  v.updated_at,
  now() as refreshed_at

FROM ventures v
LEFT JOIN studio_projects sp ON sp.id = v.studio_project_id
LEFT JOIN studio_hypotheses h ON h.project_id = sp.id
LEFT JOIN studio_experiments e ON e.project_id = sp.id
LEFT JOIN log_entries le ON le.studio_project_id = sp.id
LEFT JOIN business_model_canvases bmc ON bmc.studio_project_id = sp.id
LEFT JOIN value_proposition_canvases vpc ON vpc.studio_project_id = sp.id
LEFT JOIN customer_profiles cp ON cp.studio_project_id = sp.id

GROUP BY
  v.id, v.title, v.slug, v.portfolio_type, v.horizon, v.explore_stage, v.exploit_stage,
  v.evidence_strength, v.innovation_risk, v.strategic_value_score, v.studio_project_id,
  v.expected_return, v.profitability, v.sustainability, v.disruption_risk,
  v.total_investment, v.current_investment, v.allocated_fte, v.next_review_due_at,
  sp.status, v.created_at, v.updated_at;

-- Create indexes on materialized view
CREATE UNIQUE INDEX idx_portfolio_evidence_summary_venture_id
    ON portfolio_evidence_summary (venture_id);

CREATE INDEX idx_portfolio_evidence_portfolio_type
    ON portfolio_evidence_summary(portfolio_type) WHERE portfolio_type IS NOT NULL;

CREATE INDEX idx_portfolio_evidence_score
    ON portfolio_evidence_summary(computed_evidence_score) WHERE computed_evidence_score IS NOT NULL;

-- Add comment
COMMENT ON MATERIALIZED VIEW portfolio_evidence_summary IS 'Aggregates evidence from hypotheses, experiments, canvases, and log entries for portfolio ventures. Refresh with: REFRESH MATERIALIZED VIEW CONCURRENTLY portfolio_evidence_summary';

-- ============================================================================
-- STEP 9: UPDATE FUNCTIONS
-- ============================================================================

-- Function: Compute evidence strength category from score
CREATE OR REPLACE FUNCTION compute_evidence_strength(p_venture_id UUID)
RETURNS TEXT AS $$
DECLARE
  evidence_score NUMERIC;
  THRESHOLD_WEAK CONSTANT INTEGER := 20;
  THRESHOLD_MODERATE CONSTANT INTEGER := 50;
  THRESHOLD_STRONG CONSTANT INTEGER := 75;
BEGIN
  SELECT computed_evidence_score INTO evidence_score
  FROM portfolio_evidence_summary
  WHERE venture_id = p_venture_id;

  RETURN CASE
    WHEN evidence_score IS NULL OR evidence_score < THRESHOLD_WEAK THEN 'none'
    WHEN evidence_score < THRESHOLD_MODERATE THEN 'weak'
    WHEN evidence_score < THRESHOLD_STRONG THEN 'moderate'
    ELSE 'strong'
  END;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION compute_evidence_strength IS 'Computes evidence strength category (none/weak/moderate/strong) from aggregated evidence score for ventures. Thresholds: <20 none, <50 weak, <75 moderate, ≥75 strong';

-- Function: Suggest stage transitions based on evidence
CREATE OR REPLACE FUNCTION suggest_explore_stage_transition(p_venture_id UUID)
RETURNS JSONB AS $$
DECLARE
  summary RECORD;
  suggestion JSONB;
BEGIN
  SELECT * INTO summary
  FROM portfolio_evidence_summary
  WHERE venture_id = p_venture_id;

  IF summary IS NULL THEN
    RETURN jsonb_build_object(
      'error', 'Venture not found or no evidence data available'
    );
  END IF;

  -- Rule: Ideation → Discovery (at least 1 hypothesis)
  IF summary.explore_stage = 'ideation' AND summary.total_hypotheses >= 1 THEN
    suggestion = jsonb_build_object(
      'current_stage', 'ideation',
      'suggested_stage', 'discovery',
      'reason', 'Has defined hypotheses ready for testing',
      'confidence', 'high',
      'evidence', jsonb_build_object(
        'total_hypotheses', summary.total_hypotheses
      )
    );

  -- Rule: Discovery → Validation (at least 3 experiments, 2+ successful)
  ELSIF summary.explore_stage = 'discovery' AND summary.total_experiments >= 3 AND summary.successful_experiments >= 2 THEN
    suggestion = jsonb_build_object(
      'current_stage', 'discovery',
      'suggested_stage', 'validation',
      'reason', 'Has sufficient successful experiments to validate',
      'confidence', 'high',
      'evidence', jsonb_build_object(
        'total_experiments', summary.total_experiments,
        'successful_experiments', summary.successful_experiments
      )
    );

  -- Rule: Validation → Acceleration (high evidence score, validated canvas)
  ELSIF summary.explore_stage = 'validation' AND summary.computed_evidence_score >= 75 AND summary.validated_business_models >= 1 THEN
    suggestion = jsonb_build_object(
      'current_stage', 'validation',
      'suggested_stage', 'acceleration',
      'reason', 'Strong evidence and validated business model',
      'confidence', 'high',
      'evidence', jsonb_build_object(
        'computed_evidence_score', summary.computed_evidence_score,
        'validated_business_models', summary.validated_business_models
      )
    );

  ELSE
    -- No transition suggested
    suggestion = jsonb_build_object(
      'current_stage', summary.explore_stage,
      'suggested_stage', summary.explore_stage,
      'reason', 'Not enough evidence to suggest stage transition',
      'confidence', 'low'
    );
  END IF;

  RETURN suggestion;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION suggest_explore_stage_transition IS 'Suggests explore stage transitions for ventures based on evidence thresholds';

-- Function: Get portfolio metrics summary
CREATE OR REPLACE FUNCTION get_portfolio_metrics()
RETURNS JSONB AS $$
DECLARE
  v_metrics JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total_ventures', COUNT(*),
    'explore_ventures', COUNT(*) FILTER (WHERE portfolio_type = 'explore'),
    'exploit_ventures', COUNT(*) FILTER (WHERE portfolio_type = 'exploit'),
    'avg_evidence_score', ROUND(AVG(computed_evidence_score)::numeric, 1),
    'high_risk_ventures', COUNT(*) FILTER (WHERE innovation_risk = 'high'),
    'ventures_due_review', COUNT(*) FILTER (WHERE next_review_due_at < NOW()),
    'h1_ventures', COUNT(*) FILTER (WHERE horizon = 'h1'),
    'h2_ventures', COUNT(*) FILTER (WHERE horizon = 'h2'),
    'h3_ventures', COUNT(*) FILTER (WHERE horizon = 'h3')
  ) INTO v_metrics
  FROM portfolio_evidence_summary;

  RETURN v_metrics;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_portfolio_metrics IS 'Returns summary metrics for portfolio ventures dashboard';

-- ============================================================================
-- STEP 10: UPDATE BACKLOG ITEMS REFERENCES
-- ============================================================================

-- Update backlog_items.converted_to string values
UPDATE backlog_items
SET converted_to = 'venture'
WHERE converted_to = 'project';

COMMENT ON COLUMN backlog_items.converted_to IS 'Type of entity this was converted to: venture, specimen, log_entry, studio_project, etc.';

-- ============================================================================
-- STEP 11: ADD TABLE COMMENTS
-- ============================================================================

COMMENT ON TABLE ventures IS 'Portfolio ventures (businesses, products, services) - public-facing portfolio items with Strategyzer portfolio management dimensions';
COMMENT ON TABLE venture_specimens IS 'Junction table linking ventures to specimens (design components)';
COMMENT ON TABLE log_entry_ventures IS 'Junction table linking log entries to ventures';

-- ============================================================================
-- FINAL: REFRESH MATERIALIZED VIEW
-- ============================================================================

REFRESH MATERIALIZED VIEW portfolio_evidence_summary;

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES (run these after migration)
-- ============================================================================

-- Verify ventures table exists
-- SELECT COUNT(*) FROM ventures;

-- Verify junction tables exist
-- SELECT COUNT(*) FROM venture_specimens;
-- SELECT COUNT(*) FROM log_entry_ventures;

-- Verify materialized view exists and has data
-- SELECT COUNT(*) FROM portfolio_evidence_summary;

-- Verify indexes exist
-- SELECT indexname FROM pg_indexes WHERE tablename = 'ventures';
-- SELECT indexname FROM pg_indexes WHERE tablename = 'venture_specimens';
-- SELECT indexname FROM pg_indexes WHERE tablename = 'log_entry_ventures';

-- Verify RLS policies exist
-- SELECT policyname FROM pg_policies WHERE tablename = 'ventures';

-- Verify functions exist
-- SELECT proname FROM pg_proc WHERE proname LIKE '%venture%' OR proname LIKE '%portfolio%';
