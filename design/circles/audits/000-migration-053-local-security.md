# Audit 000 — Draft Migration 053 local security run

- **Date:** 2026-09-17
- **Target:** `design/circles/db/053_circles_social_layer.sql` (DRAFT)
- **Harness:** `design/circles/db/run-circles-security.sh` — isolated PostgreSQL 16.12
  (Homebrew) cluster in `/tmp/ohara-circles.*`; bootstrap
  `circles-security-bootstrap.sql`; assertions `circles-security.test.sql`.
  No Supabase credentials read; no live project contacted.
- **Result:** ✅ `circles security: all assertions passed`; re-applying 053 fails
  loudly as expected (duplicate objects).

## Actors

A = owner · B = A's accepted friend · C = B's friend, **not** A's friend.

## Assertions proven

**Public goal (CD-002)**
- `set_public_goal` swaps atomically; exactly one `public` Goal remains.
- Draft Goals cannot be made public (`P0002`).
- A direct `UPDATE goals set visibility='public'` creating a second public Goal
  hits `unique_violation` (index enforces it even outside the RPC).
- A user cannot make another user's Goal public.

**Invitations (CD-002, CD-009)**
- Inviting a non-friend is rejected (`42501`).
- Duplicate invitee IDs and repeat sends create one live invite.
- Direct `INSERT` into `goal_share_invites` is denied (RPC-only).
- Pending invite grants **no** access; `list_goals_shared_with_me` excludes it.
- Invitee sees it in `list_my_goal_invites`, accepts → `get_viewable_goal` returns
  `access = 'invited'`; responding twice is rejected.
- Owner `withdraw_goal_invite` revokes an accepted invite → access returns NULL.

**Whitelisted summaries (CD-003, CD-004)**
- Friend cannot `SELECT` owner `goals` / `milestones` rows directly.
- `list_friend_public_goals` returns the public Goal to a friend, **no** string
  containing seeded `PRIVATE` description/reflection/Task title.
- Progress shape: 2 top-level milestones; weekly Task `{done: 2, target: 5}` from
  occurrences in the owner's (America/New_York) current Monday week.
- Stranger (C) gets nothing from `list_friend_public_goals` and NULL from
  `get_viewable_goal` for the public Goal.

**Feed (CD-005, CD-006, CD-007)**
- Reflection link accepted with server-snapshotted title (`Rest counts`).
- Linking a **note** as a reflection is rejected (bug found and fixed during this
  run — untitled-fallback had masked a missing row).
- Linking another user's Goal is rejected.
- Friend sees the post in `get_circles_feed`; stranger sees none, and cannot read
  its comments or encouragements, nor encourage it.
- Saves are private: neither the stranger nor the post author can read another
  user's `saved_posts`.
- Author's feed row shows `encouragement_count = 1`, `comment_count = 1`,
  `saved_by_me = false`.

## Not covered (carry to Phase 2/6)

- Real Supabase role/grant defaults (bootstrap approximates `authenticated`).
- Occurrence materialization horizon for the weekly count (needs live read).
- Comment soft-delete path and feed pagination (`p_before`, limit clamp).
- Unfriending after posts/saves exist.
- `get_profiles_by_ids` interplay for feed author hydration.

## Phase 1b sign-off re-run (2026-09-17)

- 053 was **not modified** at sign-off — Q1–Q4 (CD-013…CD-016) all resolved to
  API-layer/migration-028 behavior with no schema impact.
- Re-ran `design/circles/db/run-circles-security.sh` → `circles security: all
  assertions passed`; non-idempotent re-apply still fails loudly. Suite remains
  valid for the promoted-as-is 053.
- L3 sign-off recorded as **CD-017**. Gate cleared → Phase 2.
