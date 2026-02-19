-- Add prototype_key column to studio_experiments
-- Links experiments of type 'prototype' to their component in the prototype registry
-- Format: project-slug/experiment-slug (e.g., putt/physics-engine)

ALTER TABLE studio_experiments ADD COLUMN prototype_key TEXT;

COMMENT ON COLUMN studio_experiments.prototype_key IS
  'Component registry key (e.g. putt/physics-engine). Set when type=prototype.';

-- Backfill existing Putt experiments that have registered prototypes
UPDATE studio_experiments SET prototype_key = 'putt/' || slug
WHERE project_id = (SELECT id FROM studio_projects WHERE slug = 'putt')
  AND type = 'prototype'
  AND slug IN ('physics-engine', 'green-outline', 'green-generation', 'undulation-system', 'cup-mechanics');
