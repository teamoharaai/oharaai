# Audit 001 — Migration 053 live apply + verification

- **Date:** 2026-09-17
- **Target:** `supabase/migrations/053_circles_social_layer.sql` (promoted from
  `design/circles/db/` this session)
- **Project:** `rrgiqemscnyaqkculnmb` (linked main)
- **Apply method:** Supabase management API query endpoint
  (`/v1/projects/<ref>/database/query`, curl User-Agent — Cloudflare 1010 gotcha),
  SQL wrapped in `begin; … commit;`. No Supabase CLI. Authorized by the user in
  session (CD-017 sign-off + explicit "Apply now").

## Pre-flight (read-only, before apply)

| Check | Result |
|---|---|
| `goals.visibility` distribution | 45 `private`, 1 `circle`, **0 `public`** → `goals_one_public_per_user` safe |
| Users with >1 public goal | none |
| `053` in `schema_migrations` | absent; latest applied = `052` (confirms 052 is live) |
| Occurrence horizon vs current week (UTC 2026-09-14 → 09-20) | global max `2026-10-15` (~4 wks), 69 active occurrences this week |
| Active-task coverage | 85 active; 71 unscheduled ("anytime", correctly no occ); 14 scheduled — 12 cover the week; 1 weekly Monday task starts 09-16 (this week's Monday 09-14 precedes start → correct); **1 daily task `985be6df` has zero materialized occurrences** |

## Post-apply verification (live)

- **Tables (RLS enabled):** `goal_share_invites`, `circle_posts`,
  `post_encouragements`, `post_comments`, `saved_posts` — all `relrowsecurity = true`.
- **Index:** `goals_one_public_per_user` present.
- **Functions (13/13):** `are_friends`, `set_public_goal`, `send_goal_invites`,
  `respond_to_goal_invite`, `withdraw_goal_invite`, `circles_goal_summary`,
  `get_viewable_goal`, `list_goals_shared_with_me`, `list_my_goal_invites`,
  `list_friend_public_goals`, `create_circle_post`, `delete_circle_post`,
  `get_circles_feed`.
- **Policies:** `circle_posts` 1 (select-only), `goal_share_invites` 1
  (select-only), `post_comments` 3, `post_encouragements` 3, `saved_posts` 3 —
  exactly as authored (cross-user writes are RPC-only).
- **Grant boundary (CD-004 spine):**
  `has_function_privilege('authenticated','circles_goal_summary(uuid,text)','execute')`
  = **false**; `get_viewable_goal` / `are_friends` / `get_circles_feed` = true.
  Viewers cannot reach the internal summary directly.
- **Tracker row:** `supabase_migrations.schema_migrations` now has
  `('053','circles_social_layer', statements[1])`.
- **Types:** `types/supabase.ts` regenerated from live schema
  (1960 → 3512 lines; the prior file was stale ~migration 034 — the full regen
  also refreshed entries/tasks/momentum/constellation types). `npx tsc --noEmit`
  clean before and after.

## Follow-ups

- **Occurrence-materialization gap (pre-existing, not 053):** active daily task
  `985be6df-5305-40b6-ad99-000bf6471985` (start_date 2026-09-14) has no
  materialized `task_occurrences`. Effect on Circles is bounded — the weekly
  Task count reads occurrences with `target > 0`, so a goal with none simply
  shows **no** weekly count (null), never a wrong or leaked number. Carry to the
  Tasks lane / Phase 5 weekly-count wiring. Logged in `OUTSTANDING.md` risks.
- Real Supabase role/grant defaults now confirmed live (audit 000's first
  "not covered" item is closed for grants; comment soft-delete path, pagination,
  and unfriend-after-post remain Phase 6 harness extensions).
