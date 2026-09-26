-- Migration 077: the Note Goal-evidence synchronizer is internal again.
--
-- 042 made public.sync_entry_goal_progress_evidence(uuid, jsonb) internal: only save_entry_v2 calls it,
-- and save_entry_v2 is a security definer owned by postgres, so clients never need EXECUTE on it.
-- 047 redefined the function and re-granted EXECUTE to authenticated, which let a signed-in user write
-- progress evidence for their own Notes and Goals directly, without the editor deriving it from the
-- saved document. The full-chain harness found this on 2026-09-26 (TD-001); the Notes suite asserts 042's rule.
--
-- Desktop and native save Notes through save_entry_v2/v3/v4, which keep working: the definer's own
-- privilege is what calls the synchronizer. No data changes.
begin;

revoke all on function public.sync_entry_goal_progress_evidence(uuid, jsonb)
  from public, anon, authenticated;

commit;
