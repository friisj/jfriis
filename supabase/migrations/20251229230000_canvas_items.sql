-- Canvas Items as First-Class Entities
-- Normalizes items from BMC, Customer Profile, and Value Map blocks
-- Enables cross-canvas linking, individual validation, and FIT analysis
-- Migration created: 2025-12-29

-- ============================================================================
-- 1. CANVAS_ITEMS TABLE
-- ============================================================================

CREATE TABLE canvas_items (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Project scope
  studio_project_id UUID REFERENCES studio_projects(id) ON DELETE SET NULL,

  -- Content
  title TEXT NOT NULL,
  description TEXT,

  -- Item type - determines which blocks this item can appear in
  item_type TEXT NOT NULL CHECK (item_type IN (
    -- Business Model Canvas
    'partner',           -- key_partners
    'activity',          -- key_activities
    'resource',          -- key_resources
    'value_proposition', -- value_propositions
    'segment',           -- customer_segments
    'relationship',      -- customer_relationships
    'channel',           -- channels
    'cost',              -- cost_structure
    'revenue',           -- revenue_streams
    -- Customer Profile
    'job',               -- jobs
    'pain',              -- pains
    'gain',              -- gains
    -- Value Map
    'product_service',   -- products_services
    'pain_reliever',     -- pain_relievers
    'gain_creator'       -- gain_creators
  )),

  -- Strategyzer prioritization
  importance TEXT DEFAULT 'medium' CHECK (importance IN ('critical', 'high', 'medium', 'low')),

  -- Validation tracking
  validation_status TEXT DEFAULT 'untested' CHECK (validation_status IN (
    'untested',
    'testing',
    'validated',
    'invalidated'
  )),

  -- Job-specific fields (for item_type = 'job')
  job_type TEXT CHECK (job_type IN ('functional', 'social', 'emotional', 'supporting')),
  job_context TEXT, -- "When I'm..." context for the job

  -- Pain/Gain intensity (for item_type IN ('pain', 'gain'))
  intensity TEXT CHECK (intensity IN ('minor', 'moderate', 'major', 'extreme')),

  -- Frequency/occurrence
  frequency TEXT CHECK (frequency IN ('rarely', 'sometimes', 'often', 'always')),

  -- Metadata
  notes TEXT,
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_canvas_items_project ON canvas_items(studio_project_id);
CREATE INDEX idx_canvas_items_type ON canvas_items(item_type);
CREATE INDEX idx_canvas_items_importance ON canvas_items(importance);
CREATE INDEX idx_canvas_items_validation ON canvas_items(validation_status);
CREATE INDEX idx_canvas_items_job_type ON canvas_items(job_type) WHERE job_type IS NOT NULL;

-- Trigger
CREATE TRIGGER update_canvas_items_updated_at
  BEFORE UPDATE ON canvas_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 2. CANVAS_ITEM_PLACEMENTS TABLE
-- Tracks where items appear across canvases (polymorphic)
-- ============================================================================

CREATE TABLE canvas_item_placements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- The item being placed
  canvas_item_id UUID NOT NULL REFERENCES canvas_items(id) ON DELETE CASCADE,

  -- Which canvas (polymorphic reference)
  canvas_type TEXT NOT NULL CHECK (canvas_type IN (
    'business_model_canvas',
    'customer_profile',
    'value_map'
  )),
  canvas_id UUID NOT NULL,

  -- Which block within the canvas
  block_name TEXT NOT NULL,

  -- Position within the block (for ordering)
  position INTEGER DEFAULT 0,

  -- Optional override of validation status at placement level
  -- If null, inherits from canvas_item
  validation_status_override TEXT CHECK (validation_status_override IN (
    'untested', 'testing', 'validated', 'invalidated'
  )),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Each item can only appear once per canvas+block
  CONSTRAINT unique_item_placement UNIQUE (canvas_item_id, canvas_type, canvas_id, block_name)
);

-- Indexes for efficient lookups
CREATE INDEX idx_placements_item ON canvas_item_placements(canvas_item_id);
CREATE INDEX idx_placements_canvas ON canvas_item_placements(canvas_type, canvas_id);
CREATE INDEX idx_placements_block ON canvas_item_placements(canvas_type, canvas_id, block_name);

-- ============================================================================
-- 3. CANVAS_ITEM_ASSUMPTIONS TABLE
-- Links items to assumptions (many-to-many)
-- ============================================================================

CREATE TABLE canvas_item_assumptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  canvas_item_id UUID NOT NULL REFERENCES canvas_items(id) ON DELETE CASCADE,
  assumption_id UUID NOT NULL REFERENCES assumptions(id) ON DELETE CASCADE,

  -- How does this assumption relate to this item?
  relationship_type TEXT DEFAULT 'about' CHECK (relationship_type IN (
    'about',       -- Assumption is about this item
    'depends_on',  -- Item depends on this assumption being true
    'validates',   -- If assumption is validated, item is validated
    'contradicts'  -- Assumption contradicts this item
  )),

  -- Notes about the relationship
  notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Each item-assumption pair is unique per relationship type
  CONSTRAINT unique_item_assumption UNIQUE (canvas_item_id, assumption_id, relationship_type)
);

