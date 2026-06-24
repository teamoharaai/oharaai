-- ============================================================================
-- 001_core_schema_and_rls.sql
-- Narrative baseline migration 1 of 7, replacing original migrations 001-026.
-- DRAFT — not yet applied. See OUTSTANDING.md / migration audit for context.
--
-- Scope: profiles, goals, milestones, measurables, measurable_logs,
-- interests, base RLS, and the rls_auto_enable() safety-net trigger.
--
-- This file reflects VERIFIED LIVE SCHEMA as of the audit, not the
-- aspirational state of any historical migration file. Known intentional
-- deviations from "what the old migration files implied":
--   - goals.mode is DROPPED here (see note below) rather than left in its
--     026-tightened single-value-CHECK state.
--   - goals.is_private / goals.community_id are KEPT (unused today, reserved
--     for a future social/Constellation layer) and annotated via COMMENT ON
--     COLUMN rather than dropped.
--   - rls_auto_enable()/ensure_rls is added here for the first time in any
--     migration file. It already exists live (added directly against the DB,
--     outside migration history) — this brings it under version control.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- KNOWN GAP — see audit, OUT OF SCOPE for this squash:
-- Migration 004 (profiles_auto_create) historically defined handle_new_user()
-- and a trigger on auth.users to auto-create a profile row on signup. Neither
-- the function nor the trigger exist in the live database today, and no
-- Supabase Auth Hook or app-code path creates a profile row on signup either.
-- This baseline intentionally reflects that broken live state — it does NOT
-- restore the trigger. Fixing signup/profile-row creation is tracked as a
-- separate, dedicated piece of work and must not be inferred as "done" from
-- the presence of this comment.
-- ---------------------------------------------------------------------------

-- pgvector ------------------------------------------------------------------
-- Created here (not in 004_vaults_and_embeddings.sql) because goals.embedding
-- and echo_entries.embedding (002_echo.sql) both need the `vector` type
-- before either of those tables is created.
create extension if not exists vector;

-- profiles --------------------------------------------------------------
create table public.profiles (
  id                  uuid primary key references auth.users(id) on delete cascade,
  display_name        text not null default '',
  character_profile    jsonb not null default '{}'::jsonb,
  interests           jsonb not null default '[]'::jsonb,
  context             jsonb not null default '{}'::jsonb,
  onboarding_complete boolean not null default false,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  last_summarized_at  timestamptz
);

alter table public.profiles enable row level security;

create policy "Users can read own profile" on public.profiles
  for select using (id = auth.uid());
create policy "Users can insert own profile" on public.profiles
  for insert with check (id = auth.uid());
create policy "Users can update own profile" on public.profiles
  for update using (id = auth.uid());
create policy "Users cannot delete profiles" on public.profiles
  for delete using (false);

-- shared trigger function used by several tables in later files ---------
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- goals -------------------------------------------------------------------
create table public.goals (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  title        text not null,
  category     text not null check (category in ('body','mind','money','create','connect','contribute')),
  status       text not null default 'active' check (status in ('active','complete','stagnant','discovered')),
  smart_data   jsonb not null default '{}'::jsonb,
  is_private   boolean not null default true,
  community_id uuid,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  description  text,
  color_theme  text not null default 'ocean',
  deadline     timestamptz,
  progress     numeric not null default 0,
  ai_generated boolean not null default false,
  project_id   uuid,
  visibility   text not null default 'private' check (visibility in ('private','circle','public')),
  space_id     uuid,
  embedding       vector,
  embedding_text  text,
  embedding_model text
  -- NOTE: project_id/space_id FK constraints (goals_project_id_fkey,
  -- goals_space_id_fkey) are added via ALTER TABLE in
  -- 003_spaces_and_projects.sql, once projects/spaces exist. Declared as
  -- plain uuid columns here to fix the cross-file ordering problem flagged
  -- in the original draft's summary.
);

comment on column public.goals.is_private is
  'Unused as of 2026-06-24 - reserved for future social/sharing layer, see DECISIONS.md';
comment on column public.goals.community_id is
  'Unused as of 2026-06-24 - reserved for future social/sharing layer, see DECISIONS.md';

-- goals.mode: DROPPED in this baseline.
-- Historical context: 001 created `mode text check (mode in ('exploration','commitment'))`;
-- 026 tightened the CHECK to `mode = 'commitment'` only, making the column a
-- constant. Decision: drop the column and its constraint entirely rather than
-- carry forward a single-value field.
-- *** FLAG FOR REVIEW (see summary): lib/db/goals.ts:79 currently inserts
-- `mode: 'commitment'` on every goal create. That insert will fail once this
-- column is gone. That code must be updated in the same change as applying
-- this migration. Not fixed here since this is a SQL-only draft. ***

alter table public.goals enable row level security;

create policy "Users can select own goals" on public.goals
  for select using (user_id = auth.uid());
create policy "Users can insert own goals" on public.goals
  for insert with check (user_id = auth.uid());
create policy "Users can update own goals" on public.goals
  for update using (user_id = auth.uid());
create policy "Users can delete own goals" on public.goals
  for delete using (user_id = auth.uid());

create index idx_goals_status on public.goals (status);
create index idx_goals_visibility on public.goals (visibility);
create index idx_goals_project_id on public.goals (project_id);
create index goals_space_id_idx on public.goals (space_id);

