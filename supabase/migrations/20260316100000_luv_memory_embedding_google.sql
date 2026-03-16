-- Switch embedding dimension from 1536 (OpenAI) to 768 (Google text-embedding-004)
-- No data loss — no embeddings have been populated yet.

-- Drop the old index and column, recreate with correct dimension
drop index if exists idx_luv_memories_embedding;
alter table luv_memories drop column if exists embedding;
alter table luv_memories add column embedding extensions.vector(768);

-- Recreate similarity search index
create index idx_luv_memories_embedding
  on luv_memories using ivfflat (embedding extensions.vector_cosine_ops)
  with (lists = 10);

-- Update the match function to use 768 dimensions
create or replace function match_luv_memories(
  query_embedding extensions.vector(768),
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
