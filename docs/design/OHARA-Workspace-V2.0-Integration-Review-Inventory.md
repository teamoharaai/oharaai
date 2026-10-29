# Phase 4D — Exact review inventory and commit boundaries

October 26, 2026. Relative to team main `b939327dfd70f44c650992e3c0337c8798a297d8`. **137 paths; no staging or commits.** This appendix is a proposed explicit allowlist. Do not use directory-wide staging from this table. Full byte hashes live in the recovery manifest; documents added during 4D are included in the final checkpoint.

A = validation foundations; B = complete landing/Workspace implementation and matching tests; C = approved security remediation; D = CI/release documentation. Whole-file assignments mean the complete candidate delta/new file, not unrelated existing base contents.

## Shared-file hunk boundaries

- `tests/notes/library.spec.ts`: **A** only import substitution at current line 3, evidence directory substitutions at lines 5–6 and capture path at line 182. **C** only the two complete tests beginning “Note clipboard preserves formatting and serializes without executable markup” and “ProseMirror paste runs schema validators on clipboard slice-context attributes” (current lines 185–258). The diff coalesces the capture line and appended tests; split by syntax/test boundaries, preserving the original preceding test's closing brace. Do not assign the appended security tests to A.
- `tests/journal/library.spec.ts`: **A** only evidence helper import/directory replacements (current lines 3 and 5). **B** all Reflections label/role/text expectation hunks (beginning current line 68 onward). Never apply renamed assertions before the corresponding runtime copy in B.
- `CHANGELOGCODEX.md`: **A** Roots pin/heading resolution, Node URL type-test correction, and capture-only helper notes; **B** landing/auth plus Workspace foundation/Home/Goals/Projects/Vault/runtime-hardening and matched test notes; **C** the complete “Fixed — Workspace V2.0 Phase 4C dependency security (local)” section; **D** readiness/preflight/rehearsal/documentation/CI notes. Entries that currently combine implementation and reporting must be split conservatively by bullet/sentence, preserving every approved fact. This is an editorial commit-assembly instruction, not an authorization to rewrite the file now.
- `docs/constellation/REFERENCE_CONCEPTS.md` is A, not D: pinned-history setup is necessary alongside the corrected Roots test.
- `lib/goals/manual-create-v1.test.ts` is A: only the explicit Node URL import; no runtime Goal logic.
- `tests/helpers/visual-evidence.ts` and its unit test are A; all new Workspace/landing spec files importing the helper follow in B.
- `package-lock.json` is entirely C: 25 locations / 18 package names. `package.json` and existing patches have no delta and must not be staged.
- `scripts/db-chain/run.sh`, new Vault suite and SQL assertions are B together; these are local harness changes, not migrations.
- `.github/workflows/workspace-validation.yml` is D but has two unresolved CI findings in the review report. No misleading “CI-ready” commit description or security bypass.
- All remaining paths are whole-delta assignments below. No arbitrary split of shared Workspace context, consumers, canonical Vault service or Goal/Project interfaces: B must compile as one coherent set.

The complete candidate passed the final regression matrix; proposed intermediate commits have **not** been constructed or validated. On separate authorization, typecheck and test each assembled boundary, then run the full final matrix. Existing Roots snapshots remain unchanged. The landing prerequisite is already included once in B.

## Complete path assignment

