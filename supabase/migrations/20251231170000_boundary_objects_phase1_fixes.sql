-- Boundary Objects Phase 1: Critical Fixes
-- Addresses security, data integrity, and performance issues
-- Migration created: 2025-12-31

-- ============================================================================
-- FIX 1: POLYMORPHIC REFERENCE INTEGRITY
-- ============================================================================
-- Replace polymorphic touchpoint_mappings with explicit junction tables

-- Create separate junction tables for type safety
CREATE TABLE touchpoint_canvas_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  touchpoint_id UUID NOT NULL REFERENCES touchpoints(id) ON DELETE CASCADE,
  canvas_item_id UUID NOT NULL REFERENCES canvas_items(id) ON DELETE CASCADE,
  mapping_type TEXT NOT NULL CHECK (
    mapping_type IN (
      'addresses_job',
      'triggers_pain',
      'delivers_gain',
      'tests_assumption',
      'delivers_value_prop'
    )
  ),
  strength TEXT CHECK (strength IN ('weak', 'moderate', 'strong')),
  validated BOOLEAN DEFAULT false,
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_touchpoint_canvas_item UNIQUE (touchpoint_id, canvas_item_id, mapping_type)
);

CREATE TABLE touchpoint_customer_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  touchpoint_id UUID NOT NULL REFERENCES touchpoints(id) ON DELETE CASCADE,
  customer_profile_id UUID NOT NULL REFERENCES customer_profiles(id) ON DELETE CASCADE,
  mapping_type TEXT NOT NULL CHECK (
    mapping_type IN ('addresses_job', 'triggers_pain', 'delivers_gain')
  ),
  strength TEXT CHECK (strength IN ('weak', 'moderate', 'strong')),
  validated BOOLEAN DEFAULT false,
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_touchpoint_customer_profile UNIQUE (touchpoint_id, customer_profile_id, mapping_type)
);

CREATE TABLE touchpoint_value_propositions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  touchpoint_id UUID NOT NULL REFERENCES touchpoints(id) ON DELETE CASCADE,
  value_proposition_canvas_id UUID NOT NULL REFERENCES value_proposition_canvases(id) ON DELETE CASCADE,
  mapping_type TEXT NOT NULL CHECK (
    mapping_type IN ('delivers_value_prop', 'tests_assumption')
  ),
  strength TEXT CHECK (strength IN ('weak', 'moderate', 'strong')),
  validated BOOLEAN DEFAULT false,
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_touchpoint_value_proposition UNIQUE (touchpoint_id, value_proposition_canvas_id, mapping_type)
);

-- Indexes for junction tables
CREATE INDEX idx_touchpoint_canvas_items_touchpoint ON touchpoint_canvas_items(touchpoint_id);
CREATE INDEX idx_touchpoint_canvas_items_canvas_item ON touchpoint_canvas_items(canvas_item_id);
CREATE INDEX idx_touchpoint_customer_profiles_touchpoint ON touchpoint_customer_profiles(touchpoint_id);
CREATE INDEX idx_touchpoint_customer_profiles_customer ON touchpoint_customer_profiles(customer_profile_id);
CREATE INDEX idx_touchpoint_value_propositions_touchpoint ON touchpoint_value_propositions(touchpoint_id);
CREATE INDEX idx_touchpoint_value_propositions_vpc ON touchpoint_value_propositions(value_proposition_canvas_id);

-- Triggers for updated_at
CREATE TRIGGER update_touchpoint_canvas_items_updated_at
  BEFORE UPDATE ON touchpoint_canvas_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_touchpoint_customer_profiles_updated_at
  BEFORE UPDATE ON touchpoint_customer_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_touchpoint_value_propositions_updated_at
  BEFORE UPDATE ON touchpoint_value_propositions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Migrate data from old touchpoint_mappings to new tables
INSERT INTO touchpoint_canvas_items (touchpoint_id, canvas_item_id, mapping_type, strength, validated, notes, metadata, created_at, updated_at)
SELECT touchpoint_id, target_id, mapping_type, strength, validated, notes, metadata, created_at, updated_at
FROM touchpoint_mappings
WHERE target_type = 'canvas_item';

INSERT INTO touchpoint_customer_profiles (touchpoint_id, customer_profile_id, mapping_type, strength, validated, notes, metadata, created_at, updated_at)
SELECT touchpoint_id, target_id, mapping_type, strength, validated, notes, metadata, created_at, updated_at
FROM touchpoint_mappings
WHERE target_type = 'customer_profile';

INSERT INTO touchpoint_value_propositions (touchpoint_id, value_proposition_canvas_id, mapping_type, strength, validated, notes, metadata, created_at, updated_at)
SELECT touchpoint_id, target_id, mapping_type, strength, validated, notes, metadata, created_at, updated_at
FROM touchpoint_mappings
WHERE target_type = 'value_proposition_canvas';

-- Drop old polymorphic table
DROP TABLE touchpoint_mappings;

