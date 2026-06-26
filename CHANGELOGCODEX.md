# Ohara Codex Changelog

## [Unreleased]

### Fixed (2026-06-26 — BRT read fallback chain)
- Applied `brt_user ?? brt_ai ?? brt` read-priority rule to all 5 consumer sites that access BRT values directly. This is forward-compatible scaffolding: produces identical results on all live rows today (brt_user always NULL; brt_ai equals brt when non-NULL) while correctly prioritising user overrides once brt_user write paths ship.
- **Mapper sites (4):**
  - `features/echo/services/echo-service.ts`: added `brt_ai`, `brt_user` to `DbEchoEntry` type; updated `mapEntry` line 43. Query uses `*` — no SELECT change needed.
  - `lib/db/echo-goal-links.ts`: added `brt_ai`, `brt_user` to `DbEchoEntryRow` type; updated `mapEchoEntry` line 60; added `brt_ai, brt_user` to named SELECT in `getEchoEntriesForGoal`.
  - `lib/db/goals.ts:363` (`getActivityByGoalId` echo_entry path): added `brt_ai`, `brt_user` to `DbEchoEntryRow` type and to the `.select()` at line 347; updated inline mapper.
  - `lib/db/goals.ts:506` (`getActivityByGoalId` echo_linked path): added `brt_ai`, `brt_user` to `DbEchoEntryForLinkRow` type and to the `.select()` at line 495; updated inline mapper.
- **Direct-query site (1):**
  - `features/goals/services/goal-service.ts:227` (`fetchGoalSignals`): added `brt_ai, brt_user` to SELECT; updated cast type; resolved priority into `brtValue` before storing in Map. Lines 241-242 unchanged — they read `entry.brt` which now holds the resolved value.
- **Untouched downstream (8 sites inherit fix automatically):** `EchoDetailScreen.tsx:55`, `ActivityFeed.tsx:38`, `EchoTrail.tsx:97`, `useEchoTrail.ts:53` all consume `EchoEntry.brt` or `ActivityItem.brt` resolved by the fixed upstream mappers. No changes needed.
- **OUT OF SCOPE (deferred):** `lib/db/embeddings.ts` / `match_echo_entries()` — semantic search not in production; requires DB-level function rewrite. Tracked separately.
- **Dead code cleanup:** Deleted `lib/ai/prompts/summarizer.ts` — zero importers confirmed; pipeline that called it was already deleted.
- Files touched: `features/echo/services/echo-service.ts`, `lib/db/echo-goal-links.ts`, `lib/db/goals.ts`, `features/goals/services/goal-service.ts`, `lib/ai/prompts/summarizer.ts` (deleted), `CHANGELOGCODEX.md`.
- Verification: `npx tsc --noEmit` clean.

### Added (2026-06-26 — Echo ai_status column)
- Added `ai_status text NOT NULL DEFAULT 'not_requested' CHECK (ai_status IN ('not_requested', 'pending', 'completed', 'failed'))` to `echo_entries` via `supabase/migrations/009_echo_ai_status.sql`. Backfills `completed` where `summarized = true`; all other pre-existing rows stay `'not_requested'` (pre-squash rows had no way to distinguish failed from not-requested).
- Wired writes in `features/echo/services/echo-service.ts`:
  - INSERT payload: `ai_status: aiInsightRequested ? 'pending' : 'not_requested'` — covers both branches atomically at insert time, no separate round-trip.
  - Catch block (requestEchoReflection throws — rate-limit or other): fire-and-forget UPDATE `'failed'` before returning `rate_limited` or `saved_without_summary`.
  - `!reflectPayload.summarized` guard (covers reflect+api.ts non-rate-limit failure path, which returns `ok:true, summarized:false`): fire-and-forget UPDATE `'failed'`.
  - Success UPDATE: `ai_status: 'completed'` added to the existing `summarized: true` UPDATE — no extra round-trip.
  - `updateError` guard (AI call succeeded but DB UPDATE failed): fire-and-forget UPDATE `'failed'`.
- `summarized` column untouched — still written and read by reconcile. `ai_status` is additive.
- reflect+api.ts not modified — it has no entry ID in its request contract and cannot write ai_status directly. All failure paths propagate back to echo-service.ts where the entry ID is available.
- Files touched: `supabase/migrations/009_echo_ai_status.sql` (new), `features/echo/services/echo-service.ts`, `CHANGELOGCODEX.md`.
- Verification: `npx tsc --noEmit` clean.

### Fixed (2026-06-26 — Echo reconcile auth fix)
- Fixed silent 401 swallow on the dashboard's mount-time Echo reconcile call in `app/(app)/dashboard.tsx`. The bare `fetch('/api/echo/reconcile', { method: 'POST' })` sent no `Authorization` header, so `reconcile+api.ts:getAuthContext()` returned null and the route returned 401. Because `fetch()` resolves normally on HTTP errors, the `.catch()` never fired and the 401 was silently swallowed with zero log output.
- Replaced the promise chain with an async function matching the established `DueTodayZone` / intelligence-fetch pattern: calls `getAccessToken()` (throws if session not ready → fetch is skipped), sends `Authorization: Bearer <token>`, and checks `res.ok` after await — logging a distinct `console.warn(`Echo reconcile: server responded with status ${res.status}`)` on non-ok responses. Network/auth errors are caught and logged via a separate `console.warn('Echo reconcile: fetch error:', err)`. The `reconcileInFlight` ref reset is preserved in `finally`.
- Code trace: `getAccessToken()` → `supabase.auth.getSession()` → JWT sent as `Authorization: Bearer` → `reconcile+api.ts:getAuthContext()` reads the header, validates via `supabase.auth.getUser(token)`, returns `{ userId, accessToken }` → `if (!auth)` gate passes → reconciliation proceeds.
- Files touched: `app/(app)/dashboard.tsx`, `CHANGELOGCODEX.md`.
- Verification: `npx tsc --noEmit` clean.

### Added (2026-06-22 — Block 1: API-layer goal creation + mode fix)
- Created `lib/api/auth.ts` (`getAuthContext`) and `lib/api/contracts.ts` (`ApiResponse<T>`
  envelope) as the first routes on the new shared API auth/contract pattern.
- Created `app/api/goals/index+api.ts` (`POST /api/goals`), routing AI-finalized goal
  persistence through `createGoalWithMeasurables` under an authed Supabase client instead of
  calling the DB layer directly from `app/goals/create.tsx`.
- Restored `mode: 'commitment' as const` in `lib/db/goals.ts` (`mapAiGoalDataToDbInserts`),
  reverting the unreviewed H3 cleanup pass that dropped it and caused a NOT-NULL insert
  failure in production.
- Added `supabase/migrations/026_goals_mode_drop_exploration.sql`, tightening
  `goals_mode_check` to `mode = 'commitment'` only ('exploration' was dead — never written or
  read anywhere in the app).
- Files touched: `lib/api/auth.ts` (new), `lib/api/contracts.ts` (new),
  `app/api/goals/index+api.ts` (new), `lib/db/goals.ts`, `app/goals/create.tsx`,
  `supabase/migrations/026_goals_mode_drop_exploration.sql` (new).
- Verification: `POST /api/goals` returns 201 with a real `goalId`; DB row confirms
  `mode: 'commitment'` persists; `npx tsc --noEmit` clean.
- Closes H3 (see Cleanup, 2026-04-08, below) — that entry is now marked CLOSED.

### Changed (2026-06-19 — Block 0 Closeout: Verification and blocker cleanup)
- Session `Block 0 Closeout — Verification and blocker cleanup`: audited the current Block 0.1 callback state, Block 0.2 RLS hardening migration and four audited routes, Block 0.3 Echo reconcile route, `package.json` scripts, and the known verification blockers before making any edits. Confirmed `app/(auth)/callback.tsx` exists, `app/auth/callback.tsx` is absent, signup still redirects to `https://oharaai.vercel.app/callback`, the four audited actions/goals routes still use `createAuthedClient(accessToken)` for their Supabase queries, and `app/api/echo/reconcile+api.ts` still imports the canonical helper from `lib/db/client.ts`.
- Fixed the verification blockers with the smallest safe changes: closed the missing header wrapper `View` in `app/about.tsx` so TypeScript and Expo web bundling can parse the page again; tightened `expo-router` `Link` prop typing in `app/about.tsx` and `app/index.tsx`; registered the existing root `about` screen in `app/_layout.tsx`; added a targeted `Href` cast on the two `/about` links because the generated Expo typed-route file still omits that route in this repo; and repointed `expo.web.favicon` in `app.json` from missing `./assets/images/favicon.png` to the existing `./assets/images/icon.png` instead of inventing new branding.
- Files touched: `app/_layout.tsx`, `app/about.tsx`, `app/index.tsx`, `app.json`, `CHANGELOGCODEX.md`.
- Verification results: `npx tsc --noEmit` passes after the JSX and typed-route fixes; `npx expo export -p web` passes after the JSX and favicon fixes; `npx supabase migration list` shows local and remote are aligned through migration `025`; `npx supabase db push` reports `Remote database is up to date`; there is still no lint script in `package.json`; repo audit still shows no live app-code references to `/auth/callback`; Block 0.2 route state and Block 0.3 Echo reconcile state remain intact from source review after the blocker fixes.
- Supabase status: the repo is linked to project `rrgiqemscnyaqkculnmb`, live CLI access is available from this machine, and `025_action_logs_rls_hardening.sql` is already applied remotely, so no new migration was pushed during this closeout.
- Manual tests still required: signup email confirmation landing on `/callback`; authenticated `POST /api/echo/reconcile` returning `{ reconciled, failed }`; unauthorized `POST /api/echo/reconcile` returning `401`; authenticated `/api/goals/activity` and `/api/goals/complete-measurable` exercising correctly against live RLS.
- Remaining risk: live Supabase migration/application state and runtime route behavior still require environment-backed verification even though local typecheck and web export blockers are now cleared, and the generated Expo typed-route file still appears stale around `/about` despite the route registration fix.

