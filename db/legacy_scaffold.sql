-- JobRadar schema — pgvector + postings + chunks
-- Setup/infrastructure only. Ingestion/RAG/Agent logic is yours to write.
-- Run in the Supabase SQL editor (or via `supabase db push`) on a project you own.

-- 1. Vector extension (pgvector). Supabase ships it; this just enables it.
create extension if not exists vector;

-- 2. Raw job postings, one row per posting. Dedupe on url.
create table if not exists postings (
    id          bigint generated always as identity primary key,
    source      text        not null default 'remotive',
    url         text        not null unique,          -- dedupe key
    title       text        not null,
    company     text,
    location    text,
    description text,                                  -- HTML-stripped body
    raw         jsonb,                                 -- original API payload, for reprocessing
    created_at  timestamptz not null default now()
);

-- 3. Chunks: each posting split into embeddable pieces.
--    1536 dims = OpenAI text-embedding-3-small. Change if you use another model
--    (e.g. 1024 for Voyage, 768 for many local Agent). Match your embedder.
create table if not exists chunks (
    id          bigint generated always as identity primary key,
    posting_id  bigint       not null references postings(id) on delete cascade,
    chunk_index int          not null,
    content     text         not null,
    embedding   vector(1536),
    created_at  timestamptz  not null default now(),
    unique (posting_id, chunk_index)
);

-- 4. ANN index for fast cosine retrieval. Build AFTER you've inserted rows.
--    ivfflat needs data present to train; run this once postings are loaded.
create index if not exists chunks_embedding_idx
    on chunks using ivfflat (embedding vector_cosine_ops)
    with (lists = 100);

-- Retrieval query you'll use in rag.py (k nearest chunks to a question embedding):
--   select c.content, p.title, p.url
--   from chunks c join postings p on p.id = c.posting_id
--   order by c.embedding <=> $1
--   limit $2;
