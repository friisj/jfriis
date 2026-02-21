-- Expand entity_links link_type constraint
-- Adds strategic framework, journey-to-product, and studio project link types
-- that were defined in TypeScript (lib/types/entity-relationships.ts) but missing from the DB constraint.

-- Pre-flight check: Ensure no existing rows have link_types outside the new constraint
DO $$
DECLARE
  invalid_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO invalid_count
  FROM entity_links
  WHERE link_type NOT IN (
    'related', 'references', 'evolved_from', 'inspired_by', 'derived_from', 'spin_off',
    'validates', 'tests', 'tested_by', 'supports', 'contradicts', 'challenges', 'depends_on',
    'contains', 'part_of', 'addresses_job', 'relieves_pain', 'creates_gain', 'triggers_pain',
    'delivers_gain', 'explores', 'prototypes', 'informs', 'enables', 'improves', 'fixes_pain',
    'implements', 'delivers', 'maps_to', 'expands', 'documents', 'demonstrates'
  );

  IF invalid_count > 0 THEN
    RAISE EXCEPTION 'Migration aborted: % rows have link_type values outside the new constraint', invalid_count;
  END IF;
END $$;

ALTER TABLE entity_links DROP CONSTRAINT IF EXISTS entity_links_link_type_valid;
ALTER TABLE entity_links ADD CONSTRAINT entity_links_link_type_valid
  CHECK (link_type IN (
    -- Generic associations
    'related',
    'references',
    -- Derivation/evolution
    'evolved_from',
    'inspired_by',
    'derived_from',
    'spin_off',
    -- Validation relationships
    'validates',
    'tests',
    'tested_by',
    'supports',
    'contradicts',
    'challenges',
    'depends_on',
    -- Composition
    'contains',
    'part_of',
    -- Canvas-specific
    'addresses_job',
    'relieves_pain',
    'creates_gain',
    'triggers_pain',
    'delivers_gain',
    -- Strategic framework (studio projects)
    'explores',
    'prototypes',
    'informs',
    -- Journey-to-product
    'enables',
    'improves',
    'fixes_pain',
    'implements',
    'delivers',
    'maps_to',
    'expands',
    -- Documentation
    'documents',
    'demonstrates'
  ));

COMMENT ON CONSTRAINT entity_links_link_type_valid ON entity_links IS
  'Ensures link_type is a valid relationship type — synced with LinkType in lib/types/entity-relationships.ts';
