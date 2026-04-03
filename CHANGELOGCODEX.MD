# Ohara Codex Changelog

## [Unreleased]

### Added
- Documented `POST /api/goals/create` AI goal creation endpoint in `docs/API_CONTRACT.md`, including full `GoalFinalizeResponse` payload shape (`goal`, `measurables`, `reasoning`, `assumptions`). Affected file: `docs/API_CONTRACT.md`.

### Changed
- Updated goal `status` enum throughout `docs/API_CONTRACT.md` — replaced `paused / completed / archived` with canonical DB values `complete / stagnant / discovered` (matches `GOAL_DB_STATUSES` in `lib/goals/schema.ts`). Affected file: `docs/API_CONTRACT.md`.
- Added `smartData` as a required field in `GET /api/v1/goals` list response and `GET /api/v1/goals/:id` hydrated response in `docs/API_CONTRACT.md`.
- Renamed Starlog fields in all request/response shapes in `docs/API_CONTRACT.md`: `rawText → content`, `aiOptedIn → aiInsightRequested` (aligns with migration 005 column renames). Affected file: `docs/API_CONTRACT.md`.
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
- Added a dedicated Starlog reflection prompt in `lib/ai/prompts/starlog-reflection.ts` and a separate Haiku-backed Starlog client in `lib/ai/starlog-client.ts` so Starlog reflections now use an isolated AI path instead of the goal-creation client.

### Changed
- Added `getEntriesByGoalId(goalId)` to `features/starlog/services/starlog-service.ts` and surfaced linked Starlog entry previews on the goal detail screen via `features/goals/hooks/useGoalDetail.ts`, `app/goals/[id].tsx`, and `features/goals/components/GoalStarlogEntriesPanel.tsx` so goals now show their related reflections directly below measurables.
- Replaced hardcoded fallback Supabase client credentials in `lib/db/client.ts` with required environment validation so the app no longer initializes against placeholder values when `EXPO_PUBLIC_SUPABASE_URL` or `EXPO_PUBLIC_SUPABASE_ANON_KEY` are missing.
- Set `STARLOG_ENABLED` to `true` in `constants/features.ts` for Phase 1 shipping, while keeping `DISCOVERY_ENABLED` `false`, and wired `app/(app)/_layout.tsx` so the Starlog and Explore tabs now render only when their respective flags are enabled.
- Wired Starlog entry creation through a new `app/api/starlog/reflect+api.ts` backend path and updated `features/starlog/services/starlog-service.ts` to request and persist a concise Starlog reflection only when `aiInsightRequested` is true, with `processed_at` set after a successful response.
- Replaced the dashboard, goal detail, and Starlog bare loading text with dark-theme NativeWind pulse skeletons, and updated the relevant CTAs to match the Phase 1 teal accent. Affected files: `app/(app)/dashboard.tsx`, `app/goals/[id].tsx`, `features/starlog/components/StarlogScreen.tsx`, `features/goals/components/NewGoalButton.tsx`, `components/ui/EmptyStateCard.tsx`.

### Fixed
- Added a subtle empty state for goal-linked Starlog content on the detail screen: `No Starlog entries yet.` This keeps the section informative when a goal has no related entries.
- Added `supabase/migrations/006_rls_audit_fixes.sql` to make RLS CRUD coverage explicit for `measurables`, `measurable_logs`, `profiles`, and `ai_usage`, closing gaps where policies relied on `FOR ALL` without `WITH CHECK` or omitted explicit deny coverage for blocked operations.
- Added `supabase/migrations/007_remove_public_goals_policy.sql` to remove the Phase 2 public-goals select policy from `public.goals` without changing any other goals RLS policies.
- Standardized empty-state treatment across Dashboard, Starlog, goal-linked Starlog entries, and goal measurables so Phase 1 users see centered dark cards with clear next steps instead of bare copy. Affected files: `app/(app)/dashboard.tsx`, `features/starlog/components/StarlogScreen.tsx`, `features/goals/components/GoalStarlogEntriesPanel.tsx`, `features/goals/components/MeasurablesPanel.tsx`, `components/ui/EmptyStateCard.tsx`.

### Refactored
- Replaced the Flow A / Flow B ambiguity detection model in `lib/ai/prompts/goal-creation.ts` with a three-stage SPARK → SHAPE → DRAFT conversation model. Stage 1 (Spark) always fires on the first message with domain-aware context and 1-3 questions — no draft. Stage 2 (Shape) proposes a lightweight goal frame for confirmation before committing to structure. Stage 3 (Draft) produces the full 6-section scaffold after frame confirmation. Updated Core behavior to align with the new stage model and remove conflicting draft-first defaults.
