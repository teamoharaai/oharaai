# Session 004 — Phase 4: client services + store swap

- **Date:** 2026-09-17
- **Task(s):** PLAN.md Phase 4 (client swap behind `FEATURES.CIRCLES_ENABLED`)
- **Agent/model:** Opus 4.8
- **tsc baseline (before):** clean

## Goal of this session

Swap the Circles client off the in-memory fixtures onto the real
`/api/circles/**` endpoints, behind an additive feature flag. Prototype
interactions (post, encourage, comment, save, invite send/respond/withdraw, set
public goal) now round-trip to the DB. No schema, migration, or API-route change.

## Changes

- **`constants/features.ts`** — added `CIRCLES_ENABLED: false` (additive;
  PLAN-authorized). Gates every Circles fetch/mount.
- **`features/circles/types.ts`** — rewritten to re-export the server DTOs
  (type-only) from `lib/db/circles-core.ts` as the feature's type surface; kept
  view-state (`FeedFilter`, `FeedScope`, `PostKind`). Dropped all prototype
  shapes (`CirclePerson`, `SharedGoal` incl. `why`, `MyGoal`, `MyReflection`,
  `GoalInvite`, `SentInvite`, `PostAttachment`, `CirclesGoalStatus`).
- **`features/circles/format.ts`** (new) — pure helpers: `toCategory` (coerce
  free-form category → known `GoalCreationCategory`), `firstName`/`authorName`
  (from a hydrated `CirclesAuthor`), `formatRelativeTime` (ISO → "2h ago"),
  `goalStatusBadge` (real goal status → badge).
- **`features/circles/progress.ts`** — milestone helpers now take the whitelisted
  `{title,done}[]` / `CircleGoalSummary`; `weeklyTaskLabel` reads
  `{done,target}` (no fixture `label`).
- **`features/circles/services/circles-service.ts`** (new) — pure async functions
  over `authedFetch` for all 20 Circles routes, unwrapping the `ApiResponse<T>`
  envelope and throwing `CirclesServiceError` (mirrors `friends-service.ts`).
  Plus `fetchInviteableFriends()` consuming the shared `/api/friends` HTTP
  resource for the invite picker (CD-020 — not a `features/friends` import).
- **`features/circles/store.ts`** — rewritten. State seeded from a single
  guarded `ensureLoaded()` (feed + shared-with-me + friends' public goals +
  incoming/sent invites + public goal + linkable + friends via
  `Promise.allSettled`). Optimistic update + revert for `toggleEncourage`,
  `toggleSave`, `addComment`/`removeComment`, `acceptInvite`/`declineInvite`;
  reload-after-write for `publishPost`, `sendInviteToGoal`,
  `withdrawInvitesForGoal`, `setMyPublicGoal`. `commentsByPost` cache +
  `loadComments`; `saved` list + `loadSaved`. `selectVisiblePosts` uses
  `postKind` + `link.refId`.
- **`features/circles/hooks/useCircles.ts`** — gated on `FEATURES.CIRCLES_ENABLED`
  (no fetch when off); derives the current user's `CirclesAuthor` (`me`) from the
  session (no extra request); triggers `ensureLoaded`; exposes
  `enabled`/`myId`/`me`, `publicGoals` (friends'), `myGoals`/`myReflections`
  (from linkable).
- **Components** — all off fixtures:
  - `primitives.tsx`: `PersonAvatar` now takes a `CirclesAuthor` and delegates to
    the shared `Avatar` (removed fixture `PERSON_TONE`).
  - `FeedPostCard.tsx`: consumes `CirclesFeedPost`, author from `post.author`,
    store-loaded comments; encourage count is tappable → encouragers (CD-013);
    own-comment delete; image + `goal_complete` special-case removed (no upload
    pipeline; links render uniformly).
  - `PostComposer.tsx`: takes `me` prop; shows the **editable snapshot
    description** before posting (CD-005); image toggle removed.
  - `ContextCards.tsx`: `CircleGoalSummary` + embedded `owner`; `FollowingPill`
    removed.
  - `CirclesSheets.tsx`: `PersonSheet`/`SharedGoalSheet` over DTOs; removed
    `why` (CD-004), `following`/`focus`/`activity`, and the fake goal-encourage
    button.
  - `GoalInvitesPane.tsx`: `IncomingGoalInvite`; `useGoalInviteCount` flag-gated
    (returns 0, no fetch, when off).
  - `SavedPostsPane.tsx`: real `GET /api/circles/saved`.
  - `CirclesPane.tsx`: public-goal + invite sections over linkable goals + the
    fetched friends list + sent invites (grouped by goal); flag-off placeholder.
  - `CirclesScreen.tsx`: feed wiring; **flag-off path** renders greeting +
    Today's Focus + drafts with no feed and no fetch; encouragers modal.
- **`features/circles/fixtures.ts`** — rewritten as **TEST-ONLY** sample data in
  the new DTO shapes; zero production importers (verified by grep).

## Tests

- Commands run + result:
  - `npx tsc --noEmit` → **pass** (before and after).
  - **Live signed-in token pass (2026-09-17, audit 002): 19/20 green.** expo web
    :8099 → live project, owner `e4245ec3…`, user-pasted token. All 8 client read
    endpoints returned the expected DTO shapes; a full write round-trip verified
    post create (CD-005 edited description persisted + server title snapshot +
    hydrated author), encourage + encouragers (CD-013), save, and post delete.
    Test data hard-deleted after; server stopped.
  - **1 failure = a Migration 053 / Phase 3 defect, not Phase 4:** author
    soft-delete of a comment returns 403 `42501` — the `post_comments` SELECT
    policy (`deleted_at IS NULL`) rejects the post-update row. Fix is L3/CTO (new
    migration; SECURITY DEFINER RPC like posts, or broaden the SELECT policy). The
    Phase 4 client is correct (`removeComment` reverts on the 403). See
    `audits/002-phase4-live-verify.md`.

## Decisions made

- **CD-019** — drop prototype-only `following`/`toggleFollowing` (+
  `activity`/`hasNewPost`/`focus`); no server backing, Circles is mutual-friends.
- **CD-020** — invite-picker friends list sourced via the shared `/api/friends`
  endpoint from `circles-service`, not a `features/friends` import (preserves
  CD-011 independence).

## Follow-ups / handoff

- **Next: Phase 5** — real-data wiring: Today's Focus weekly Task count, invite
  links (Add people), and verify `redeem_invite_link` behavior (CD-016).
- **Phase 8 QA** — flip `CIRCLES_ENABLED` on and verify every interaction
  round-trips against a live signed-in session (owner timezone weekly count is
  Phase 5; the occurrence-gap caveat in MEMORY still applies).
- Feed pagination (`before=` cursor) is wired in the service but the store loads
  only the first page; infinite scroll is a later enhancement.
