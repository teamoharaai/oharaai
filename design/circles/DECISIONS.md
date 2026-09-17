# Circles — Decision Log

ADR-style. One entry per judgment call. Newest at top. Never rewrite history —
supersede with a new entry. IDs are **`CD-NNN`** (Circles-Decision).

Format: `CD-NNN` · date · status (accepted | proposed | superseded) · context →
decision → consequence.

---

## CD-022 · 2026-09-17 · accepted — Phase 5b (invite links) deferred; `redeem_invite_link` diverges from CD-016

**Context:** Phase 5b. CD-016 specifies invite links are reusable (one per user)
and redeeming auto-sends a **pending** friend request (both-consent). Live
verification (management API, read-only) of migration 028 found the opposite:
`redeem_invite_link` **inserts an `accepted` friend edge directly** (auto-accept,
confirmed `inserts_accepted: true`) — or upgrades an existing pending to accepted —
and there is **no get-or-create "my invite link" RPC** (only `redeem_invite_link`
exists; 0 `invite_links` rows exist). Reusability is only partial: `max_uses IS
NULL` links are unlimited, but nothing enforces one canonical link per user.
Reconciling to CD-016 means a **new L3 migration on the live, security-hardened
friend graph** (028/030).
**Decision:** **Defer Phase 5b.** The prototype `InviteByLink()` placeholder in
`features/friends/components/AddPeoplePane.tsx` stays as-is; no invite-link client
wiring this session. Mobile Add people is already unreachable (<900px), so urgency
is low.
**Consequence:** When revived, choose one of: (A) reconcile 028→CD-016 — new
migration changing `redeem_invite_link` to create a *pending* request plus a
get-or-create reusable-link RPC (+ per-user uniqueness); or (B) supersede CD-016
with the shipped auto-accept model (sharing a private link *is* the consent),
needing only get-or-create-my-link. Either is an L3 decision to bring to the user
before writing. No impact on 053/054.

## CD-021 · 2026-09-17 · accepted — Comment soft-delete via a SECURITY DEFINER RPC (Fix 0)

**Context:** Phase-4 live QA found `DELETE /api/circles/comments/:id` → 403
`42501` (audit 002). Root cause: the `post_comments` SELECT policy requires
`deleted_at is null`, so the post-update row of an author's own soft-delete UPDATE
fails SELECT visibility and PostgreSQL rejects the UPDATE. 053 gave comments a
direct column-scoped UPDATE path, unlike `circle_posts` (RPC-based, CD-009).
**Decision:** Migration `054` adds `delete_circle_comment(uuid)` SECURITY DEFINER
(author-scoped via `auth.uid()`, idempotent, `raise P0002` when missing), grants
EXECUTE to `authenticated`, and **drops** the `"Authors can soft delete own
comments"` UPDATE policy + `update (deleted_at)` grant. `lib/db/circles.ts`
`deletePostComment` repoints at the RPC. Chosen over broadening the SELECT policy
(option B) to avoid widening the privacy spine and to match CD-009.
**Consequence:** Comments and posts now soft-delete the same way (RPC, definer),
closing the direct-UPDATE path. Applied + verified live 2026-09-17 (audit 003);
DB harness extended (053+054). No SELECT-policy change; privacy spine intact.

## CD-020 · 2026-09-17 · accepted — Invite-picker friends via the shared `/api/friends` endpoint

**Context:** Phase 4. The "Invite to a Goal" picker (`CirclesPane`) needs the
user's friends to choose invitees, but `features/CLAUDE.md` forbids
`features/circles` importing `features/friends` (CD-011 keeps them independent).
**Decision:** `circles-service.fetchInviteableFriends()` calls the shared HTTP
resource `GET /api/friends` and maps `PersonSummary` → `CirclesAuthor`. This
consumes a shared endpoint (allowed) rather than importing the friends feature
module (forbidden). The friends list is loaded into `useCirclesStore` by
`ensureLoaded`.
**Consequence:** No cross-feature coupling; the invite picker works without
plumbing friends through `AvatarMenu` slots. If a lighter "friends for invite"
projection is ever needed it can move behind a dedicated route without touching
the feature boundary.

## CD-019 · 2026-09-17 · accepted — Drop prototype-only "following" and rich person fields

**Context:** Phase 4. The prototype `CirclePerson` carried `following`
(+ `toggleFollowing`), `activity`, `hasNewPost`, and `focus`. Circles is a
mutual-friends space (accepted `friend_connections`); there is no follow graph,
and the real author DTO is `CirclesAuthor` (id, username, displayName,
avatarUrl) only. The resume prompt asked to decide and note this.
**Decision:** Remove `following`/`toggleFollowing` and the other prototype-only
person fields entirely. Author identity everywhere comes from the hydrated
`author` DTO on posts/comments/encouragers and goal `owner`; the person popover
(`PersonSheet`) shows name/@username + public goal + goals-shared-with-me +
"view updates", with no follow affordance.
**Consequence:** `FollowingPill` deleted; `PersonAvatar` takes a `CirclesAuthor`
and delegates to the shared `Avatar`. No schema impact. If a follow/mute concept
is ever wanted it is a new, separately-designed feature — not a revival of this
fixture affordance.

