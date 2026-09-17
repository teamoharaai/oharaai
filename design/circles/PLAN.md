# Circles — Buildout Plan

Status: **Phases 0–1 done; Phase 1b awaiting L3 sign-off.** Settled decisions live
in `DECISIONS.md` (CD-NNN). Do not re-litigate them here.

## 1. Product model (settled)

| Concept | Rule | Decision |
|---|---|---|
| Home | `/dashboard` renders Circles; nav label stays "Home". Keeps greeting, Today's Focus, drafts list (`DASHBOARD_DRAFTS_ROUTE`), Echo reconcile. | CD-001 |
| Privacy default | Goals/notes/reflections private. | CD-002 |
| Public goal | Optional, **max one** per user, `goals.visibility = 'public'`; all accepted friends can view. Set via Circles pane: choose → list → Confirm; Change / Make private. | CD-002 |
| Invited goal | Owner invites specific friends; invitee Accepts/Declines in Requests; accepted → "Shared with You". Owner can withdraw/revoke. | CD-002 |
| Viewer data | Title, category, status, top-level milestone titles + done, this week's Task count. Never description, reflection, Task titles, Entries, Vault. | CD-004 |
| Progress | Completed top-level milestones / total + this week's Task count; "No milestones yet" when empty. | CD-003 |
| Feed links | Goal / milestone / reflection by server-snapshotted title + author-written description (≤280). | CD-005 |
| Encourage | Counts public to post viewers; *who* encouraged not exposed (open Q1). | CD-006 |
| Saved | Private per user, in the profile panel's **Saved** tab. | CD-007 |
| Invite a friend | Merged into **Add people**; backed by existing `invite_links` / `redeem_invite_link()`. | CD-008 |

## 2. Where things live

