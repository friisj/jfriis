-- Luv Stage: Scene registry table
-- Replaces the hardcoded scene-registry.ts with a DB-backed registry.
-- Each row describes a scene that can be mounted on the Stage.

create table luv_scenes (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null default '',
  category text not null default 'generative'
    check (category in ('diagnostic', 'generative', 'spatial', 'temporal', 'instrument', 'composite')),
  tags text[] not null default '{}',
  required_modules text[] not null default '{}',
  optional_modules text[] not null default '{}',
  requires_soul boolean not null default false,
  requires_research boolean not null default false,
  surface text not null default 'dom'
    check (surface in ('dom', 'canvas', 'webgl', 'webgpu', 'video', 'composite')),
  agent_surface jsonb,
  component text not null
    check (component in ('generative-prompt')),
  status text not null default 'concept'
    check (status in ('concept', 'prototype', 'stable')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Index for category-based browsing
create index idx_luv_scenes_category on luv_scenes (category);

-- Auto-update updated_at
create trigger set_luv_scenes_updated_at
  before update on luv_scenes
  for each row
  execute function update_updated_at_column();

-- RLS
alter table luv_scenes enable row level security;

create policy "luv_scenes_admin_all" on luv_scenes
  for all
  using (is_admin())
  with check (is_admin());

-- Seed with the 7 existing generative scenes
insert into luv_scenes (slug, name, description, category, tags, required_modules, optional_modules, surface, component, status) values
  ('portrait-headshot', 'Portrait Headshot', 'Close-up portrait focusing on facial features', 'generative', '{portrait}', '{eyes,mouth,nose,skeletal,skin,hair}', '{}', 'dom', 'generative-prompt', 'stable'),
  ('portrait-bust', 'Portrait Bust', 'Head and shoulders portrait with upper body visible', 'generative', '{portrait}', '{eyes,mouth,nose,skeletal,skin,hair}', '{body-proportions}', 'dom', 'generative-prompt', 'stable'),
  ('full-figure', 'Full Figure', 'Full body view showing all proportions', 'generative', '{figure}', '{body-proportions,skeletal,skin,hair}', '{eyes,mouth,nose}', 'dom', 'generative-prompt', 'stable'),
  ('eye-detail', 'Eye Detail', 'Close-up of eyes with full iris and expression detail', 'generative', '{detail}', '{eyes,skin}', '{skeletal}', 'dom', 'generative-prompt', 'stable'),
  ('mouth-detail', 'Mouth Detail', 'Close-up of mouth and lip detail', 'generative', '{detail}', '{mouth,skin}', '{skeletal}', 'dom', 'generative-prompt', 'stable'),
  ('hand-study', 'Hand Study', 'Detailed hand pose reference', 'generative', '{detail}', '{skin,body-proportions}', '{skeletal}', 'dom', 'generative-prompt', 'stable'),
  ('composite-overview', 'Composite Overview', 'Multi-view composite showing key angles', 'generative', '{composite}', '{eyes,mouth,nose,skeletal,skin,hair,body-proportions}', '{}', 'dom', 'generative-prompt', 'stable');
