-- Add privacy flags to core entity tables
-- Allows hiding sensitive records during demos/presentations

ALTER TABLE studio_projects
  ADD COLUMN is_private BOOLEAN DEFAULT FALSE;

ALTER TABLE cog_series
  ADD COLUMN is_private BOOLEAN DEFAULT FALSE;

ALTER TABLE log_entries
  ADD COLUMN is_private BOOLEAN DEFAULT FALSE;

-- Add indexes for performance
CREATE INDEX idx_studio_projects_is_private ON studio_projects(is_private);
CREATE INDEX idx_cog_series_is_private ON cog_series(is_private);
CREATE INDEX idx_log_entries_is_private ON log_entries(is_private);

-- Add helpful comments
COMMENT ON COLUMN studio_projects.is_private IS 'When true, record is hidden in privacy mode (for demos/presentations)';
COMMENT ON COLUMN cog_series.is_private IS 'When true, record is hidden in privacy mode (for demos/presentations)';
COMMENT ON COLUMN log_entries.is_private IS 'When true, record is hidden in privacy mode (for demos/presentations)';
