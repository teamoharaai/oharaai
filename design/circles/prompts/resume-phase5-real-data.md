# Circles — Resume: Phase 5 (real-data wiring) + the 054 comment-delete fix

You are continuing the **Circles** initiative — the friends-only social layer that
is Home (`/dashboard`, nav label "Home"). Migration 053 is **applied and verified
live**; the **server layer (Phase 3)** and the **client swap (Phase 4)** are built,
committed-in-tree (not merged), and Phase 4 was **live-verified 19/20 green**
(`design/circles/audits/002-phase4-live-verify.md`). `FEATURES.CIRCLES_ENABLED` is
**false**. Work on the existing branch **`feat/circles-home`**. Do NOT commit to
`main` (main lands only via the Phase 8 PR with the user's go-ahead). Commit only
when the user asks.

This session has **two deliverables**, in order:

1. **Fix 0 (CTO / L3) — comment soft-delete.** Phase-4 QA found a live defect:
   `DELETE /api/circles/comments/:id` → **403 `42501`**. Root cause (pinned, audit
   002): the `post_comments` **SELECT** policy (`deleted_at IS NULL`) rejects the
   post-update row, so an author's own soft-delete UPDATE is refused. This blocks
   comment delete in QA. It is **L3 (schema/RLS)** — a new migration.
2. **Phase 5 (real-data wiring).** Today's Focus weekly Task count + invite links
   in Add people + verify `redeem_invite_link`. Note most of PLAN §5 already
   landed in Phase 4 (the composer's linkable picker and author-profile hydration
   are done) — do not redo them.

**Guardrails:** applying any migration live needs **explicit per-session user
go-ahead**. Any new L3 decision (schema/RLS/RPC, types, AI contract) → **stop and
ask**. Do not broaden 053's privacy spine (CD-004) or existing RLS without an
audited decision.

## Read first (in this order)
1. `design/circles/MEMORY.md` — durable facts + gotchas (053 live; Phase 3/4 built;
   the Phase-4 verify + the 053 comment-delete defect; the management-API +
   rolled-back `set role authenticated` RLS-simulation recipe; `.env.local` points
   at the **live** project so a local expo web server writes live data).
2. `design/circles/OUTSTANDING.md` — phase board + the "Blocking defect for QA"
   section (Fix 0) + follow-ups (weekly-count occurrence-gap caveat; mobile Add
   people; Intelligence insight no longer on Home).
3. `design/circles/audits/002-phase4-live-verify.md` — the defect's exact
   reproduction, root cause, and the two suggested fixes.
4. `design/circles/PLAN.md` — **§5 Phase 5 acceptance**, §4 (route contract), §2
   (where things live). `design/circles/DECISIONS.md` — **CD-003** (progress =
   milestones + weekly Task count, owner-tz Monday-start), **CD-008** (invite-by-link
   in Add people), **CD-016** (invite links reusable; redeem auto-sends a *pending*
   friend request — verify actual behavior), **CD-009/CD-018**, **CD-011** (slot
   props keep `features/friends` independent).
5. Root `CLAUDE.md`, `supabase/CLAUDE.md` (migration conventions + the 028 +
   053 ledger entries), `lib/db/CLAUDE.md`, nested `features/CLAUDE.md`.
6. `docs/API_CONTRACT.md` → "Circles endpoints".

## Fix 0 — comment soft-delete (CTO / L3, migration ≥054)

- **Files that reproduce it:** live `post_comments` SELECT policy
  (`supabase/migrations/053_circles_social_layer.sql` ~L515) vs the author
  soft-delete UPDATE in `lib/db/circles.ts:deletePostComment` (~L210, direct
  `.update({deleted_at}).select('id')`). `circle_posts` is unaffected — it deletes
  via the `delete_circle_post` SECURITY DEFINER RPC (CD-009).
- **Two options (pick with the user):**
  - **(A, preferred — matches CD-009):** new migration adds
    `delete_circle_comment(p_comment_id uuid)` SECURITY DEFINER (author-scoped,
    idempotent, `raise P0002` when not found), grant EXECUTE to `authenticated`;
    repoint `deletePostComment` at the RPC (drop the direct UPDATE + the
    `update (deleted_at)` grant if now unused). Mirror the `delete_circle_post`
    RPC + `lib/db/circles.ts` call shape.
  - **(B, one-line policy):** broaden the `post_comments` SELECT policy USING to
    `((deleted_at is null and exists(post)) or author_id = auth.uid())`. Reads
    already filter `deleted_at is null`, so authors still won't see deleted
    comments; but this widens SELECT — weigh vs the privacy spine.
- **Verify** on a disposable local cluster first if you extend the DB harness
  (`scripts/test-circles-security.sh` / `npm run test:circles:db`), then re-run the
  live token pass (below) to confirm the round-trip now goes 20/20. Regenerate
  `types/supabase.ts` if the migration adds a function. **Ask before applying live.**

## Phase 5 — real-data wiring

### 5a. Today's Focus weekly Task count (CD-003)
- Slot lives in `app/(app)/dashboard.tsx` → `TodayFocusSummary` (own goals from
  `useGoals`); it currently shows only `milestoneProgressLabel`. Add **this week's
  Task count** beside it.
- **Canonical rule** (mirror 053's `circles_goal_summary`, ~L273–325): owner tz,
  `date_trunc('week', now() at time zone tz)` (Monday-start), count
  `task_occurrences` with `scheduled_local_date` in `[start, start+7)`, target =
  scheduled / done = completed. Reuse `lib/db/tasks.ts` + `lib/time/zoned-calendar.ts`
  rather than re-deriving. A new thin `GET /api/…` (or extend an existing goals
  endpoint) is CTO-lane; keep `features/circles` out of it (dashboard is the slot
  owner).
- **Caveat (OUTSTANDING):** some active daily tasks have **zero** materialized
  occurrences → the count under-reports (shows nothing), never wrong data.
  Pre-existing Tasks-materialization issue; don't try to fix materialization here.

### 5b. Invite links in Add people (CD-008, CD-016) — **likely L3, verify first**
- The prototype `InviteByLink()` in `features/friends/components/AddPeoplePane.tsx`
  (~L332) is fake (hardcoded `ohara.app/invite/[YOUR-INVITE-CODE]`, no real code).
  No app code calls `invite_links`/`redeem_invite_link` yet.
- **First, verify `redeem_invite_link` (migration 028) actual behavior** against
  CD-016 (reusable + redeem creates a *pending* friend request). The 028 ledger
  says redeem "writes accepted directly" with `uses_count`/exhausted guards — that
  likely **contradicts CD-016**. Use the management-API + rolled-back
  `set role authenticated` simulation (MEMORY recipe) to confirm, read-only.
- If it auto-accepts or is single-use, reconciling to CD-016 is a **new migration
  (L3) — stop and ask** before writing it. Also check whether a get-or-create
  "my invite link" RPC exists (028 has owner-only RLS on `invite_links` +
  `generate_invite_code()`); if the app needs one, that's L3 too.
- Client side (VP Product): a `features/friends` service call + wiring
  `InviteByLink` to a real code/URL, keeping `features/circles` uninvolved (this is
  friends' surface, per CD-008). Respect CD-011.

## Acceptance
- **Fix 0:** live token round-trip goes **20/20** (comment delete → 200); `tsc`
  clean; migration applied + tracker row + audit note.
- **5a:** Today's Focus shows "X of Y milestones" **and** this week's Task count for
  own goals, owner-tz Monday-start, degrading gracefully (no count) when a goal has
  no occurrences. `tsc` clean.
- **5b:** Add people shows the user's **real** reusable invite link; redeem behavior
  is verified and matches CD-016 (or the divergence is logged with an L3 decision).
- No fixture data reachable with the flag on (already true — keep it).
- `npx tsc --noEmit` clean before and after.

## Verifying in a signed-in browser (token pass)
- The user's dev server is **OFF**. Ask before starting one; never start a
  duplicate. `expo start --web --port 8099` serves the API routes but talks to the
  **live** project (`.env.local`) — writes are live. Never type credentials; have
  the user paste an `access_token` (localStorage `sb-rrgiqemscnyaqkculnmb-auth-token`
  → `.access_token`; expires ~1h — grab it fresh). Reuse the Phase-4 harness shape
  (`circles-read-fanout.mjs` / `circles-roundtrip.mjs` were job-tmp, not committed —
  recreate as needed). **Hard-delete any test rows** via the management API and
  **stop the server** when done, as in the Phase-4 pass.
- Management-API SQL (read-only introspection + rolled-back RLS simulations):
  `POST https://api.supabase.com/v1/projects/rrgiqemscnyaqkculnmb/database/query`,
  `Authorization: Bearer $SUPABASE_ACCESS_TOKEN` (shell env), curl UA.

## Every session
- Baseline and finish with `npx tsc --noEmit` (must pass).
- Document in order: `design/circles/changelog/005-<slug>.md` (from `TEMPLATE.md`)
  → `OUTSTANDING.md` (status + exact next action; clear the Fix-0 block once fixed)
  → new `DECISIONS.md` entries → `MEMORY.md` facts → `audits/` if a live apply or a
  gate → root `CHANGELOGCODEX.md`.
- Branch `feat/circles-home`; never commit to `main`; never apply a migration live
  without explicit user go-ahead. Stop at any L3 (types/schema/RLS/RPC/AI contract).
