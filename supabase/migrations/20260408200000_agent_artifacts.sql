-- agent_artifacts: structured documents created by agents (Chief, etc.)

create table agent_artifacts (
  id uuid primary key default gen_random_uuid(),
  agent text not null default 'chief',
  title text not null,
  slug text not null,
  content text not null default '',
  tags text[] default '{}',
  status text not null default 'draft'
    check (status in ('draft', 'published', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(agent, slug)
);

comment on table agent_artifacts is
  'Structured documents drafted by agents. Each artifact belongs to an agent and has a unique slug within that agent.';

create or replace function agent_artifacts_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger agent_artifacts_updated_at
  before update on agent_artifacts
  for each row execute function agent_artifacts_set_updated_at();

alter table agent_artifacts enable row level security;

create policy "Service role full access" on agent_artifacts
  for all to service_role using (true) with check (true);
create policy "Authenticated full access" on agent_artifacts
  for all to authenticated using (true) with check (true);
