# Ohara Codex Changelog

## [Unreleased]

### Added
- Documented `POST /api/goals/create` AI goal creation endpoint in `docs/API_CONTRACT.md`, including full `GoalFinalizeResponse` payload shape (`goal`, `measurables`, `reasoning`, `assumptions`). Affected file: `docs/API_CONTRACT.md`.

### Changed
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

### Added (2026-04-05)
- Added `supabase/migrations/010_action_logs.sql`: creates `action_logs` table with `goal_id` (CASCADE), `user_id` (CASCADE), `action_text`, `status` (pending/complete/skipped), `due_date`, `completed_at`, and `created_at`. Indexes on `(goal_id, created_at DESC)` and `(user_id, status)`. RLS policies for SELECT, INSERT, and UPDATE gated on `user_id = auth.uid()`.
- Added `features/actions/types.ts`: `ActionLogStatus` union type and `ActionLog` interface matching the DB schema.
- Added `app/api/actions/index+api.ts`: `GET /api/actions` (query params: `goal_id` required, `status` optional, `limit` optional default 10 max 100) and `POST /api/actions` (body: `goal_id`, `action_text`, `due_date?`). Both read `user_id` from server-side session only.
- Added `app/api/actions/[id]+api.ts`: `PATCH /api/actions/:id` (body: `status?`, `action_text?`). Setting `status = 'complete'` automatically sets `completed_at = now()`. Validated against `user_id` from session; returns 404 if not found or not owned.

### Refactored
- Lifted `useActivity` ownership into `app/goals/[id].tsx` and updated `features/goals/components/ActivityFeed.tsx` to accept typed activity props, removing the duplicate goal activity fetch while preserving the existing feed rendering behavior.
- Added measurable completion flow across `app/api/goals/complete-measurable+api.ts`, `lib/db/goals.ts`, `features/goals/hooks/useGoalDetail.ts`, `features/goals/components/MeasurablesPanel.tsx`, and `features/goals/components/MeasurableCard.tsx` so tapping a milestone checkmark now logs completion, recalculates persisted goal progress, reorders completed rows after incomplete ones, and updates the goal detail UI optimistically.
- Replaced the Flow A / Flow B ambiguity detection model in `lib/ai/prompts/goal-creation.ts` with a three-stage SPARK → SHAPE → DRAFT conversation model. Stage 1 (Spark) always fires on the first message with domain-aware context and 1-3 questions — no draft. Stage 2 (Shape) proposes a lightweight goal frame for confirmation before committing to structure. Stage 3 (Draft) produces the full 6-section scaffold after frame confirmation. Updated Core behavior to align with the new stage model and remove conflicting draft-first defaults.
