-- ============================================================================
-- FIX: Rename projects -> ventures (re-apply)
-- The original 20260102000000 migration was recorded but didn't take effect
-- because it used BEGIN/COMMIT inside Supabase's own transaction wrapper.
-- This migration applies only the steps relevant to current DB state.
-- ============================================================================

-- Step 1: Rename main table
ALTER TABLE projects RENAME TO ventures;

-- Step 2: Rename indexes (IF EXISTS for safety)
ALTER INDEX IF EXISTS idx_projects_slug RENAME TO idx_ventures_slug;
ALTER INDEX IF EXISTS idx_projects_status RENAME TO idx_ventures_status;
ALTER INDEX IF EXISTS idx_projects_published RENAME TO idx_ventures_published;
ALTER INDEX IF EXISTS idx_projects_created_at RENAME TO idx_ventures_created_at;
ALTER INDEX IF EXISTS idx_projects_studio_project RENAME TO idx_ventures_studio_project;
ALTER INDEX IF EXISTS idx_projects_portfolio_type RENAME TO idx_ventures_portfolio_type;
ALTER INDEX IF EXISTS idx_projects_explore_stage RENAME TO idx_ventures_explore_stage;
ALTER INDEX IF EXISTS idx_projects_exploit_stage RENAME TO idx_ventures_exploit_stage;
ALTER INDEX IF EXISTS idx_projects_horizon RENAME TO idx_ventures_horizon;
ALTER INDEX IF EXISTS idx_projects_evidence_strength RENAME TO idx_ventures_evidence_strength;
ALTER INDEX IF EXISTS idx_projects_innovation_risk RENAME TO idx_ventures_innovation_risk;
ALTER INDEX IF EXISTS idx_projects_next_review RENAME TO idx_ventures_next_review;

-- Step 3: Rename triggers
DROP TRIGGER IF EXISTS update_projects_updated_at ON ventures;
CREATE TRIGGER update_ventures_updated_at
    BEFORE UPDATE ON ventures
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Step 4: Update RLS policies
DROP POLICY IF EXISTS "Public can view published projects" ON ventures;
CREATE POLICY "Public can view published ventures"
    ON ventures FOR SELECT
    USING (published = true);

DROP POLICY IF EXISTS "Admin can do everything with projects" ON ventures;
CREATE POLICY "Admin can do everything with ventures"
    ON ventures FOR ALL
    USING (auth.jwt() ->> 'role' = 'authenticated');

-- Step 5: Add table comment
COMMENT ON TABLE ventures IS 'Portfolio ventures (businesses, products, services) - public-facing portfolio items';