-- ============================================================================
-- FIX 2: UNIQUE SLUG CONSTRAINT FOR NULL PROJECT IDs
-- ============================================================================

-- Drop existing constraint
ALTER TABLE user_journeys DROP CONSTRAINT unique_journey_slug_per_project;

-- Create separate unique indexes for project-scoped and global journeys
CREATE UNIQUE INDEX unique_journey_slug_with_project
  ON user_journeys(studio_project_id, slug)
  WHERE studio_project_id IS NOT NULL;

CREATE UNIQUE INDEX unique_journey_slug_global
  ON user_journeys(slug)
  WHERE studio_project_id IS NULL;

-- ============================================================================
-- FIX 3: ADD UPDATED_AT TO TOUCHPOINT_ASSUMPTIONS
-- ============================================================================

ALTER TABLE touchpoint_assumptions ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE TRIGGER update_touchpoint_assumptions_updated_at
  BEFORE UPDATE ON touchpoint_assumptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- FIX 4: DATABASE VIEW FOR JOURNEY SUMMARIES (N+1 QUERY FIX)
-- ============================================================================

CREATE OR REPLACE VIEW journey_summaries AS
SELECT
  j.id,
  j.slug,
  j.name,
  j.description,
  j.status,
  j.validation_status,
  j.journey_type,
  j.goal,
  j.customer_profile_id,
  cp.name as customer_profile_name,
  j.studio_project_id,
  sp.name as studio_project_name,
  j.tags,
  j.created_at,
  j.updated_at,
  COUNT(DISTINCT s.id) as stage_count,
  COUNT(t.id) as touchpoint_count,
  COUNT(t.id) FILTER (WHERE t.pain_level IN ('major', 'critical')) as high_pain_count
FROM user_journeys j
LEFT JOIN journey_stages s ON s.user_journey_id = j.id
LEFT JOIN touchpoints t ON t.journey_stage_id = s.id
LEFT JOIN customer_profiles cp ON cp.id = j.customer_profile_id
LEFT JOIN studio_projects sp ON sp.id = j.studio_project_id
GROUP BY j.id, cp.name, sp.name;

-- Index for common queries on the view
CREATE INDEX idx_user_journeys_summary_lookup ON user_journeys(id, status, validation_status, customer_profile_id, studio_project_id);

-- ============================================================================
-- FIX 5: ROW-LEVEL SECURITY POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE user_journeys ENABLE ROW LEVEL SECURITY;
ALTER TABLE journey_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE touchpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE touchpoint_canvas_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE touchpoint_customer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE touchpoint_value_propositions ENABLE ROW LEVEL SECURITY;
ALTER TABLE touchpoint_assumptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE touchpoint_evidence ENABLE ROW LEVEL SECURITY;

-- Helper function to check project access
CREATE OR REPLACE FUNCTION user_has_project_access(project_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- If project_id is NULL, allow access (global journeys)
  IF project_id IS NULL THEN
    RETURN TRUE;
  END IF;

  -- Check if user owns the project or is a collaborator
  RETURN EXISTS (
    SELECT 1 FROM studio_projects
    WHERE id = project_id
    AND (
      user_id = auth.uid()
      -- Add collaborator check here if you have a collaborators table
      -- OR EXISTS (SELECT 1 FROM project_collaborators WHERE project_id = project_id AND user_id = auth.uid())
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- USER_JOURNEYS policies
CREATE POLICY "Users can view journeys in their projects"
  ON user_journeys FOR SELECT
  USING (user_has_project_access(studio_project_id));

CREATE POLICY "Users can create journeys in their projects"
  ON user_journeys FOR INSERT
  WITH CHECK (user_has_project_access(studio_project_id));

CREATE POLICY "Users can update journeys in their projects"
  ON user_journeys FOR UPDATE
  USING (user_has_project_access(studio_project_id))
  WITH CHECK (user_has_project_access(studio_project_id));

CREATE POLICY "Users can delete journeys in their projects"
  ON user_journeys FOR DELETE
  USING (user_has_project_access(studio_project_id));

-- JOURNEY_STAGES policies (inherit from parent journey)
CREATE POLICY "Users can view stages in their journeys"
  ON journey_stages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_journeys
      WHERE id = journey_stages.user_journey_id
      AND user_has_project_access(studio_project_id)
    )
  );

CREATE POLICY "Users can create stages in their journeys"
  ON journey_stages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_journeys
      WHERE id = journey_stages.user_journey_id
      AND user_has_project_access(studio_project_id)
    )
  );

CREATE POLICY "Users can update stages in their journeys"
  ON journey_stages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_journeys
      WHERE id = journey_stages.user_journey_id
      AND user_has_project_access(studio_project_id)
    )
  );

CREATE POLICY "Users can delete stages in their journeys"
  ON journey_stages FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_journeys
      WHERE id = journey_stages.user_journey_id
      AND user_has_project_access(studio_project_id)
    )
  );

