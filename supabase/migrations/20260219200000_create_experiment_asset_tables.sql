-- Create asset tables for experiments
-- Separates technical artifacts (spikes, prototypes) from experiment methodology.
-- Spikes = isolated component investigations, Prototypes = assembled app references.
-- Linked to experiments via entity_links.

-- ============================================================================
-- studio_asset_spikes — isolated component experiments
-- ============================================================================

CREATE TABLE studio_asset_spikes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES studio_projects(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  component_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project_id, slug)
);

CREATE INDEX idx_studio_asset_spikes_project ON studio_asset_spikes(project_id);

CREATE TRIGGER set_studio_asset_spikes_updated_at
  BEFORE UPDATE ON studio_asset_spikes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE studio_asset_spikes IS 'Isolated component investigations linked to experiments via entity_links';
COMMENT ON COLUMN studio_asset_spikes.component_key IS 'Registry key for prototype-renderer, e.g. putt/physics-engine';

-- RLS: public read for active projects, admin full access
ALTER TABLE studio_asset_spikes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read studio_asset_spikes" ON studio_asset_spikes
  FOR SELECT USING (true);

CREATE POLICY "Admin full access studio_asset_spikes" ON studio_asset_spikes
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================================
-- studio_asset_prototypes — assembled app references
-- ============================================================================

CREATE TABLE studio_asset_prototypes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES studio_projects(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  app_path TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project_id, slug)
);

CREATE INDEX idx_studio_asset_prototypes_project ON studio_asset_prototypes(project_id);

CREATE TRIGGER set_studio_asset_prototypes_updated_at
  BEFORE UPDATE ON studio_asset_prototypes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE studio_asset_prototypes IS 'Assembled app references linked to experiments via entity_links';
COMMENT ON COLUMN studio_asset_prototypes.app_path IS 'App route path, e.g. /apps/putt';

-- RLS: public read for active projects, admin full access
ALTER TABLE studio_asset_prototypes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read studio_asset_prototypes" ON studio_asset_prototypes
  FOR SELECT USING (true);

CREATE POLICY "Admin full access studio_asset_prototypes" ON studio_asset_prototypes
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================================
-- Update entity_links constraints to allow asset_spike and asset_prototype
-- ============================================================================

ALTER TABLE entity_links DROP CONSTRAINT IF EXISTS entity_links_target_type_valid;
ALTER TABLE entity_links ADD CONSTRAINT entity_links_target_type_valid
  CHECK (target_type IN (
    'project',
    'log_entry',
    'specimen',
    'studio_project',
    'hypothesis',
    'experiment',
    'business_model_canvas',
    'customer_profile',
    'value_proposition_canvas',
    'value_map',
    'canvas_item',
    'user_journey',
    'journey_stage',
    'touchpoint',
    'assumption',
    'gallery_sequence',
    'asset_spike',
    'asset_prototype'
  ));

-- ============================================================================
-- Backfill: migrate existing prototype_key experiments to spike assets
-- ============================================================================

-- Create spike assets from experiments that have a prototype_key set
INSERT INTO studio_asset_spikes (project_id, slug, name, description, component_key)
SELECT e.project_id, e.slug, e.name, e.description, e.prototype_key
FROM studio_experiments e
WHERE e.prototype_key IS NOT NULL;

-- Link experiments → spike assets via entity_links
INSERT INTO entity_links (source_type, source_id, target_type, target_id, link_type, metadata)
SELECT 'experiment', e.id, 'asset_spike', s.id, 'contains', '{}'::jsonb
FROM studio_experiments e
JOIN studio_asset_spikes s ON s.project_id = e.project_id AND s.slug = e.slug
WHERE e.prototype_key IS NOT NULL;