### Added (2026-06-19 — Block 0.2: Anon-client RLS hardening)
- Added `supabase/migrations/025_action_logs_rls_hardening.sql` to tighten `public.action_logs` RLS around both `user_id = auth.uid()` and owned `goal_id`, replacing the earlier user-id-only select/insert/update policies with explicit goal-ownership checks and an update `WITH CHECK`. This closes the anon-client RLS gap for the action routes without widening any access.

### Changed (2026-06-19 — Block 0.2: Anon-client RLS hardening)
- Audited `app/api/actions/index+api.ts`, `app/api/actions/[id]+api.ts`, `app/api/goals/activity+api.ts`, and `app/api/goals/complete-measurable+api.ts`. Confirmed Block 0.1 did not change these API auth paths; it only changed signup/callback flow in the auth screens.
- Updated the four audited routes to run their actual Supabase reads/writes through `createAuthedClient(accessToken)` after token validation, so existing table RLS can enforce the caller boundary instead of relying on the shared anon client. Affected files: `app/api/actions/index+api.ts`, `app/api/actions/[id]+api.ts`, `app/api/goals/activity+api.ts`, `app/api/goals/complete-measurable+api.ts`.
- Threaded an optional authed Supabase client through `getActivityByGoalId`, `completeMeasurable`, and `getGoalProgressById` in `lib/db/goals.ts` so the targeted goal routes can keep their current behavior while executing under the caller JWT.

### Changed (2026-06-19 — Block 0.3: Echo auth client consolidation)
- Session `Block 0.3 — Echo auth client consolidation`: audited `app/api/echo/reconcile+api.ts` against `lib/db/client.ts` and existing API route usage, confirming the private `createAuthedClient(accessToken)` matched the canonical export in function name, input, bearer-header handling, auth flags, and env-backed Supabase configuration. Confirmed Block 0.1 only changed signup/callback flow and Block 0.2 only established the same bearer-validated, RLS-scoped route pattern used here.
- Replaced the private authed Supabase client in `app/api/echo/reconcile+api.ts` with the canonical `createAuthedClient` import from `lib/db/client.ts`, removing the duplicate helper and unused `@supabase/supabase-js` import while preserving the route's auth checks, response shape, and database read/write behavior.
- Files touched: `app/api/echo/reconcile+api.ts`, `CHANGELOGCODEX.md`.
- Verification performed: `git diff -- app/api/echo/reconcile+api.ts` confirmed the route diff is limited to the client import/helper removal; `git status --short` confirmed no `supabase/migrations/*` files were created or modified; `npx tsc --noEmit` was blocked by pre-existing syntax errors in `app/about.tsx`; `npx expo export -p web` was blocked by the same pre-existing `app/about.tsx` JSX error plus a missing `./assets/images/favicon.png`.
- No DB migration was required, no migration files were created or modified, and `npx supabase db push` was not run.
- Manual test still required: call `POST /api/echo/reconcile` with a valid bearer token and confirm unauthorized requests still return `401`, successful requests still return `{ reconciled, failed }`, and the same `echo_entries` plus `profiles.last_summarized_at` writes occur.
- Remaining risk: end-to-end runtime verification of the reconcile route is still pending until the unrelated `app/about.tsx` syntax issue and missing web favicon are resolved, or until the route is exercised manually in an authenticated environment.

### Fixed (2026-06-19 — Block 0.2: Anon-client RLS hardening)
- Repo-based RLS audit results: `action_logs`, `goals`, `measurables`, `measurable_logs`, `echo_entries`, `vaults`, `vault_items`, and `echo_goal_links` were reviewed for the four targeted routes. Matching repo policies already existed for all audited goal/activity tables; the missing hardening was on `action_logs`, whose prior policies did not enforce owned `goal_id`.
- Verification performed: route/table audit completed from repo migrations and helper code; `npx tsc --noEmit` passed and `npx expo export -p web` passed. Live Supabase RLS inspection remains pending because the local repo only provides the public Supabase URL and anon key, not a DB connection string or service-role/admin credential for querying live policy metadata safely.
- Manual DB checks still required when Supabase is reachable: apply `supabase/migrations/025_action_logs_rls_hardening.sql`, then verify user A can read/create/update only their own `action_logs`, cannot insert an `action_logs.goal_id` pointing at another user's goal, and that the authed `/api/goals/activity` and `/api/goals/complete-measurable` flows still succeed under RLS.
- Remaining risk: until the new migration is applied to the live Supabase project, the database will continue using the older `action_logs` policies even though the route code is now RLS-compatible.

### Added (2026-04-08 — Conversation 3 Block 4: embedding_text Population + Write-Path Wiring)
- Created `lib/ai/embedding-text.ts`: three pure helper functions with zero side effects — `buildEchoEmbeddingText(content)` returns trimmed content or null if below 40-word floor; `buildGoalEmbeddingText(title, description, milestones)` concatenates title + description + milestone titles, never returns null; `buildVaultItemEmbeddingText(content)` returns trimmed content or null if below floor. All import `EMBEDDING_MIN_WORD_COUNT` from `lib/ai/constants.ts`.
- Created `scripts/backfill-embedding-text.ts`: idempotent backfill for existing `echo_entries`, `goals`, and `vault_items` where `embedding_text IS NULL`. Pure string computation — no API calls. Batches of 100 rows, parallel within batch. Uses Supabase service role client. For goals, joins `measurables(title)` via PostgREST nested select. Reports: "X echo entries, Y goals, Z vault items updated."
- Created `scripts/backfill-embeddings.ts`: idempotent backfill for records where `embedding_text IS NOT NULL AND embedding IS NULL`. Calls Voyage AI via `generateEmbedding()`. Batches of 10 with 200ms delay between batches. Per-record errors are logged and skipped — batch continues. Reports progress every 10 records. Run AFTER `backfill-embedding-text.ts`.

### Changed (2026-04-08 — Conversation 3 Block 4: embedding_text Population + Write-Path Wiring)
- `features/echo/services/echo-service.ts`: added `buildEchoEmbeddingText`, `generateEmbedding`, `EMBEDDING_MODEL` imports; computes `embeddingText` before the `echo_entries` INSERT; adds `embedding_text` field to the INSERT payload; fire-and-forget `.then().catch()` chain after the insert guard writes `embedding` + `embedding_model` using the saved entry's ID. BRT pipeline, echo_goal_links write, and all existing INSERT fields are untouched.
- `lib/db/goals.ts`: added `buildGoalEmbeddingText`, `generateEmbedding`, `EMBEDDING_MODEL` imports; `mapAiGoalDataToDbInserts()` now computes `embeddingText` from `aiData.goal.title`, `aiData.goal.description`, and `aiData.measurables`, adds `embedding_text` to `goalInsert`, and exposes `embeddingText` in the return value; `createGoalWithMeasurables()` destructures `embeddingText` and runs a sync try/catch embedding call AFTER the measurables insert (goal already saved — embedding failure is isolated). Conversation flow untouched.
- `lib/db/vaults.ts`: added `buildVaultItemEmbeddingText`, `generateEmbedding`, `EMBEDDING_MODEL` imports; `createVaultItem()` computes `embeddingText`, adds to INSERT payload, fire-and-forget embedding after insert guard; `addVaultItem()` (legacy) computes `embeddingText`, adds to INSERT payload, adds `.select('id').single()` to return the new row ID, fire-and-forget embedding using that ID. Return type of `addVaultItem()` unchanged (`Promise<void>`).
- Preserved: `lib/ai/embeddings.ts` unmodified. `lib/ai/client.ts` unmodified. No migration files modified. No existing INSERT fields removed.
- `tsc --noEmit`: clean.

