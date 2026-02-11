-- Make pipeline configs global (remove series_id dependency)
-- Configs are reusable creative personas, not tied to specific series.
-- Jobs reference configs by ID (photographer_config_id etc. with ON DELETE SET NULL),
-- so no job data is affected by this change.

DROP INDEX IF EXISTS idx_photographer_configs_series;
ALTER TABLE cog_photographer_configs DROP COLUMN IF EXISTS series_id;

DROP INDEX IF EXISTS idx_director_configs_series;
ALTER TABLE cog_director_configs DROP COLUMN IF EXISTS series_id;

DROP INDEX IF EXISTS idx_production_configs_series;
ALTER TABLE cog_production_configs DROP COLUMN IF EXISTS series_id;
