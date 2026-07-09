-- ============================================================================
-- 017_eager_general_folder_provisioning.sql
-- Eager General-folder provisioning: get_or_create_general_folder()
-- (013_echo_folders.sql) previously only ran lazily, on a caller's first
-- container-less Echo save or on folder-delete-reassign. This adds a
-- profiles-insert trigger so every new user gets a General folder at
-- signup, matching the existing eager-provisioning pattern for personal
-- spaces (handle_new_user_space(), 003_spaces_and_projects.sql).
--
-- Deliberately a separate trigger function, not folded into
-- handle_new_user_space(): keeps each provisioning concern independently
-- auditable/revertable, mirroring the try/exception-per-concern shape that
-- function already uses internally for its own two steps (space + member
-- insert share one block there because they're one unit of work; General-
-- folder provisioning is a distinct, unrelated unit).
--
-- Non-blocking: wrapped in exception handler, same pattern as
-- handle_new_user_space() and handle_new_user() (008) — provisioning
-- failure must not block signup (root CLAUDE.md: "Space creation failure
-- must NOT block signup. Non-blocking, log errors" — same rule applies
-- here). Lazy provisioning via getOrCreateGeneralFolderId() (server-side
-- call sites only — see lib/db/echo-folders.ts) remains as a fallback for
-- any user whose eager provisioning failed here.
--
-- Idempotent: get_or_create_general_folder() upserts against
-- echo_folders_one_general_per_user (013) with ON CONFLICT ... DO NOTHING,
-- so this trigger firing is safe even if a General folder already exists
-- for the user (shouldn't happen for a fresh signup, but true for any
-- replay scenario).
--
-- SECURITY DEFINER + locked search_path: same pattern as
-- handle_new_user_space(). This function runs as its owner (the migration-
-- applying role), which is why it can call get_or_create_general_folder()
-- despite that function's EXECUTE grant being locked to service_role only
-- (014_lock_down_general_folder_rpc.sql) — the SECURITY DEFINER execution
-- context is what's checked, not the session that fired the original
-- INSERT. NOT independently verified against a live Supabase instance in
-- this session (no credentials available here) — flagging this
-- cross-function-privilege interaction as the one thing that should get a
-- live signup smoke test before this is considered fully verified, same
-- caveat already on record for handle_new_user_space() itself in
-- supabase/CLAUDE.md.
--
-- Also includes a one-time backfill (below the trigger) provisioning a
-- General folder for every profile that already existed before this
-- migration landed — the trigger alone only covers profiles inserted from
-- here forward. See the backfill's own comment for why this is plain SQL
-- rather than a per-row function call.
-- ============================================================================

create or replace function public.handle_new_profile_general_folder()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  begin
    perform public.get_or_create_general_folder(new.id);
  exception when others then
    raise warning '[handle_new_profile_general_folder] Failed to provision General folder for user %: %',
      new.id, sqlerrm;
  end;

  return new;
end;
$$;

create trigger on_profile_created_create_general_folder
  after insert on public.profiles
  for each row execute function public.handle_new_profile_general_folder();

-- Backfill ---------------------------------------------------------------
-- The trigger above only covers profiles inserted from this point forward.
-- Any profile that already existed when this migration runs would otherwise
-- have no General folder and no path to get one: getGeneralFolderId()
-- (lib/db/echo-folders.ts) is a plain read with no creation fallback by
-- design (client-side, RLS-scoped — see echo-service.ts's createEntry()).
-- This is a one-time data backfill, not ongoing provisioning logic, so it's
-- plain SQL rather than a per-row call into get_or_create_general_folder().
--
-- Same idempotent shape as get_or_create_general_folder() itself: insert
-- against echo_folders_one_general_per_user (013) with ON CONFLICT ... DO
-- NOTHING, safe to re-run. The NOT EXISTS filter is a scoping optimization,
-- not a correctness requirement — it just avoids generating a row (and
-- immediately conflicting on it) for every profile that already has one.
--
-- Pre-pilot / zero production data at time of writing, per session
-- instructions — this is expected to be a no-op or near-no-op today, but is
-- included for correctness against any environment where profiles already
-- exist ahead of this migration landing.
insert into public.echo_folders (user_id, name, is_general)
select p.id, 'General', true
from public.profiles p
where not exists (
  select 1
  from public.echo_folders f
  where f.user_id = p.id
    and f.is_general = true
)
on conflict (user_id) where (is_general = true) do nothing;