### Added (2026-04-08 — Conversation 3 Block 3: Postgres Match Functions + Retrieval Layer)
- Created `supabase/migrations/024_embedding_match_functions.sql`: three Postgres match functions (`match_echo_entries`, `match_goals`, `match_vault_items`) for semantic vector retrieval. All use `LANGUAGE sql STABLE`, `SECURITY INVOKER` (RLS enforced), and `SET search_path = public, extensions` so pgvector `<=>` operator resolves correctly from the extensions schema. Returns similarity as `1 - (embedding <=> query_embedding)` (cosine). `match_echo_entries` uses `content` column (canonical name after migration 005 rename chain). `match_goals` includes `description` column (confirmed present since migration 003). `match_vault_items` uses `created_by` for ownership (confirmed from migration 017). All functions filter `WHERE embedding IS NOT NULL`.
- Created `lib/db/embeddings.ts`: application-layer retrieval module with three functions — `findSimilarEchoEntries`, `findSimilarGoals`, `findSimilarVaultItems`. Each calls `generateEmbedding(text, 'query')` from `lib/ai/embeddings.ts`, returns empty array on null (text too short), calls the corresponding Postgres function via `supabase.rpc()`, maps snake_case DB rows to camelCase result types via local `DbXxxMatchRow` types and explicit mapper functions following the existing `lib/db/` pattern. Exported result types: `EchoMatchResult`, `GoalMatchResult`, `VaultItemMatchResult`. RPC errors throw with function name and Supabase error message — callers decide retry/fallback. No `any` used; `unknown` cast to typed rows.

### Added (2026-04-08 — Conversation 3 Block 2: Voyage Embedding Pipeline)
- Created `lib/ai/embeddings.ts` as a standalone Voyage REST embedding client with `generateEmbedding()` and `generateEmbeddings()`; applies the 40-word floor and 512-token approximate truncation from `lib/ai/constants.ts`, skips short inputs by returning `null`, validates 1024-dimension numeric vectors, retries once on 5xx/network failures, and emits structured JSON observability logs without routing through `callLLM` or consuming daily AI quota.
- Exported `EmbeddingResult` from `lib/ai/embeddings.ts` for future retrieval/write-path callers; includes `embedding`, `model`, `inputType`, `dimensions`, and `latencyMs`.

### Changed (2026-04-08 — Conversation 3 Block 2: Voyage Embedding Pipeline)
- Updated `lib/ai/errors.ts` with embedding-specific constants and typed errors: `EMBEDDING_FAILED`, `EMBEDDING_RATE_LIMITED`, and `EMBEDDING_KEY_MISSING`, so Voyage failures follow the existing AI error pattern instead of surfacing raw fetch/provider exceptions.
- Updated `lib/ai/contracts.ts` to extend `AiErrorCode` with the new embedding error codes required by `lib/ai/errors.ts` and `lib/ai/embeddings.ts`.
- Preserved existing Anthropic pipeline files: `lib/ai/client.ts` and `lib/ai/echo-client.ts` were left unchanged, and no dependencies were added to `package.json`.

### Added (2026-04-08 — Conversation 3 Block 1: pgvector Setup)
- Created `supabase/migrations/023_pgvector_setup.sql`: enables `vector` extension via `CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions`; adds `embedding vector(1024)`, `embedding_text text`, and `embedding_model text` columns (all nullable, `IF NOT EXISTS`) to `echo_entries`, `goals`, and `vault_items`; creates HNSW indexes (`vector_cosine_ops`, m=16, ef_construction=64) on all three tables; adds partial index `idx_vault_items_needs_embedding` filtering for unembedded items with `content` length > 200 chars. Migration is fully idempotent. Model: `voyage-4-lite`, 1024 dimensions. Spec ref: `ohara_constellation_spec.md` Section 7c.
- Added `embedding?: number[] | null`, `embedding_text?: string | null`, `embedding_model?: string | null` to `EchoEntry` in `features/echo/types.ts` — append-only, no existing fields modified.
- Added same three fields to `Goal` in `features/goals/types.ts` — append-only.
- Added same three fields to `VaultItem` in `types/vault.ts` — append-only.
- Created `lib/ai/constants.ts`: `EMBEDDING_DIMENSIONS = 1024`, `EMBEDDING_MODEL = 'voyage-4-lite'`, `EMBEDDING_MIN_WORD_COUNT = 40`, `EMBEDDING_MAX_TOKENS = 512`.
- `tsc --noEmit`: clean.

### Cleanup (2026-04-08 — Second Cleanup Pass)
Passes: H1, H3, H6 (H5 flagged — see below). Batch D items confirmed complete from prior session.

- **H1:** Deleted `store/vaults.ts` and `store/echo-links.ts`. Both confirmed zero live imports. Canonical data access remains via hook layer (`useVault.ts`, `useEchoTrail.ts`).
- **H3:** Removed `mode: 'commitment' as const` from the goal insert block in `lib/db/goals.ts` (~line 68). DB column preserved; application no longer writes to it. **[CLOSED 2026-06-22]** — this removal caused a NOT-NULL insert failure in production; the write was restored and the column's CHECK constraint tightened. See "Added (2026-06-22 — Block 1: API-layer goal creation + mode fix)" above.
- **H6:** Renamed `ActionLog` fields to camelCase in `features/actions/types.ts` (`goal_id → goalId`, `user_id → userId`, `action_text → actionText`, `due_date → dueDate`, `completed_at → completedAt`, `created_at → createdAt`). Added explicit `mapActionLog()` DB→TS mapping functions in both `app/api/actions/index+api.ts` and `app/api/actions/[id]+api.ts` so DB snake_case rows are properly converted before serialization. Updated `displayedAction.action_text → displayedAction.actionText` in `features/actions/components/NextActionSection.tsx` and `app/(app)/dashboard.tsx`. DB column names in Supabase queries unchanged.
- **H5:** Created `features/projects/types.ts` with `ProjectStatus`, `Project`, and `ProjectWithGoals` (moved verbatim from `features/goals/types.ts`; `ProjectWithGoals` imports `GoalWithMeasurables` from `@/features/goals/types`). Removed all three types from `features/goals/types.ts`. Updated four import paths: `features/projects/store.ts`, `features/projects/services/project-service.ts`, `features/projects/components/ProjectCard.tsx`, `app/projects/[id].tsx`. `GoalWithMeasurables` import in project-service.ts preserved from `@/features/goals/types`. H5 completed: Project and ProjectWithGoals moved to features/projects/types.ts. Four import paths updated. tsc clean.
- **Batch D (confirmed complete):** All D2–D6 items were applied in the prior session. Verified: `vaultIdToGoalId` rename in goal-service.ts, Bud color #4A7C5F in both CLAUDE.md files, `if (error) return null` in ActivityFeed.tsx, `onClose` wired to `closeSheet` in vault.tsx, pipeline removal note in lib/ai/CLAUDE.md.

Deferred: H2 (echo prompt consolidation), H4 (useEchoTrail API boundary) — each has its own dedicated session.

`tsc --noEmit`: clean after H1, H3, H6.

### Cleanup (2026-04-07 — Codebase Audit)
Batches: A, B (partial), C (partial), D (partial)

- **Batch A:** Deleted 22 dead files: `lib/ai/queue.ts`, `lib/ai/pipelines/create-goal.ts`, `lib/ai/pipelines/reflect.ts`, `lib/ai/pipelines/summarize.ts`, `lib/rules/{task-recommender,hobby-matcher,thorn-detector}.ts`, `lib/utils/{date,validation,ui-store}.ts`, `lib/activity/mappers.ts`, `features/dashboard/components/DailyView.tsx`, `features/dashboard/hooks/useDailyTasks.ts`, `features/dashboard/services/task-recommender.ts`, `features/dashboard/types.ts`, `features/goals/components/{GoalMediaGallery,GoalEchoEntriesPanel,NewGoalButton}.tsx`, `features/goals/hooks/useMeasurables.ts`, `features/goals/services/mock-data.ts`, `features/echo/services/mock-data.ts`, `features/profile/services/profile-service.ts`. Removed `ECHO_REFLECTION_PROMPT` dead export from `lib/ai/echo/prompts.ts`. Removed `createGoal()` TODO stub from `features/goals/services/goal-service.ts`. Removed stale `TRACKED DEBT — vaultNoteCount → vaultItemCount` entry from `CONTEXT.md` (completed in Prompt 11).
- **Batch B:** Deleted `types/global.ts` and `types/index.ts` after moving live `Profile` type to `features/auth/types.ts` and updating `features/auth/store.ts` import. Removed dead `ActivityEntry` interface from `features/goals/types.ts`. Converted three inline `ActivityItem` union variants (`vault_item_added`, `insight_confirmed`, `echo_linked`) to named interfaces (`VaultItemAddedActivity`, `InsightConfirmedActivity`, `EchoLinkedActivity`). Updated `ActivityKind` union to include all six variants.
- **Batch C (C3 only):** Added refactor-target comment above `getActivityByGoalId()` in `lib/db/goals.ts` documenting that activity assembly logic belongs in the service layer (Phase 2 target).
- **Batch D (partial):** Renamed `vaultGoalMap` → `vaultIdToGoalId` in `features/goals/services/goal-service.ts`. Updated Bud BRT color from `#22C55E` → `#4A7C5F` in `components/CLAUDE.md` and `lib/db/CLAUDE.md`. Removed `void error` suppression in `ActivityFeed.tsx` (replaced with `if (error) return null`). Removed `void onClose` suppression in `vault.tsx` `VaultPickerSheet` (wired to Cancel button). Documented pipeline removal in `lib/ai/CLAUDE.md`.

