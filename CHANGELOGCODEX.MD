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

### Refactored
- Aligned structured draft detection in `evals/goal-creation/run.mjs` with the new draft-stage headings so local evals recognize the updated prompt shape.
- Updated `evals/goal-creation/scoring-rubric.md` to document the new draft-stage draft signals used by the goal-creation eval harness.
- Removed duplicate and dead goal payload validation/types from `app/api/goals/create+api.ts`, normalized `assumptions` to `string[]` in `lib/ai/schemas/goal-creation.ts`, and tightened frontend hydration in `features/goals/services/goal-service.ts` to normalize DB numerics/dates/statuses instead of relying on unsafe casts.
- Aligned frontend goal/measurable models and mock data with the persisted schema in `features/goals/types.ts`, `features/goals/services/mock-data.ts`, and `features/goals/components/GoalDetailHeader.tsx`, including support for hydrated `smartData`.

# CHANGELOGCODEX.md

## [Unreleased]

### Added

### Changed
- Added `getEntriesByGoalId(goalId)` to `features/starlog/services/starlog-service.ts` and surfaced linked Starlog entry previews on the goal detail screen via `features/goals/hooks/useGoalDetail.ts`, `app/goals/[id].tsx`, and `features/goals/components/GoalStarlogEntriesPanel.tsx` so goals now show their related reflections directly below measurables.

### Fixed
- Added a subtle empty state for goal-linked Starlog content on the detail screen: `No Starlog entries yet.` This keeps the section informative when a goal has no related entries.

### Refactored