| Group | Repository-relative path |
| --- | --- |
| D | `.github/workflows/workspace-validation.yml` |
| A/B/C/D | `CHANGELOGCODEX.md` |
| B | `app/(app)/_layout.tsx` |
| B | `app/(app)/dashboard.tsx` |
| B | `app/(app)/goals/[id]/vault.web.tsx` |
| B | `app/(app)/goals/index.tsx` |
| B | `app/(app)/momentum.tsx` |
| B | `app/(app)/projects/[id].tsx` |
| B | `app/(app)/projects/index.tsx` |
| B | `app/(auth)/login.tsx` |
| B | `app/(auth)/signup.tsx` |
| B | `components/landing/LandingPage.tsx` |
| B | `components/landing/LandingPage.web.tsx` |
| B | `components/landing/PublicAuthShell.tsx` |
| B | `components/landing/PublicAuthShell.web.tsx` |
| B | `components/landing/landing-v2.css` |
| B | `components/landing/public-auth-v2.css` |
| B | `components/layout/AppNavigation.tsx` |
| B | `components/layout/AuthenticatedPageShell.tsx` |
| B | `components/layout/FeaturePageHeader.tsx` |
| B | `components/layout/GlobalCreateControl.tsx` |
| B | `components/layout/Screen.tsx` |
| B | `components/layout/WorkspaceContext.tsx` |
| B | `components/layout/WorkspaceShell.tsx` |
| B | `components/layout/WorkspaceShell.web.tsx` |
| B | `components/layout/workspace-navigation.ts` |
| B | `components/layout/workspace-v2.css` |
| B | `components/ui/Button.tsx` |
| B | `components/ui/Card.tsx` |
| B | `components/ui/Input.tsx` |
| B | `components/ui/Modal.tsx` |
| B | `components/ui/Typography.tsx` |
| B | `constants/workspace.ts` |
| A | `docs/constellation/REFERENCE_CONCEPTS.md` |
| D | `docs/design/OHARA-Goals-V2.0-Phase-3B.md` |
| D | `docs/design/OHARA-Home-V2.0-Phase-2.md` |
| D | `docs/design/OHARA-Landing-Page-V2.0-Specification.md` |
| D | `docs/design/OHARA-Projects-V2.0-Phase-3C.md` |
| D | `docs/design/OHARA-Vault-V2.0-Phase-3D.md` |
| D | `docs/design/OHARA-Workspace-Design-System-V2.0.md` |
| D | `docs/design/OHARA-Workspace-V2.0-Change-Inventory.md` |
| D | `docs/design/OHARA-Workspace-V2.0-Dependency-Security-Review.md` |
| D | `docs/design/OHARA-Workspace-V2.0-Final-Readiness.md` |
| D | `docs/design/OHARA-Workspace-V2.0-Integration-Plan.md` |
| D | `docs/design/OHARA-Workspace-V2.0-Integration-Rehearsal.md` |
| D | `docs/design/OHARA-Workspace-V2.0-Integration-Review-Inventory.md` |
| D | `docs/design/OHARA-Workspace-V2.0-Integration-Review.md` |
| D | `docs/design/OHARA-Workspace-V2.0-Phase-3E-Readiness.md` |
| D | `docs/design/OHARA-Workspace-V2.0-Rollout.md` |
| D | `docs/design/security/OHARA-Phase4C-Advisory-Inventory.json` |
| D | `docs/design/security/OHARA-Phase4C-Advisory-Inventory.md` |
| D | `docs/ui-checkpoints/goals-v2/README.md` |
| D | `docs/ui-checkpoints/projects-v2/README.md` |
| D | `docs/ui-checkpoints/readiness-v2/README.md` |
| D | `docs/ui-checkpoints/vault-v2/README.md` |
| B | `features/calendar/components/CalendarItemRow.tsx` |
| B | `features/calendar/components/CalendarScreen.tsx` |
| B | `features/calendar/components/HomeCalendarPreview.tsx` |
| B | `features/circles/components/CirclesPane.tsx` |
| B | `features/circles/components/CirclesScreen.tsx` |
| B | `features/circles/components/FeedPostCard.tsx` |
| B | `features/circles/components/PostComposer.tsx` |
| B | `features/circles/components/SavedPostsPane.tsx` |
| A | `features/constellation/fixture-boundary.test.ts` |
| B | `features/entries/components/CompletedReflection.tsx` |
| B | `features/entries/components/EchoCreationModal.tsx` |
| B | `features/entries/components/EchoNewMenu.tsx` |
| B | `features/entries/components/EntriesLibrary.tsx` |
| B | `features/entries/components/EntriesScreen.tsx` |
| B | `features/entries/components/NoteEditor.tsx` |
| B | `features/entries/components/NotesLibraryScreen.tsx` |
| B | `features/entries/components/QuickReflectionEditor.tsx` |
| B | `features/entries/components/ReflectionsScreen.tsx` |
| B | `features/entries/components/SharedEntryReadView.tsx` |
| B | `features/entries/context-vault.test.ts` |
| B | `features/entries/echo-v1-ui.test.ts` |
| B | `features/entries/journal-prelaunch-ui.test.ts` |
| B | `features/entries/product-structure-ui.test.ts` |
| B | `features/entries/services/context-vault.ts` |
| B | `features/friends/components/FriendsPopover.tsx` |
| B | `features/goals/components/GoalDetailHeader.tsx` |
| B | `features/goals/components/GoalVault.tsx` |
| B | `features/goals/components/GoalsExperience.tsx` |
| B | `features/goals/components/GoalsExperience.web.tsx` |
| B | `features/goals/components/GoalsWorkspace.tsx` |
| B | `features/goals/components/ManageGoalControl.tsx` |
| B | `features/goals/components/RecentActivityPanel.tsx` |
| B | `features/goals/components/VaultItemCard.tsx` |
| B | `features/goals/components/home/HomeEchoEntryPoints.tsx` |
| B | `features/goals/components/home/NextStepPanel.tsx` |
| B | `features/goals/hooks/useActivity.ts` |
| B | `features/goals/hooks/useGoals.ts` |
| B | `features/goals/hooks/useVault.ts` |
| B | `features/goals/services/goal-service.ts` |
| B | `features/goals/vault-request-race.test.ts` |
| B | `features/intelligence/contextual-insights.test.ts` |
| B | `features/intelligence/contextual-insights.ts` |
| B | `features/momentum/components/HomeMomentumSnapshot.tsx` |
| B | `features/projects/components/CreateProjectModal.tsx` |
| B | `features/projects/components/ManageProjectModal.tsx` |
| B | `features/projects/components/ProjectCard.tsx` |
| B | `features/projects/components/ProjectChat.tsx` |
| B | `features/projects/components/ProjectGoalsPanel.tsx` |
| B | `features/projects/components/ProjectVaultWorkspace.tsx` |
| B | `features/projects/hooks/useProjectVault.ts` |
| B | `features/projects/intelligence.test.ts` |
| B | `features/projects/services/project-service.ts` |
| B | `features/projects/ui.test.ts` |
| B | `features/sources/components/SourceComposer.tsx` |
| A | `lib/goals/manual-create-v1.test.ts` |
| C | `package-lock.json` |
| B | `scripts/db-chain/run.sh` |
| B | `scripts/db-chain/suites/vault-context.sh` |
| B | `scripts/vault-context-security.test.sql` |
| B | `store/uiStore.ts` |
| A | `tests/constellation/constellation.acceptance.spec.ts` |
| C | `tests/helpers/dependency-security.test.ts` |
| A | `tests/helpers/visual-evidence.test.ts` |
| A | `tests/helpers/visual-evidence.ts` |
| A/B | `tests/journal/library.spec.ts` |
| B | `tests/landing-v2/landing.spec.ts` |
| B | `tests/landing-v2/playwright.config.ts` |
| A/C | `tests/notes/library.spec.ts` |
| B | `tests/prelaunch/prelaunch-source.test.ts` |
| B | `tests/workspace-v2/fixtures.ts` |
| B | `tests/workspace-v2/foundation.test.ts` |
| B | `tests/workspace-v2/goals.spec.ts` |
| B | `tests/workspace-v2/goals.test.ts` |
| B | `tests/workspace-v2/home.spec.ts` |
| B | `tests/workspace-v2/home.test.ts` |
| B | `tests/workspace-v2/playwright.config.ts` |
| B | `tests/workspace-v2/project-fixtures.ts` |
| B | `tests/workspace-v2/projects.spec.ts` |
| B | `tests/workspace-v2/projects.test.ts` |
| B | `tests/workspace-v2/readiness.spec.ts` |
| B | `tests/workspace-v2/vault.spec.ts` |
| B | `tests/workspace-v2/workspace.spec.ts` |

## Explicit exclusions

Do not include `.expo/types/router.d.ts`, captured PNG evidence, test-results, exports, caches, node_modules, local backup scripts/logs, environment files/credentials or unrelated files from another checkout. No new migration, EventKit branch content or Tracker archive is part of this list. Preserve exclusions in their current locations/backups rather than deleting them.

## Review and recovery references

- Main report: [Integration review](OHARA-Workspace-V2.0-Integration-Review.md).
- Security package/advisory detail: [Phase 4C inventory](security/OHARA-Phase4C-Advisory-Inventory.md).
- Pre-change 135-path byte manifest: `/Users/arthursilva/Desktop/OharaBackup/OHARA-Workspace-V2-Phase4D-Start-2026-10-26/file-sha256.json`.
- Final 137-path package: `/Users/arthursilva/Desktop/OharaBackup/OHARA-Workspace-V2-Phase4D-Review-2026-10-26`. Verify its checksums and restore into a new directory; never apply multiple accumulated phase patches together.
