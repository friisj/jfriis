-- Create optimized function to fetch canvas items with aggregated counts
-- This replaces the N+1 query pattern with a single efficient query

CREATE OR REPLACE FUNCTION get_canvas_items_with_counts()
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  item_type TEXT,
  importance TEXT,
  validation_status TEXT,
  tags TEXT[],
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  studio_project_id UUID,
  studio_project JSONB,
  placement_count BIGINT,
  assumption_count BIGINT,
  evidence_count BIGINT
)
LANGUAGE SQL
STABLE
AS $$
  SELECT
    ci.id,
    ci.title,
    ci.description,
    ci.item_type,
    ci.importance,
    ci.validation_status,
    ci.tags,
    ci.created_at,
    ci.updated_at,
    ci.studio_project_id,
    CASE
      WHEN sp.id IS NOT NULL THEN
        jsonb_build_object('name', sp.name)
      ELSE NULL
    END as studio_project,
    COUNT(DISTINCT cip.id) as placement_count,
    COUNT(DISTINCT cia.id) as assumption_count,
    COUNT(DISTINCT cie.id) as evidence_count
  FROM canvas_items ci
  LEFT JOIN studio_projects sp ON sp.id = ci.studio_project_id
  LEFT JOIN canvas_item_placements cip ON cip.canvas_item_id = ci.id
  LEFT JOIN canvas_item_assumptions cia ON cia.canvas_item_id = ci.id
  LEFT JOIN canvas_item_evidence cie ON cie.canvas_item_id = ci.id
  GROUP BY ci.id, sp.id, sp.name
  ORDER BY ci.updated_at DESC;
$$;

-- Add comment for documentation
COMMENT ON FUNCTION get_canvas_items_with_counts() IS
  'Efficiently fetches all canvas items with aggregated counts for placements, assumptions, and evidence. Avoids N+1 query problem.';
