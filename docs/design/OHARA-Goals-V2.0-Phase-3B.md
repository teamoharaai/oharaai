# OHARA Goals V2.0 — Phase 3B

Local review build, October 21, 2026. Worktree: `/private/tmp/ohara-workspace-v2`, branch `codex/workspace-design-system-v2-phase1`, base HEAD `d286285dccd13cee607cd706fa56df589562e357`. Nothing committed, pushed, merged, deployed, or applied to production. Stop before Phase 3C.

## Final review decisions

- Goals opens a dedicated library. Opening a Goal uses Overview, Tasks, Milestones, and Vault.
- The redundant header Vault/Overview button is removed only from the new tabbed web presentation. Manage Goal remains available, including inside Vault; Add to Vault remains a distinct creation action.
- **No Goal Progress card.** The October 21 user review supersedes the original suggestion to feature an outcome percentage. Library rows show completed/total top-level milestones, not a potentially stale stored percentage.
- Reflections is the visible term. Existing `/journal` routes, DTOs, identifiers, storage, and compatibility readers remain unchanged.

## What the old Goal Progress number actually measures

It is the stored `goals.progress` field, not an automatic percentage derived from Tasks and Milestones. The schema defaults it to zero (`001_core_schema_and_rls.sql`); `mapGoal` reads it unchanged (`goal-service.ts`); explicit Goal completion sets it to 100 (`useGoalDetail.ts`). Task occurrence and Milestone completion paths do not recompute this field. There is no newly introduced calculation in Phase 3B.

Consequently, displaying it as a prominent outcome metric would imply more reliability than the current data contract supports. New library rows instead display an explicitly labeled count such as “2 of 5 milestones reached.” Adding a top-level milestone increases the total; completing one increases the reached count. Sub-milestone evidence does not become another top-level milestone. Tasks retain their own occurrence/quantity completion display.

Goal Momentum is separate. Its existing V1.1 engine uses completion consistency, progress evidence/milestones/pace, reflection, and initiative. Its Progress pillar is **not** the stored Goal percentage. The deadline display remains elapsed time / time remaining, not completion. No formulas, weights, historical snapshots, or stored percentages were changed. Older Project/native percentage presentations are outside this scoped web redesign and remain a follow-up product decision.

## Architecture and navigation

`app/(app)/goals/index.tsx` resolves `GoalsExperience` by platform. Web gets the new `GoalsExperience.web.tsx`; native reexports the original `GoalsWorkspace`.

- `/goals`: owned library plus existing authorized Shared Goals preview.
- `/goals?goal=<id>`: exact Goal detail, Overview by default.
- `/goals?goal=<id>&view=tasks|milestones|vault`: contextual sections with browser history.
- Existing `selected`, `taskId`, and `projectId` deep-link parameters remain supported. Task links default to Tasks; the originating Project breadcrumb remains available.
- Detail resolves the requested Goal before mounting mutation hooks. Failed/unavailable IDs show an error and retry rather than silently selecting another Goal.

The library requests all supported lifecycle states through an opt-in `status: 'all'` in the existing read service. Other callers retain their active-only default. Active, Completed, Historical, Paused (`stagnant`), Expired, Archived, and All filters are available. Historical includes completed/expired/archived records; All also includes draft/discovered records. Superseded Goals retain existing predecessor/successor presentation and guards.

Search covers title, description, category and loaded Project title. Additional filters distinguish category and personal/Project association. Rows preserve category color with a textual category, ownership label, lifecycle, optional Project, deadline, milestone count and next milestone. Search misses, empty library, no active Goals, loading and failure have different states.

## Detail presentation and component reuse

- Subtle themed contextual header, serif Goal title, functional metadata, preserved deadline and lifecycle controls. Mobile stacks title and actions to prevent narrow word-by-word wrapping.
- Overview: canonical compact Tasks, next milestone, Vault shortcut; secondary column with existing Goal Momentum, deterministic Echo insight and Recent Activity. Activity/history disclosure keeps deeper analytics available without dominating the Overview.
- Tasks: the same `TasksPanel`, full view. Recurrence, schedules, timezone, occurrences, binary/quantity completion, assignments, milestone associations, history and idempotency remain in the existing services.
- Milestones: the same `MilestonesPanel`, callbacks and lifecycle guards. Hierarchy, explicit completion, evidence, photo attachments and management remain intact.
- Native retains original workspace routing and presentation. Shared copy changes say Reflections; no desktop library is injected into native navigation.
- Shared Phase 1 primitives: `AuthenticatedPageShell`, workspace dimensions, `Card`, `Button`, `Typography`, official brand marks and theme tokens. No new framework or package.

## Vault and loading

Vault remains the existing parent-neutral `VaultWorkspace`/`GoalVault`: All, Notes, Reflections, Sources. Entries are canonical records; Sources remain canonical Vault items, with existing privacy and creator controls. Linking is described as organization, not sharing.

The new web detail fetches Entries only when Vault opens. Results are filtered to the exact Goal and deduplicated by canonical Entry ID. Library and Overview issue **zero Entry-library reads** in the synthetic browser check; first Vault entry issues one. The existing endpoint still returns the full authorized Entry library—this is lazy loading, not a new scoped server API or global cache. Returning to Vault may refetch; no cross-user cache is introduced.

Loading and failed linked-content reads are distinct from an empty Vault. Retry is available even when only Reflections is selected. Source failure does not display a contradictory empty state. Existing Add Note/Reflection/Source and open-content flows remain; existing content linking/folder management stays in the canonical editors/libraries rather than adding a second picker/library. Project aggregation is unchanged.

