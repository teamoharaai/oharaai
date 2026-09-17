# Circles — Resume: backend buildout (Phases 1b → 8)

You are continuing the **Circles** initiative: the friends-only social layer that
now *is* Home (`/dashboard`, nav label "Home"). The fixture-backed prototype is
done and committed; draft Migration 053 passes an isolated local security suite.
Your job is to take it to a real, database-backed feature, one phase at a time.

Work on the existing branch **`feat/circles-home`**. Do NOT commit to `main`.
Commit only when I ask. Never apply a migration to the live database without my
explicit go-ahead in this session.

## Read first (in this order)
1. `design/circles/MEMORY.md` — repo realities and gotchas (signed-out preview
   redirect, macOS `LC_ALL` for local Postgres, relative imports for node tests,
   live-DB apply path via management API + curl UA).
2. `design/circles/OUTSTANDING.md` — phase board, **next action**, open
   questions Q1–Q4.
3. `design/circles/PLAN.md` — product model table, ownership map, API contract
   draft (§4), phases + acceptance criteria (§5), risks (§6).
4. `design/circles/DECISIONS.md` — settled calls CD-001…CD-012. Especially
   **CD-004** (viewers never read base tables — whitelisted SECURITY DEFINER
   summaries only), **CD-005** (feed links = server title snapshot + author
   description ≤280), **CD-003** (progress rule), **CD-011** (slot props keep
   `features/friends` independent of `features/circles`).
5. `design/circles/db/053_circles_social_layer.sql` and
   `design/circles/audits/000-migration-053-local-security.md`.
6. Root `CLAUDE.md`, `AGENTS.md`, `CONTEXT.md`, plus nested `CLAUDE.md` for every
   directory you touch (`supabase/`, `lib/db/`, `features/`, `components/`, `types/`).

## Known facts (verify, don't re-derive blindly)
- Prototype commit `f083ba5`; all social state lives in
  `features/circles/fixtures.ts` + `store.ts`. Components already match the final
  UX — swap data sources, don't redesign.
- Live DB: latest applied migration **052**; `goals.visibility` has 0 `public`
  rows (1 legacy `circle`, treated as private); `invite_links` +
  `redeem_invite_link()` exist but are unused by the app.
- Mirror server conventions from `app/api/friends/request+api.ts`,
  `lib/api/friends.ts`, `lib/db/friends.ts`, `lib/db/friends-core.ts`
  (`withAuth`, `createAuthedClient`, userId from session only).
- Home must keep: greeting, Today's Focus, drafts list via
  `DASHBOARD_DRAFTS_ROUTE` (used by `AIGoalCreation`), and the Echo reconcile call.
- Prototype `SharedGoal.why` is not backed by the schema — remove it in Phase 4.

## Work the phases in order (stop at each gate)
1. **Phase 1b — sign-off gate.** Summarize 053 for me (tables, RLS, RPCs,
   grants) and ask Q1–Q4 from `OUTSTANDING.md` with a recommendation for each.
   Record my answers + sign-off as new `CD-NNN` entries. Adjust 053 and the
   local harness if answers change the schema; re-run
   `design/circles/db/run-circles-security.sh`.
2. **Phase 2 — promote + apply.** `git mv` SQL to
   `supabase/migrations/053_circles_social_layer.sql`; move the harness into
   `scripts/` (`circles-security-bootstrap.sql`, `circles-security.test.sql`,
   `test-circles-security.sh`) and add `"test:circles:db"` to `package.json`;
   re-run. Live pre-flight reads (0/1 public goals per user; `053` absent in
   `supabase_migrations.schema_migrations`; occurrence horizon covers the
   current week). **Ask me before applying.** Apply, insert the tracker row,
   regenerate `types/supabase.ts`, write `audits/NNN-migration-053-live-verify.md`.
3. **Phase 3 — server layer.** `lib/db/circles.ts` + `app/api/circles/**` per
   PLAN §4; map Postgres errors (`42501`→403, `P0002`→404, `22023`→400); add the
   routes to root `API_CONTRACT.md`; smoke script like
   `scripts/momentum-api.smoke.mjs`.
4. **Phase 4 — client swap.** `FEATURES.CIRCLES_ENABLED`;
   `features/circles/services/circles-service.ts` via `authedFetch`; store
   actions become optimistic + revert-on-error; fixtures leave production paths.
5. **Phase 5 — real data.** Linkable picker endpoint, author profile hydration
   (`get_profiles_by_ids`), weekly Task count on Today's Focus, real invite links.
6. **Phase 6 — tests.** Node tests for pure mappers (relative imports), extend
   the DB harness (comment soft delete, feed pagination, unfriend cases);
   `npm run test:circles` + `npm run test:circles:db` green.
7. **Phase 7 — docs.** Root `CLAUDE.md` (lift "No feed", add Circles to Data
   Model/Naming — CEO-owned, confirm wording with me), root `DECISIONS.md`
   pointer, `CHANGELOGCODEX.md`.
8. **Phase 8 — QA + PR.** Signed-in check of the profile popover dropdown
   (CD-010), light/dark, widths <720 / 720–1080 / ≥1080, mobile avatar menu. Open
   a PR from `feat/circles-home`; do not merge without my go-ahead.

Complete one phase per session unless I say otherwise; stop at every gate and at
any L3 (types/schema/AI contract) decision.

## Every session
- Baseline and finish with `npx tsc --noEmit` (must pass).
- Document in this order: `design/circles/changelog/NNN-<slug>.md` (from
  `TEMPLATE.md`) → `OUTSTANDING.md` (status + exact next action) → new
  `DECISIONS.md` entries → `MEMORY.md` facts → `audits/` for gated verifications
  → root `CHANGELOGCODEX.md`.
- Never type credentials into a browser; treat signed-out preview redirects as
  expected (MEMORY).