-- Indexes
CREATE INDEX idx_item_assumptions_item ON canvas_item_assumptions(canvas_item_id);
CREATE INDEX idx_item_assumptions_assumption ON canvas_item_assumptions(assumption_id);

-- ============================================================================
-- 4. CANVAS_ITEM_MAPPINGS TABLE
-- FIT mappings between Value Map items and Customer Profile items
-- ============================================================================

CREATE TABLE canvas_item_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Source item (typically from Value Map: pain_reliever, gain_creator, product_service)
  source_item_id UUID NOT NULL REFERENCES canvas_items(id) ON DELETE CASCADE,

  -- Target item (typically from Customer Profile: pain, gain, job)
  target_item_id UUID NOT NULL REFERENCES canvas_items(id) ON DELETE CASCADE,

  -- Mapping type
  mapping_type TEXT NOT NULL CHECK (mapping_type IN (
    'relieves',    -- pain_reliever → pain
    'creates',     -- gain_creator → gain
    'addresses',   -- product_service → job
    'enables'      -- general enablement relationship
  )),

  -- FIT strength assessment
  fit_strength TEXT DEFAULT 'partial' CHECK (fit_strength IN (
    'weak',     -- Barely addresses
    'partial',  -- Somewhat addresses
    'strong',   -- Significantly addresses
    'perfect'   -- Fully addresses
  )),

  -- How was this mapping validated?
  validation_method TEXT CHECK (validation_method IN (
    'assumed',     -- We think this is true
    'interviewed', -- Customer interviews confirm
    'tested',      -- Experiment/prototype tested
    'measured'     -- Quantitative data supports
  )),

  -- Notes about the mapping
  notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Prevent duplicate mappings
  CONSTRAINT unique_item_mapping UNIQUE (source_item_id, target_item_id, mapping_type),

  -- Prevent self-mapping
  CONSTRAINT no_self_mapping CHECK (source_item_id != target_item_id)
);

-- Indexes
CREATE INDEX idx_mappings_source ON canvas_item_mappings(source_item_id);
CREATE INDEX idx_mappings_target ON canvas_item_mappings(target_item_id);
CREATE INDEX idx_mappings_type ON canvas_item_mappings(mapping_type);
CREATE INDEX idx_mappings_fit ON canvas_item_mappings(fit_strength);

-- Trigger
CREATE TRIGGER update_canvas_item_mappings_updated_at
  BEFORE UPDATE ON canvas_item_mappings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 5. CANVAS_ITEM_EVIDENCE TABLE
-- Links items directly to evidence (separate from assumption evidence)
-- ============================================================================

CREATE TABLE canvas_item_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  canvas_item_id UUID NOT NULL REFERENCES canvas_items(id) ON DELETE CASCADE,

  -- Evidence details (similar to assumption_evidence)
  evidence_type TEXT NOT NULL CHECK (evidence_type IN (
    'interview',
    'survey',
    'analytics',
    'experiment',
    'observation',
    'research',
    'competitor',
    'expert'
  )),
  title TEXT NOT NULL,
  summary TEXT,
  url TEXT,

  -- Assessment
  supports_item BOOLEAN, -- true = supports, false = contradicts, null = unclear
  confidence TEXT CHECK (confidence IN ('low', 'medium', 'high')),

  -- When collected
  collected_at TIMESTAMPTZ,

  -- Metadata
  metadata JSONB DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_item_evidence_item ON canvas_item_evidence(canvas_item_id);
CREATE INDEX idx_item_evidence_type ON canvas_item_evidence(evidence_type);
CREATE INDEX idx_item_evidence_supports ON canvas_item_evidence(supports_item);

-- Trigger
CREATE TRIGGER update_canvas_item_evidence_updated_at
  BEFORE UPDATE ON canvas_item_evidence
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 6. ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE canvas_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE canvas_item_placements ENABLE ROW LEVEL SECURITY;
ALTER TABLE canvas_item_assumptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE canvas_item_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE canvas_item_evidence ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Public read access to canvas_items" ON canvas_items
  FOR SELECT USING (true);

CREATE POLICY "Public read access to canvas_item_placements" ON canvas_item_placements
  FOR SELECT USING (true);

CREATE POLICY "Public read access to canvas_item_assumptions" ON canvas_item_assumptions
  FOR SELECT USING (true);

CREATE POLICY "Public read access to canvas_item_mappings" ON canvas_item_mappings
  FOR SELECT USING (true);

CREATE POLICY "Public read access to canvas_item_evidence" ON canvas_item_evidence
  FOR SELECT USING (true);

