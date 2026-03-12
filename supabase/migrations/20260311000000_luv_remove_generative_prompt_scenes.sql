-- Remove placeholder generative scenes and generative-prompt component
-- These scenes all mapped to the same read-only reference component.
-- Scenes will be rebuilt properly with real implementations.

delete from luv_scenes where component = 'generative-prompt';

-- Update CHECK constraint to remove generative-prompt
alter table luv_scenes drop constraint if exists luv_scenes_component_check;
alter table luv_scenes add constraint luv_scenes_component_check
  check (component in ('reinforcement-review'));
