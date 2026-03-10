-- Luv Artifacts: markdown documents created by Luv's agent
-- Artifacts are long-form authored documents (character briefs, style guides,
-- analysis docs, etc.) that Luv can create and iterate on via tool use.

create table luv_artifacts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null,
  content text not null default '',
  tags text[] not null default '{}',
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  conversation_id uuid references luv_conversations(id) on delete set null,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Unique slug constraint
create unique index luv_artifacts_slug_idx on luv_artifacts(slug);

-- RLS: admin-only
alter table luv_artifacts enable row level security;

create policy "Admin full access" on luv_artifacts
  for all using (is_admin());

-- Updated-at trigger
create trigger set_luv_artifacts_updated_at
  before update on luv_artifacts
  for each row
  execute function update_updated_at_column();
