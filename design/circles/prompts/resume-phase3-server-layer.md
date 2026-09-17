# Circles — Resume: Phase 3 (server layer: `lib/db/circles.ts` + `app/api/circles/**`)

You are continuing the **Circles** initiative — the friends-only social layer that
is Home (`/dashboard`, nav label "Home"). Migration 053 is **already applied and
verified live**; the UI is still the fixture-backed prototype. Phase 3 builds the
**server data-access + API layer** so later phases can swap the client off
fixtures. This is a **CTO-lane** phase (`lib/db/*`, `app/api/*`).

Work on the existing branch **`feat/circles-home`** (HEAD at the Phase 2 commit).
Do NOT commit to `main`. Commit only when the user asks. No schema changes in
this phase — if you find you need a new table/column/RPC, that is an L3
schema decision: **stop and ask** (053 is frozen as applied).

## Read first (in this order)
1. `design/circles/MEMORY.md` — durable facts + gotchas (053 is live; file
   locations; `types/supabase.ts` was regenerated; node tests use relative
   imports, no `@/` map; occurrence-gap caveat).
2. `design/circles/OUTSTANDING.md` — phase board; Phase 3 is the next action.
3. `design/circles/PLAN.md` — **§4 is the API contract table you implement**;
   §5 Phase 3 acceptance; §6 risks.
4. `design/circles/DECISIONS.md` — CD-001…CD-017. Load-bearing for Phase 3:
   **CD-004** (viewers only read whitelisted RPC summaries, never base tables),
   **CD-005** (feed links = server title snapshot + author description ≤280),
   **CD-013** (encourage exposes *who* — build an encouragers endpoint),
   **CD-014** (declined invites shown as "Pending" in the owner's sent list —
   API-layer map), **CD-009** (cross-user mutations via RPC; soft deletes).
5. `supabase/migrations/053_circles_social_layer.sql` — the live contract
   (RPC signatures, RLS, grants). `design/circles/audits/001-migration-053-live-verify.md`.
6. Root `CLAUDE.md`, `AGENTS.md`, `CONTEXT.md`; nested `lib/db/CLAUDE.md` and
   `types/CLAUDE.md`. (`app/api/` has **no** nested CLAUDE.md — follow root +
   `lib/db/CLAUDE.md`.)

## Mirror these existing patterns (verified paths)
- **Route auth:** `withAuth(handler, { onUnauthorized })` — `lib/api/auth.ts:37`.
  userId comes from the session only, never the request body.
- **DB client:** `createAuthedClient(accessToken)` — `lib/db/client.ts:23`.
- **Response envelope:** `ApiResponse<T>` / `ApiErrorCode` — `lib/api/contracts.ts`.
- **Error mapping pattern:** `lib/api/friends.ts:45` does `switch (error.code)`;
  `lib/db/friends-core.ts:42` defines the typed error carrying `.code`. Mirror
  this: `lib/db/circles.ts` throws typed errors; the api/route layer maps
  Postgres SQLSTATEs → HTTP:
  - `42501` (unauthorized / not-a-friend) → **403**
  - `P0002` (no_data_found: not found / already handled) → **404**
  - `22023` (invalid_parameter: bad input) → **400**
  - `23505` (unique_violation, e.g. second public goal) → **409** (mirror the
    friends `already_connected` handling)
- **Reference routes/services:** `app/api/friends/request+api.ts`,
  `lib/api/friends.ts`, `lib/db/friends.ts`, `lib/db/friends-core.ts`.
- **Smoke script:** copy the shape of `scripts/momentum-api.smoke.mjs`
  (`scripts/test-friends-api.mjs` is another reference); add an npm script
  (e.g. `"test:circles:api"`).

## 053 surface — what to call (from the applied migration)

**Call as RPCs** (`.rpc(name, args)`; all `security definer` unless noted, granted
to `authenticated`):
- `set_public_goal(p_goal_id uuid | null) → uuid`
- `send_goal_invites(p_goal_id uuid, p_invitee_ids uuid[]) → setof uuid`
- `respond_to_goal_invite(p_invite_id uuid, p_response text) → uuid` (`'accepted'|'declined'`)
- `withdraw_goal_invite(p_invite_id uuid) → uuid`
- `get_viewable_goal(p_goal_id uuid) → jsonb` (owner/public/invited/NULL; no leak)
- `list_goals_shared_with_me() → setof jsonb`
- `list_my_goal_invites() → table(invite_id, created_at, goal jsonb)` (incoming, pending)
- `list_friend_public_goals() → setof jsonb`
- `create_circle_post(p_body, p_image_path?, p_link_kind?, p_link_ref_id?, p_link_description?) → uuid`
  (validates link ownership + snapshots title server-side — CD-005)
