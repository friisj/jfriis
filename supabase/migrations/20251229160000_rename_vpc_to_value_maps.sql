-- Strategyzer Canvas Refactor: Rename VPC to Value Maps + Create proper VPC
-- Migration created: 2025-12-29
--
-- Per Strategyzer methodology:
-- - Value Map (square) = products/services, pain relievers, gain creators
-- - Value Proposition Canvas = FIT analysis between Value Map + Customer Profile

-- ============================================================================
-- 1. RENAME value_proposition_canvases → value_maps
-- ============================================================================

-- Drop existing indexes (will recreate with new names)
DROP INDEX IF EXISTS idx_vpc_project;
DROP INDEX IF EXISTS idx_vpc_hypothesis;
DROP INDEX IF EXISTS idx_vpc_status;
DROP INDEX IF EXISTS idx_vpc_bmc;
DROP INDEX IF EXISTS idx_vpc_customer_profile;
DROP INDEX IF EXISTS idx_vpc_version_lineage;
DROP INDEX IF EXISTS idx_vpc_fit_score;

-- Drop existing trigger
DROP TRIGGER IF EXISTS update_vpc_updated_at ON value_proposition_canvases;

-- Drop existing policies
DROP POLICY IF EXISTS "Public read access to published VPC" ON value_proposition_canvases;
DROP POLICY IF EXISTS "Admin full access to VPC" ON value_proposition_canvases;

-- Rename the table
ALTER TABLE value_proposition_canvases RENAME TO value_maps;

-- Rename the unique constraint
ALTER TABLE value_maps RENAME CONSTRAINT unique_vpc_slug_per_project TO unique_vm_slug_per_project;

-- Recreate indexes with new names
CREATE INDEX idx_vm_project ON value_maps(studio_project_id);
CREATE INDEX idx_vm_hypothesis ON value_maps(hypothesis_id);
CREATE INDEX idx_vm_status ON value_maps(status);
CREATE INDEX idx_vm_bmc ON value_maps(business_model_canvas_id);
CREATE INDEX idx_vm_customer_profile ON value_maps(customer_profile_id);
CREATE INDEX idx_vm_version_lineage ON value_maps(parent_version_id);
CREATE INDEX idx_vm_fit_score ON value_maps(fit_score) WHERE fit_score IS NOT NULL;

-- Recreate trigger
CREATE TRIGGER update_vm_updated_at
  BEFORE UPDATE ON value_maps
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Recreate RLS policies
CREATE POLICY "Public read access to published value maps" ON value_maps
  FOR SELECT USING (status IN ('active', 'validated'));

CREATE POLICY "Admin full access to value maps" ON value_maps
  FOR ALL USING (is_admin());

-- ============================================================================
-- 2. CREATE NEW value_proposition_canvases TABLE (Fit Analysis)
-- ============================================================================

CREATE TABLE value_proposition_canvases (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,

  -- Studio Context
  studio_project_id UUID REFERENCES studio_projects(id) ON DELETE SET NULL,
  hypothesis_id UUID REFERENCES studio_hypotheses(id) ON DELETE SET NULL,

  -- Core Links (both required for a VPC)
  value_map_id UUID NOT NULL REFERENCES value_maps(id) ON DELETE CASCADE,
  customer_profile_id UUID NOT NULL REFERENCES customer_profiles(id) ON DELETE CASCADE,

  -- Fit Analysis
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'validated', 'archived')),
  fit_score DECIMAL(3,2) CHECK (fit_score >= 0 AND fit_score <= 1),
  fit_analysis JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Which jobs/pains/gains from customer profile are addressed by value map
  -- Stores item IDs or descriptions that are addressed
  addressed_jobs JSONB NOT NULL DEFAULT '{"items": [], "coverage": null}'::jsonb,
  addressed_pains JSONB NOT NULL DEFAULT '{"items": [], "coverage": null}'::jsonb,
  addressed_gains JSONB NOT NULL DEFAULT '{"items": [], "coverage": null}'::jsonb,

  -- Validation
  assumptions JSONB NOT NULL DEFAULT '{"items": []}'::jsonb,
  evidence JSONB NOT NULL DEFAULT '{"items": []}'::jsonb,
  validation_status TEXT NOT NULL DEFAULT 'untested' CHECK (validation_status IN ('untested', 'testing', 'validated', 'invalidated')),
  last_validated_at TIMESTAMPTZ,

  -- Metadata
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Constraints
  CONSTRAINT unique_vpc_slug_per_project UNIQUE (studio_project_id, slug),
  CONSTRAINT unique_vpc_per_vm_cp UNIQUE (value_map_id, customer_profile_id)
);

