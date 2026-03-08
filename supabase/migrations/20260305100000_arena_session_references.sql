-- Arena session references: Figma links and uploaded images used as "like this" inputs
-- during gym refinement rounds. References are per-round and sent to the AI as
-- multimodal context alongside feedback and annotations.

create table arena_session_references (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references arena_sessions(id) on delete cascade,
  round integer not null,
  type text not null check (type in ('figma', 'image')),
  url text not null,
  image_url text,
  label text not null default '',
  figma_node_name text,
  created_at timestamptz not null default now()
);

create index idx_arena_session_references_session on arena_session_references(session_id, round);

-- RLS
alter table arena_session_references enable row level security;
create policy "Authenticated users can manage session references"
  on arena_session_references for all using (true) with check (true);
