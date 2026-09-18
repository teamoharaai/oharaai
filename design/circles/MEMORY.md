# Circles — Compounding Memory

Durable facts. Read first. Append; correct stale facts in place. Dated so drift is
visible.

## Repo & branch (2026-09-17)

- Work lives on **`feat/circles-home`** (pushed). Prototype commit **`f083ba5`**.
  `main` is untouched by this initiative. Commit only when the user asks.
- `.claude/launch.json` is an untracked local preview config — never commit it.
- The user's own dev server usually runs on **:8099** (`expo start --web --port 8099`).
  Avoid starting a second server from the same checkout (duplicate background jobs).

## Phase 7 docs (2026-09-17)

- Root constitution is **`docs/CLAUDE.md`**; repo-root **`CLAUDE.md` is a symlink
  to it** — edit `docs/CLAUDE.md` and both update. Phase 7 lifted the "No feed"
  prohibition (Circles/Home is now the one shipped social surface, behind the
  flag) and added Circles to the Data Model + Naming sections.
- Root decision log is **`docs/DECISIONS.md`** (append-only; note the stray
  double `# Decision Log` header at the top — leave it). It now carries a dated
  pointer to `design/circles/DECISIONS.md` as the authoritative CD-001…CD-022 log.
- `docs/API_CONTRACT.md` already had a "## Circles endpoints" section (Phase 3);
  Phase 7 added `GET /api/goals/weekly-task-counts` right after it, flagged as the
  **goals lane, not `/api/circles/**`**, returning raw `{ counts: { [goalId]:
  {done,target} } }` (no `ApiResponse` envelope).
- Only Phase 8 (signed-in QA + PR; flip `CIRCLES_ENABLED`) remains.

## Phase 6 tests (2026-09-17)

- **`npm run test:circles`** (new script) runs `lib/db/circles-core.test.ts` +
  `features/circles/progress.test.ts` under `node --experimental-strip-types
  --test` — 28 tests, relative runtime imports (D-004; both modules' `@/` imports
  are type-only, stripped). Covers `classifyPgError`, the author/feed/post/goal-
  summary/sent-invite mappers, all validators, and the CD-003 progress rules.
- **Contract clarified (not a bug):** the "weekly count null when target 0" rule
  is enforced in SQL (`circles_goal_summary`, 053 L321–326 emits `weekly_task:
  null`) and in `weeklyTaskLabel` (returns null at target ≤ 0). `mapGoalSummary`
  just passes the SQL's null through — tests assert that real contract.
- **`test:circles:db` now also covers `get_circles_feed` pagination.** The harness
  seeds 55 stamped author posts via **direct superuser inserts** (053 grants
  `authenticated` SELECT only, so `set role authenticated` cannot INSERT — writes
  normally go through `create_circle_post`, which stamps `created_at = now()` and
  ties timestamps within one transaction; direct inserts give deterministic,
  distinct stamps). Assertions use created_at aggregates (order-independent):
  default page 20, `p_limit=>1000`→50, `p_limit=>0`→1 (newest), top-3 newest-first,
  `p_before` older-only, `p_before`+`p_limit` = two newest below cursor. Call
  `get_circles_feed` with **named args** (`p_limit =>`, `p_before =>`) to avoid
  null-type ambiguity on the positional `p_before`.

## Fix 0 + Phase 5a (2026-09-17)

- **Migration 054 is LIVE.** `054_circle_comment_soft_delete_rpc.sql` added
  `delete_circle_comment(uuid)` SECURITY DEFINER (author-scoped, idempotent,
  P0002 when missing) and **dropped** the `post_comments` UPDATE policy +
  `update(deleted_at)` grant (CD-021). Fixes the 403 `42501` comment-delete defect.
  Applied via management API, tracker row inserted; **latest applied migration is
  now 054**. Types regenerated. Verified live via a rolled-back `set local role
  authenticated` sim (direct UPDATE → 0 rows; RPC returns id; re-delete → P0002) —
  audit 003. `lib/db/circles.ts:deletePostComment(commentId, client)` now calls the
  RPC (dropped `userId`). Harness (`test:circles:db`) applies 053+054 and asserts
  the round-trip.
- **Live grant gotcha:** all 053 tables carry table-level UPDATE+DELETE grants for
  `authenticated` that 053's SQL never wrote — a **Supabase project-wide default**.
  RLS is the real gate; a dropped policy blocks direct writes regardless of grant.
  Don't chase these grants in migrations.
