-- Luv Prompt Playground: saved prompt templates with versioning.
-- Supports the prompt-playground scene for composing and testing
-- image generation prompts against chassis module parameters.

-- Extend scene component CHECK to include prompt-playground
alter table luv_scenes drop constraint if exists luv_scenes_component_check;
alter table luv_scenes add constraint luv_scenes_component_check
  check (component in ('generative-prompt', 'reinforcement-review', 'prompt-playground'));

-- Prompt templates (saved prompt versions per module)
create table luv_prompt_templates (
  id uuid primary key default gen_random_uuid(),
  module_slug text not null,
  name text not null,
  version integer not null default 1,
  template_text text not null,
  provider_config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table luv_prompt_templates is
  'Saved prompt templates for the prompt playground scene, versioned per module.';

-- RLS: admin-only (matches other luv_ tables)
alter table luv_prompt_templates enable row level security;

create policy "Admin full access on luv_prompt_templates"
  on luv_prompt_templates for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- Index for fast lookup by module
create index idx_luv_prompt_templates_module on luv_prompt_templates(module_slug);

-- Seed the prompt-playground scene record
insert into luv_scenes (
  slug, name, description, category, tags,
  required_modules, optional_modules,
  requires_soul, requires_research,
  surface, component, status
) values (
  'prompt-playground',
  'Prompt Playground',
  'Compose prompts from chassis module parameters, generate test images via Flux, annotate results, and save prompt versions.',
  'generative',
  array['prompt', 'image-gen', 'flux'],
  array[]::text[],
  array[]::text[],
  false,
  false,
  'dom',
  'prompt-playground',
  'prototype'
);
