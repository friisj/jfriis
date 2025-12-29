-- Strategyzer Canvas Tables
-- Business Model Canvas, Value Proposition Canvas, and Customer Profiles
-- Migration created: 2025-12-29

-- ============================================================================
-- 1. BUSINESS MODEL CANVASES
-- ============================================================================

CREATE TABLE business_model_canvases (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,

  -- Studio Context (optional soft links)
  studio_project_id UUID REFERENCES studio_projects(id) ON DELETE SET NULL,
  hypothesis_id UUID REFERENCES studio_hypotheses(id) ON DELETE SET NULL,

  -- Canvas Metadata
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'validated', 'archived')),
  version INTEGER NOT NULL DEFAULT 1,
  parent_version_id UUID REFERENCES business_model_canvases(id) ON DELETE SET NULL,

  -- Canvas Building Blocks (JSONB for flexible, evolving content)
  -- Each block: { items: [...], metadata: {...}, assumptions: [...], validation_status: 'untested'|'testing'|'validated'|'invalidated' }

  -- Value Side (What we create)
  key_partners JSONB NOT NULL DEFAULT '{"items": [], "assumptions": [], "validation_status": "untested"}'::jsonb,
  key_activities JSONB NOT NULL DEFAULT '{"items": [], "assumptions": [], "validation_status": "untested"}'::jsonb,
  key_resources JSONB NOT NULL DEFAULT '{"items": [], "assumptions": [], "validation_status": "untested"}'::jsonb,
  value_propositions JSONB NOT NULL DEFAULT '{"items": [], "assumptions": [], "validation_status": "untested"}'::jsonb,

  -- Customer Side (Who we serve)
  customer_segments JSONB NOT NULL DEFAULT '{"items": [], "assumptions": [], "validation_status": "untested"}'::jsonb,
  customer_relationships JSONB NOT NULL DEFAULT '{"items": [], "assumptions": [], "validation_status": "untested"}'::jsonb,
  channels JSONB NOT NULL DEFAULT '{"items": [], "assumptions": [], "validation_status": "untested"}'::jsonb,

  -- Financial Side
  cost_structure JSONB NOT NULL DEFAULT '{"items": [], "assumptions": [], "validation_status": "untested"}'::jsonb,
  revenue_streams JSONB NOT NULL DEFAULT '{"items": [], "assumptions": [], "validation_status": "untested"}'::jsonb,

  -- Cross-canvas Relationships
  related_value_proposition_ids UUID[] DEFAULT '{}',
  related_customer_profile_ids UUID[] DEFAULT '{}',

  -- Extended Metadata
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Constraints
  CONSTRAINT unique_bmc_slug_per_project UNIQUE (studio_project_id, slug)
);

-- Indexes
CREATE INDEX idx_bmc_project ON business_model_canvases(studio_project_id);
CREATE INDEX idx_bmc_hypothesis ON business_model_canvases(hypothesis_id);
CREATE INDEX idx_bmc_status ON business_model_canvases(status);
CREATE INDEX idx_bmc_version_lineage ON business_model_canvases(parent_version_id);

-- Triggers
CREATE TRIGGER update_bmc_updated_at
  BEFORE UPDATE ON business_model_canvases
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 2. CUSTOMER PROFILES (before VPC due to FK dependency)
-- ============================================================================

CREATE TABLE customer_profiles (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,

  -- Studio Context (optional soft links)
  studio_project_id UUID REFERENCES studio_projects(id) ON DELETE SET NULL,
  hypothesis_id UUID REFERENCES studio_hypotheses(id) ON DELETE SET NULL,

  -- Profile Metadata
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'validated', 'archived')),
  version INTEGER NOT NULL DEFAULT 1,
  parent_version_id UUID REFERENCES customer_profiles(id) ON DELETE SET NULL,
  profile_type TEXT CHECK (profile_type IN ('persona', 'segment', 'archetype', 'icp')), -- ideal customer profile

  -- Core Profile Data (flexible JSONB for evolving understanding)
  demographics JSONB NOT NULL DEFAULT '{}'::jsonb, -- { age_range, location, income, education, role, company_size, industry, ... }
  psychographics JSONB NOT NULL DEFAULT '{}'::jsonb, -- { values, attitudes, interests, lifestyle, personality_traits, ... }
  behaviors JSONB NOT NULL DEFAULT '{}'::jsonb, -- { buying_patterns, tool_usage, decision_making, information_sources, ... }

  -- Jobs-to-be-Done Framework
  -- Each job: { description, context, importance, satisfaction, frequency, type: 'functional'|'social'|'emotional' }
  jobs JSONB NOT NULL DEFAULT '{"items": [], "evidence": [], "validation_status": "untested"}'::jsonb,

  -- Pains & Gains (aligned with VPC)
  pains JSONB NOT NULL DEFAULT '{"items": [], "severity": {}, "evidence": [], "validation_status": "untested"}'::jsonb,
  gains JSONB NOT NULL DEFAULT '{"items": [], "importance": {}, "evidence": [], "validation_status": "untested"}'::jsonb,

  -- Contextual Information
  environment JSONB NOT NULL DEFAULT '{}'::jsonb, -- { tools, constraints, influencers, budget_authority, timeline_pressures, ... }
  journey_stages JSONB NOT NULL DEFAULT '{"items": []}'::jsonb, -- Customer journey touchpoints and stages

  -- Quantitative Metrics
  market_size_estimate TEXT, -- "10K-50K companies" or "2M individuals"
  addressable_percentage DECIMAL(5,2) CHECK (addressable_percentage >= 0 AND addressable_percentage <= 100),

  -- Evidence & Validation
  evidence_sources JSONB NOT NULL DEFAULT '{"items": []}'::jsonb, -- { type: 'interview'|'survey'|'analytics'|'observation', reference: '...', confidence: '...' }
  validation_confidence TEXT CHECK (validation_confidence IN ('low', 'medium', 'high')),
  last_validated_at TIMESTAMPTZ,

  -- Cross-canvas Relationships
  related_business_model_ids UUID[] DEFAULT '{}',
  related_value_proposition_ids UUID[] DEFAULT '{}',

  -- Extended Metadata
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Constraints
  CONSTRAINT unique_profile_slug_per_project UNIQUE (studio_project_id, slug)
);

