# Circles — Compounding Memory

Durable facts. Read first. Append; correct stale facts in place. Dated so drift is
visible.

## Repo & branch (2026-09-17)

- Work lives on **`feat/circles-home`** (pushed). Prototype commit **`f083ba5`**.
  `main` is untouched by this initiative. Commit only when the user asks.
- `.claude/launch.json` is an untracked local preview config — never commit it.
- The user's own dev server usually runs on **:8099** (`expo start --web --port 8099`).
  Avoid starting a second server from the same checkout (duplicate background jobs).

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
