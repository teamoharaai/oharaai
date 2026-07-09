-- ============================================================================
-- 014_lock_down_general_folder_rpc.sql
-- get_or_create_general_folder() (013_echo_folders.sql) is SECURITY DEFINER
-- and was confirmed, via live cross-user RLS testing, to let any
-- authenticated caller create/fetch another user's General folder by
-- passing an arbitrary p_user_id — the function has no internal check
-- binding p_user_id to auth.uid() (see 013's function comment; this is
-- intentional, not a bug, since the function must also be callable from a
-- future handle_new_user() trigger with no authenticated session context).
--
-- Fix is at the grant layer, not the function body: only service_role
-- (server-side, using the service key) may call this function. The API
-- route built in Session 3 must invoke it via the service-role client,
-- never the anon/authenticated client. No client-side code in the repo
-- calls this function today (verified via repo-wide search for
-- get_or_create_general_folder / supabase.rpc(...) call sites) — the
-- default PUBLIC execute grant was unused, not a live vulnerability.
-- ============================================================================

revoke execute on function public.get_or_create_general_folder(uuid) from public;
revoke execute on function public.get_or_create_general_folder(uuid) from anon;
revoke execute on function public.get_or_create_general_folder(uuid) from authenticated;
grant execute on function public.get_or_create_general_folder(uuid) to service_role;