-- Admin full access
CREATE POLICY "Admin full access to canvas_items" ON canvas_items
  FOR ALL USING (is_admin());

CREATE POLICY "Admin full access to canvas_item_placements" ON canvas_item_placements
  FOR ALL USING (is_admin());

CREATE POLICY "Admin full access to canvas_item_assumptions" ON canvas_item_assumptions
  FOR ALL USING (is_admin());

CREATE POLICY "Admin full access to canvas_item_mappings" ON canvas_item_mappings
  FOR ALL USING (is_admin());

CREATE POLICY "Admin full access to canvas_item_evidence" ON canvas_item_evidence
  FOR ALL USING (is_admin());

-- ============================================================================
-- 7. HELPER VIEWS
-- ============================================================================

-- View: Items with their placements aggregated
CREATE VIEW canvas_items_with_placements AS
SELECT
  ci.*,
  COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'placement_id', cip.id,
        'canvas_type', cip.canvas_type,
        'canvas_id', cip.canvas_id,
        'block_name', cip.block_name,
        'position', cip.position
      )
    ) FILTER (WHERE cip.id IS NOT NULL),
    '[]'::jsonb
  ) as placements,
  COUNT(cip.id) as placement_count
FROM canvas_items ci
LEFT JOIN canvas_item_placements cip ON ci.id = cip.canvas_item_id
GROUP BY ci.id;

-- View: Items with assumption counts
CREATE VIEW canvas_items_with_assumptions AS
SELECT
  ci.*,
  COUNT(cia.id) as assumption_count,
  COUNT(cia.id) FILTER (WHERE a.status = 'validated') as validated_assumption_count,
  COUNT(cia.id) FILTER (WHERE a.status = 'invalidated') as invalidated_assumption_count
FROM canvas_items ci
LEFT JOIN canvas_item_assumptions cia ON ci.id = cia.canvas_item_id
LEFT JOIN assumptions a ON cia.assumption_id = a.id
GROUP BY ci.id;

-- View: FIT analysis - pain relievers to pains
CREATE VIEW fit_pain_relief AS
SELECT
  cim.id as mapping_id,
  pr.id as pain_reliever_id,
  pr.title as pain_reliever,
  p.id as pain_id,
  p.title as pain,
  p.intensity as pain_intensity,
  cim.fit_strength,
  cim.validation_method,
  cim.notes,
  pr.studio_project_id
FROM canvas_item_mappings cim
JOIN canvas_items pr ON cim.source_item_id = pr.id AND pr.item_type = 'pain_reliever'
JOIN canvas_items p ON cim.target_item_id = p.id AND p.item_type = 'pain'
WHERE cim.mapping_type = 'relieves';

-- View: FIT analysis - gain creators to gains
CREATE VIEW fit_gain_creation AS
SELECT
  cim.id as mapping_id,
  gc.id as gain_creator_id,
  gc.title as gain_creator,
  g.id as gain_id,
  g.title as gain,
  g.intensity as gain_intensity,
  cim.fit_strength,
  cim.validation_method,
  cim.notes,
  gc.studio_project_id
FROM canvas_item_mappings cim
JOIN canvas_items gc ON cim.source_item_id = gc.id AND gc.item_type = 'gain_creator'
JOIN canvas_items g ON cim.target_item_id = g.id AND g.item_type = 'gain'
WHERE cim.mapping_type = 'creates';

-- ============================================================================
-- 8. COMMENTS
-- ============================================================================

COMMENT ON TABLE canvas_items IS 'First-class entities for canvas block items, enabling cross-canvas linking and individual validation';
COMMENT ON TABLE canvas_item_placements IS 'Tracks where items appear across canvases (BMC, Customer Profile, Value Map)';
COMMENT ON TABLE canvas_item_assumptions IS 'Links canvas items to assumptions for granular validation tracking';
COMMENT ON TABLE canvas_item_mappings IS 'FIT mappings between Value Map items and Customer Profile items';
COMMENT ON TABLE canvas_item_evidence IS 'Direct evidence linked to canvas items';

COMMENT ON COLUMN canvas_items.item_type IS 'Determines which canvas blocks this item can be placed in';
COMMENT ON COLUMN canvas_items.job_type IS 'Only for job items: functional, social, emotional, or supporting';
COMMENT ON COLUMN canvas_items.intensity IS 'Only for pain/gain items: how severe/important';

COMMENT ON COLUMN canvas_item_placements.canvas_type IS 'Polymorphic reference to canvas table';
COMMENT ON COLUMN canvas_item_placements.validation_status_override IS 'If set, overrides the item validation_status for this specific placement';

COMMENT ON COLUMN canvas_item_mappings.fit_strength IS 'How well does the source item address the target item need';
COMMENT ON COLUMN canvas_item_mappings.validation_method IS 'How was this FIT mapping validated';