-- Indexes
CREATE INDEX idx_vpc_project ON value_proposition_canvases(studio_project_id);
CREATE INDEX idx_vpc_hypothesis ON value_proposition_canvases(hypothesis_id);
CREATE INDEX idx_vpc_value_map ON value_proposition_canvases(value_map_id);
CREATE INDEX idx_vpc_customer_profile ON value_proposition_canvases(customer_profile_id);
CREATE INDEX idx_vpc_status ON value_proposition_canvases(status);
CREATE INDEX idx_vpc_fit_score ON value_proposition_canvases(fit_score) WHERE fit_score IS NOT NULL;
CREATE INDEX idx_vpc_validation_status ON value_proposition_canvases(validation_status);

-- Trigger
CREATE TRIGGER update_vpc_updated_at
  BEFORE UPDATE ON value_proposition_canvases
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE value_proposition_canvases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access to published VPC" ON value_proposition_canvases
  FOR SELECT USING (status IN ('active', 'validated'));

CREATE POLICY "Admin full access to VPC" ON value_proposition_canvases
  FOR ALL USING (is_admin());

-- ============================================================================
-- 3. UPDATE RELATED TABLES
-- ============================================================================

-- Update business_model_canvases to reference value_maps instead
-- (The related_value_proposition_ids should now reference value_maps)
-- Note: This is a semantic change - the array now references value_maps
COMMENT ON COLUMN business_model_canvases.related_value_proposition_ids IS
  'References to value_maps (formerly value_proposition_canvases). Renamed for Strategyzer methodology compliance.';

-- ============================================================================
-- 4. SEED DATA: Create a VPC linking existing value map and customer profile
-- ============================================================================

-- Only insert if we have both a value map and customer profile
INSERT INTO value_proposition_canvases (
  slug,
  name,
  description,
  studio_project_id,
  value_map_id,
  customer_profile_id,
  status,
  fit_score,
  fit_analysis,
  addressed_jobs,
  addressed_pains,
  addressed_gains,
  validation_status
)
SELECT
  'dst-fit-analysis',
  'Design System Tool - Product-Market Fit',
  'Analyzing how well the Design System Tool value proposition fits the needs of design system maintainers',
  vm.studio_project_id,
  vm.id,
  cp.id,
  'active',
  0.65,
  '{
    "summary": "Good fit for efficiency gains, partial fit for pain relief",
    "strengths": ["Reduces manual token management", "Provides visual feedback"],
    "gaps": ["Does not directly address team alignment issues", "Learning curve for new paradigm"],
    "recommendations": ["Add collaboration features", "Improve onboarding"]
  }'::jsonb,
  '{
    "items": ["Maintain design system tokens", "Ensure consistency across products"],
    "coverage": 0.7
  }'::jsonb,
  '{
    "items": ["Manual token updates are error-prone", "Hard to visualize token relationships"],
    "coverage": 0.6
  }'::jsonb,
  '{
    "items": ["Faster design-to-code handoff", "Single source of truth for design tokens"],
    "coverage": 0.7
  }'::jsonb,
  'testing'
FROM value_maps vm
CROSS JOIN customer_profiles cp
WHERE vm.slug = 'design-system-tool-vpc'
  AND cp.slug = 'design-system-maintainers'
LIMIT 1;
