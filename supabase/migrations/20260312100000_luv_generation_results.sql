-- Luv generation results and parameter-level annotations.
-- Persists every image generation from any scene, and allows
-- fine-grained feedback on which module parameters were accurate.

-- Generation results — one row per generated image
create table luv_generation_results (
  id uuid primary key default gen_random_uuid(),
  scene_slug text not null,
  module_slugs text[] not null default array[]::text[],
  prompt_text text not null,
  prompt_source text not null default 'manual'
    check (prompt_source in ('manual', 'agent', 'template')),
  storage_path text not null,
  provider_config jsonb not null default '{}'::jsonb,
  module_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

comment on table luv_generation_results is
  'Every image generated through Stage scenes, with frozen module state at generation time.';

alter table luv_generation_results enable row level security;
create policy "Admin full access on luv_generation_results"
  on luv_generation_results for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create index idx_luv_generation_results_scene on luv_generation_results(scene_slug);
create index idx_luv_generation_results_created on luv_generation_results(created_at desc);

-- Parameter-level annotations on generated images
create table luv_parameter_annotations (
  id uuid primary key default gen_random_uuid(),
  generation_result_id uuid not null references luv_generation_results(id) on delete cascade,
  module_slug text not null,
  parameter_key text not null,
  rating text not null check (rating in ('accurate', 'inaccurate', 'uncertain')),
  note text,
  source text not null default 'human'
    check (source in ('human', 'agent')),
  created_at timestamptz not null default now()
);

comment on table luv_parameter_annotations is
  'Parameter-level feedback on generated images. Both human and agent can annotate.';

alter table luv_parameter_annotations enable row level security;
create policy "Admin full access on luv_parameter_annotations"
  on luv_parameter_annotations for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create index idx_luv_parameter_annotations_result
  on luv_parameter_annotations(generation_result_id);

-- Unique constraint: one annotation per parameter per source per image
create unique index idx_luv_parameter_annotations_unique
  on luv_parameter_annotations(generation_result_id, module_slug, parameter_key, source);
