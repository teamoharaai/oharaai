# Circles — Resume: Phase 4 (client services + store swap, behind `FEATURES.CIRCLES_ENABLED`)

You are continuing the **Circles** initiative — the friends-only social layer that
is Home (`/dashboard`, nav label "Home"). Migration 053 is **applied and verified
live**; the Phase 3 **server layer is built, committed, and smoke-verified**
(`lib/db/circles.ts`, `lib/api/circles.ts`, 17 routes under `app/api/circles/**`,
DTOs/mappers in `lib/db/circles-core.ts`). Phase 4 swaps the **client** off the
in-memory fixtures onto those real endpoints, behind a feature flag. This is a
**VP-Product lane** phase (`features/circles/**`); it also adds one flag in
`constants/features.ts` (CEO/L3 file — additive only; the PLAN authorizes it).

Work on the existing branch **`feat/circles-home`** (HEAD at the Phase 3 docs
commit `847f2f3`). Do NOT commit to `main` (main lands only via the Phase 8 PR
with the user's go-ahead). Commit only when the user asks. **No schema or 053
changes** — if you think you need one, that is L3: **stop and ask**. **Do not add
or change API routes** — the Phase 3 contract is frozen; if the client needs a
shape the routes don't provide, stop and ask before touching `app/api/circles/**`
or `lib/db/circles.ts`.

## Read first (in this order)
1. `design/circles/MEMORY.md` — durable facts + gotchas (053 live; Phase 3 built
   & smoke-green; DTOs in `lib/db/circles-core.ts`; `.env.local` points at the
   **live** project so a local expo web server writes live data; authedFetch
   redirect-on-401).
2. `design/circles/OUTSTANDING.md` — phase board; Phase 4 is the next action.
3. `design/circles/PLAN.md` — **§5 Phase 4 acceptance**, §2 (where things live +
   the slot rule), §6 risks.
4. `design/circles/DECISIONS.md` — load-bearing for Phase 4: **CD-004** (remove
   `SharedGoal.why` — not backed by data), **CD-005** (composer shows/edits the
   snapshot description before posting), **CD-011** (slot props keep
   `features/friends` independent), **CD-013** (encouragers on tap), **CD-014**
   (sent list: declined shows as "Pending" — already mapped server-side),
   **CD-018** (sent-list status mapping lives in the mapper).
5. `docs/API_CONTRACT.md` → **"Circles endpoints"** — the exact routes, request
   bodies, and response envelopes you consume.
6. Root `CLAUDE.md`, `AGENTS.md`, `CONTEXT.md`; nested `features/CLAUDE.md`
   (self-contained slices, no cross-feature imports, hook→store→component,
   services are pure async, one store per feature) and `components/CLAUDE.md`
   (optimistic-update + revert pattern; Modal confirm/cancel for destructive).

## Mirror these existing patterns (verified paths)
- **Feature-flag file:** `constants/features.ts` — the `FEATURES` object
  (`SOCIAL_ENABLED: true`, `TASKS_V2_ENABLED: true`, …), re-exported from
  `constants/index.ts`. Add `CIRCLES_ENABLED` here.
- **Client service (the template):** `features/friends/services/friends-service.ts`
  — a `FriendsServiceError` carrying `code`/`status`, a `readApiResponse<T>` that
  unwraps the `ApiResponse<T>` envelope (`lib/api/contracts.ts`), and thin typed
  functions over `authedFetch`. Copy this shape into
  `features/circles/services/circles-service.ts`.
- **`authedFetch`:** `lib/api/client.ts:40` — attaches the Bearer token and, on
  401, calls `signOutAndRedirect()` and throws `UnauthorizedError`. Signed-out
  callers bounce to login (MEMORY verification gotcha) — expected.
- **Server DTOs to consume (do not re-derive):** `lib/db/circles-core.ts` exports
  `CirclesFeedPost`, `CirclesPostCore`, `SavedPost`, `PostComment`,
  `CircleGoalSummary`, `IncomingGoalInvite`, `SentGoalInvite`, `PublicGoalRef`,
  `LinkableItems`, `CirclesAuthor`. These are camelCase and stable. Import the
  types (not runtime) into the feature layer, or restate them in
  `features/circles/types.ts`; do not fetch snake_case.

## The prototype you are converting (all in-memory today)
- **`features/circles/store.ts`** — `useCirclesStore` (Zustand). Fixture-backed
  actions: `toggleEncourage`, `toggleSave`, `addComment`, `publishPost`,
  `acceptInvite`, `declineInvite`, `setMyPublicGoal`, `sendInvite`,
  `withdrawInvite`, plus `filter`/`scope` view state and `toggleFollowing`
  (following is a prototype-only affordance with no server backing — keep it
  local or drop it; **decide and note it**). Initial state comes from
  `PEOPLE`, `INITIAL_POSTS`, `ACCEPTED_SHARED_GOALS`, `PENDING_GOAL_INVITES`.
- **`features/circles/hooks/useCircles.ts`** — pulls `MY_GOALS`, `MY_REFLECTIONS`,
  `PUBLIC_GOALS` from fixtures (→ `GET /api/circles/linkable` and
  `GET /api/circles/friends/public-goals`).
- **Components importing fixtures directly** (must stop — CD-011 keeps identity
  data flowing as props, not fixture reads): `FeedPostCard.tsx`,
  `SavedPostsPane.tsx`, `GoalInvitesPane.tsx` all `import { personById }`;
  `PostComposer.tsx` imports `ME`. With real data, author identity comes from the
  hydrated `author` field on feed posts / comments / encouragers and the current
  user's own profile — not a fixture lookup.
- **`app/(app)/dashboard.tsx`** composes `CirclesScreen` with non-social slots
  (`greeting`, `todayFocus`, `feedNotice`) and still fires `/api/echo/reconcile`.
  Keep those. With the flag **off**, Home must still render greeting + Today's
  Focus + drafts and simply omit the feed.

## Build (PLAN §4/§5, Phase 4)
1. **`constants/features.ts`** — add `CIRCLES_ENABLED` (additive; keep it `false`
   until the swap is complete and QA'd, or gate per the user's call).
2. **`features/circles/services/circles-service.ts`** — pure async functions over
   `authedFetch` for every "Circles endpoints" route: feed (cursor
   `?before=`), create/delete post, encourage/unencourage, encouragers list,
   comments list/create/delete, save/unsave/saved list, public-goal get/set,
   friends' public goals, shared-with-me, invites (incoming/sent/send/respond/
   withdraw), linkable. Unwrap the envelope; throw a typed `CirclesServiceError`.
