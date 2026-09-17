# Audit 002 — Phase 4 live verification (signed-in token pass)

- **Date:** 2026-09-17
- **How:** expo web on `:8099` → live project `rrgiqemscnyaqkculnmb` (`.env.local`),
  owner `e4245ec3-1696-4fff-b40e-bd07bd325bfd` (user-pasted access token).
  Scripts: `circles-read-fanout.mjs` + `circles-roundtrip.mjs` (job tmp, not committed).
- **Data hygiene:** all test posts/comments hard-deleted after the run via the
  management API; `circle_posts`/`post_comments` for the owner back to 0. Server stopped.

## Result: 19 / 20 checks green

**Read fan-out (8/8 PASS)** — every endpoint the client's `ensureLoaded` calls
returned `200 { ok:true }` with the expected DTO key: `feed` (posts=0),
`shared-with-me` (0), `friends/public-goals` (0), `invites` (0), `invites/sent`
(0), `public-goal` (null), `linkable` (goals=7, milestones=11, reflections=13),
`/api/friends` (friends=2).

**Write round-trip (11/12 PASS)** — exercised every mutation route the store uses,
verifying the DTO shape on read then cleaning up:
- POST `/posts` (goal link + edited description) → 201; appeared in feed with **all
  `CirclesFeedPost` keys**, author hydrated ("Justin"), link snapshot
  (kind/refId/**server-snapshotted title**), and the **edited `link_description`
  persisted (CD-005)**. ✓
- encourage → feed reflects `encouragedByMe`+count → encouragers lists me
  (**CD-013**) → unencourage. ✓
- comment create → appears with hydrated author → **DELETE comment ✗ (see below)**.
- save → appears in `/saved` → unsave. ✓
- delete post → gone from feed (cleanup). ✓

## Defect found (NOT Phase 4 — Migration 053 / Phase 3, L3/CTO)

**Author cannot soft-delete their own comment.** `DELETE /api/circles/comments/:id`
→ **403 `42501` "new row violates row-level security policy for table
post_comments"**. Reproduced three ways (app route, direct PostgREST
`return=minimal`, and a rolled-back `set role authenticated` SQL simulation).

**Root cause (pinned):** the `post_comments` **SELECT policy** is
`deleted_at IS NULL AND exists(post)`. Soft-delete sets `deleted_at = now()`, so
the post-update row no longer satisfies the SELECT policy, and PostgreSQL rejects
the UPDATE. Proof: `auth.uid()` **equals** `author_id` (checked directly); setting
the UPDATE policy `with check (true)` still fails; relaxing the **SELECT** policy
to drop the `deleted_at IS NULL` clause makes the soft-delete succeed
(`update-ok`). Not the column-scoped grant (full `UPDATE` grant still fails) and
no triggers exist. `circle_posts` is unaffected because it soft-deletes via the
`delete_circle_post` SECURITY DEFINER RPC (CD-009); comments use a direct
column-scoped RLS UPDATE — the CD-009 inconsistency is the source.

**Suggested fix (new migration ≥ 054, CTO lane):** either (preferred, matches
CD-009) add a `delete_circle_comment(uuid)` SECURITY DEFINER RPC that soft-deletes
the caller's own comment and repoint `lib/db/circles.ts` `deletePostComment` at it;
or broaden the SELECT policy USING to
`((deleted_at is null and exists(post)) or author_id = auth.uid())` (reads already
filter `deleted_at is null`, so authors still won't see their deleted comments).

**Phase 4 client impact:** none corrupting — `removeComment` optimistically drops
the comment then **reverts** on the 403, so the comment reappears. The swap itself
is correct; this is a server capability gap to fix before enabling comment delete
in QA.
