-- Enable pgvector extension
create extension if not exists vector;

-- Documents: one row per uploaded file
create table if not exists documents (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  size_bytes   integer,
  mime_type    text,
  created_at   timestamptz default now()
);

-- Chunks: many rows per document, each with a 384-dim embedding
-- 384 dims matches sentence-transformers/all-MiniLM-L6-v2
create table if not exists chunks (
  id           uuid primary key default gen_random_uuid(),
  document_id  uuid not null references documents(id) on delete cascade,
  content      text not null,
  chunk_index  integer not null,
  page_number  integer,
  token_count  integer,
  embedding    vector(384),
  created_at   timestamptz default now()
);

-- IVFFlat index for approximate nearest-neighbor search
-- lists=100 is appropriate for up to ~1M vectors
create index if not exists chunks_embedding_idx on chunks using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- RPC function for similarity search — keeps SQL out of application code
create or replace function match_chunks(
  query_embedding  vector(384),
  match_threshold  float,
  match_count      int,
  filter_doc_ids   uuid[] default null
)
returns table (
  id           uuid,
  document_id  uuid,
  content      text,
  chunk_index  integer,
  page_number  integer,
  similarity   float
)
language sql stable
as $$
  select
    c.id,
    c.document_id,
    c.content,
    c.chunk_index,
    c.page_number,
    1 - (c.embedding <=> query_embedding) as similarity
  from chunks c
  where
    (filter_doc_ids is null or c.document_id = any(filter_doc_ids))
    and 1 - (c.embedding <=> query_embedding) > match_threshold
  order by c.embedding <=> query_embedding
  limit match_count;
$$;

-- Enable Row Level Security (permissive for now — no user auth)
alter table documents enable row level security;
alter table chunks enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'documents' and policyname = 'allow all on documents') then
    create policy "allow all on documents" on documents for all using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'chunks' and policyname = 'allow all on chunks') then
    create policy "allow all on chunks" on chunks for all using (true);
  end if;
end $$;