Excluded: H1–H6 items pending human review (store pattern decision, echo prompt consolidation, mode column, useEchoTrail boundary, Project type move, ActionLog rename).

`tsc --noEmit`: clean after each batch.

### Added (2026-04-07 — Prompt 11: Constellation Sample SVG)
- Added `components/constellation/ConstellationSample.web.tsx` as a static inline SVG constellation sample using the existing React Native Web raw-`<svg>` pattern, with seven labeled nodes, curved connection paths, and a reduced-motion-safe pulse on the Current Season anchor. Added `components/constellation/ConstellationSample.tsx` as a native-safe static fallback so no new SVG dependency was required.

### Changed (2026-04-07)
- Updated `app/(app)/constellation.tsx` to replace the prior star-dot placeholder visual with the new Constellation sample inside a white preview card, while leaving the existing screen structure and summary-gate logic intact.
- Polished `app/projects/[id].tsx` by replacing the stubbed edit row with a local modal form wired to `updateProject()`, updating hero state immediately after save, and consolidating delete confirmation onto a minimally extended shared `components/ui/Modal.tsx` with optional confirm/cancel actions and destructive styling.
- Fixed project detail goal loading in `features/projects/services/project-service.ts` by adding a project-scoped goals query and removing the previous fetch-all-then-filter behavior, while preserving the same mapped goal shape and signal enrichment used by `GoalCard`.
- Extended `app/projects/[id].tsx` below the existing Goals section only: added placeholder `Project Vault` and `Activity` cards, added a `Settings` card with stubbed edit action, space-gated hidden manage-members placeholder, and a local destructive delete confirmation modal wired to the existing `deleteProject()` project service helper. Hero card and Goals section from Prompt 10A were left unchanged.
- Redesigned the top two sections of `app/projects/[id].tsx`: rebuilt the project hero card with shared badge styling, aggregate child-goal progress, and the requested cream/white/forest hierarchy; rebuilt the Goals section as a vertical shared-`GoalCard` list with count badge, filled `+ Add Goal` CTA, and the new empty-state copy. Left lower page sections unchanged. No project model or goal-card variant changes.
- Renamed goal signal field `vaultNoteCount` to `vaultItemCount` in the goal type, goal service, goal card, and goal mock data; updated the GoalCard label from notes to items with no logic changes.

### Added (2026-04-07 — Prompt 9C: Signal Refinement + BRT Centralization)
- Extracted inline BRT derivation logic from `fetchGoalSignals()` into a named helper `deriveBrtTag(brt: DbBrtValue): 'bud' | 'rose' | 'thorn' | null` in `features/goals/services/goal-service.ts`. Annotated with heuristic comment and Phase 2 migration note. No behavior change.
- Fixed GoalCard layout shift: wrapped conditional activity line (`{n} notes · {n} reflections`) in a fixed `minHeight: 20` View so card height is stable whether signals are present or not.
- Confirmed Constellation screen uses API route (`/api/dashboard/summary`) for counts — `supabase` import is auth-token-only (no direct data reads). No logic changes.
- Renamed `{/* Progress section */}` comment to `{/* Progress gates */}` for clarity.
- `tsc --noEmit`: clean.
- Updated `CONTEXT.md`: added Signal Layer Notes section documenting `deriveBrtTag()` location and `vaultNoteCount → vaultItemCount` rename as tracked Phase 1.5 debt.

### ✓ Prompt 9 Complete (9A + 9B + 9C)
- 9A: Echo → Goal auto-linking (keyword heuristic, `echo_goal_links`, non-blocking IIFE)
- 9B: Goal signal enrichment (vaultNoteCount, echoLinkCount, latestBrtTags), GoalCard micro-dots, Constellation screen, dashboard summary API
- 9C: BRT helper centralization, GoalCard layout-shift fix, signal layer documentation

### Added (2026-04-07 — Prompt 9B: Goal Signal Enrichment + Constellation Screen)
- Extended `GoalWithMeasurables` in `features/goals/types.ts` with three signal fields: `vaultNoteCount: number`, `echoLinkCount: number`, `latestBrtTags: string[] | null`.
- Added `fetchGoalSignals()` helper in `features/goals/services/goal-service.ts` that fetches per-goal vault note counts, echo link counts, and latest BRT tags in 4 bulk queries (no N+1). BRT tag derived from `echo_entries.brt` JSONB object (bud → rose → thorn priority). Signal fetch failures are caught and silently ignored so goal list is never blocked.
- Updated `fetchGoals()` in `goal-service.ts` to call `fetchGoalSignals()` and merge results into returned goals. `mapGoal()` now sets default `vaultNoteCount: 0`, `echoLinkCount: 0`, `latestBrtTags: null` so all callers remain valid.
- Updated `features/goals/services/mock-data.ts` to include signal default fields on all 5 mock goals.
- Updated `features/goals/components/GoalCard.tsx`: added activity line below progress bar (`{n} notes · {n} reflections`, only when count > 0); added BRT micro-dots (6×6 circles, flex row, `alignSelf: flex-end`) in footer using color map: bud `#4A7C5F`, rose `#F59E0B`, thorn `#EF4444`. No other GoalCard logic or styles changed.
- Created `app/api/dashboard/summary+api.ts`: authenticated GET route returning `{ goalCount, echoCount }` using Supabase `count: 'exact'` — used by Constellation screen.
- Replaced `app/(app)/constellation.tsx` placeholder with full Phase 1.5 implementation: SafeAreaView + ScrollView, star-node visual (8 positioned Views, no SVG dep), headline, subtext, progress bars toward 3-goal / 10-echo gates, status line. Fetches from `/api/dashboard/summary` via Bearer token. Counts rendered only after loaded (null guard). No direct Supabase data calls.
- Replaced `app/(app)/explore.tsx` content with centered placeholder ("Explore is coming") using inline styles, no icon library, SafeAreaView container.
- Added `CONSTELLATION_ENABLED: false` to `constants/features.ts`.
- Updated `components/layout/Sidebar.tsx` NAV_ITEMS: added Constellation route (gated by `CONSTELLATION_ENABLED`, opacity 0.4, no-nav when disabled).
- Updated `app/(app)/_layout.tsx`: added `constellation` Stack.Screen for sidebar path; added Constellation Tabs.Screen (hidden via `href: null` when `CONSTELLATION_ENABLED` is false); updated `tabBarActiveTintColor` to `#3D5247`.
- `tsc --noEmit`: clean.

### Added (2026-04-07 — Echo → Goal Auto-Linking)
- Updated `features/echo/services/echo-service.ts:createEntry()` to write to `echo_goal_links` after every successful `echo_entries` insert. Manual link fires when `goalId` is provided (`link_source: 'manual'`, `confirmed: true`). AI auto-link fires when no `goalId` is provided — keyword heuristic scores active goal titles against entry content, inserts the single best match above 0.7 threshold (`link_source: 'ai_auto'`, `confirmed: false`). Both paths are non-blocking void IIFEs isolated from the main save flow. Bridge table upsert uses `onConflict: 'echo_entry_id,goal_id'` with `ignoreDuplicates: true` — no duplicate links possible. No new AI calls introduced; Phase 2 classifier can swap in by replacing the auto-link IIFE body. `tsc --noEmit` clean.

### Added (2026-04-07 — Echo Links Zustand Store)
- Added `store/echo-links.ts` with a new `useEchoLinksStore` Zustand store that mirrors `store/vaults.ts`, using the existing goal-fetch helper plus authenticated echo-link confirm, dismiss, and manual-create mutations with exact optimistic rollback paths and recomputed unconfirmed counts.
- Added `EchoEntryWithLink` to `types/echo-link.ts` so the new echo-links store can type its linked-entry state against the existing `getEchoEntriesForGoal()` response shape.
- Added `GET /api/echo-links/:goalId` handling in `app/api/echo-links/[linkId]+api.ts` so goal-linked echo entries can be loaded through the API using the repo’s existing Bearer-token auth pattern and response conventions.

### Changed (2026-04-07 — Echo Links API Fetch)
- Updated `store/echo-links.ts` to load goal-linked echo entries from `/api/echo-links/:goalId` instead of importing `lib/db/echo-goal-links` directly, preserving the existing store logic while moving the read path behind the API boundary.

### Added (2026-04-07 — Vault Zustand Store)
- Added `store/vaults.ts` with a new `useVaultStore` Zustand store for goal-detail vault state, following the existing store architecture while adding authenticated vault fetch/create/update/delete actions plus precise optimistic rollback paths for confirm and dismiss flows.
- Added `CreateVaultItemInput` to `types/vault.ts` so the new vault store can accept a typed create payload that matches the current `POST /api/vaults/[goalId]` request contract.

### Added (2026-04-06 — Goal Vault + Echo Trail)
- Added `features/goals/hooks/useVault.ts`, `features/goals/hooks/useEchoTrail.ts`, `features/goals/components/VaultItemCard.tsx`, and `features/goals/components/EchoTrail.tsx` so the goal vault screen can manage saved notes/links and review linked Echo reflections in dedicated reusable UI/hooks.

