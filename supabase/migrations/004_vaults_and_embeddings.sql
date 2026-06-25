-- ============================================================================
-- 004_vaults_and_embeddings.sql
-- Narrative baseline migration 4 of 7, replacing original migrations 001-026.
-- Applied 2026-06-24 as part of migration squash; reconciled against live schema_migrations.
--
-- Scope: vaults, vault_items, embedding columns on vault_items, HNSW indexes
-- (goals/echo_entries/vault_items), and the three match_* functions.
-- pgvector extension itself is created in 001_core_schema_and_rls.sql.
-- ============================================================================

-- pgvector extension is created in 001_core_schema_and_rls.sql (needed there
-- for goals.embedding and, via 002_echo.sql, echo_entries.embedding).

-- vaults --------------------------------------------------------------------
create table public.vaults (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  goal_id    uuid not null references public.goals(id) on delete cascade,
  space_id   uuid references public.spaces(id) on delete set null,
  vault_type text not null default 'personal' check (vault_type in ('personal','shared','institutional')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (goal_id)
);

create index vaults_goal_id_idx on public.vaults (goal_id);
create index vaults_user_id_idx on public.vaults (user_id);
create index vaults_space_id_idx on public.vaults (space_id);

alter table public.vaults enable row level security;

create policy "Goal owners can create vaults" on public.vaults
  for insert with check (user_id = auth.uid());
create policy "Vault owners can read" on public.vaults
  for select using (user_id = auth.uid());
create policy "Vault owners can update" on public.vaults
  for update using (user_id = auth.uid());
create policy "Vault owners can delete" on public.vaults
  for delete using (user_id = auth.uid());

create trigger vaults_updated_at
  before update on public.vaults
  for each row execute function public.handle_updated_at();

-- vault_items -----------------------------------------------------------
create table public.vault_items (
  id              uuid primary key default gen_random_uuid(),
  vault_id        uuid not null references public.vaults(id) on delete cascade,
  item_type       text not null check (item_type in ('note','link','document','insight','action_update')),
  title           text,
  content         text,
  metadata        jsonb not null default '{}'::jsonb,
  visibility      text not null default 'private' check (visibility in ('private','vault_members','public')),
  created_by      uuid not null references auth.users(id) on delete cascade,
  sort_order      integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  embedding       vector,
  embedding_text  text,
  embedding_model text
);

create index vault_items_vault_id_idx on public.vault_items (vault_id);
create index vault_items_vault_id_sort_order_idx on public.vault_items (vault_id, sort_order);
create index vault_items_created_by_idx on public.vault_items (created_by);
create index idx_vault_items_needs_embedding on public.vault_items (id)
  where (embedding is null and content is not null and length(content) > 200);

alter table public.vault_items enable row level security;

create policy "Users can read vault items they own" on public.vault_items
  for select using (
    exists (select 1 from public.vaults v where v.id = vault_items.vault_id and v.user_id = auth.uid())
  );
create policy "Users can create vault items in their vaults" on public.vault_items
  for insert with check (
    created_by = auth.uid()
    and exists (select 1 from public.vaults v where v.id = vault_items.vault_id and v.user_id = auth.uid())
  );
create policy "Item creators can update" on public.vault_items
  for update using (created_by = auth.uid());
create policy "Item creators can delete" on public.vault_items
  for delete using (created_by = auth.uid());

create trigger vault_items_updated_at
  before update on public.vault_items
  for each row execute function public.handle_updated_at();

-- HNSW indexes on goals and echo_entries ------------------------------------
-- The embedding/embedding_text/embedding_model columns themselves are
-- declared inline on goals (001_core_schema_and_rls.sql) and on echo_entries
-- (002_echo.sql). Only the vector-specific indexes live here, alongside
-- vault_items', so all pgvector-dependent DDL stays grouped in one file
-- after the extension is created.
create index idx_goals_embedding on public.goals
  using hnsw (embedding vector_cosine_ops) with (m = '16', ef_construction = '64');
create index idx_echo_entries_embedding on public.echo_entries
  using hnsw (embedding vector_cosine_ops) with (m = '16', ef_construction = '64');
create index idx_vault_items_embedding on public.vault_items
  using hnsw (embedding vector_cosine_ops) with (m = '16', ef_construction = '64');

-- match functions -------------------------------------------------------
create or replace function public.match_echo_entries(
  query_embedding vector,
  match_user_id uuid,
  match_limit integer default 5
)
returns table (
  id uuid, user_id uuid, content text, goal_id uuid, brt jsonb,
  created_at timestamptz, similarity double precision
)
language sql stable
set search_path to 'public', 'extensions'
as $$
  select e.id, e.user_id, e.content, e.goal_id, e.brt, e.created_at,
         1 - (e.embedding <=> query_embedding) as similarity
  from echo_entries e
  where e.user_id = match_user_id and e.embedding is not null
  order by e.embedding <=> query_embedding
  limit match_limit;
$$;

create or replace function public.match_goals(
  query_embedding vector,
  match_user_id uuid,
  match_limit integer default 5
)
returns table (
  id uuid, user_id uuid, title text, description text, category text,
  status text, smart_data jsonb, created_at timestamptz, similarity double precision
)
language sql stable
set search_path to 'public', 'extensions'
as $$
  select g.id, g.user_id, g.title, g.description, g.category, g.status,
         g.smart_data, g.created_at,
         1 - (g.embedding <=> query_embedding) as similarity
  from goals g
  where g.user_id = match_user_id and g.embedding is not null
  order by g.embedding <=> query_embedding
  limit match_limit;
$$;

create or replace function public.match_vault_items(
  query_embedding vector,
  match_user_id uuid,
  match_limit integer default 5
)
returns table (
  id uuid, vault_id uuid, item_type text, title text, content text,
  created_by uuid, created_at timestamptz, similarity double precision
)
language sql stable
set search_path to 'public', 'extensions'
as $$
  select v.id, v.vault_id, v.item_type, v.title, v.content, v.created_by, v.created_at,
         1 - (v.embedding <=> query_embedding) as similarity
  from vault_items v
  where v.created_by = match_user_id and v.embedding is not null
  order by v.embedding <=> query_embedding
  limit match_limit;
$$;
