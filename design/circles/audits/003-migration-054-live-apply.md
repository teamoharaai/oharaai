# Audit 003 — Migration 054 live apply + verify (comment soft-delete fix)

- **Date:** 2026-09-17
- **What:** Fix 0 — `054_circle_comment_soft_delete_rpc.sql`, resolving the
  Phase-4 QA blocker (author 403 `42501` on `DELETE /api/circles/comments/:id`,
  audit 002).
- **How applied:** Supabase management API query endpoint
  (`POST /v1/projects/rrgiqemscnyaqkculnmb/database/query`, curl UA),
  transaction-wrapped (`begin; … commit;`). Tracker row inserted into
  `supabase_migrations.schema_migrations` (version `054`, name
  `circle_comment_soft_delete_rpc`, single statement). **Latest applied migration
  is now 054.** Types regenerated via `/types/typescript`.

## Pre-flight (read-only)

- `redeem_invite_link` was the only `%invite%` RPC; confirmed the Phase-5b findings
  (see CD-022) as a side check. Not part of this migration.

## Post-apply verification

Management-API introspection:
- `delete_circle_comment(uuid)` exists; `authenticated` has EXECUTE
  (`authed_can_exec: true`).
- `"Authors can soft delete own comments"` UPDATE policy on `post_comments` is
  **gone** (`old_policy_remaining: 0`).
- `revoke update (deleted_at)` ran; note the live DB still shows a **table-level**
  UPDATE grant to `authenticated` on `post_comments` — this is a **project-wide
  Supabase default** present identically on all 053 tables (`circle_posts`,
  `saved_posts`, `post_encouragements`, `goal_share_invites` all have table-level
  UPDATE + DELETE grants they never received in 053). RLS is the actual gate: with
  the UPDATE **policy** dropped, direct UPDATEs on `post_comments` are refused
  regardless of grant. A clean rebuild from migrations has only the column grant,
  which 054 revokes. No action taken on the environmental grant (out of scope,
  chasing it would drift from the shared pattern).

Behavioral proof — **rolled-back `set local role authenticated` simulation** as
owner `e4245ec3-1696-4fff-b40e-bd07bd325bfd` (RLS enforced; superuser would
bypass, so the role switch is essential):
- Direct `UPDATE post_comments SET deleted_at = now()` on the author's own live
  comment affects **0 rows** and leaves `deleted_at` NULL (RLS, no UPDATE policy).
  This is exactly the path that previously errored 42501 — now cleanly closed.
- `delete_circle_comment(comment_id)` returns the comment id (soft-delete
  succeeded).
- A second `delete_circle_comment` raises `P0002` (idempotent / already gone).
- Transaction rolled back; `circle_posts` and `post_comments` remain at 0 for the
  owner (no test data persisted).

Signed-in HTTP token round-trip (live REST, user-pasted `access_token`, owner
`e4245ec3…`) — the authenticated path the app route wraps
(`…/rest/v1/rpc/delete_circle_comment`, identical to
`createAuthedClient(token).rpc('delete_circle_comment', …)`):
- `rpc/create_circle_post` → post `1ea7737d…`.
- insert own comment → `8019143a…`.
- **`rpc/delete_circle_comment` → HTTP 200**, returned the comment id — the exact
  call that was **403 `42501`** pre-fix. Now green.
- Live comment list for the post → `[]` (soft-deleted, filtered).
- Cleanup: post soft-deleted, then both rows **hard-deleted** via the management
  API; `circle_posts`/`post_comments` back to 0.

## Result

Fix 0 is **live and verified** — at both the RLS/RPC layer (rolled-back sim) and
the authenticated HTTP layer (token round-trip, comment delete → 200). The
previously-failing Phase-4 check is now green, taking the live token pass to
**20/20**. No test data persisted.
