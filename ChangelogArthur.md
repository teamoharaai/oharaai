# Arthur Implementation Changelog

## 2026-08-04 — Local Manual Review of Migrations 001–039

### Review result
- Completed an authenticated manual browser, runtime, local API, and read-only database/security review against the isolated `127.0.0.1` Supabase stack after migrations 001–039; no remote project was contacted and no application or migration source was changed.
- Confirmed the authoritative Home Momentum fixture (`4.5192`, Weekly Streak `3`, Tasks Completed `1`), stable `3|3|3` snapshot state, 39 migration rows, 35/35 public tables with RLS, valid `vector(1024)` HNSW indexes, zero anonymous table CRUD, and preserved Momentum/friendship mutation boundaries.
- Recorded the result as **Ready with documented non-blocking issues** in `docs/LOCAL_MANUAL_REVIEW_001_039.md`, with route-by-route evidence and local screenshots. The findings are application-level or pre-existing; none appears introduced by the migration-chain repair.

## 2026-08-03 — Clean Supabase Migration Chain Repair

### Root-cause corrections
- Repaired the squashed Migration 003 ordering defect by installing the final `spaces` owner/member read policy only after `space_members` exists; preserved all eight final space/member RLS policies and their ownership predicates.
- Restored the original `vector(1024)` declarations in baseline migrations 001, 002, and 004 so the existing pgvector HNSW indexes apply on an empty database.
- Added forward Migration 039 with explicit per-table PostgREST privileges instead of broad grants; anonymous table CRUD remains absent, direct friendship and Momentum client writes remain revoked, and RLS remains enabled everywhere.

### Compatibility and documentation
- Kept Migration 038 and all Momentum calculation, service, API, UI, and persistence behavior unchanged.
- Updated the local Momentum fixture only for the canonical full-chain Auth/profile and required goal-category schema.
- Added `docs/SUPABASE_MIGRATION_CHAIN_REPAIR.md` and synchronized local Momentum/Supabase migration guidance, including the repository evidence that the squashed baseline may already be tracked in shared environments and the fact that no remote state was queried.

### Local validation
- Completed three empty isolated Supabase replays through Migration 039 and seed loading; the final two deterministic catalog fingerprints matched exactly (`1629|fd93710c7f712ce8e1f66433198b9ff0`).
- Confirmed 39 migration ledger rows, 35/35 public tables with RLS, eight space/member policies, `vector(1024)` embedding columns, no anon table CRUD, and preserved friendship/Momentum mutation boundaries.
- Passed Momentum's 29 source tests, disposable database harness, 10 real local scenarios, 5 adversarial assertions, authenticated API smoke test, and rendered Home verification with real values and no browser errors.
- Passed the Constellation database security harness, live three-user friendship/RLS harness, 13 Friends tests, 8 Entries tests, known-valid TypeScript check, 50-route web export, and `git diff --check`.
- No remote Supabase project was contacted or modified; no commit, push, merge, or migration deployment was performed.

## 2026-08-03 — Momentum Phase 1 Integrity Remediation

### Trusted calculation boundary
- Changed `/api/momentum` to verify the authenticated owner, read canonical records with that user's RLS client, calculate every derived value/hash/reason on the server, and persist only through a server-only service-role client.
- Restricted `publish_momentum_snapshot` to `service_role`, revoked anonymous/authenticated execution and table DML, fixed its search path, added strict payload/week/timezone/hash bounds, and made snapshots database-immutable through superseding revisions.

### Eligibility correction
- Added normalized per-action planning and completion eligibility with owner, goal status, due-date, local-week, timestamp, duplicate, and exclusion checks.
- Defined planned-action numerator as the intersection of completion-eligible IDs with the planned-eligible denominator IDs and added the direct `0 <= numerator <= denominator` invariant.

### Isolated local validation
- Added loopback-only local Supabase guards/configuration, disposable PostgreSQL 16 migration/RLS tests, and real Supabase/PostgreSQL 15 Auth/PostgREST/API fixtures without changing or using the remote `.env`.
- Passed 29 source tests, the PostgreSQL security harness, 10 local data scenarios, 5 adversarial security assertions, actual API smoke testing, known-valid source type-check, a 50-route web export, `git diff --check`, and rendered Home verification with real values (`Weekly Streak 3`, `Tasks Completed 1`).
- Documented the unrelated pre-existing Migration 003 ordering defect that blocks a clean full-repository reset; it was not modified in this task.

## 2026-08-03 — Momentum Migration 038 Safety Review

### Pre-application decision
- Reviewed the complete canonical Momentum specification, Phase 1 report/open decisions, migration 038, calculation service/engine, API route, and Home integration.
- Confirmed migration 038 is structurally additive, but stopped before application because the authenticated publication RPC accepts caller-supplied authoritative values and the planned-action numerator does not share the denominator's due-date eligibility.
- Confirmed the repository has no local Supabase configuration/runtime or documented local migration command and that the active environment targets a non-local Supabase host; no database or browser/API mutation was attempted.

### Validation and readiness
- `npm run test:momentum` — 19 passed; `npx tsc --noEmit --types node,react` — passed; web export — passed with 50 API routes; `git diff --check` — passed after documentation updates.
- A read-only engine probe reproduced the numerator mismatch: three completions against one planned action yielded a raw completion rate of 3 and a clamped Progress score of 100.
- Marked Phase 1 not ready for development/staging database deployment until trusted-only publication, aligned planned-action eligibility, a local-only Supabase workflow, and all requested live scenarios are verified.

## 2026-08-03 — Momentum Foundation Phase 1