3. **`features/circles/store.ts`** — replace fixture actions with service calls
   using **optimistic update + revert** (components/CLAUDE.md): apply the local
   change, call the service, roll back on throw. Reconcile the store's
   `SentInvite`/`SharedGoal`/`CirclesPost` shapes to the server DTOs (drop
   `SharedGoal.why` — CD-004). Seed initial state from a fetch, not fixtures.
4. **Components** — take author identity via props/DTO `author`, not fixture
   lookups; PostComposer must show the server-snapshot description editable
   before posting (CD-005); encourage count tappable → encouragers (CD-013).
5. **Fixtures** — remove from all production import paths; keep `fixtures.ts`
   only as test fixtures (Phase 6). Grep `features/circles`/`app` for
   `fixtures` and confirm zero production importers when done.

## Acceptance (PLAN §5, Phase 4)
- `FEATURES.CIRCLES_ENABLED` exists. Flag **on**: every prototype interaction
  (post, encourage, comment, save, invite send/respond/withdraw, set public
  goal) round-trips to the DB and survives reload. Flag **off**: Home renders
  greeting + Today's Focus + drafts, no feed, no Circles fetches on mount.
- No fixture data reachable from production paths (fixtures test-only).
- `SharedGoal.why` removed from types + UI.
- `npx tsc --noEmit` clean.
- Weekly Task count on Today's Focus and invite links stay **Phase 5** — don't
  pull them forward.

## Verifying in a signed-in browser (optional but ideal)
- The user's dev server is **OFF**. Ask before starting one; never start a
  duplicate. `expo start --web --port 8099` serves the API routes but talks to the
  **live** project (`.env.local`), so writes are live (posts soft-delete). Never
  type credentials — for any authed check, have the user paste an `access_token`
  (localStorage `sb-rrgiqemscnyaqkculnmb-auth-token` → `.access_token`), the way
  the Phase 3 smoke was run. Stop any server you start.
- Reuse `npm run test:circles:api` to re-confirm the server contract if you touch
  anything server-adjacent (you shouldn't).

## Every session
- Baseline and finish with `npx tsc --noEmit` (must pass).
- Document in order: `design/circles/changelog/004-<slug>.md` (from
  `TEMPLATE.md`) → `OUTSTANDING.md` (status + exact next action) → new
  `DECISIONS.md` entries (e.g. the `toggleFollowing` fate) → `MEMORY.md` facts →
  `audits/` only if a gate → root `CHANGELOGCODEX.md`.
- Branch `feat/circles-home`; never commit to `main`; never apply a migration
  live. Stop at any L3 (types/schema/AI contract) or new-route decision.
