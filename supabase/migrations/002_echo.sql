-- ============================================================================
-- 002_echo.sql
-- Narrative baseline migration 2 of 7, replacing original migrations 001-026.
-- DRAFT — not yet applied.
--
-- Scope: echo_sessions, echo_entries (final shape), corrected echo_*-named
-- constraints/indexes/policies, related RLS.
--
-- Naming correction: the original Starlog -> Echo rename (migration 009)
-- only renamed the TABLES. All dependent objects (primary key constraints,
-- foreign key constraints, indexes, RLS policy names) kept their original
-- "starlog_*" names permanently, live, to this day:
--   starlog_entries_pkey, starlog_entries_goal_id_fkey, starlog_entries_user_id_fkey,
--   starlog_sessions_pkey, starlog_sessions_goal_id_fkey, starlog_sessions_user_id_fkey,
--   idx_starlog_goal_id,
--   "Users can select/insert/update/delete own starlog entries/sessions" (8 policies)
-- This baseline renames all of the above to echo_*-consistent names.
-- ============================================================================

-- echo_sessions ---------------------------------------------------------
create table public.echo_sessions (
  id         uuid primary key default gen_random_uuid(),
  goal_id    uuid references public.goals(id) on delete set null,
  user_id    uuid not null references auth.users(id) on delete cascade,
  summary    jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.echo_sessions enable row level security;

create policy "Users can select own echo sessions" on public.echo_sessions
  for select using (user_id = auth.uid());
create policy "Users can insert own echo sessions" on public.echo_sessions
  for insert with check (user_id = auth.uid());
create policy "Users can update own echo sessions" on public.echo_sessions
  for update using (user_id = auth.uid());
create policy "Users can delete own echo sessions" on public.echo_sessions
  for delete using (user_id = auth.uid());

-- echo_entries ------------------------------------------------------------
create table public.echo_entries (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references auth.users(id) on delete cascade,
  goal_id              uuid references public.goals(id) on delete set null,
  content              text not null,
  guide_response       jsonb,
  created_at           timestamptz not null default now(),
  media_url            text,
  ai_insight_requested boolean not null default false,
  confidence           numeric,
  themes               text[],
  ai_response          text,
  processed_at         timestamptz,
  brt                  jsonb,
  emotion              jsonb,
  model_version        text,
  visibility           text not null default 'private' check (visibility in ('private','shared')),
  summarized           boolean not null default false,
  embedding            vector,
  embedding_text       text,
  embedding_model      text
);

alter table public.echo_entries enable row level security;

create policy "Users can select own echo entries" on public.echo_entries
  for select using (user_id = auth.uid());
create policy "Users can insert own echo entries" on public.echo_entries
  for insert with check (user_id = auth.uid());
create policy "Users can update own echo entries" on public.echo_entries
  for update using (user_id = auth.uid());
create policy "Users can delete own echo entries" on public.echo_entries
  for delete using (user_id = auth.uid());

create index idx_echo_goal_id on public.echo_entries (goal_id);

-- interests.source_thorn_id FK — interests is created in
-- 001_core_schema_and_rls.sql (as a plain uuid column) before echo_entries
-- exists. Added here, now that echo_entries exists, to fix the cross-file
-- FK ordering problem flagged in the original draft.
alter table public.interests
  add constraint interests_source_thorn_id_fkey
  foreign key (source_thorn_id) references public.echo_entries(id) on delete set null;

-- pgvector index for echo_entries — extension is created once in
-- 004_vaults_and_embeddings.sql; this index is declared there alongside the
-- goals/vault_items HNSW indexes to keep all vector-dependent DDL in one
-- place. See note in that file.