- **Phase 5a weekly Task count is built** (CD-003). `lib/db/tasks.ts:
  fetchWeeklyTaskCountsByGoal(db, userId, timezone)` (owner-tz Monday-start via
  `zoned-calendar`; non-cancelled active-task occurrences this week = target,
  completed = done; goals w/o occurrences absent from the map). Exposed at
  **`GET /api/goals/weekly-task-counts`** (CTO/goals lane, NOT `/api/circles/**` —
  dashboard is the slot owner) → `features/goals/services/weekly-task-count-service.ts`
  → `dashboard.tsx` renders `done/target` beside the milestone fraction in
  `TodayFocusSummary`. Live browser render deferred to Phase 8.
- **Phase 5b invite links DEFERRED (CD-022).** Live check: `redeem_invite_link`
  (028) **auto-accepts** (inserts an `accepted` friend edge, not a pending request)
  and there is **no get-or-create "my invite link" RPC** — both contradict CD-016.
  Prototype `InviteByLink()` placeholder left as-is. Reconciliation is a future L3
  decision.

## Phase 4 client swap (2026-09-17)

- **Built (changelog 004), tsc clean.** Client is off fixtures onto the real
  `/api/circles/**` endpoints, behind **`FEATURES.CIRCLES_ENABLED`** (added to
  `constants/features.ts`, still **false**). Files: `features/circles/`
  `services/circles-service.ts` (new), `store.ts` (rewritten), `types.ts`
  (re-exports server DTOs type-only from `lib/db/circles-core.ts`), `format.ts`
  (new), `progress.ts`, `hooks/useCircles.ts`, and every component.
- **Flag is the single fetch gate.** Every mount-time load runs only when
  `CIRCLES_ENABLED`: `useCircles` (Home), `useGoalInviteCount` (AvatarMenu,
  app-wide → returns 0/no-fetch when off), `SavedPostsPane`. With the flag off,
  Home renders greeting + Today's Focus + drafts, no feed, no Circles fetches.
- **`ensureLoaded` is idempotent** (guarded on `status !== 'idle'`) so Home +
  the avatar-menu panes trigger a single `Promise.allSettled` load. Mutations use
  optimistic update + revert for the light toggles and reload-after-write for
  publish/send/withdraw/set-public-goal.
- **Author identity = the hydrated DTO `author`/`owner`** (never a fixture
  lookup). `me` (current user `CirclesAuthor`) is derived from the session in
  `useCircles` — no extra request. `PersonAvatar` takes a `CirclesAuthor`.
- **CD-004** `SharedGoal.why` removed from types + UI. **CD-005** composer shows
  an editable snapshot description before posting. **CD-013** encourage count is
  tappable → encouragers modal (`GET .../encouragements`). **CD-019** dropped
  `following`/`toggleFollowing`. **CD-020** invite-picker friends come from the
  shared `GET /api/friends` (not a `features/friends` import).
- **`fixtures.ts` is TEST-ONLY**, rewritten to the new DTO shapes; **zero
  production importers** (verify with a grep before Phase 6 tests).
- **No image upload:** composer image toggle + feed image rendering removed
  (`imagePath` is effectively always null; no upload pipeline). Revisit if/when
  uploads land (Phase 1.5).
- **Feed pagination:** service supports the `before=` cursor but the store loads
  page 1 only. `goal_complete` posts never arise from `create_circle_post`
  (only reflection/milestone) — the "Completed" filter stays empty in practice.

## Phase 4 live verification + a 053 defect (2026-09-17)

- **Token pass ran 19/20 green** (audit 002) vs live signed-in owner `e4245ec3…`
  (expo web :8099). All client read endpoints returned the right DTO shapes; a
  write round-trip verified post create (CD-005 description persisted, server
  title snapshot, hydrated author), encourage/encouragers (CD-013), save, delete.
  Test data hard-deleted after (management API); tables back to 0. Server stopped.