- `delete_circle_post(p_post_id uuid) → uuid` (soft delete)
- `get_circles_feed(p_before timestamptz?, p_limit int=20) → table(...)` (`security invoker`;
  returns `author_id`, snapshot link fields, `encouragement_count`, `comment_count`,
  `encouraged_by_me`, `saved_by_me`)

**Direct table writes/reads under RLS** (NOT RPCs — `create_*`/`delete_*` don't
exist for these):
- `post_encouragements` — insert (encourage) / delete (un-encourage) /
  **select** (list who encouraged — CD-013).
- `post_comments` — insert / select (live only) / **update `deleted_at`**
  (author soft-delete; column-scoped grant, no delete RPC).
- `saved_posts` — insert / delete / select (owner-only).
- `goal_share_invites` — **select** for the owner's sent list
  (map `declined`→`pending` in the API — CD-014; incoming pending uses
  `list_my_goal_invites`).
- `goals where visibility='public' and user_id=self` — select (my public goal).

**Author hydration:** `get_profiles_by_ids(uuid[])` (migration 030 — restricted
to self + live friend edges). Feed only shows friends'/own posts, so every
`author_id` is hydratable. Use it for the feed and the encouragers endpoint.

**Internal, do not call from clients:** `are_friends` (used inside RLS/RPCs),
`circles_goal_summary` (revoked from `authenticated` — verified live).

## Build (PLAN §4 route table)

| Method + path | Backing |
|---|---|
| `GET /api/circles/feed?before=` | `get_circles_feed` + `get_profiles_by_ids` |
| `POST /api/circles/posts` | `create_circle_post` |
| `DELETE /api/circles/posts/[id]` | `delete_circle_post` |
| `POST`/`DELETE /api/circles/posts/[id]/encourage` | `post_encouragements` insert/delete |
| `GET /api/circles/posts/[id]/encouragements` | `post_encouragements` select + `get_profiles_by_ids` (**CD-013**) |
| `GET`/`POST /api/circles/posts/[id]/comments`, `DELETE /api/circles/comments/[id]` | `post_comments` select/insert/update(deleted_at) |
| `POST`/`DELETE /api/circles/posts/[id]/save`, `GET /api/circles/saved` | `saved_posts` (+ embedded `circle_posts`) |
| `GET`/`PUT /api/circles/public-goal` | select `goals visibility='public'` / `set_public_goal` |
| `GET /api/circles/friends/public-goals` | `list_friend_public_goals` |
| `GET /api/circles/shared-with-me` | `list_goals_shared_with_me` |
| `GET /api/circles/invites` (incoming) | `list_my_goal_invites` |
| `GET /api/circles/invites/sent` | `goal_share_invites` where owner (**declined→"Pending"**, CD-014) |
| `POST /api/circles/invites` | `send_goal_invites` |
| `POST /api/circles/invites/[id]/respond` | `respond_to_goal_invite` |
| `POST /api/circles/invites/[id]/withdraw` | `withdraw_goal_invite` |
| `GET /api/circles/linkable` | caller's own goals (shareable status) + completed milestones + reflection entries → title + suggested description (for the post composer picker) |

If a pure row→DTO mapper is worth node-testing (e.g. feed row → `CirclesPost`,
`circles_goal_summary` jsonb → viewable-goal shape), put it in
`lib/db/circles-core.ts` with **relative imports** (no `@/`; runner has no import
map — tracker-metrics D-004) so Phase 6 can test it.

## Acceptance (PLAN §5, Phase 3)
- `lib/db/circles.ts` (+ `circles-core.ts` if used) and `app/api/circles/**`
  exist and compile.
- Postgres error codes map to HTTP per above.
- Routes added to **`docs/API_CONTRACT.md`** (not a root file — it lives under
  `docs/`).
- Smoke script (like `scripts/momentum-api.smoke.mjs`) passes against a signed-in
  dev session; npm script added.
- `npx tsc --noEmit` clean.
- **Do not** wire the client/store yet (that is Phase 4, behind
  `FEATURES.CIRCLES_ENABLED`) and **do not** remove fixtures.

## Every session
- Baseline and finish with `npx tsc --noEmit` (must pass).
- Document in order: `design/circles/changelog/003-<slug>.md` (from
  `TEMPLATE.md`) → `OUTSTANDING.md` (status + exact next action) → new
  `DECISIONS.md` entries → `MEMORY.md` facts → `audits/` only if a gate →
  root `CHANGELOGCODEX.md`.
- Branch `feat/circles-home`; never commit to `main`; never apply a migration
  live without explicit in-session go-ahead (none expected this phase).
- The user's dev server (`expo start --web --port 8099`) is **currently OFF** —
  ask before starting one, and never start a duplicate from this checkout.
  Signed-out preview redirects to login (`authedFetch`); never type credentials.
- Stop at any L3 (types/schema/AI contract) decision.
