-- Luv Research: single polymorphic table for hypotheses, experiments,
-- decisions, insights, and evidence. Self-referencing parent_id enables
-- hierarchy (e.g. experiment → hypothesis, evidence → experiment).

create table luv_research (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('hypothesis', 'experiment', 'decision', 'insight', 'evidence')),
  title text not null,
  body text,
  status text not null default 'open' check (status in ('open', 'active', 'resolved', 'archived')),
  tags text[] default '{}',
  metadata jsonb default '{}',
  parent_id uuid references luv_research(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table luv_research is 'Polymorphic research log for Luv agent — hypotheses, experiments, decisions, insights, evidence';
comment on column luv_research.kind is 'Discriminator: hypothesis, experiment, decision, insight, evidence';
comment on column luv_research.metadata is 'Kind-specific structured data (validation_criteria, options_considered, confidence, etc.)';
comment on column luv_research.parent_id is 'Self-ref for hierarchy: experiments→hypotheses, evidence→experiments, etc.';

-- Indexes
create index idx_luv_research_kind on luv_research(kind);
create index idx_luv_research_status on luv_research(status);
create index idx_luv_research_parent on luv_research(parent_id);

-- Full-text search index
create index idx_luv_research_fts on luv_research using gin (
  to_tsvector('english', title || ' ' || coalesce(body, ''))
);

-- Updated_at trigger
create trigger set_luv_research_updated_at
  before update on luv_research
  for each row
  execute function update_updated_at();

-- RLS: admin full access (matches other luv_* tables)
alter table luv_research enable row level security;

create policy "Admin full access on luv_research"
  on luv_research for all
  using (is_admin())
  with check (is_admin());