### Changed (2026-04-06 — Goal Detail + Vault Surface)
- Updated `app/goals/[id]/index.tsx` to show parent project context plus summary cards for Vault and Reflections, making the goal detail screen a clearer hub into the new vault and journaling flows.
- Updated `app/goals/[id]/vault.tsx`, `features/goals/components/ActivityFeed.tsx`, `lib/db/goals.ts`, and `docs/DECISIONS.md` to reshape Vault into a richer note/link/reflection workspace and surface vault additions, confirmed insights, and linked reflections in the activity timeline.

### Changed (2026-04-06 — Prompt 5 Surgical Fix)
- Updated `lib/db/client.ts` to export `createAuthedClient(accessToken)`, mirroring the existing bearer-token-scoped Supabase pattern so Prompt 5 API routes can execute RLS-gated reads/writes under the authenticated user instead of the shared anon client.
- Updated `lib/db/vaults.ts` service signatures to accept an optional Supabase client and added ownership helpers `getVaultByGoalIdForUser` and `getVaultItemByIdForUser` so vault API routes can keep ownership checks inside the service layer while preserving existing external behavior for other callers.
- Updated `lib/db/echo-goal-links.ts` service signatures to accept an optional Supabase client, added `getUnconfirmedLinksForUserGoals`, `getEchoLinkByIdForUserGoal`, and `createLinkForUserGoal`, and kept `getUnconfirmedLinksForUser` as a compatibility alias. Ownership is now consistently scoped through `goals.user_id` across the Prompt 5 echo-link routes.
- Updated `app/api/vaults/[goalId]+api.ts`, `app/api/vaults/items/[itemId]+api.ts`, `app/api/echo-links/+api.ts`, and `app/api/echo-links/[linkId]+api.ts` to use the canonical bearer-auth extraction shape (`{ userId, accessToken }`), create token-scoped DB clients for their service calls, and apply the canonical string sanitization pattern to route params and request IDs.

### Fixed (2026-04-06 — Prompt 5 Surgical Fix)
- Fixed Prompt 5 vault and echo-link API routes so their DB operations now run under authenticated bearer context, making the routes merge-safe with existing RLS instead of relying on the shared anon client. Affected files: `lib/db/client.ts`, `lib/db/vaults.ts`, `lib/db/echo-goal-links.ts`, `app/api/vaults/[goalId]+api.ts`, `app/api/vaults/items/[itemId]+api.ts`, `app/api/echo-links/+api.ts`, `app/api/echo-links/[linkId]+api.ts`.
- Replaced fragile duplicate echo-link detection in `app/api/echo-links/+api.ts` by preserving structured Supabase/Postgres error metadata from `lib/db/echo-goal-links.ts` and mapping unique violations (`23505`, optional echo-link constraint match) to HTTP 409.

### Added (2026-04-06 — Migration 022)
- Created `supabase/migrations/022_spaces_rename_owner_id.sql`: renames `spaces.user_id` → `spaces.owner_id`. Includes: column rename; drop/recreate `spaces_user_id_idx` → `spaces_owner_id_idx`; drop/recreate `spaces_one_personal_per_user_idx` on `owner_id`; drop/recreate 4 RLS policies on `public.spaces`; drop/recreate 4 RLS policies on `public.space_members` that subquery `spaces.owner_id`; updated `handle_new_user_space()` function INSERT/ON CONFLICT/SELECT to use `owner_id`.

### Changed (2026-04-06 — Migration 022)
- Updated `lib/db/spaces.ts`: `DbSpaceRow.user_id` → `owner_id`; `mapSpace(row.user_id)` → `mapSpace(row.owner_id)`; all `.select()` strings and `.eq('user_id', ...)` against spaces table updated to `owner_id`; insert payload key `user_id` → `owner_id`. `space_members` queries unchanged (their `user_id` column is unaffected).

### Added (2026-04-06 — Prompt 4)
- Created `lib/db/spaces.ts`: `getPersonalSpace`, `getSpacesForUser`, `createSpace`, `getSpaceMembers`, `addSpaceMember`, `removeSpaceMember`. Uses types from `types/space.ts`. Maps DB `owner_id` → `Space.ownerId`; `joined_at` → `joinedAt`. `getSpacesForUser` uses two sequential queries (space_members then spaces IN) to match existing no-complex-join pattern.
- Created `lib/db/echo-goal-links.ts`: `getLinksForEchoEntry`, `getLinksForGoal`, `getEchoEntriesForGoal`, `createLink`, `confirmLink`, `dismissLink`, `getUnconfirmedLinksForUser`. Uses types from `types/echo-link.ts` and `EchoEntry` from `features/echo/types.ts`. `getEchoEntriesForGoal` and `getUnconfirmedLinksForUser` use two sequential queries instead of complex JOINs. Maps `echo_entry_id` → `echoEntryId`, `link_source` → `linkSource`.
- Rewrote `lib/db/vaults.ts` with canonical service API: `getVaultByGoalId`, `getVaultItems` (sort_order ASC), `getVaultItemsByType`, `createVaultItem`, `updateVaultItem`, `deleteVaultItem`, `getVaultWithItems`. All functions use types from `types/vault.ts`; re-exports `VaultItem` from that module. Legacy helpers (`getOrCreateVault`, `addVaultItem`, `getVaultItemCount`) preserved unchanged.

### Changed (2026-04-06 — Prompt 4)
- Updated `app/goals/[id]/vault.tsx`: changed `item.created_at` → `item.createdAt` (strictly necessary — `VaultItem` is now the canonical camelCase type from `types/vault.ts`).

### Added
- Documented `POST /api/goals/create` AI goal creation endpoint in `docs/API_CONTRACT.md`, including full `GoalFinalizeResponse` payload shape (`goal`, `measurables`, `reasoning`, `assumptions`). Affected file: `docs/API_CONTRACT.md`.
- Added `supabase/migrations/012_goals_visibility_model.sql` to replace `goals.is_public` with checked `visibility` values (`private`, `circle`, `public`), backfill existing rows safely, and remove the legacy boolean/index path.
- Added `supabase/migrations/013_daily_ai_usage_rate_limit.sql` with `daily_ai_usage`, authenticated quota consumption via `consume_daily_ai_quota`, and a 30-requests-per-day limit for AI calls.

