# Circles — Compounding Memory

Durable facts. Read first. Append; correct stale facts in place. Dated so drift is
visible.

## Repo & branch (2026-09-17)

- Work lives on **`feat/circles-home`** (pushed). Prototype commit **`f083ba5`**.
  `main` is untouched by this initiative. Commit only when the user asks.
- `.claude/launch.json` is an untracked local preview config — never commit it.
- The user's own dev server usually runs on **:8099** (`expo start --web --port 8099`).
  Avoid starting a second server from the same checkout (duplicate background jobs).

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

- Project ref `rrgiqemscnyaqkculnmb`. Latest applied migration **052**; **053 is free**.
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
