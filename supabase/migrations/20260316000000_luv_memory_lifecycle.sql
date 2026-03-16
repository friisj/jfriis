-- Luv Memory Lifecycle: pgvector embeddings, archive support, operations audit log
-- Enables semantic retrieval and agent-driven memory management.

-- Enable pgvector extension (idempotent)
create extension if not exists vector with schema extensions;

-- Add lifecycle columns to luv_memories
alter table luv_memories
  add column archived_at timestamptz,
  add column updated_count integer not null default 0,
  add column embedding extensions.vector(1536);

comment on column luv_memories.archived_at is
  'When non-null, memory is archived (soft-deleted). Restorable by the agent.';
comment on column luv_memories.updated_count is
  'Number of times the agent has updated this memory content.';
comment on column luv_memories.embedding is
  'OpenAI text-embedding-3-small vector for semantic retrieval.';

-- Similarity search index (IVFFlat — good for <100k rows)
create index idx_luv_memories_embedding
  on luv_memories using ivfflat (embedding extensions.vector_cosine_ops)
  with (lists = 10);

-- Operations audit log — every lifecycle action is recorded
create table luv_memory_operations (
  id uuid primary key default gen_random_uuid(),
  memory_id uuid references luv_memories(id) on delete cascade,
  operation_type text not null check (operation_type in (
    'create', 'update', 'archive', 'restore', 'merge', 'delete'
  )),
  reason text,
  metadata jsonb default '{}',
  created_at timestamptz default now()
);

create index idx_luv_memory_ops_memory on luv_memory_operations (memory_id);
create index idx_luv_memory_ops_type on luv_memory_operations (operation_type);
create index idx_luv_memory_ops_created on luv_memory_operations (created_at desc);

alter table luv_memory_operations enable row level security;
create policy "Admin full access" on luv_memory_operations for all using (true);

comment on table luv_memory_operations is
  'Audit trail for agent memory lifecycle actions. Research data for studying memory management autonomy.';

-- Similarity search function — returns top-K memories by cosine similarity
create or replace function match_luv_memories(
  query_embedding extensions.vector(1536),
  match_count integer default 10,
  similarity_threshold float default 0.5
)
returns table (
  id uuid,
  content text,
  category text,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    m.id,
    m.content,
    m.category,
    1 - (m.embedding <=> query_embedding) as similarity
  from luv_memories m
  where m.active = true
    and m.archived_at is null
    and m.embedding is not null
    and 1 - (m.embedding <=> query_embedding) > similarity_threshold
  order by m.embedding <=> query_embedding
  limit match_count;
end;
$$;
