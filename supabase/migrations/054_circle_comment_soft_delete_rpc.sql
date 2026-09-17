-- ============================================================================
-- 054_circle_comment_soft_delete_rpc.sql
--
-- Circles Fix 0: comment soft-delete was broken live.
--
-- Migration 053 let comment authors soft-delete via a direct column-scoped
-- UPDATE grant + an "Authors can soft delete own comments" UPDATE policy. But
-- the post_comments SELECT policy requires `deleted_at is null`, so the
-- post-update row (deleted_at = now()) fails the SELECT visibility check and
-- PostgreSQL rejects the author's own soft-delete UPDATE with 42501
-- ("new row violates row-level security policy for table post_comments").
-- See design/circles/audits/002-phase4-live-verify.md for the pinned root cause.
--
-- Fix (CD-021, mirrors delete_circle_post / CD-009): replace the direct RLS
-- UPDATE path with a SECURITY DEFINER RPC that soft-deletes the caller's own
-- comment, and drop the now-unused UPDATE policy + column-scoped update grant.
-- The SELECT policy and the privacy spine are untouched.
-- ============================================================================

-- Author-scoped, idempotent soft delete of one's own comment. SECURITY DEFINER
-- so it bypasses the SELECT `deleted_at is null` visibility check that blocked
-- the direct UPDATE; still author-scoped via auth.uid() in the WHERE clause.
create or replace function public.delete_circle_comment(p_comment_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_id uuid;
begin
  update public.post_comments
    set deleted_at = now()
  where id = p_comment_id and author_id = auth.uid() and deleted_at is null
  returning id into v_id;

  if v_id is null then
    raise exception using errcode = 'P0002', message = 'comment_not_found';
  end if;
  return v_id;
end;
$$;

revoke all on function public.delete_circle_comment(uuid) from public, anon;
grant execute on function public.delete_circle_comment(uuid) to authenticated;

-- The direct RLS UPDATE path is now superseded by the RPC. Drop the policy and
-- the column-scoped grant so authors can no longer attempt a direct UPDATE (it
-- would fail the SELECT visibility check anyway).
drop policy if exists "Authors can soft delete own comments" on public.post_comments;
revoke update (deleted_at) on table public.post_comments from authenticated;
