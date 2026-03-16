-- Repair: luv_changelog table was recorded as migrated (20260316200000)
-- but never actually created — the original migration likely failed due to
-- a transaction rollback. This re-applies the schema idempotently.

create table if not exists luv_changelog (
  id uuid primary key default gen_random_uuid(),
  date date not null default current_date,
  title text not null,
  summary text not null,
  category text not null check (category in ('architecture', 'behavior', 'capability', 'tooling', 'fix')),
  details text,
  created_at timestamptz not null default now()
);

comment on table luv_changelog is 'Evolution log for Luv — tracks changes to architecture, behaviors, and capabilities.';

-- RLS
alter table luv_changelog enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'luv_changelog' and policyname = 'Authenticated users can read changelog') then
    create policy "Authenticated users can read changelog" on luv_changelog for select to authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'luv_changelog' and policyname = 'Authenticated users can insert changelog') then
    create policy "Authenticated users can insert changelog" on luv_changelog for insert to authenticated with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'luv_changelog' and policyname = 'Authenticated users can update changelog') then
    create policy "Authenticated users can update changelog" on luv_changelog for update to authenticated using (true);
  end if;
end $$;

create index if not exists luv_changelog_date_idx on luv_changelog (date desc, created_at desc);

-- Seed data (only if table is empty)
insert into luv_changelog (date, title, summary, category, details)
select * from (values
  ('2026-02-28'::date, 'Initial schema', 'Luv workbench launched with core tables: character, conversations, messages, references, generations, training sets, and presets.', 'architecture', 'First migration established the foundational database schema for the Luv parametric character engine.'),
  ('2026-03-03'::date, 'Chassis module system', 'Physical appearance split from a single chassis_data blob into discrete parametric modules with versioned schemas.', 'architecture', null),
  ('2026-03-06'::date, 'Memory system', 'Luv gained persistent semantic memory: facts saved across conversations, retrieved via pgvector cosine similarity.', 'capability', null),
  ('2026-03-08'::date, 'Research toolkit', 'Added structured research system: hypotheses, experiments, decisions, insights, and evidence.', 'capability', null),
  ('2026-03-09'::date, 'Stage scenes + artifacts', 'Added stage scenes and artifact system for persistent documents.', 'capability', null),
  ('2026-03-14'::date, 'Layered soul composition engine', 'System prompt replaced with a multi-layer composition pipeline with independent priorities.', 'architecture', null),
  ('2026-03-15'::date, 'Conversation compaction + branching', 'Agent can compact long conversations into structured summaries and branch into new sessions.', 'capability', null),
  ('2026-03-16'::date, 'Memory lifecycle tools', 'Luv gained autonomous memory management: update, archive, merge memories.', 'behavior', null),
  ('2026-03-16'::date, 'Changelog', 'Added luv_changelog table injected into agent system prompt on conversation start.', 'capability', null)
) as seed(date, title, summary, category, details)
where not exists (select 1 from luv_changelog limit 1);
