-- Fix embedding dimension: gemini-embedding-001 produces 3072, not 768
-- No data loss — no embeddings have been populated yet.

drop index if exists idx_luv_memories_embedding;
alter table luv_memories drop column if exists embedding;
alter table luv_memories add column embedding extensions.vector(3072);

-- No vector index: pgvector caps IVFFlat/HNSW at 2000 dims.
-- Exact brute-force scan is fast for <1000 rows (Luv's memory scale).

create or replace function match_luv_memories(
  query_embedding extensions.vector(3072),
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