## CD-018 · 2026-09-17 · accepted — Sent-list status mapping lives in the DTO mapper

**Context:** Phase 3. CD-014 requires the owner's sent list to hide declines
(show them as "Pending"). `goal_share_invites.status` also carries `withdrawn`
(owner's own revoke) and `accepted`.
**Decision:** `mapSentInvite` (`lib/db/circles-core.ts`) is the single place the
status is normalized for the owner: `pending`/`declined`→`pending`,
`accepted`→`accepted`, and `withdrawn` (or anything unexpected) is **dropped**
from the list (returns null). The `GET /api/circles/invites/sent` query already
filters to `pending|accepted|declined`, so withdrawn rows never reach the mapper
in practice, but the mapper stays defensive. The exposed `SentInviteStatus` union
is therefore `'pending' | 'accepted' | 'withdrawn'` with `declined` unrepresentable.
**Consequence:** CD-014 is enforced in one testable pure function (Phase 6). The
underlying `declined` row is unchanged; a fresh invite after a decline still works
(053 `live_pair` index). No schema change.

## CD-017 · 2026-09-17 · accepted — Migration 053 L3 sign-off

**Context:** Phase 1b gate. Draft 053 (tables `goal_share_invites`,
`circle_posts`, `post_encouragements`, `post_comments`, `saved_posts`; the
`are_friends` / `set_public_goal` / invite / whitelisted-summary / feed RPCs;
select-only RLS with RPC-mediated cross-user writes and column-scoped comment
soft-delete grant) passed the isolated local security suite (audit 000).
**Decision:** The 053 schema, RLS, RPC contract, and grants are **approved**
(CEO types + CTO schema/RLS/RPC). None of Q1–Q4 (CD-013…CD-016) changed the
schema, so 053 is promoted as-is. The CLAUDE.md "No feed" rule change and Data
Model / Naming additions are deferred to Phase 7.
**Consequence:** Phase 2 promotion (`git mv` to `supabase/migrations/`, harness
to `scripts/`) is authorized. Applying 053 to the live database still requires
explicit per-session user go-ahead.

## CD-016 · 2026-09-17 · accepted — Invite links reusable; redeem auto-sends a friend request (Q4)

**Context:** OUTSTANDING Q4. Existing `invite_links` + `redeem_invite_link()`
(migration 028) are unused by the app; CD-008 merges "Invite a friend" into
Add people.
**Decision:** Invite links are **reusable** (one shareable link per user), and
redeeming creates a **pending** friend request (both sides consent) rather than
an instant friendship.
**Consequence:** The actual behavior of `redeem_invite_link` must be verified in
Phase 5; if it auto-accepts or is single-use, reconcile it to this contract then
(no impact on 053).

## CD-015 · 2026-09-17 · accepted — Posts linking a now-private/withdrawn Goal are kept (Q3)

**Context:** OUTSTANDING Q3. Feed links are server-side title snapshots
(CD-005), carrying no live join into private tables.
**Decision:** Making a linked Goal private again, or withdrawing an invite, does
**not** alter or remove existing feed posts that reference it. The snapshot
(title + author description) stands as posted.
**Consequence:** Consistent with CD-005 (renaming a Goal never rewrites old
posts). No retroactive scrub logic; no schema change.

## CD-014 · 2026-09-17 · accepted — Declined goal invites are hidden from the owner (Q2)

**Context:** OUTSTANDING Q2. `goal_share_invites.status` records `declined`;
the owner's sent-invites API controls what is surfaced.
**Decision:** The owner's sent list **hides declines** — a declined invite is
presented as "Pending" (declined→pending mapping at the API layer), never as an
explicit rejection.
**Consequence:** Softens social friction. Pure API-layer behavior in Phase 3
(`GET /api/circles/invites/sent`); the underlying `declined` row is unchanged
and the `live_pair` unique index still allows a fresh invite after decline.

## CD-013 · 2026-09-17 · accepted — Encourage shows who, not just counts (Q1)

**Context:** OUTSTANDING Q1, refining CD-006. `post_encouragements` RLS already
lets any post-viewer read the rows.
**Decision:** A post's Encourage count is public (CD-006) **and** tapping it
reveals the friends who encouraged, hydrated via `get_profiles_by_ids`.
**Consequence:** No schema change; a Phase 3 endpoint lists encouragers for a
post. A friends-only space makes named encouragement a warm, expected signal.

## CD-012 · 2026-09-17 · accepted — DB verification runs on an isolated local cluster, not live

**Context:** Draft 053 needed behavioral security proof before sign-off. Rolled-back
live transactions were possible but the repo's convention (`scripts/test-*-security.sh`)
uses disposable local PostgreSQL.
**Decision:** `design/circles/db/run-circles-security.sh` bootstraps a minimal
production-shaped schema locally, applies 053, asserts behavior, and never reads
Supabase credentials.
**Consequence:** Live-only facts (existing data, occurrence horizon) are verified
separately in Phase 2 with read queries.

## CD-011 · 2026-09-17 · accepted — Slot props keep `features/friends` independent of `features/circles`

**Context:** Saved, Circles, and goal invitations render inside the friends profile
popover, but `features/CLAUDE.md` forbids cross-feature imports.
**Decision:** `FriendsPopover` accepts `savedPane`, `circlesPane`, `goalInvitesPane`,
`goalInviteCount` as props; `components/layout/AvatarMenu.tsx` composes them.
**Consequence:** Friends stays unaware of Circles; keep this pattern for new panes.

## CD-010 · 2026-09-17 · accepted — Profile popover drops down from the top-nav avatar

**Context:** Positioning was authored for the old bottom-left sidebar avatar
(opened rightward/upward), colliding with viewport edges now that the avatar is
top-right.
**Decision:** Right-align under the anchor with the caret on the top edge; height
clamps to the space below.
**Consequence:** Not verifiable signed-out (authedFetch redirect); Phase 8 QA item.

## CD-009 · 2026-09-17 · accepted — Cross-user mutations via RPC; soft deletes

**Decision:** Invites, posts, and public-goal swaps go through SECURITY DEFINER RPCs
(Migration 030 pattern). Posts and comments soft delete (`deleted_at`).
Encouragements/saves are direct owner-scoped table writes under RLS.

## CD-008 · 2026-09-17 · accepted — "Invite a Friend" merges into Add people

**Decision:** Invite-by-link lives in the Add people tab (empty state + no-results
state). Back it with existing `invite_links` + `redeem_invite_link()` (028), which
the app does not yet call.

## CD-007 · 2026-09-17 · accepted — Saved is private, in the profile panel

**Decision:** `saved_posts` owner-only RLS; surfaced as the profile panel's Saved
tab (desktop) and avatar-menu Saved modal (mobile).
**Consequence:** If the author unfriends or deletes, the save disappears (RLS).

## CD-006 · 2026-09-17 · accepted — Encouragement counts are public

**Decision:** Anyone who can see a post sees its Encourage count. Whether names of
encouragers are shown is **open (Q1)**; the RLS already allows reading rows.

## CD-005 · 2026-09-17 · accepted — Feed links are title snapshot + author description

**Context:** User: linking must stay "limited to only a description in order to
preserve user privacy".
**Decision:** `create_circle_post` validates the link belongs to the author
(goal: shareable status; milestone; reflection entry only — never notes), snapshots
the title server-side, and stores an author-written description ≤280 chars.
No progress, Tasks, or content travels with a post. The prototype's pre-filled
description (from Goal description) must be shown/editable before posting.
**Consequence:** Renaming a Goal later doesn't change old posts. Feed never joins
private tables.

## CD-004 · 2026-09-17 · accepted — Viewers never read base tables

**Context:** RLS is row-level; a friend allowed to read a `goals` row would see
every column (description, reflection, smart_data).
**Decision:** Non-owners get Goal data only from `circles_goal_summary` via
`get_viewable_goal` / `list_*` RPCs, returning a whitelisted JSON shape.
**Consequence:** The prototype's `SharedGoal.why` line is NOT backed by data and
must be removed in Phase 4.

## CD-003 · 2026-09-17 · accepted — Progress = milestones + weekly Task count (option 2)

**Context:** No canonical progress exists: `goals.progress` only flips to 100 on
completion; goal detail ring is deadline elapsed; Momentum is separate.
**Decision:** Completed top-level milestones / total (sub-milestones excluded),
shown as "X of Y milestones", plus this week's Task count (owner timezone,
Monday-start). No milestones → "No milestones yet", never 0%.
**Consequence:** Today's Focus now shows milestone fraction (weekly count pending
Phase 5).

## CD-002 · 2026-09-17 · accepted — Private by default; one public Goal; explicit invites

**Decision:** Reuse `goals.visibility`: `'public'` = the single friend-visible Goal
(partial unique index). Legacy `'circle'` (1 live row) is treated as private.
Other Goals are shared only through accepted `goal_share_invites`, surfaced in
Requests. There is no "all friends" invite option — that is the public Goal.

## CD-001 · 2026-09-17 · accepted — Home becomes Circles

**Decision:** `/dashboard` renders `CirclesScreen` (internal name Circles, nav label
Home). The route composes non-social slots (greeting, Today's Focus, drafts) so
`features/circles` never imports goals/momentum. Friends panel dropped from Home
(friends live in the profile panel); My Circles card moved to the profile panel.
**Consequence:** Momentum/goals/projects/Echo/Intelligence cards no longer on Home.