### Changed
- Added goal-level vault entry counts to the goal detail milestone rows by introducing `getVaultItemCount` in `lib/db/vaults.ts`, fetching it from `app/goals/[id]/index.tsx` on focus, and threading the shared count through `features/goals/components/MeasurablesPanel.tsx` and `features/goals/components/MeasurableCard.tsx` so each milestone shows the current `X entries` text without changing layout structure.
- Removed the placeholder `Activity` card from `app/projects/[id].tsx` after auditing goal/project detail screens, leaving the real goal detail activity feed intact and avoiding fabricated project update copy.
- Changed the `goal_created` activity fallback timestamp in `lib/db/goals.ts` from the Unix epoch to the current time so missing `created_at` values no longer render a 1969/1970 date in the activity feed.
- Moved the goal-level vault entry count display from each milestone row into `features/goals/components/MeasurablesPanel.tsx`, removing the per-row subtitle in `features/goals/components/MeasurableCard.tsx` and rendering a single subdued `X vault entries` line above the milestone list instead.
- Tightened prompt verbosity across `lib/ai/prompts/echo-reflection.ts`, `lib/ai/prompts/intelligence.ts`, `lib/ai/prompts/goal-creation.ts`, `lib/ai/prompts/summarizer.ts`, and `lib/ai/prompts/reflect.ts` to reduce extra wording while preserving downstream prompt contracts and sys tem signals.
- Constrained conversational prompts to shorter, more direct responses where the prompt format allows it, including explicit 2-3 sentence guidance for `lib/ai/prompts/echo-reflection.ts`, `lib/ai/prompts/intelligence.ts`, and Stage 1 of `lib/ai/prompts/goal-creation.ts`.
- Preserved structured prompts with minimal explanation requirements and no extra commentary outside required JSON structure in `lib/ai/prompts/goal-creation.ts` and `lib/ai/prompts/summarizer.ts`, while tightening explanatory response guidance in `lib/ai/prompts/reflect.ts`.
- Updated goal schema/types, service mapping, mock data, and goal card sharing badges to use explicit `visibility` literals instead of `is_public` / `isPublic`. Affected files: `lib/goals/schema.ts`, `types/global.ts`, `features/goals/types.ts`, `features/goals/services/goal-service.ts`, `features/goals/services/mock-data.ts`, `features/goals/components/GoalCard.tsx`, `lib/db/goals.ts`.
- Updated goal-sharing policy/docs references to the new visibility model, keeping Phase 1 access conservative so `circle` is not treated as public before connection-aware rules exist. Affected files: `supabase/migrations/003_goals_measurables_schema.sql`, `docs/API_CONTRACT.md`, `docs/ARCHITECTURE.md`, `Context.md`, `docs/DECISIONS.md`.
- Added daily AI rate limiting at the `lib/ai/client.ts` chokepoint, routing Echo through the same path, requiring authenticated user context for tracked AI calls, and returning structured `RATE_LIMITED` / HTTP 429 responses instead of generic failures. Affected files: `lib/ai/client.ts`, `lib/ai/echo-client.ts`, `lib/ai/errors.ts`, `app/api/goals/create+api.ts`, `app/api/echo/reflect+api.ts`, `app/api/intelligence/index+api.ts`, `lib/ai/pipelines/*.ts`.
- Updated goal creation, Echo, and intelligence frontend handling for AI 429 responses so rate-limited requests do not retry infinitely, Echo keeps the saved reflection path intact, and the UI surfaces the new limit state. Affected files: `app/goals/create.tsx`, `features/echo/services/echo-service.ts`, `features/echo/components/EchoScreen.tsx`, `app/(app)/dashboard.tsx`.
- Added a persisted Echo composer draft store in `features/echo/draft-store.ts` and updated `features/echo/components/EchoScreen.tsx`, `features/echo/hooks/useEntries.ts`, and `features/echo/services/echo-service.ts` so Echo drafts restore per context (`global` or `goal:<goal_id>`), save locally after 500ms of inactivity, clear only after confirmed submission, and show inline submission-state messaging for saved-without-summary, offline, and unconfirmed-submit outcomes. Assumption: the existing Echo flow confirms persistence once the `echo_entries` insert succeeds, while `/api/echo/reflect` semantics only determine whether the AI response is immediately available.
- Added explicit `Inter` font usage to previously implicit dashboard, goals, goal-detail, and activity text styles, and updated `components/ui/Typography.tsx` so the shared `title` variant resolves through the Inter-backed `font-sans` mapping. Affected files: `app/(app)/dashboard.tsx`, `app/goals/index.tsx`, `app/goals/[id].tsx`, `features/goals/components/GoalDetailHeader.tsx`, `features/goals/components/ActivityFeed.tsx`, `components/ui/Typography.tsx`.
- Rewrote `features/projects/components/ProjectCard.tsx` to replace the GoalCard-like shell with a project-specific layout using a status dot, `Last active` metadata from `updated_at`, an optional two-line description, and a neutral placeholder progress rail so Phase 1 project cards reflect available data without inventing progress values.
- Updated `features/echo/components/EchoScreen.tsx`, `features/echo/hooks/useEntries.ts`, and `features/echo/services/echo-service.ts` so Echo entries can capture optional BRT and emotion metadata from new composer pill selectors, persist both fields to `echo_entries`, and render the refreshed cream-themed list cards with relative timestamps and emotion badges.
- Updated Echo and goal-facing schema types, mock data, service mapping, and AI prompt templates to replace legacy `classification` / `is_public` references with `brt`, `emotion`, `model_version`, and `visibility` for the new `echo_entries` schema. Affected files: `features/echo/types.ts`, `features/echo/services/echo-service.ts`, `features/echo/services/mock-data.ts`, `features/goals/types.ts`, `features/goals/services/mock-data.ts`, `lib/ai/prompts/reflect.ts`, `lib/ai/prompts/summarizer.ts`, `types/global.ts`.
- Added `supabase/migrations/009_echo_entries_schema_update.sql` to update `public.echo_entries` by dropping legacy `classification` / `is_public` fields and adding `brt`, `emotion`, `model_version`, and checked `visibility` metadata for the current Echo schema.
- Renamed the reflection and journaling feature to Echo across routes, feature modules, AI helpers, flags, docs, migrations, and generated artifacts so the codebase now consistently uses `Echo` / `echo` / `ECHO`. Affected files include `app/(app)/echo.tsx`, `app/api/echo/reflect+api.ts`, `features/echo/**`, `features/goals/components/GoalEchoEntriesPanel.tsx`, `constants/features.ts`, `lib/ai/echo-client.ts`, `lib/ai/prompts/echo-reflection.ts`, and the related docs/migrations/dist files.
- Updated goal `status` enum throughout `docs/API_CONTRACT.md` — replaced `paused / completed / archived` with canonical DB values `complete / stagnant / discovered` (matches `GOAL_DB_STATUSES` in `lib/goals/schema.ts`). Affected file: `docs/API_CONTRACT.md`.
- Added `smartData` as a required field in `GET /api/v1/goals` list response and `GET /api/v1/goals/:id` hydrated response in `docs/API_CONTRACT.md`.
- Renamed Echo fields in all request/response shapes in `docs/API_CONTRACT.md`: `rawText → content`, `aiOptedIn → aiInsightRequested` (aligns with migration 005 column renames). Affected file: `docs/API_CONTRACT.md`.
- Clarified `assumptions` is always `string[]`, never `null` or `undefined`; empty array when no assumptions were made. Affected file: `docs/API_CONTRACT.md`.
- Bumped contract version to 1.1 and updated `Last updated` date in `docs/API_CONTRACT.md`.
- Updated draft-stage goal-creation guidance in `lib/ai/prompts/goal-creation.ts` to use a stable user-facing structure with `Draft title`, `Summary`, `Why this matters`, `Assumed timeline`, `First milestones`, `Assumptions`, and up to 1-3 targeted questions.
- Clarified in `lib/ai/prompts/goal-creation.ts` that completing the draft structure should not force finalization.
- Consolidated goal schema constants and field types in `lib/goals/schema.ts`, and updated prompt/runtime/frontend imports to use the shared canonical goal categories, measurable enums, smart fields, and DB status values.
- Normalized finalized goal payload handling so `GoalFinalizeResponse` is the single canonical draft-to-save shape across `app/api/goals/create+api.ts`, `app/goals/create.tsx`, and `lib/db/goals.ts`.
- Added goal deletion support across `features/goals/services/goal-service.ts`, `features/goals/store.ts`, and `features/goals/components/GoalCard.tsx` so the existing `⋯` affordance now opens a delete flow with React Native `Alert` confirmation and removes deleted goals from Zustand state.
- Updated `app/(app)/dashboard.tsx` so Projects always remain accessible from the dashboard via the header `+` action, and replaced the fully empty dashboard state with a single guided chooser for creating either a goal or a long-term project.
- Added optional project linking during goal creation in `app/goals/create.tsx`, threading `projectId` through `app/api/goals/create+api.ts` and the existing persistence helper in `lib/db/goals.ts` so a goal can be pre-linked from a project or manually attached before the conversation starts.
- Fixed the `GoalCard` overflow interaction in `features/goals/components/GoalCard.tsx` by replacing the nested alert-only trigger with local menu state, a dismiss backdrop, and a web-safe responder wrapper so tapping `⋯` reliably opens the delete menu on React Native Web.
- Updated `features/goals/components/GoalCard.tsx` to use a web-compatible delete confirmation path (`window.confirm` on web, `Alert.alert` on native) so selecting `Delete goal` now confirms and proceeds reliably on React Native Web.

### Refactored
- Aligned structured draft detection in `evals/goal-creation/run.mjs` with the new draft-stage headings so local evals recognize the updated prompt shape.
- Updated `evals/goal-creation/scoring-rubric.md` to document the new draft-stage draft signals used by the goal-creation eval harness.
- Removed duplicate and dead goal payload validation/types from `app/api/goals/create+api.ts`, normalized `assumptions` to `string[]` in `lib/ai/schemas/goal-creation.ts`, and tightened frontend hydration in `features/goals/services/goal-service.ts` to normalize DB numerics/dates/statuses instead of relying on unsafe casts.
- Aligned frontend goal/measurable models and mock data with the persisted schema in `features/goals/types.ts`, `features/goals/services/mock-data.ts`, and `features/goals/components/GoalDetailHeader.tsx`, including support for hydrated `smartData`.

# CHANGELOGCODEX.md

## [Unreleased]

### Added
- Added a dedicated Echo reflection prompt in `lib/ai/prompts/echo-reflection.ts` and a separate Haiku-backed Echo client in `lib/ai/echo-client.ts` so Echo reflections now use an isolated AI path instead of the goal-creation client.

