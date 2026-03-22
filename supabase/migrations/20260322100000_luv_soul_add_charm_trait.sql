-- Migration: luv_soul_add_charm_trait
--
-- Adds "charm" as the 7th DSMS trait. Charm modulates relational/gendered appeal
-- on a scale from matter-of-fact (1) to enchanting (10), orthogonal to formality
-- which controls register. Backfills existing presets and configs with sensible
-- defaults.

-- ============================================================================
-- Backfill seed presets with charm values
-- ============================================================================

-- Research Partner: balanced charm (6)
update luv_soul_presets
  set traits = traits || '{"charm": 6}'::jsonb,
      updated_at = now()
  where slug = 'research_partner'
    and not (traits ? 'charm');

-- Creative Collaborator: higher charm (7) — warm creative energy
update luv_soul_presets
  set traits = traits || '{"charm": 7}'::jsonb,
      updated_at = now()
  where slug = 'creative_collaborator'
    and not (traits ? 'charm');

-- Technical Reviewer: low charm (3) — matter-of-fact focus
update luv_soul_presets
  set traits = traits || '{"charm": 3}'::jsonb,
      updated_at = now()
  where slug = 'technical_reviewer'
    and not (traits ? 'charm');

-- Friendly Chat: higher charm (7) — warm and appealing
update luv_soul_presets
  set traits = traits || '{"charm": 7}'::jsonb,
      updated_at = now()
  where slug = 'friendly_chat'
    and not (traits ? 'charm');

-- ============================================================================
-- Backfill any existing soul configs that lack charm
-- ============================================================================

update luv_soul_configs
  set traits = traits || '{"charm": 6}'::jsonb
  where not (traits ? 'charm');

-- ============================================================================
-- Update column comments to reflect 7-trait schema
-- ============================================================================

comment on column luv_soul_presets.traits is 'JSON object with keys: honesty, humor, deference, formality, enthusiasm, risk_taking, charm — each an integer 1–10.';
comment on column luv_soul_configs.traits is 'Full trait snapshot: honesty, humor, deference, formality, enthusiasm, risk_taking, charm — each integer 1–10.';
