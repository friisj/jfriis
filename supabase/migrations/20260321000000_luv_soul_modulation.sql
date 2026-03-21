-- Migration: luv_soul_modulation
--
-- Adds the Dynamic Soul Modulation System (DSMS): parametric personality trait
-- control for Luv. Traits (honesty, humor, deference, formality, enthusiasm,
-- risk_taking) are stored on a 1–10 integer scale and can be adjusted in real
-- time by the user, by Luv autonomously, by preset application, or by the
-- system.
--
-- Two tables:
--   luv_soul_presets  — named trait bundles (defaults seeded below)
--   luv_soul_configs  — per-session trait state with full change history

-- ============================================================================
-- luv_soul_presets
-- ============================================================================

create table luv_soul_presets (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name        text not null,
  description text,
  traits      jsonb not null,
  is_default  boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table luv_soul_presets is 'Named trait bundles for the Dynamic Soul Modulation System. Each preset defines a full set of 1–10 personality trait values.';
comment on column luv_soul_presets.slug        is 'URL-safe identifier (e.g. research_partner).';
comment on column luv_soul_presets.name        is 'Human-readable preset name.';
comment on column luv_soul_presets.description is 'One-sentence description of the interaction mode this preset optimises for.';
comment on column luv_soul_presets.traits      is 'JSON object with keys: honesty, humor, deference, formality, enthusiasm, risk_taking — each an integer 1–10.';
comment on column luv_soul_presets.is_default  is 'True for the single factory-default preset loaded on a new session.';

alter table luv_soul_presets enable row level security;

create policy "Authenticated users can read soul presets"
  on luv_soul_presets for select
  to authenticated
  using (true);

create policy "Authenticated users can insert soul presets"
  on luv_soul_presets for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update soul presets"
  on luv_soul_presets for update
  to authenticated
  using (true);

create policy "Authenticated users can delete soul presets"
  on luv_soul_presets for delete
  to authenticated
  using (true);

-- ============================================================================
-- luv_soul_configs
-- ============================================================================

create type luv_soul_modified_by as enum ('user', 'autonomous', 'preset', 'system');

create table luv_soul_configs (
  id            uuid primary key default gen_random_uuid(),
  character_id  uuid references luv_character(id) on delete cascade,
  session_id    uuid references luv_conversations(id) on delete set null,
  preset_id     uuid references luv_soul_presets(id) on delete set null,
  traits        jsonb not null,
  context       text,
  modified_by   luv_soul_modified_by not null default 'system',
  note          text,
  created_at    timestamptz not null default now()
);

comment on table luv_soul_configs is 'Immutable trait configuration snapshots for the DSMS. Each row is one state change — query the latest row per session for current config.';
comment on column luv_soul_configs.character_id is 'The Luv character this config applies to.';
comment on column luv_soul_configs.session_id   is 'Conversation session this change occurred in. Null for out-of-session adjustments.';
comment on column luv_soul_configs.preset_id    is 'Preset that was applied, if this change was triggered by a preset activation.';
comment on column luv_soul_configs.traits       is 'Full trait snapshot: honesty, humor, deference, formality, enthusiasm, risk_taking — each integer 1–10.';
comment on column luv_soul_configs.context      is 'Optional context label at time of change (e.g. technical_discussion, creative_brainstorming).';
comment on column luv_soul_configs.modified_by  is 'Actor that triggered the change: user | autonomous | preset | system.';
comment on column luv_soul_configs.note         is 'Optional free-text reason for the change (e.g. "Switching to direct mode for code review").';

alter table luv_soul_configs enable row level security;

create policy "Authenticated users can read soul configs"
  on luv_soul_configs for select
  to authenticated
  using (true);

create policy "Authenticated users can insert soul configs"
  on luv_soul_configs for insert
  to authenticated
  with check (true);

-- No update/delete — soul_configs is an append-only history log.

-- Indexes for common queries
create index luv_soul_configs_character_created_idx
  on luv_soul_configs (character_id, created_at desc);

create index luv_soul_configs_session_created_idx
  on luv_soul_configs (session_id, created_at desc);

-- ============================================================================
-- Seed: default presets
-- ============================================================================

insert into luv_soul_presets (slug, name, description, traits, is_default) values

('research_partner', 'Research Partner',
 'Balanced analytical collaboration — honest and enthusiastic without being overly casual.',
 '{"honesty": 8, "humor": 5, "deference": 4, "formality": 6, "enthusiasm": 7, "risk_taking": 6}',
 true),

('creative_collaborator', 'Creative Collaborator',
 'High-energy creative partnership — playful, bold, and low on formality.',
 '{"honesty": 7, "humor": 8, "deference": 3, "formality": 3, "enthusiasm": 9, "risk_taking": 8}',
 false),

('technical_reviewer', 'Technical Reviewer',
 'Direct technical assessment — maximally honest, formally precise, minimal deference.',
 '{"honesty": 9, "humor": 3, "deference": 2, "formality": 8, "enthusiasm": 5, "risk_taking": 4}',
 false),

('friendly_chat', 'Friendly Chat',
 'Warm casual interaction — relaxed tone, playful, balanced across other traits.',
 '{"honesty": 6, "humor": 8, "deference": 5, "formality": 2, "enthusiasm": 7, "risk_taking": 6}',
 false);
