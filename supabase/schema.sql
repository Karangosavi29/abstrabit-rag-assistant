

--  Extensions
create extension if not exists vector;
create extension if not exists pgcrypto;

--  Workspaces
create table if not exists workspaces (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

--  Documents (one row per uploaded file, per workspace)
create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  filename text not null,
  content_hash text not null,
  status text not null default 'processing',
  created_at timestamptz not null default now(),
  unique (workspace_id, content_hash) 
);

--  Chunks (the single shared vector store — EVERY workspace's chunks live here)
create table if not exists chunks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  document_id uuid not null references documents(id) on delete cascade,
  chunk_index int not null,
  content text not null,
  embedding vector(768), 
  created_at timestamptz not null default now(),
  unique (document_id, chunk_index) 
);

create index if not exists chunks_workspace_idx on chunks (workspace_id);
create index if not exists chunks_embedding_idx on chunks using ivfflat (embedding vector_cosine_ops) with (lists = 100);

--  Chat history
create table if not exists chat_messages (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  citations jsonb, 
  created_at timestamptz not null default now()
);

--  Tool call log
create table if not exists tool_calls (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  tool_name text not null,
  arguments jsonb not null,
  status text not null check (status in ('success', 'error')),
  result jsonb,
  error text,
  created_at timestamptz not null default now()
);

--  Tasks (side-effect target of the save_task tool)
create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  title text not null,
  details text,
  created_at timestamptz not null default now()
);

--  Row Level Security: every table is scoped to workspaces the caller owns.
alter table workspaces enable row level security;
alter table documents enable row level security;
alter table chunks enable row level security;
alter table chat_messages enable row level security;
alter table tool_calls enable row level security;
alter table tasks enable row level security;

create policy "own workspaces" on workspaces
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "own documents" on documents
  for all using (workspace_id in (select id from workspaces where owner_id = auth.uid()))
  with check (workspace_id in (select id from workspaces where owner_id = auth.uid()));

create policy "own chunks" on chunks
  for all using (workspace_id in (select id from workspaces where owner_id = auth.uid()))
  with check (workspace_id in (select id from workspaces where owner_id = auth.uid()));

create policy "own chat" on chat_messages
  for all using (workspace_id in (select id from workspaces where owner_id = auth.uid()))
  with check (workspace_id in (select id from workspaces where owner_id = auth.uid()));

create policy "own tool calls" on tool_calls
  for all using (workspace_id in (select id from workspaces where owner_id = auth.uid()))
  with check (workspace_id in (select id from workspaces where owner_id = auth.uid()));

create policy "own tasks" on tasks
  for all using (workspace_id in (select id from workspaces where owner_id = auth.uid()))
  with check (workspace_id in (select id from workspaces where owner_id = auth.uid()));

create or replace function match_chunks(
  p_workspace_id uuid,
  p_query_embedding vector(768),
  p_match_count int default 6
)
returns table (
  id uuid,
  document_id uuid,
  chunk_index int,
  content text,
  similarity float
)
language sql stable
as $$
  select
    c.id,
    c.document_id,
    c.chunk_index,
    c.content,
    1 - (c.embedding <=> p_query_embedding) as similarity
  from chunks c
  where c.workspace_id = p_workspace_id  
  order by c.embedding <=> p_query_embedding
  limit p_match_count;
$$;
