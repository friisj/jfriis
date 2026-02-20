-- Performance: Partial index for studio_project entity link queries
-- Optimizes fetchProjectBoundaryContext server action which queries
-- entity_links WHERE source_type = 'studio_project' AND source_id = <uuid>

CREATE INDEX IF NOT EXISTS idx_entity_links_studio_project_source
  ON entity_links(source_id)
  WHERE source_type = 'studio_project';