-- Indexes
CREATE INDEX idx_customer_profile_project ON customer_profiles(studio_project_id);
CREATE INDEX idx_customer_profile_hypothesis ON customer_profiles(hypothesis_id);
CREATE INDEX idx_customer_profile_status ON customer_profiles(status);
CREATE INDEX idx_customer_profile_type ON customer_profiles(profile_type);
CREATE INDEX idx_customer_profile_version_lineage ON customer_profiles(parent_version_id);
CREATE INDEX idx_customer_profile_confidence ON customer_profiles(validation_confidence);

-- Triggers
CREATE TRIGGER update_customer_profile_updated_at
  BEFORE UPDATE ON customer_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 3. VALUE PROPOSITION CANVASES (after customer_profiles due to FK dependency)
-- ============================================================================

CREATE TABLE value_proposition_canvases (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,

  -- Studio Context (optional soft links)
  studio_project_id UUID REFERENCES studio_projects(id) ON DELETE SET NULL,
  hypothesis_id UUID REFERENCES studio_hypotheses(id) ON DELETE SET NULL,

  -- Canvas Metadata
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'validated', 'archived')),
  version INTEGER NOT NULL DEFAULT 1,
  parent_version_id UUID REFERENCES value_proposition_canvases(id) ON DELETE SET NULL,
  fit_score DECIMAL(3,2) CHECK (fit_score >= 0 AND fit_score <= 1), -- 0.0-1.0 alignment score

  -- Customer Profile (Right Side) - Understanding the customer
  -- Each block: { items: [...], evidence: [...], assumptions: [], validation_status: '...' }
  customer_jobs JSONB NOT NULL DEFAULT '{"items": [], "evidence": [], "assumptions": [], "validation_status": "untested"}'::jsonb,
  pains JSONB NOT NULL DEFAULT '{"items": [], "evidence": [], "assumptions": [], "validation_status": "untested"}'::jsonb,
  gains JSONB NOT NULL DEFAULT '{"items": [], "evidence": [], "assumptions": [], "validation_status": "untested"}'::jsonb,

  -- Value Map (Left Side) - What we offer
  products_services JSONB NOT NULL DEFAULT '{"items": [], "assumptions": [], "validation_status": "untested"}'::jsonb,
  pain_relievers JSONB NOT NULL DEFAULT '{"items": [], "assumptions": [], "validation_status": "untested"}'::jsonb,
  gain_creators JSONB NOT NULL DEFAULT '{"items": [], "assumptions": [], "validation_status": "untested"}'::jsonb,

  -- Cross-canvas Relationships
  business_model_canvas_id UUID REFERENCES business_model_canvases(id) ON DELETE SET NULL,
  customer_profile_id UUID REFERENCES customer_profiles(id) ON DELETE SET NULL,

  -- Extended Metadata
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Constraints
  CONSTRAINT unique_vpc_slug_per_project UNIQUE (studio_project_id, slug)
);

-- Indexes
CREATE INDEX idx_vpc_project ON value_proposition_canvases(studio_project_id);
CREATE INDEX idx_vpc_hypothesis ON value_proposition_canvases(hypothesis_id);
CREATE INDEX idx_vpc_status ON value_proposition_canvases(status);
CREATE INDEX idx_vpc_bmc ON value_proposition_canvases(business_model_canvas_id);
CREATE INDEX idx_vpc_customer_profile ON value_proposition_canvases(customer_profile_id);
CREATE INDEX idx_vpc_version_lineage ON value_proposition_canvases(parent_version_id);
CREATE INDEX idx_vpc_fit_score ON value_proposition_canvases(fit_score) WHERE fit_score IS NOT NULL;

-- Triggers
CREATE TRIGGER update_vpc_updated_at
  BEFORE UPDATE ON value_proposition_canvases
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 4. ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS
ALTER TABLE business_model_canvases ENABLE ROW LEVEL SECURITY;
ALTER TABLE value_proposition_canvases ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_profiles ENABLE ROW LEVEL SECURITY;

-- Public read access for active/validated canvases
CREATE POLICY "Public read access to published BMC" ON business_model_canvases
  FOR SELECT USING (status IN ('active', 'validated'));

CREATE POLICY "Public read access to published VPC" ON value_proposition_canvases
  FOR SELECT USING (status IN ('active', 'validated'));

CREATE POLICY "Public read access to published profiles" ON customer_profiles
  FOR SELECT USING (status IN ('active', 'validated'));

-- Admin full access
CREATE POLICY "Admin full access to BMC" ON business_model_canvases
  FOR ALL USING (is_admin());

CREATE POLICY "Admin full access to VPC" ON value_proposition_canvases
  FOR ALL USING (is_admin());

CREATE POLICY "Admin full access to profiles" ON customer_profiles
  FOR ALL USING (is_admin());