-- KNOWN INCONSISTENCY, not an oversight: live schema has no updated_at
-- trigger on goals or milestones, unlike projects/spaces/vault_items/vaults
-- which all have one. Reproducing live state faithfully rather than adding
-- one for consistency — flag if you want this normalized in a follow-up.

-- milestones ----------------------------------------------------------------
create table public.milestones (
  id         uuid primary key default gen_random_uuid(),
  goal_id    uuid not null references public.goals(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  title      text not null,
  due_date   date,
  complete   boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.milestones enable row level security;

create policy "Users can select own milestones" on public.milestones
  for select using (user_id = auth.uid());
create policy "Users can insert own milestones" on public.milestones
  for insert with check (user_id = auth.uid());
create policy "Users can update own milestones" on public.milestones
  for update using (user_id = auth.uid());
create policy "Users can delete own milestones" on public.milestones
  for delete using (user_id = auth.uid());

-- measurables -----------------------------------------------------------
create table public.measurables (
  id              uuid primary key default gen_random_uuid(),
  goal_id         uuid not null references public.goals(id) on delete cascade,
  title           text not null,
  type            text not null check (type in ('counter','habit','checklist')),
  target_value    numeric,
  target_unit     text,
  frequency       text check (frequency in ('daily','weekly','monthly','once')),
  current_value   numeric not null default 0,
  is_ai_suggested boolean not null default false,
  sort_order      integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table public.measurables enable row level security;

create policy "Users can select measurables for own goals" on public.measurables
  for select using (goal_id in (select id from public.goals where user_id = auth.uid()));
create policy "Users can insert measurables for own goals" on public.measurables
  for insert with check (goal_id in (select id from public.goals where user_id = auth.uid()));
create policy "Users can update measurables for own goals" on public.measurables
  for update using (goal_id in (select id from public.goals where user_id = auth.uid()));
create policy "Users can delete measurables for own goals" on public.measurables
  for delete using (goal_id in (select id from public.goals where user_id = auth.uid()));

create index idx_measurables_goal_id on public.measurables (goal_id);

-- measurable_logs ---------------------------------------------------------
create table public.measurable_logs (
  id             uuid primary key default gen_random_uuid(),
  measurable_id  uuid not null references public.measurables(id) on delete cascade,
  value          numeric not null default 1,
  note           text,
  logged_at      timestamptz not null default now()
);

alter table public.measurable_logs enable row level security;

create policy "Users can select own measurable logs" on public.measurable_logs
  for select using (
    measurable_id in (
      select m.id from public.measurables m join public.goals g on m.goal_id = g.id
      where g.user_id = auth.uid()
    )
  );
create policy "Users can insert own measurable logs" on public.measurable_logs
  for insert with check (
    measurable_id in (
      select m.id from public.measurables m join public.goals g on m.goal_id = g.id
      where g.user_id = auth.uid()
    )
  );
create policy "Users can update own measurable logs" on public.measurable_logs
  for update using (
    measurable_id in (
      select m.id from public.measurables m join public.goals g on m.goal_id = g.id
      where g.user_id = auth.uid()
    )
  );
create policy "Users can delete own measurable logs" on public.measurable_logs
  for delete using (
    measurable_id in (
      select m.id from public.measurables m join public.goals g on m.goal_id = g.id
      where g.user_id = auth.uid()
    )
  );

create index idx_measurable_logs_mid on public.measurable_logs (measurable_id);

-- interests -----------------------------------------------------------------
create table public.interests (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  source_thorn_id   uuid,
  promoted_goal_id  uuid references public.goals(id) on delete set null,
  name              text not null,
  status            text not null default 'suggested' check (status in ('suggested','exploring','promoted','dismissed')),
  created_at        timestamptz not null default now()
  -- NOTE: source_thorn_id FK constraint (interests_source_thorn_id_fkey) is
  -- added via ALTER TABLE in 002_echo.sql, once echo_entries exists.
);

alter table public.interests enable row level security;

create policy "Users can select own interests" on public.interests
  for select using (user_id = auth.uid());
create policy "Users can insert own interests" on public.interests
  for insert with check (user_id = auth.uid());
create policy "Users can update own interests" on public.interests
  for update using (user_id = auth.uid());
create policy "Users can delete own interests" on public.interests
  for delete using (user_id = auth.uid());

-- rls_auto_enable() / ensure_rls --------------------------------------------
-- Exists live today with NO corresponding migration file (added directly
-- against the database, outside migration history). Brought under version
-- control here. Event trigger: on every CREATE TABLE in the public schema,
-- automatically enables row level security as a safety net.
create or replace function public.rls_auto_enable()
returns event_trigger
language plpgsql
security definer
set search_path to 'pg_catalog'
as $$
declare
  cmd record;
begin
  for cmd in
    select *
    from pg_event_trigger_ddl_commands()
    where command_tag in ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      and object_type in ('table','partitioned table')
  loop
    if cmd.schema_name is not null and cmd.schema_name in ('public')
       and cmd.schema_name not in ('pg_catalog','information_schema')
       and cmd.schema_name not like 'pg_toast%' and cmd.schema_name not like 'pg_temp%' then
      begin
        execute format('alter table if exists %s enable row level security', cmd.object_identity);
        raise log 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      exception
        when others then
          raise log 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      end;
    else
      raise log 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
    end if;
  end loop;
end;
$$;

create event trigger ensure_rls
  on ddl_command_end
  when tag in ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
  execute function public.rls_auto_enable();
