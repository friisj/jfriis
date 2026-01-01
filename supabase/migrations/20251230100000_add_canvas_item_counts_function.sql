-- Create function to get aggregated counts for canvas items
-- This improves performance by replacing N+1 queries with a single database call

CREATE OR REPLACE FUNCTION get_canvas_item_counts(item_ids UUID[])
RETURNS TABLE (
  item_id UUID,
  assumption_count BIGINT,
  evidence_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ci.id AS item_id,
    COALESCE(COUNT(DISTINCT cia.id), 0) AS assumption_count,
    COALESCE(COUNT(DISTINCT cie.id), 0) AS evidence_count
  FROM
    unnest(item_ids) AS ci(id)
    LEFT JOIN canvas_item_assumptions cia ON cia.canvas_item_id = ci.id
    LEFT JOIN canvas_item_evidence cie ON cie.canvas_item_id = ci.id
  GROUP BY
    ci.id;
END;
$$ LANGUAGE plpgsql STABLE;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_canvas_item_counts(UUID[]) TO authenticated;
GRANT EXECUTE ON FUNCTION get_canvas_item_counts(UUID[]) TO anon;

-- Add comment explaining the function
COMMENT ON FUNCTION get_canvas_item_counts(UUID[]) IS
  'Returns aggregated counts of assumptions and evidence for given canvas item IDs.
   Optimizes performance by replacing N+1 queries with a single aggregated query.';