### Backend-authoritative calculation
- Added the frozen `momentum-v1.0` calculation contract with canonical pillar weights, difficulty, gain, drag, clamping, unavailable-pillar reweighting, and stable no-activity behavior.
- Added deterministic local-timezone Monday-through-Sunday boundaries, canonical `action.completed` normalization, explicit inclusion/exclusion diagnostics, event deduplication, and stable SHA-256 calculation hashes.
- Used due-dated action records as the planned-action denominator without reinterpreting undated completions; undated completions remain valid task and active-day evidence.

### Persistence and diagnostics
- Added private `momentum_profiles`, `momentum_events`, and immutable versioned `momentum_weekly_snapshots` in migration 038.
- Added authenticated, transaction-safe snapshot publication with profile locking, identical-hash idempotency, superseding revisions, stale-baseline rejection, and normalized-event deduplication.
- Added an authenticated Momentum API with optional owner-safe diagnostics, stage-specific logging, and no stored or logged note, reflection, goal, or action text.

### Home integration
- Replaced the active Home Momentum card's sample values with the published real value/change, strict real Weekly Streak, and authoritative Tasks Completed This Week count.
- Added explicit loading, zero, and unavailable states while preserving the current card layout, expansion behavior, and full Momentum route.

### Product decisions and review
- Added `docs/MOMENTUM_OPEN_DECISIONS.md` without inventing policy for inactivity, reflection limits, AI bounds, decreases, pillar visibility, opt-out, privacy, or later-pillar normalization.
- Added `docs/MOMENTUM_PHASE1_IMPLEMENTATION_REPORT.md` with architecture, sources, version/revision strategy, calculation flow, diagnostics, reason codes, validation, open decisions, and remaining phases.
- Migration 038 remains local and must be reviewed/applied before the linked browser can return authoritative Momentum results.

### Validation
- `npm run test:momentum` — 19 passed, covering formula, boundaries, timezones/DST, duplicates, exclusions, empty data, streaks, hash reproducibility, RLS, idempotency, revisions, and stale baselines.
- `npm run test:entries` — 8 passed; `npm run test:echo-composer` — 5 passed.
- `npx tsc --noEmit --types node,react` — passed. The bare command remains blocked by pre-existing malformed duplicate ambient folders such as `@types/react 3` and `@types/node 3`.
- Web export passed with all 50 API routes, including `/api/momentum/index`.

## 2026-07-30 — Entries: Notes and Reflections

### Added
- Added the functional Entries workspace with a Notes library, canonical category shelves, search/filter/sort/view controls, note pinning and deletion, multi-goal/category links, and empty/loading/error states.
- Added a focused note editor with a code-native rich-text toolbar, debounced autosave, local failed-save recovery, export/copy actions, and a responsive session-aware Ohara Intelligence panel.
- Added Reflections landing, transparent guided prompts, goal/milestone context, recent history, and completed-reflection editing, export, conversation viewing, and deletion.
- Added an additive Supabase schema for Notes, Reflections, multi-goal/category relationships, reflection milestones, owner-scoped RLS, timestamps, schema/content versioning, transactional saves, and future retrieval normalization.
- Added a safe compatibility import that preserves the existing Echo tables while exposing existing user-authored Echo history as completed Reflections.
- Added authenticated API and service boundaries plus focused tests for recency ordering, unlinked Notes, multi-goal/multi-category shelving without duplicated records, retrieval-document normalization, transaction use, and owner-scoped policies.

### Synchronization
- Fetched `origin/main` and `upstream/main` on 2026-07-30.
- Fast-forwarded local `main` from `2792687` to upstream commit `18b93d4`, incorporating 11 team commits covering global creation and the latest Constellation work.
- Resolved compatible overlaps in the sidebar, app layout, UI session state, test scripts, and Codex changelog without dropping either implementation.
- Renumbered the Entries migration from `033` to `036` because upstream now owns migrations `033` through `035`.
- Connected upstream’s global New entry action to the canonical Entries New Note flow.

### Affected files
- `app/(app)/entries.tsx`
- `app/(app)/entries/[id].tsx`
- `app/(app)/entries/reflection.tsx`
- `app/api/entries/`
- `features/entries/`
- `lib/db/entries.ts`
- `lib/goals/catalog.ts`
- `supabase/migrations/036_entries_notes_reflections.sql`
- `components/layout/Sidebar.tsx`
- `components/ui/SegmentedControl.tsx`
- `components/ui/GoalCreationModeToggle.tsx`
- `components/ui/Modal.tsx`
- `store/uiStore.ts`
- `store/clearAllStores.ts`
- `app/(app)/_layout.tsx`
- `app/(app)/echo.tsx`
- `global.css`
- `package.json`
- `CHANGELOGCODEX.md`
- `ChangelogArthur.md`

### Validation
- `npx tsc --noEmit` — passed after synchronization.
- `npm run test:entries` — 7 tests passed.
- `npm run test:echo-composer` — 5 tests passed.
- `npm run test:constellation` — 74 tests passed.
- `npm run test:friends` — 13 tests passed.
- `npx expo export --platform web` — passed with 49 API routes.
- `git diff --check` and staged diff validation — passed.
- No repository lint script is currently available.

### Remaining limitations
- Migration `036_entries_notes_reflections.sql` must be applied to the target Supabase project after the upstream Constellation migrations before Entries persistence is available there.
- The editor provides a compatible code-native formatting surface rather than adding a large cross-platform editor dependency; native formatting uses lightweight markup commands while web uses a richer content-editable surface.
- Ohara Intelligence intentionally contains supported linked context and a clearly labeled future placeholder; it makes no AI requests.
- Guided Reflections use transparent configured prompts and do not generate AI summaries.
- Authenticated light/dark visual verification requires a valid signed-in browser session; the available preview session had an expired refresh token.