- **Comment soft-delete is broken live — Migration 053 defect (L3/CTO, not Phase
  4).** `DELETE /api/circles/comments/:id` → 403 `42501`. The `post_comments`
  **SELECT** policy (`deleted_at IS NULL`) rejects the post-update row, so the
  author's own soft-delete UPDATE is refused. Proven: `auth.uid() = author_id`;
  UPDATE policy `with check(true)` still fails; relaxing the SELECT policy fixes
  it. `circle_posts` is fine (RPC-based delete, CD-009). Fix in a new migration —
  add `delete_circle_comment(uuid)` SECURITY DEFINER RPC (matches CD-009) or
  broaden the SELECT policy USING with `or author_id = auth.uid()`. The Phase 4
  client is correct (`removeComment` reverts on the 403).
- **Reusable live-DB introspection this session:** management API query endpoint
  (`POST https://api.supabase.com/v1/projects/<ref>/database/query`, `Authorization:
  Bearer $SUPABASE_ACCESS_TOKEN` [in shell env], curl UA) runs arbitrary SQL as
  postgres — great for `pg_policies`/`pg_trigger` reads and **rolled-back
  `set local role authenticated` + `set local request.jwt.claims` RLS simulations**.
  `SUPABASE_SERVICE_ROLE_KEY` is in `.env.local` too.

## Phase 3 server layer (2026-09-17)

- **Built (changelog 003), tsc clean.** `lib/db/circles-core.ts` (pure DTOs +
  mappers + validators + `CircleDataError`/`classifyPgError`/`throwCircleError`),
  `lib/db/circles.ts` (data access over 053), `lib/api/circles.ts` (envelope +
  error→HTTP), and 17 route files under `app/api/circles/**`. Contract documented
  in `docs/API_CONTRACT.md` → "Circles endpoints".
- **`circles-core.ts` uses type-only `@/` imports only** (no runtime imports),
  so the node runner strips them — safe for Phase 6 relative-import tests (D-004).
  Follow the friends pattern: `lib/db/*-core.ts` = pure/testable, `lib/db/*.ts` =
  Supabase calls.
- **Error mapping** (SQLSTATE→HTTP): 42501→403, P0002→404, 22023→400, 23505→409,
  else 500. Lives in `classifyPgError` (db) + `circlesErrorResponse` (api).
- **CD-013** encouragers endpoint = `GET /api/circles/posts/:id/encouragements`.
  **CD-014** declined→pending is `mapSentInvite` (see **CD-018**); withdrawn dropped.
- **supabase-js embedded joins infer as arrays** — `saved_posts.post:circle_posts(*)`
  and `milestones.goals(...)` needed `as unknown as {...}` casts; rpc `data` for
  the feed cast to `FeedRow[]`.
- **Author hydration always via `get_profiles_by_ids`** (030: self + live friend
  edges only) — every author/invitee/owner Circles surfaces is a friend/self, so
  it's sufficient; unfriended → profile drops to null.
- **Smoke `scripts/circles-api.smoke.mjs` + `npm run test:circles:api`** — **ran
  green 2026-09-17** vs a live signed-in session (expo web :8099 → live
  `rrgiqemscnyaqkculnmb`; user pasted their access_token). Checks 401 guards
  unconditionally; runs the authed create→delete round-trip when
  `OHARA_CIRCLES_ACCESS_TOKEN` or `OHARA_CIRCLES_EMAIL`/`PASSWORD` (+`WEB_ORIGIN`)
  is set. Config `.env.local` points at the **live** project, so a local expo web
  server writes to live data — the smoke's one post is soft-deleted immediately.

## Phase 2 promote + apply (2026-09-17)

- **053 is LIVE.** Applied to `rrgiqemscnyaqkculnmb` via the management API
  (transaction-wrapped), tracker row inserted; **latest applied migration is now
  053**. Verified: 5 tables + RLS, `goals_one_public_per_user` index, 13
  functions, correct policy counts, and `circles_goal_summary` NOT executable by
  `authenticated` (CD-004 spine holds). See `audits/001`.
- **File locations changed** (from `design/circles/db/`):
  - migration → `supabase/migrations/053_circles_social_layer.sql`
  - harness → `scripts/circles-security-bootstrap.sql`,
    `scripts/circles-security.test.sql`, `scripts/test-circles-security.sh`
    (run via `npm run test:circles:db`; repo-root path convention).
- **`types/supabase.ts` was stale (~migration 034)** — the post-053 regen jumped
  1960 → 3512 lines, refreshing entries/tasks/momentum/constellation types too.
  `tsc` stayed clean. If regenerating again, expect a large but benign diff.
