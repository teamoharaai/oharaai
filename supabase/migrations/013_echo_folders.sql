-- ============================================================================
-- 013_echo_folders.sql
-- Echo Folders: schema + migration. Implements the data-model decision from
-- the Echo Folders audit (Option A, reversed from Option B — see
-- DECISIONS.md) plus lazy General-folder creation. Zero production data at
-- time of writing (pre-pilot) — this is a clean migration, not a defensive
-- one.
--
-- Adds the echo_folders table, backfills the folder_id FK on
-- echo_entry_links (added nullable, no-FK, in 012_echo_entry_links.sql), and
-- adds get_or_create_general_folder() for lazy General-folder provisioning.
-- ============================================================================

-- echo_folders --------------------------------------------------------------
create table public.echo_folders (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  name       text not null,
  is_general boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Race-safe General folder: at most one per user. Also the conflict target
-- for get_or_create_general_folder()'s upsert below.
create unique index echo_folders_one_general_per_user
  on public.echo_folders (user_id)
  where (is_general = true);

-- updated_at trigger: reuses the shared public.handle_updated_at() function
-- defined in 001_core_schema_and_rls.sql and already applied to spaces,
-- projects, vaults, and vault_items. Not redefined here.
create trigger echo_folders_updated_at
  before update on public.echo_folders
  for each row execute function public.handle_updated_at();

alter table public.echo_folders enable row level security;

-- RLS mirrors echo_entries exactly (002_echo.sql): echo_folders is a
-- directly user-owned table (user_id column, no join needed), same shape as
-- echo_entries rather than the join-based echo_entry_links pattern.
create policy "Users can select own echo folders" on public.echo_folders
  for select using (user_id = auth.uid());
create policy "Users can insert own echo folders" on public.echo_folders
  for insert with check (user_id = auth.uid());
create policy "Users can update own echo folders" on public.echo_folders
  for update using (user_id = auth.uid());
create policy "Users can delete own echo folders" on public.echo_folders
  for delete using (user_id = auth.uid());

-- echo_entry_links.folder_id FK ----------------------------------------------
-- folder_id was added nullable, no-FK, in 012_echo_entry_links.sql (Echo
-- Folders table didn't exist yet). Adding the FK now that it does.
--
-- ON DELETE RESTRICT is deliberate, not an oversight: folder-deletion UX
-- (cascade vs. reassign-to-General) is locked as "requires explicit user
-- choice" but isn't built until a later session. RESTRICT makes folder
-- deletion impossible at the DB level until that logic exists and this FK
-- is deliberately changed to CASCADE or SET NULL alongside it.
alter table public.echo_entry_links
  add constraint echo_entry_links_folder_id_fkey
  foreign key (folder_id) references public.echo_folders(id)
  on delete restrict;

-- get_or_create_general_folder ----------------------------------------------
-- SQL/plpgsql (not TypeScript) so this is trivially promotable into
-- handle_new_user() (008_profiles_timezone_and_user_trigger.sql) later
-- without changing any call-site code on the API side.
--
-- SECURITY DEFINER + locked search_path follows the established pattern for
-- functions that must write despite RLS (handle_new_user_space() in
-- 003_spaces_and_projects.sql, handle_new_user() in 008,
-- consume_daily_ai_quota() in 006_logging_and_rate_limiting.sql). Callers
-- only ever pass auth.uid() as p_user_id (enforced at the API layer, not by
-- this function), so this does not grant cross-user access in practice —
-- flagging per session instructions since the function itself has no
-- internal check tying p_user_id to auth.uid().
--
-- Atomic via the partial unique index above: safe under concurrent calls,
-- no check-then-insert race.
create or replace function public.get_or_create_general_folder(p_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_folder_id uuid;
begin
  insert into public.echo_folders (user_id, name, is_general)
  values (p_user_id, 'General', true)
  on conflict (user_id) where (is_general = true) do nothing;

  select id into v_folder_id
  from public.echo_folders
  where user_id = p_user_id and is_general = true;

  return v_folder_id;
end;
$$;
