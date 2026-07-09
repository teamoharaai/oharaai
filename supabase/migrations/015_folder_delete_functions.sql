-- ============================================================================
-- 015_folder_delete_functions.sql
-- Session 3 (Folder CRUD API Routes) needs DELETE /api/folders/[id] to be
-- transactional: reassigning/deleting entries and deleting the folder row
-- must not partially apply. supabase-js has no multi-statement transaction
-- support over PostgREST, so each delete mode is implemented as a single
-- plpgsql function — the function body is one transaction by construction.
--
-- Both functions are SECURITY INVOKER (the default — stated explicitly for
-- clarity), unlike get_or_create_general_folder() in 013/014. They only ever
-- touch rows already reachable under RLS for the calling user (echo_folders
-- via user_id = auth.uid(), echo_entry_links/echo_entries via
-- echo_entries.user_id = auth.uid()), and each function additionally
-- verifies ownership internally via auth.uid() before mutating anything.
-- No service-role escalation needed, so none of the SECURITY DEFINER /
-- grant-lockdown ceremony from 013/014 applies here. Callable by any
-- authenticated user; auth.uid() + the explicit checks below are the only
-- access control, same pattern as RLS policies throughout this schema.
-- ============================================================================

-- delete_folder_reassign -----------------------------------------------------
-- DELETE /api/folders/[id] mode: 'folder_only'. Repoints every
-- echo_entry_links row currently in p_folder_id to p_general_folder_id, then
-- deletes the (now-unreferenced) folder row. echo_entry_links.folder_id is
-- ON DELETE RESTRICT (013_echo_folders.sql, deliberate), so the folder
-- delete would fail if any row still referenced it — the reassignment above
-- is what clears that.
--
-- p_general_folder_id is resolved by the caller via
-- get_or_create_general_folder() (service-role only, 013/014) *before*
-- calling this function — this function does not itself need service-role
-- access, it just double-checks the id it's handed actually belongs to the
-- caller.
create or replace function public.delete_folder_reassign(
  p_folder_id uuid,
  p_general_folder_id uuid
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.echo_folders
    where id = p_folder_id and user_id = auth.uid() and is_general = false
  ) then
    raise exception 'Folder not found or not eligible for deletion';
  end if;

  if not exists (
    select 1 from public.echo_folders
    where id = p_general_folder_id and user_id = auth.uid() and is_general = true
  ) then
    raise exception 'General folder not found';
  end if;

  update public.echo_entry_links
  set folder_id = p_general_folder_id
  where folder_id = p_folder_id;

  delete from public.echo_folders where id = p_folder_id;
end;
$$;

grant execute on function public.delete_folder_reassign(uuid, uuid) to authenticated;

-- delete_folder_with_contents -------------------------------------------------
-- DELETE /api/folders/[id] mode: 'delete_contents'. Deletes every echo_entry
-- linked to p_folder_id, then the folder row. echo_entry_links.echo_entry_id
-- is ON DELETE CASCADE (005_echo_goal_links.sql, carried through the 012
-- rename unchanged) so deleting the entries removes their link rows
-- automatically — no explicit link deletion needed, and by the time the
-- folder delete runs, nothing references it (satisfying the RESTRICT FK).
create or replace function public.delete_folder_with_contents(
  p_folder_id uuid
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.echo_folders
    where id = p_folder_id and user_id = auth.uid() and is_general = false
  ) then
    raise exception 'Folder not found or not eligible for deletion';
  end if;

  delete from public.echo_entries
  where id in (
    select echo_entry_id from public.echo_entry_links where folder_id = p_folder_id
  );

  delete from public.echo_folders where id = p_folder_id;
end;
$$;

grant execute on function public.delete_folder_with_contents(uuid) to authenticated;
