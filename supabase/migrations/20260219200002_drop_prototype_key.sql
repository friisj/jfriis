-- Drop the prototype_key column from studio_experiments
-- Data has been migrated to studio_asset_spikes (component_key) with entity_links
ALTER TABLE studio_experiments DROP COLUMN IF EXISTS prototype_key;