## Lifecycle and security

The existing lifecycle operations and server authorization remain authoritative. This is not a new active/inactive permission rule. Manage Goal, Pause/Resume, Complete, Archive, deadline editing, extension, atomic New Phase, Project reassignment and historical access reuse the original components/services. No client-side duplication of Tasks, Milestones, occurrences or successor records.

No API routes, schemas, RLS, service-role access, scoring code, authentication, generic API clients or global caching infrastructure were changed. Browser fixtures demonstrate presentation and callback behavior, not production RLS. Existing Entry/security, Project/security, Task boundary and Momentum suites provide regression coverage; no production content was read or mutated.

## Accessibility and responsive review

- Section navigation uses ordinary buttons with `aria-pressed`, not incomplete semantic tabs. Keyboard activation and focus on the newly focused route are browser-tested, including history navigation.
- Library rows remain real links, preserving modifier/new-tab behavior. Explicit labels and text accompany category colors.
- Core light/dark text/control contrast is covered by foundation tests. New section and Vault filters have 44px minimum targets. Legacy embedded Task/Milestone controls are preserved; this is not a claim of a full WCAG conformance audit of all inherited controls.
- Width checks: 320, 390, 768, 1024, 1100, 1280 and desktop 1440. Available workspace width accounts for the sidebar. Title width and horizontal overflow are asserted.
- Light/dark desktop and mobile screenshots use synthetic intercepted data at browser scale 1. Dark initial loading is checked separately. Physical iOS and assistive-technology device testing remain outstanding.

## Files

New: `features/goals/components/GoalsExperience.web.tsx`, native `GoalsExperience.tsx`; `tests/workspace-v2/goals.spec.ts`, `goals.test.ts`; this document and `docs/ui-checkpoints/goals-v2/`.

Goals implementation: route index, `GoalsWorkspace.tsx`, `GoalDetailHeader.tsx`, `GoalVault.tsx`, `useGoals.ts`, `goal-service.ts`.

Terminology-only adjustments: workspace navigation, `AppNavigation`, `GlobalCreateControl`; Entries/Reflections/Note editors and creation/read views; Goal/Project management and activity labels; Source composer; Circles presentation; Home entry-point copy. No structural Home/Projects redesign or landing/auth changes were made for Phase 3B. Existing terminology assertions in Entries, Projects, prelaunch and workspace tests were updated, not removed.

Supporting: workspace test fixtures/config, `CHANGELOGCODEX.md`, workspace design/rollout documents. The worktree also contains pre-existing landing/auth, Phase 1 and Phase 2 changes; `git diff HEAD` is not a Phase-3B-only diff.

## Validation

- Goals domain/lifecycle/HTTP/manual-creation tests: 89 passed.
- Workspace foundation/Home/Goals unit checks: 10 passed.
- Entries including shared-entry/security regressions: 89 passed; Tasks: 86; Projects/security: 52; Momentum: 74; Sources: 11; Calendar: 10; prelaunch: 15; Auth: 8; Friends: 13. All passed.
- Final full browser regression: **19 passed**, covering six Goals scenarios plus Home, workspace, public landing and auth. Includes canonical Task/Milestone completion, Resume, expired Extend/New Phase entry points, unavailable deep links, dark initial loading, a genuinely empty library, Project navigation, keyboard section controls, browser Back/Forward, mobile widths and lazy Entry reads. Initial failures exposed outdated copy assertions and a Project link name contaminated by its icon glyph; expectations were updated to approved terminology and the link now has an explicit accessible name.
- Web production export succeeded at `/tmp/ohara-goals-v2-web`; iOS JavaScript export succeeded at `/tmp/ohara-goals-v2-ios`. These are local build outputs, not deployments.
- TypeScript: only the previously known `lib/goals/manual-create-v1.test.ts(6,41)` TS2769 URL type mismatch. No newly introduced diagnostics. `git diff --check` passes.
- No database migration was added, and no database/production mutation suite was run in this UI-only phase. Physical iOS/simulator testing is not claimed; the host reports unavailable `simctl`.

## Screenshots

All files under `docs/ui-checkpoints/goals-v2/`, at 100% zoom:

- `library-light.png`, `library-dark.png`
- `overview-light.png`, `overview-dark.png`
- `tasks.png`, `milestones.png`, `vault.png`
- `overview-mobile.png`

## Recovery and outstanding risks

The temporary worktree lost its `.git` pointer, 950 tracked files and several untracked foundation files during the interrupted session. After explicit user approval, only missing tracked files were restored from the verified worktree HEAD; surviving edits were preserved. Missing foundation source files were recovered from this chat's original patches, and dependencies reinstalled from the unchanged lockfile. Main checkout and unrelated branches were not changed. Not all older untracked binary screenshots were recoverable; the current Goals checkpoints were regenerated.

The unchanged dependency lock reported 87 audit findings during reinstall. No dependency upgrade or automatic audit fix was attempted. Existing require-cycle warnings remain. The stored Goal percentage and date-only formatting in legacy controls remain product/technical follow-ups, not silently rewritten in this UI phase.

## Phase 3C recommendation

After review approval, reuse the library/detail separation and contextual header for Projects (Overview / Goals / Vault), retaining Project independence and existing optional Goal association. Keep Project Vault aggregation, deduplicated counts and origin labels for Phase 3D. Resolve whether legacy Goal percentages should be retired on Project/native surfaces before promoting them in another redesign. Do not change Momentum semantics to substitute for outcome completion.
