-- agent_conversations + agent_messages: multi-agent chat infrastructure
--
-- Designed for multiple agents (Chief, future additions) sharing one
-- conversation system. Each conversation belongs to an agent.

create table agent_conversations (
  id uuid primary key default gen_random_uuid(),
  agent text not null default 'chief',  -- agent identifier
  title text,
  model text,                            -- model used (e.g. 'claude-sonnet')
  turn_count integer not null default 0,
  metadata jsonb default '{}'::jsonb,    -- agent-specific metadata
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table agent_conversations is
  'Multi-agent chat conversations. Each conversation belongs to a specific agent (chief, etc.).';

create table agent_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references agent_conversations(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text,
  parts jsonb,                           -- structured message parts (tool calls, etc.)
  created_at timestamptz not null default now()
);

comment on table agent_messages is
  'Messages within agent conversations. Parts stores structured tool call/result data.';

create index agent_messages_conversation_id_idx on agent_messages(conversation_id);
create index agent_conversations_agent_idx on agent_conversations(agent);

-- updated_at trigger
create or replace function agent_conversations_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger agent_conversations_updated_at
  before update on agent_conversations
  for each row execute function agent_conversations_set_updated_at();

-- RLS
alter table agent_conversations enable row level security;
alter table agent_messages enable row level security;

create policy "Service role full access" on agent_conversations
  for all to service_role using (true) with check (true);
create policy "Authenticated users can read" on agent_conversations
  for select to authenticated using (true);

create policy "Service role full access" on agent_messages
  for all to service_role using (true) with check (true);
create policy "Authenticated users can read" on agent_messages
  for select to authenticated using (true);
