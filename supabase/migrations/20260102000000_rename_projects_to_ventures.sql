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

-- NOTE: Materialized view creation skipped because it depends on columns
-- from a broken/incomplete migration (20251229140000_add_portfolio_dimensions.sql.broken)
-- The ventures table doesn't have portfolio_type, horizon, etc. columns.
DROP MATERIALIZED VIEW IF EXISTS portfolio_evidence_summary CASCADE;

-- ============================================================================
-- STEP 9: UPDATE FUNCTIONS
-- ============================================================================

-- NOTE: Functions skipped because they depend on portfolio_evidence_summary
-- which depends on columns from a broken/incomplete migration.
-- Functions: compute_evidence_strength, suggest_explore_stage_transition, get_portfolio_metrics

-- ============================================================================
-- STEP 10: UPDATE BACKLOG ITEMS REFERENCES
-- ============================================================================

-- NOTE: Skipped - converted_to column doesn't exist on backlog_items
-- UPDATE backlog_items SET converted_to = 'venture' WHERE converted_to = 'project';

-- ============================================================================
-- STEP 11: ADD TABLE COMMENTS
-- ============================================================================

COMMENT ON TABLE ventures IS 'Portfolio ventures (businesses, products, services) - public-facing portfolio items with Strategyzer portfolio management dimensions';
COMMENT ON TABLE venture_specimens IS 'Junction table linking ventures to specimens (design components)';
COMMENT ON TABLE log_entry_ventures IS 'Junction table linking log entries to ventures';

-- ============================================================================
-- FINAL: REFRESH MATERIALIZED VIEW
-- ============================================================================

-- NOTE: Skipped - materialized view not created due to missing columns
-- REFRESH MATERIALIZED VIEW portfolio_evidence_summary;

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