### Changed
- Added a gated affiliate teaser placeholder to `app/goals/[id].tsx` using the existing `useActivity` items array, and created `components/AffiliateTeaser.tsx` for the new cream-toned informational card that only appears after progress exists and at least one `echo_entry` activity is present.
- Refined the new affiliate teaser placeholder styling in `components/AffiliateTeaser.tsx` and wired its goal-detail placement directly below `ActivityFeed` in `app/goals/[id].tsx` so the Phase 1 card stays informational, non-interactive, and conditionally visible from existing activity state.
- Added `getEntriesByGoalId(goalId)` to `features/echo/services/echo-service.ts` and surfaced linked Echo entry previews on the goal detail screen via `features/goals/hooks/useGoalDetail.ts`, `app/goals/[id].tsx`, and `features/goals/components/GoalEchoEntriesPanel.tsx` so goals now show their related reflections directly below measurables.
- Replaced hardcoded fallback Supabase client credentials in `lib/db/client.ts` with required environment validation so the app no longer initializes against placeholder values when `EXPO_PUBLIC_SUPABASE_URL` or `EXPO_PUBLIC_SUPABASE_ANON_KEY` are missing.
- Set `ECHO_ENABLED` to `true` in `constants/features.ts` for Phase 1 shipping, while keeping `DISCOVERY_ENABLED` `false`, and wired `app/(app)/_layout.tsx` so the Echo and Explore tabs now render only when their respective flags are enabled.
- Wired Echo entry creation through a new `app/api/echo/reflect+api.ts` backend path and updated `features/echo/services/echo-service.ts` to request and persist a concise Echo reflection only when `aiInsightRequested` is true, with `processed_at` set after a successful response.
- Replaced the dashboard, goal detail, and Echo bare loading text with dark-theme NativeWind pulse skeletons, and updated the relevant CTAs to match the Phase 1 teal accent. Affected files: `app/(app)/dashboard.tsx`, `app/goals/[id].tsx`, `features/echo/components/EchoScreen.tsx`, `features/goals/components/NewGoalButton.tsx`, `components/ui/EmptyStateCard.tsx`.

### Fixed
- Added a subtle empty state for goal-linked Echo content on the detail screen: `No Echo entries yet.` This keeps the section informative when a goal has no related entries.
- Added `supabase/migrations/006_rls_audit_fixes.sql` to make RLS CRUD coverage explicit for `measurables`, `measurable_logs`, `profiles`, and `ai_usage`, closing gaps where policies relied on `FOR ALL` without `WITH CHECK` or omitted explicit deny coverage for blocked operations.
- Added `supabase/migrations/007_remove_public_goals_policy.sql` to remove the Phase 2 public-goals select policy from `public.goals` without changing any other goals RLS policies.
- Standardized empty-state treatment across Dashboard, Echo, goal-linked Echo entries, and goal measurables so Phase 1 users see centered dark cards with clear next steps instead of bare copy. Affected files: `app/(app)/dashboard.tsx`, `features/echo/components/EchoScreen.tsx`, `features/goals/components/GoalEchoEntriesPanel.tsx`, `features/goals/components/MeasurablesPanel.tsx`, `components/ui/EmptyStateCard.tsx`.
- Tightened Echo summarization success semantics in `app/api/echo/reflect+api.ts` so `summarized` now returns `true` only when the AI response parses into a valid reflection payload; malformed fallback responses keep `summarized: false`, which preserves the existing DB update gate in `features/echo/services/echo-service.ts` and leaves failed summary attempts unsummarized.
- Tightened Echo submission-state branching across `features/echo/services/echo-service.ts`, `features/echo/hooks/useEntries.ts`, and `features/echo/components/EchoScreen.tsx` so pre-persistence network failures resolve to `offline`, unknown pre-persistence failures resolve to `unconfirmed`, and post-persistence summarization failures continue resolving to `saved_without_summary` without relying on the screen-level catch-all message path.
- Hardened Echo draft persistence in `features/echo/components/EchoScreen.tsx` by flushing the latest scoped draft immediately before submit and during teardown/context switches, while keeping the existing 500ms debounce for normal typing so fast submits or navigation-away events do not drop the most recent unsaved text.
- Reset Echo composer inline submission feedback more explicitly in `features/echo/components/EchoScreen.tsx` so prior notices are cleared when a new submit attempt starts and after a later fully confirmed save, preventing stale offline/error messages from lingering into subsequent successful attempts while preserving same-attempt feedback.

### Added (2026-04-05)
- Implemented intelligence gating and one-insight surfacing. Added `lib/ai/isProfileSufficient.ts` (pure function: returns true when at least 2 of `interests`, `strengths`, `challenges`, `patterns` in `character_profile` JSONB are non-empty arrays). Added `lib/ai/prompts/intelligence.ts` with s ystem pr mpt (single sentence, max 120 chars, observational not motivational) and `buildIntelligencePrompt` helper. Added `lib/ai/pipelines/intelligence.ts` to call `callLLM` through the existing chokepoint and enforce the 120-char cap. Added `intelligence` pipeline entry to `lib/ai/config.ts` (`enabled: true`; gated at the feature level by `FEATURES.INTELLIGENCE_ENABLED`). Added `app/api/intelligence/index+api.ts` (`POST /api/intelligence`): authenticates via Bearer token, fetches `character_profile` from Supabase, checks sufficiency, generates insight if sufficient, returns `{ insight, sufficient }` — returns 503 when feature flag is off. Added `cachedInsight`, `insightFetched`, `insightLoading` fields and setters to `features/profile/store.ts` for per-session insight caching. Updated `app/(app)/dashboard.tsx`: removed hardcoded `isProfileSufficient() { return false }` stub; `IntelligenceZone` now accepts `insight` and `isLoading` props and renders the insight text, a loading skeleton, or the dormant "Keep reflecting in Echo" copy; a `useEffect` calls `POST /api/intelligence` once per session when `INTELLIGENCE_ENABLED` is true, caching the result in the profile store. Fails silently — any error leaves the zone in the dormant state. Constraint enforced: max 1 insight, no list, no "see more."

### Changed (2026-04-05)
- Completed `summarized` flag wiring in `features/echo/services/echo-service.ts`: added `summarized: true` to the DB update payload that runs after a successful AI reflection, closing the loop on the `echo_entries.summarized` column added in migration 011.