- **Occurrence-gap caveat:** one active daily task (`985be6df…`) has no
  materialized occurrences → Circles weekly count under-reports (shows nothing),
  never wrong data. Pre-existing Tasks issue; Phase 5 / Tasks lane.

## Phase 1b sign-off (2026-09-17)

- **053 is signed off (CD-017)** — schema/RLS/RPC/grants approved as-is; Phase 2
  promotion authorized. Live apply still needs explicit per-session user go-ahead.
- Q1–Q4 resolved, **none changed 053's schema** (all API-layer or migration-028):
  - **Q1/CD-013** Encourage shows *who* (names on tap via `get_profiles_by_ids`).
  - **Q2/CD-014** Owner's sent list **hides declines** — maps declined→"Pending".
  - **Q3/CD-015** Posts linking a now-private/withdrawn Goal are **kept** (snapshots).
  - **Q4/CD-016** Invite links **reusable**; redeem auto-sends a **pending** friend
    request. Verify `redeem_invite_link` (028) actual behavior in Phase 5.
- CLAUDE.md "No feed" lift + Data Model/Naming additions are **Phase 7**, not now.

## Prototype realities

- All social state is in-memory: `features/circles/fixtures.ts` +
  `features/circles/store.ts` (`useCirclesStore`). Resets on reload.
- `app/(app)/dashboard.tsx` composes `CirclesScreen` with slots: `greeting`
  (`DashboardGreeting`), `todayFocus` (`TodayFocusSummary`), `feedNotice`
  (`DraftsCard` when `?goalFilter=drafts`). It still fires `/api/echo/reconcile`
  on load — **Home is its only caller**.
- `AIGoalCreation.tsx` routes to `DASHBOARD_DRAFT_SAVED_ROUTE` → Home must keep
  the drafts list + "Saved as draft" toast.
- Today's Focus progress = top-level milestones (`parentId === null`,
  `completedAt !== null`) from `GoalWithDetails.milestones`.
- Profile popover (`features/friends/components/FriendsPopover.tsx`) is desktop-only
  (`width >= 900`, web); mobile uses the `AvatarMenu` modal rows (Profile, Circles,
  Goal invitations, Saved, Settings).
- `SharedGoal.why` in the prototype is **not** exposed by the real schema (CD-004).

## Verification gotchas

- **Signed-out preview redirects to login**: `authedFetch` calls
  `signOutAndRedirect()` with no session. Anything that fetches on mount
  (AvatarMenu profile, `useFriends`, dashboard reconcile) bounces. To eyeball
  fixture UI, a temporary route outside `(app)` rendering `CirclesScreen` with
  placeholder slots works — delete it afterwards. The popover itself cannot be
  checked signed-out.
- **Never type credentials** into the preview login.
- The preview browser can throw a Supabase auth "Lock broken by another request
  with the 'steal' option" error when two tabs race the auth lock — not app code.
- **Local Postgres on macOS needs `LC_ALL`** or the postmaster aborts with
  "became multithreaded during startup". `run-circles-security.sh` exports
  `LC_ALL=C`.
- Node unit tests run under `node --experimental-strip-types --test` with **no
  `@/` import map** — test-reachable modules must use relative imports
  (tracker-metrics D-004).

## Live DB state (read-only checks, 2026-09-17)

- Project ref `rrgiqemscnyaqkculnmb`. Latest applied migration **054** (as of
  2026-09-17; was 052 before 053/054 landed).
- `goals.visibility`: 45 `private`, 1 `circle`, 0 `public` → the one-public
  partial unique index is safe to create.
- No `circle_posts` table or `are_friends` function exists yet.
- `invite_links` + `redeem_invite_link()` exist (028) but no app code uses them.
- Apply path: management API query endpoint with a curl User-Agent (Cloudflare
  1010 bans Python-urllib), then insert the `supabase_migrations.schema_migrations`
  row manually; regenerate types via `/types/typescript`.

## Server conventions to mirror

- Routes: `withAuth(handler, { onUnauthorized })` from `lib/api/auth`,
  `createAuthedClient(auth.accessToken)` from `lib/db/client` — see
  `app/api/friends/request+api.ts`, `lib/api/friends.ts`, `lib/db/friends.ts`,
  `lib/db/friends-core.ts`.
- Profile hydration for other users: `get_profiles_by_ids` (restricted to self +
  live friend edges in 030).
