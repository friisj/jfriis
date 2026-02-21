-- Add service_blueprint, story_map, and related types to entity_links constraints
-- These boundary object types were missing from the constraints added in earlier migrations

-- Update source_type constraint
ALTER TABLE entity_links DROP CONSTRAINT IF EXISTS entity_links_source_type_valid;
ALTER TABLE entity_links ADD CONSTRAINT entity_links_source_type_valid
  CHECK (source_type IN (
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
    'service_blueprint',
    'blueprint_step',
    'story_map',
    'activity',
    'user_story'
  ));

-- Update target_type constraint
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
    'asset_prototype',
    'service_blueprint',
    'blueprint_step',
    'story_map',
    'activity',
    'user_story'
  ));
