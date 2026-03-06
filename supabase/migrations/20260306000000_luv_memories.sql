-- Luv: Persistent agent memory table
-- Stores facts the agent learns across conversations,
-- injected into the Memory soul layer (priority 70).

create table luv_memories (
  id uuid primary key default gen_random_uuid(),
  content text not null,
  category text not null default 'general',
  source_conversation_id uuid references luv_conversations(id) on delete set null,
  active boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_by uuid references auth.users(id) on delete set null
);

create index idx_luv_memories_active on luv_memories (active) where active = true;
create index idx_luv_memories_category on luv_memories (category);

alter table luv_memories enable row level security;

create policy "Admin full access" on luv_memories for all using (true);
