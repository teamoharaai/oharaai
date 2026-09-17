# Session 005 — Fix 0 (comment soft-delete) + Phase 5a (weekly Task count); Phase 5b deferred

- **Date:** 2026-09-17
- **Task(s):** Fix 0 (blocking QA defect, migration ≥054), Phase 5a (Today's Focus weekly Task count), Phase 5b investigation (invite links)
- **Agent/model:** Opus 4.8
- **tsc baseline (before):** clean

## Goal of this session

Clear the Phase-4 QA blocker (author cannot soft-delete their own comment, 403
`42501`) and wire the first slice of real Phase-5 data (this week's Task count on
Today's Focus). Investigate invite links (Phase 5b) far enough to decide the path.

## Changes

### Fix 0 — comment soft-delete (CTO / L3, decided **option A** with the user)
- **`supabase/migrations/054_circle_comment_soft_delete_rpc.sql`** (new) — adds
  `delete_circle_comment(uuid)` SECURITY DEFINER (author-scoped via `auth.uid()`,
  idempotent, `raise P0002` when missing/already gone), grants EXECUTE to
  `authenticated`, and **drops** the superseded `"Authors can soft delete own
  comments"` UPDATE policy + `revoke update (deleted_at)` grant. Mirrors
  `delete_circle_post`/CD-009. Root cause: the `post_comments` SELECT policy
  (`deleted_at is null`) made the post-update row invisible, so the direct RLS
  UPDATE was rejected 42501 (audit 002). **Applied + verified live** (audit 003).
- **`lib/db/circles.ts`** — `deletePostComment(commentId, client)` now calls the
  RPC (dropped the `userId` param and the direct `.update()`; removed the now-unused
  `CircleDataError` import).
- **`app/api/circles/comments/[id]/index+api.ts`** — drops the `auth.userId` arg;
  comment header updated.
- **`types/supabase.ts`** — regenerated from the live schema post-apply (adds
  `delete_circle_comment`; otherwise identical).
- **`scripts/test-circles-security.sh`** + **`scripts/circles-security.test.sql`** —
  harness now applies 053 **and 054** and asserts the comment soft-delete round-trip
  (stranger blocked → author RPC succeeds → feed `comment_count` → 0 → re-delete
  raises P0002).

### Phase 5a — Today's Focus weekly Task count (CD-003)
- **`lib/db/tasks.ts`** — new `fetchWeeklyTaskCountsByGoal(db, userId, timezone)`
  returning `Record<goalId, {done, target}>`. Owner-tz, Monday-start (reuses
  `lib/time/zoned-calendar` `localDateForInstant`/`startOfIsoWeekYmd`/`addLocalDays`);
  counts non-cancelled `task_occurrences` of `active` tasks in the current local
  week (`target`), completed ones (`done`). Mirrors `circles_goal_summary`
  (053 L273–325). Goals with no occurrences are absent from the map.
- **`app/api/goals/weekly-task-counts+api.ts`** (new) — thin `withAuth` GET; derives
  tz via `fetchProfileTimezone`; own goals only (RLS-scoped). CTO-lane, keeps
  `features/circles` uninvolved (dashboard is the slot owner).
- **`features/goals/services/weekly-task-count-service.ts`** (new) — `authedFetch`
  client service.
- **`app/(app)/dashboard.tsx`** — fetches the counts (mirrors the reflection-
  timestamps effect, keyed on active goal ids) and renders a `done/target` line
  with a calendar icon beside the milestone fraction in `TodayFocusSummary`;
  omitted when a goal has no weekly count (graceful degradation, the known
  occurrence-gap caveat).

### Phase 5b — invite links: **deferred** (decided with the user)
- Verified live (read-only): `redeem_invite_link` (028) **instantly creates an
  `accepted` friendship** (`inserts_accepted: true`) and there is **no
  get-or-create "my invite link" RPC** (only `redeem_invite_link` exists; 0 links
  exist). Both **contradict CD-016** (pending request + one reusable link).
  Reconciling is an L3 migration on the live friend graph. User chose to **defer**
  Phase 5b; the prototype `InviteByLink()` placeholder stays. See CD-022.

## Tests

- **`npm run test:circles:db`** → **pass** (053+054 on disposable local PG16;
  new comment soft-delete assertions green).
- **Live rolled-back `set local role authenticated` simulation** (management API,
  as owner `e4245ec3…`): direct UPDATE now affects **0 rows** (RLS, policy gone) and
  leaves `deleted_at` null; `delete_circle_comment` returns the id; a second call
  raises P0002. Rolled back — no live data persisted (`circle_posts`/`post_comments`
  back to 0). This is the RLS/RPC-layer equivalent of the token round-trip's failing
  check, now green.
- `npx tsc --noEmit` → **pass** (before and after).

## Decisions made

- **CD-021** — comment soft-delete via `delete_circle_comment` SECURITY DEFINER RPC
  (option A, mirrors CD-009).
- **CD-022** — Phase 5b (invite links) deferred; `redeem_invite_link` (028)
  diverges from CD-016 (auto-accepts, no get-or-create RPC) — reconciliation left
  as a future L3 item.

## Follow-ups / handoff

- **Done:** signed-in HTTP token round-trip for Fix 0 (live REST, user-pasted
  token, owner `e4245ec3…`) — `rpc/delete_circle_comment` → **HTTP 200** (the exact
  call that was 403 pre-fix), comment gone from the live list, throwaway rows
  hard-deleted. Live token pass is now **20/20** (audit 003). No expo server was
  needed — the round-trip hit the same authenticated RLS/RPC path directly.
- **Phase 5a live-verify** (signed-in browser: weekly count renders for own goals)
  folds into Phase 8 QA, same as the rest of the client swap.
- **Phase 5b** parked (CD-022). If revived: either reconcile 028→CD-016 (new
  migration: redeem→pending + get-or-create link RPC) or supersede CD-016 to the
  shipped auto-accept model, then do the `features/friends` client wiring.
- Phases 6 (tests) and 7 (docs) still open; Phase 8 = signed-in QA + PR.