### Added (2026-04-05)
- Added post-finalization action capture turn to goal creation flow. After goal persistence, `app/goals/create.tsx` now appends a hardcoded action prompt ("What's one action you can take today to start moving on this?") as an assistant message, keeps the chat input active for one more user response, POSTs the response to `POST /api/actions` (with today's date as `due_date`), appends a confirmation ("Locked in. You'll see this on your dashboard."), then navigates to the goal detail page after a 1.5s delay. If the action POST fails, navigation still proceeds — the action is a bonus, not a gate. Affected files: `lib/ai/prompts/goal-creation.ts`, `app/goals/create.tsx`.
- Added `ACTION_CAPTURE_PROMPT` and `ACTION_CAPTURE_CONFIRMATION` exports to `lib/ai/prompts/goal-creation.ts` with inline documentation of the post-finalization turn rules.
- Added `supabase/migrations/010_action_logs.sql`: creates `action_logs` table with `goal_id` (CASCADE), `user_id` (CASCADE), `action_text`, `status` (pending/complete/skipped), `due_date`, `completed_at`, and `created_at`. Indexes on `(goal_id, created_at DESC)` and `(user_id, status)`. RLS policies for SELECT, INSERT, and UPDATE gated on `user_id = auth.uid()`.
- Added `features/actions/types.ts`: `ActionLogStatus` union type and `ActionLog` interface matching the DB schema.
- Added `app/api/actions/index+api.ts`: `GET /api/actions` (query params: `goal_id` required, `status` optional, `limit` optional default 10 max 100) and `POST /api/actions` (body: `goal_id`, `action_text`, `due_date?`). Both read `user_id` from server-side session only.
- Added `app/api/actions/[id]+api.ts`: `PATCH /api/actions/:id` (body: `status?`, `action_text?`). Setting `status = 'complete'` automatically sets `completed_at = now()`. Validated against `user_id` from session; returns 404 if not found or not owned.
- Added `features/actions/hooks/useLatestAction.ts` to fetch the latest pending action for a goal via `GET /api/actions?goal_id=...&status=pending&limit=1`, expose loading/error state, and provide an independent `mutate()` revalidation path for the goal detail Next Action UI.
- Added `features/actions/components/NextActionSection.tsx` to render the goal detail Next Action card with loading, retry, pending-action, and inline create states. The section supports optimistic `Complete` / `Skip` interactions with rollback on PATCH failure and uses post-success revalidation after both PATCH and POST flows. Affected files: `features/actions/components/NextActionSection.tsx`, `features/actions/hooks/useLatestAction.ts`.

### Changed
- Updated `app/goals/[id].tsx` to insert `NextActionSection` directly below `GoalDetailHeader`, above `MeasurablesPanel` (which sits above `ActivityFeed`). Screen order: `GoalDetailHeader → NextActionSection → MeasurablesPanel → ActivityFeed`. Keeps the new action UI isolated from measurables and Echo logic. Affected file: `app/goals/[id].tsx`.
- Kept next-action creation on the lowest-risk path by revalidating with `useLatestAction().mutate()` after a successful `POST /api/actions` instead of introducing optimistic insert state. Notable limitation: the client still sends `status: 'pending'` for clarity, but the existing backend already hardcodes pending on insert, so no API contract change was required.

### Changed (2026-04-05)
- Refactored `app/(app)/dashboard.tsx` into a 3-zone layout: (1) Active Goal + Next Action, (2) Echo, (3) Intelligence placeholder. Removed the projects/goals list view. Zone 1 picks the most recently updated `status === 'active'` goal from `useGoals()`, renders the goal title, and shows the pending action via `useLatestAction(goalId)` with inline Complete/Skip handlers (same PATCH pattern as `NextActionSection`). Zone 2 is gated by `FEATURES.ECHO_ENABLED`, calls `useEntries()` to pre-populate the echo store, and shows a "Reflect in Echo" CTA plus a preview of the latest entry (first 100 chars + relative date). Zone 3 always renders: shows dormant copy while `INTELLIGENCE_ENABLED === false` or `isProfileSufficient()` is false (stub, always returns false; TODO Block 6). Projects remain accessible via the header `+` action. `GoalGrid`, `ProjectCard`, and `useProjectStore` are no longer imported; all other screens unchanged.

### Refactored
- Lifted `useActivity` ownership into `app/goals/[id].tsx` and updated `features/goals/components/ActivityFeed.tsx` to accept typed activity props, removing the duplicate goal activity fetch while preserving the existing feed rendering behavior.

### Fixed (2026-04-05)
- Fixed Vercel crash: `Uncaught SyntaxError: Cannot use 'import.meta' outside a module`. Root cause: Metro resolves `zustand/middleware` to `node_modules/zustand/esm/middleware.mjs` (ESM build), which contains `import.meta.env?.MODE` — a Vite idiom that is not valid in Metro's non-module script output. Patched `esm/middleware.mjs` lines 62 and 124 to replace `(import.meta.env ? import.meta.env.MODE : void 0)` with `process.env.NODE_ENV`. Generated `patches/zustand+5.0.12.patch` via patch-package and added `"postinstall": "patch-package"` to `package.json` so the patch re-applies on every `npm install` and Vercel deploy. Bundle confirmed clean: no `import.meta` in `dist/` after rebuild. TSC passes with no errors.
- Added measurable completion flow across `app/api/goals/complete-measurable+api.ts`, `lib/db/goals.ts`, `features/goals/hooks/useGoalDetail.ts`, `features/goals/components/MeasurablesPanel.tsx`, and `features/goals/components/MeasurableCard.tsx` so tapping a milestone checkmark now logs completion, recalculates persisted goal progress, reorders completed rows after incomplete ones, and updates the goal detail UI optimistically.
- Replaced the Flow A / Flow B ambiguity detection model in `lib/ai/prompts/goal-creation.ts` with a three-stage SPARK → SHAPE → DRAFT conversation model. Stage 1 (Spark) always fires on the first message with domain-aware context and 1-3 questions — no draft. Stage 2 (Shape) proposes a lightweight goal frame for confirmation before committing to structure. Stage 3 (Draft) produces the full 6-section scaffold after frame confirmation. Updated Core behavior to align with the new stage model and remove conflicting draft-first defaults.

### Changed (2026-04-05)
- Added `FEATURE_DISABLED` to `AiErrorCode` in `lib/ai/contracts.ts` and `AI_ERROR_CODES` in `lib/ai/errors.ts`; intelligence 503 now uses typed code `FEATURE_DISABLED` instead of `UNKNOWN_ERROR`. Affected files: `lib/ai/contracts.ts`, `lib/ai/errors.ts`, `app/api/intelligence/index+api.ts`.
- Standardized AI response contracts across all AI-backed endpoints. Created `lib/ai/contracts.ts` as the single source of truth for `AiErrorCode`, `AiSuccessResponse<T>`, `AiErrorResponse`, and `AiResponse<T> = AiSuccessResponse<T> | AiErrorResponse`. Updated `lib/ai/errors.ts` to expand `AI_ERROR_CODES` to all six values (`RATE_LIMITED`, `UNAUTHORIZED`, `INVALID_INPUT`, `AI_PROVIDER_ERROR`, `PARSE_ERROR`, `UNKNOWN_ERROR`), import `AiErrorCode` from contracts, and remove the old flat `AIErrorResponse` interface. Updated `app/api/goals/create+api.ts`, `app/api/echo/reflect+api.ts`, and `app/api/intelligence/index+api.ts` to wrap every response in the `AiResponse<T>` envelope (`ok`, `data`, `error`), preserving all existing HTTP status codes. Updated `features/echo/services/echo-service.ts` to parse `AiResponse<ReflectPayload>` and check `body.ok` / `body.error.code` instead of matching raw `AIErrorResponse` fields. Updated `app/(app)/dashboard.tsx` to parse `AiResponse<IntelligenceData>` and check `body.ok` instead of HTTP status alone. Updated `app/goals/create.tsx` to parse `AiResponse<GoalCreateData>` and read `body.error.message` / `body.data` from the envelope. TSC passes with zero new errors. No business logic, prompt content, pipeline logic, or RLS behavior was changed.

### Changed (2026-04-05)
- Restored GoalGrid and ProjectCard to dashboard; 5-zone layout finalized. Zone order: (1) Active Goal + Next Action, (2) Projects, (3) All Goals, (4) Echo, (5) Intelligence. `useProjectStore`, `GoalGrid`, and `ProjectCard` re-imported. `GoalGrid` receives `standaloneGoals` (goals where `projectId === null`) and `newestId`. `ProjectCard` iterates `projects` from `useProjectStore`. Loading gate updated to `goalsLoading || projectsLoading`. All Block 5 zone logic (active goal, next action, echo, intelligence) unchanged.

### Added (2026-04-05)
- Added pipeline observability to callLLM chokepoint — structured JSON events emitted via console.log, captured by Vercel. Fields: pipeline, model, latency_ms, tokens, error_code, user_id, timestamp. Emits after rate limit check on every provider call (success and failure). Error code classified from thrown value; errors rethrown unchanged. No signature change — user_id already present in CallLLMParams. Affected file: lib/ai/client.ts only.

### Added (2026-04-05)
- Added pipeline observability to callLLM chokepoint — structured JSON events emitted via console.log, captured by Vercel. Fields: pipeline, model, latency_ms, tokens, error_code, user_id, timestamp. Emits after rate limit check on every provider call (success and failure). Error code classified from thrown value; errors rethrown unchanged. No signature change — user_id already present in CallLLMParams. Affected file: lib/ai/client.ts only.
- Added Echo reconciliation: `app/api/echo/reconcile+api.ts` (`POST /api/echo/reconcile`) queries all echo_entries where summarized = false AND ai_insight_requested = true for the authenticated user, re-runs summarization via callEchoReflection, updates summarized = true on each success, and updates profiles.last_summarized_at after the batch. Single-entry failures are caught and logged without aborting the batch. Returns { reconciled: N, failed: M }. Dashboard triggers a fire-and-forget POST on mount via useRef-guarded useEffect (no render blocking, no loading state). Affected files: app/api/echo/reconcile+api.ts (new), app/(app)/dashboard.tsx.

### Added (2026-04-06)
- Created `types/vault.ts`: `VaultItemType` union, `VaultItemMetadata` typed object (url, annotation, fileType, aiConfidence, confirmed, tags), `VaultItem` interface, `Vault` interface. Pure types, no logic, no side effects. Follows L3 type rules from `types/CLAUDE.md`.
- Created `types/space.ts`: `SpaceType` union (`personal | team | institutional | community`), `SpaceRole` union, `SpaceMember` interface, `Space` interface. Pure types, no logic, no side effects.
- Created `types/echo-link.ts`: `EchoLinkSource` union (`manual | ai_suggested | ai_auto`), `EchoGoalLink` interface mirroring the `echo_goal_links` many-to-many bridge table. Pure types, no logic, no side effects.

### Changed (2026-04-06)
- Extended `types/activity.ts` `ActivityItem` discriminated union with three new variants (on `kind` field). All new variants share the required `id` and `timestamp` base fields per union contract. No existing variant shapes modified.
- Applied narrowing fix in `features/goals/components/ActivityFeed.tsx`: exhaustive switch on `kind` is now type-safe against the full `ActivityItem` union; previously unhandled variants no longer produce implicit `any` or dead-branch type errors. TSC clean after change.

## Block 0.1 — Duplicate auth callback fix (2026-06-19)

### Audited
- Compared `app/(auth)/callback.tsx` and `app/auth/callback.tsx`, traced `/callback` and `/auth/callback` references, and confirmed signup was hardcoded to `https://oharaai.vercel.app/auth/callback` while repo context still flagged `/auth/callback` as the broken path.

### Changed
- Updated `app/(auth)/signup.tsx` to send Supabase email confirmations to `https://oharaai.vercel.app/callback`, matching the auth route-group callback path exposed by Expo Router.
- Unified callback handling in `app/(auth)/callback.tsx` by normalizing the `code` param, exchanging PKCE codes, and verifying the resulting session before routing to dashboard or login.

### Fixed
- Removed the duplicate literal route `app/auth/callback.tsx` so the app now has a single callback implementation and a single public callback URL.

### Verification
- Verified route references with repo-wide search before edits.
- Manual verification still required for the live Supabase email-confirmation round-trip.

### Manual Test Required
- Create a test account from the signup screen, open the confirmation email, confirm the browser lands on `/callback`, and verify the user is routed to the expected post-auth screen without a 404.

### Risks
- If Supabase dashboard redirect URL allowlists still only include `https://oharaai.vercel.app/auth/callback`, they must be updated to include `https://oharaai.vercel.app/callback` for email confirmation to succeed in production.