| Layer | Path | Owner (root CLAUDE.md) |
|---|---|---|
| Prototype UI (done) | `features/circles/**`, `app/(app)/dashboard.tsx`, `components/layout/AvatarMenu.tsx`, `features/friends/components/{FriendsPopover,AddPeoplePane,types}.tsx` | VP Product |
| Migration | `design/circles/db/053_circles_social_layer.sql` → promote to `supabase/migrations/053_circles_social_layer.sql` | CTO (L3) |
| DB security harness | `design/circles/db/*` → promote to `scripts/circles-security-*.sql` + `scripts/test-circles-security.sh` | CTO |
| Server data access | `lib/db/circles.ts` (+ `lib/db/circles-core.ts` if pure mapping is node-tested) | CTO |
| API routes | `app/api/circles/**` using `withAuth` + `createAuthedClient` (mirror `app/api/friends/*`, `lib/api/friends.ts`) | CTO |
| Client services | `features/circles/services/circles-service.ts` (`authedFetch`) | VP Product |
| Types | `features/circles/types.ts` (extend `types/supabase.ts` via regeneration) | CEO (types/*) — L3 |

Cross-feature rule (`features/CLAUDE.md`): `features/friends` must not import
`features/circles`. Keep the **slot pattern**: `AvatarMenu` (components/layout)
passes `circlesPane`, `savedPane`, `goalInvitesPane`, `goalInviteCount` into
`FriendsPopover` (CD-011).

## 3. Data model (Migration 053 — draft, locally verified)

See `db/053_circles_social_layer.sql` header for the full contract.

- `are_friends(a, b)` — security-definer helper over accepted `friend_connections`.
- `goals_one_public_per_user` partial unique index + `set_public_goal(goal_id | null)`.
- `goal_share_invites` (pending/accepted/declined/withdrawn; one live row per
  goal+invitee; select-only RLS) + `send_goal_invites`, `respond_to_goal_invite`,
  `withdraw_goal_invite`.
- Internal `circles_goal_summary(goal_id, access)` (not granted) + client RPCs
  `get_viewable_goal`, `list_goals_shared_with_me`, `list_my_goal_invites`,
  `list_friend_public_goals`.
- `circle_posts` (friends-visible RLS, soft delete) + `create_circle_post`,
  `delete_circle_post`, `get_circles_feed(before, limit)` (security invoker).
- `post_encouragements`, `post_comments` (soft delete via column-scoped update
  grant), `saved_posts` (owner-only).

## 4. API contract (draft — finalize in Phase 3, add to root `API_CONTRACT.md`)

All routes: userId from session only; responses use the existing
`ApiResponse` envelope.

| Method + path | RPC / table |
|---|---|
| `GET /api/circles/feed?before=` | `get_circles_feed` + `get_profiles_by_ids` for authors |
| `POST /api/circles/posts` | `create_circle_post` |
| `DELETE /api/circles/posts/[id]` | `delete_circle_post` |
| `POST` / `DELETE /api/circles/posts/[id]/encourage` | `post_encouragements` |
| `GET` / `POST /api/circles/posts/[id]/comments`, `DELETE /api/circles/comments/[id]` | `post_comments` |
| `POST` / `DELETE /api/circles/posts/[id]/save`, `GET /api/circles/saved` | `saved_posts` (+ embedded `circle_posts`) |
| `GET` / `PUT /api/circles/public-goal` | `goals where visibility='public'` / `set_public_goal` |
| `GET /api/circles/friends/public-goals` | `list_friend_public_goals` |
| `GET /api/circles/shared-with-me` | `list_goals_shared_with_me` |
| `GET /api/circles/invites` (incoming) | `list_my_goal_invites` |
| `GET /api/circles/invites/sent` | `goal_share_invites` where owner |
| `POST /api/circles/invites` | `send_goal_invites` |
| `POST /api/circles/invites/[id]/respond` | `respond_to_goal_invite` |
| `POST /api/circles/invites/[id]/withdraw` | `withdraw_goal_invite` |
| `GET /api/circles/linkable` | caller's own goals, completed milestones, reflections (title + suggested description) |

## 5. Phases & acceptance criteria

**Phase 0 — Prototype ☑** Fixture-backed UI, committed `f083ba5`.

**Phase 1 — Draft Migration 053 ☑** Local harness passes (`audits/000`).

**Phase 1b — L3 sign-off ❓** CEO/CTO approve schema, RPC contract, and the
CLAUDE.md "No feed" rule change. Resolve open questions Q1–Q4 (OUTSTANDING).
*Accept:* sign-off recorded as a CD entry.

**Phase 2 — Promote + apply live**
1. `git mv` SQL into `supabase/migrations/053_circles_social_layer.sql`; move
   harness to `scripts/` and add `"test:circles:db"` to `package.json`.
2. Re-run harness from `scripts/`.
3. Pre-flight live read: confirm no user has >1 `visibility='public'` goal;
   confirm `053` unused in `supabase_migrations.schema_migrations`.
4. Apply via management API (curl UA), insert tracker row, regenerate
   `types/supabase.ts`.
*Accept:* `audits/NNN-migration-053-live-verify.md` shows tables, policies,
functions, grants present; tracker row exists; `tsc` clean.

**Phase 3 — Server layer**
`lib/db/circles.ts` + `app/api/circles/**` per §4, mirroring friends
(`withAuth`, error mapping from Postgres codes: `42501`→403, `P0002`→404,
`22023`→400). *Accept:* route smoke script (like `scripts/momentum-api.smoke.mjs`)
passes against a signed-in dev session; `tsc` clean.

**Phase 4 — Client swap behind a flag**
Add `FEATURES.CIRCLES_ENABLED`. `features/circles/services/circles-service.ts`;
store actions call services with optimistic update + revert (components/CLAUDE.md).
Delete `fixtures.ts` usage from production paths (keep as test fixtures only).
Remove `SharedGoal.why` from UI (no longer exposed — CD-004).
*Accept:* with flag on, every prototype interaction round-trips to the DB; with
flag off, Home renders greeting + Today's Focus + drafts without the feed.

**Phase 5 — Real data wiring**
Linkable picker from `GET /api/circles/linkable`; author profiles via
`get_profiles_by_ids`; Today's Focus weekly Task count (reuse the
`circles_goal_summary` week rule or `lib/db/tasks.ts`); invite link from
`invite_links`. *Accept:* no fixture data reachable with flag on.

**Phase 6 — Tests**
Node tests for pure mappers (`progress.ts`, feed row → `CirclesPost`), relative
imports only (tracker-metrics D-004). DB harness extended for comments soft
delete and feed pagination. *Accept:* `npm run test:circles` + `test:circles:db`
green.

**Phase 7 — Docs**
Root `CLAUDE.md` (lift "No feed"; add Circles to Data Model + Naming),
`API_CONTRACT.md`, root `DECISIONS.md` pointer, `CHANGELOGCODEX.md`.

**Phase 8 — Signed-in QA + PR**
Verify in a signed-in browser: profile popover drops from the top-nav avatar
(unverifiable signed-out — MEMORY), light/dark, <720 / 720–1080 / ≥1080 widths,
mobile avatar menu (Circles, Saved, Goal invitations). Open PR from
`feat/circles-home`; do not merge without user go-ahead.

## 6. Risks

- **Weekly Task count** reads materialized `task_occurrences`; if the horizon
  doesn't cover the whole current week for some schedules, target undercounts.
  Verify in Phase 2 against live data (OUTSTANDING).
- `are_friends` is called per row in RLS; fine at current scale, revisit with an
  index-backed friend-id set if the feed grows.
- Removing friendship hides that friend's posts, comments, and your saves of them
  (RLS) — intended, but confirm UX copy.
- Old Home sections (Momentum card, goals preview, projects, Echo previews,
  Intelligence insight) were removed from `/dashboard`; the Intelligence insight
  fetch no longer runs anywhere on load.