-- TOUCHPOINTS policies (inherit from parent stage -> journey)
CREATE POLICY "Users can view touchpoints in their journeys"
  ON touchpoints FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM journey_stages s
      JOIN user_journeys j ON j.id = s.user_journey_id
      WHERE s.id = touchpoints.journey_stage_id
      AND user_has_project_access(j.studio_project_id)
    )
  );

CREATE POLICY "Users can create touchpoints in their journeys"
  ON touchpoints FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM journey_stages s
      JOIN user_journeys j ON j.id = s.user_journey_id
      WHERE s.id = touchpoints.journey_stage_id
      AND user_has_project_access(j.studio_project_id)
    )
  );

CREATE POLICY "Users can update touchpoints in their journeys"
  ON touchpoints FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM journey_stages s
      JOIN user_journeys j ON j.id = s.user_journey_id
      WHERE s.id = touchpoints.journey_stage_id
      AND user_has_project_access(j.studio_project_id)
    )
  );

CREATE POLICY "Users can delete touchpoints in their journeys"
  ON touchpoints FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM journey_stages s
      JOIN user_journeys j ON j.id = s.user_journey_id
      WHERE s.id = touchpoints.journey_stage_id
      AND user_has_project_access(j.studio_project_id)
    )
  );

-- TOUCHPOINT_CANVAS_ITEMS policies
CREATE POLICY "Users can manage canvas item mappings in their journeys"
  ON touchpoint_canvas_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM touchpoints t
      JOIN journey_stages s ON s.id = t.journey_stage_id
      JOIN user_journeys j ON j.id = s.user_journey_id
      WHERE t.id = touchpoint_canvas_items.touchpoint_id
      AND user_has_project_access(j.studio_project_id)
    )
  );

-- TOUCHPOINT_CUSTOMER_PROFILES policies
CREATE POLICY "Users can manage customer profile mappings in their journeys"
  ON touchpoint_customer_profiles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM touchpoints t
      JOIN journey_stages s ON s.id = t.journey_stage_id
      JOIN user_journeys j ON j.id = s.user_journey_id
      WHERE t.id = touchpoint_customer_profiles.touchpoint_id
      AND user_has_project_access(j.studio_project_id)
    )
  );

-- TOUCHPOINT_VALUE_PROPOSITIONS policies
CREATE POLICY "Users can manage value proposition mappings in their journeys"
  ON touchpoint_value_propositions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM touchpoints t
      JOIN journey_stages s ON s.id = t.journey_stage_id
      JOIN user_journeys j ON j.id = s.user_journey_id
      WHERE t.id = touchpoint_value_propositions.touchpoint_id
      AND user_has_project_access(j.studio_project_id)
    )
  );

-- TOUCHPOINT_ASSUMPTIONS policies
CREATE POLICY "Users can manage assumption links in their journeys"
  ON touchpoint_assumptions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM touchpoints t
      JOIN journey_stages s ON s.id = t.journey_stage_id
      JOIN user_journeys j ON j.id = s.user_journey_id
      WHERE t.id = touchpoint_assumptions.touchpoint_id
      AND user_has_project_access(j.studio_project_id)
    )
  );

-- TOUCHPOINT_EVIDENCE policies
CREATE POLICY "Users can manage evidence in their journeys"
  ON touchpoint_evidence FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM touchpoints t
      JOIN journey_stages s ON s.id = t.journey_stage_id
      JOIN user_journeys j ON j.id = s.user_journey_id
      WHERE t.id = touchpoint_evidence.touchpoint_id
      AND user_has_project_access(j.studio_project_id)
    )
  );

-- ============================================================================
-- FIX 6: SEQUENCE MANAGEMENT
-- ============================================================================

-- Function to resequence stages after deletion/reordering
CREATE OR REPLACE FUNCTION resequence_journey_stages(p_journey_id UUID)
RETURNS void AS $$
BEGIN
  WITH numbered AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY sequence, created_at) - 1 as new_sequence
    FROM journey_stages
    WHERE user_journey_id = p_journey_id
  )
  UPDATE journey_stages s
  SET sequence = n.new_sequence
  FROM numbered n
  WHERE s.id = n.id;
END;
$$ LANGUAGE plpgsql;

-- Function to resequence touchpoints after deletion/reordering
CREATE OR REPLACE FUNCTION resequence_stage_touchpoints(p_stage_id UUID)
RETURNS void AS $$
BEGIN
  WITH numbered AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY sequence, created_at) - 1 as new_sequence
    FROM touchpoints
    WHERE journey_stage_id = p_stage_id
  )
  UPDATE touchpoints t
  SET sequence = n.new_sequence
  FROM numbered n
  WHERE t.id = n.id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON VIEW journey_summaries IS 'Optimized view for journey list displays with aggregated counts';
COMMENT ON FUNCTION user_has_project_access IS 'Check if current user has access to a studio project';
COMMENT ON FUNCTION resequence_journey_stages IS 'Resequence all stages in a journey to eliminate gaps';
COMMENT ON FUNCTION resequence_stage_touchpoints IS 'Resequence all touchpoints in a stage to eliminate gaps';
