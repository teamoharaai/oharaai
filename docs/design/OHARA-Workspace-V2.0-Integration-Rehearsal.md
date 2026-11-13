# OHARA Workspace V2.0 — Phase 4B Integration Rehearsal

October 23, 2026. **Local, detached candidate only. Nothing staged, committed, pushed, merged or deployed.**

## 1. Candidate and baseline

- Rehearsal: `/private/tmp/ohara-workspace-v2-rehearsal`.
- Detached HEAD / fetched team-main base: `b939327dfd70f44c650992e3c0337c8798a297d8`.
- Source preserved: `/private/tmp/ohara-workspace-v2`, branch `codex/workspace-design-system-v2-phase1`, HEAD `d286285dccd13cee607cd706fa56df589562e357`.
- Trusted remote: `upstream` → `https://github.com/teamoharaai/oharaai.git`.
- Incoming main commits since Phase 4A: **zero**. All remote branch tips match the Phase 4A table; no new teammate file or hunk overlap required resolution.
- Original 13-file backup checksum manifest verified. All 210 source-candidate file hashes matched the Phase 4A backup before assembly. No original files or backups were deleted, reset or overwritten.

The separate worktree was created at the exact main SHA without creating a branch/commit. It is not a team integration branch or a deployment artifact. The team destination, review policy and eventual release approval remain separate decisions.

## 2. Assembly and applied inventory

Recovery material: `/Users/arthursilva/Desktop/OharaBackup/OHARA-Workspace-V2-Phase4A-2026-10-23`.

Applied `current/landing-base.patch` **once**, followed by `current/tracked.patch`, with `git apply --check` before each application. Excluded all checkpoint PNG changes and `.expo/types/router.d.ts`. Extracted only non-PNG untracked files from the verified archive. No full-source-tree copy, cherry-pick, staging or merge occurred.

**125 approved source/test/document paths** were reconstructed and SHA-256 checked against the original manifest. **85 paths excluded:** 84 capture-only PNGs plus one generated route declaration. Existing upstream assets and assertion baselines remain present and unchanged. Unapproved evidence remains recoverable in the original worktree and durable backup.

The final review candidate additionally includes the Phase 4B CI proposal, capture-output helper and its two tests, this report, and a newly modified existing Notes browser spec. Existing candidate browser specs/changelog were adjusted for that infrastructure only. The exact path inventory is appended below. No runtime application code was changed beyond the approved Phase 4A candidate.

### Retained implementation areas

| Group | Included behavior / dependencies |
| --- | --- |
| Landing/auth | Final approved gradients, white palette, brand/copy, editorial layout, aligned account fields; same auth routes/calls. |
| Foundation | Scoped Workspace tokens/context, platform shell variants, sidebar/drawer, dimension consumers, core UI primitives and theme hook. Native shell retained. |
| Home | Published Momentum, Next Step, Calendar/Today's Focus, responsive alignment/order, isolated loading/errors and existing creation links. |
| Goals | Library/detail, lifecycle filters, Overview/Tasks/Milestones/Vault; opt-in all-status/error/retry Goal reads; existing Task/lifecycle operations. |
| Projects | List/grid/category presentation, Overview/Goals/Vault, role controls, independent Goal-free Projects, canonical Task writes and deferred conversation. |
| Vault/Sources | Scoped viewer-RLS Entry metadata, canonical deduplication/provenance, existing Source ownership/APIs, web legacy Vault redirect, read/mutation race guards. |
| Hardening | Calendar pending guard, optional activity errors, Modal focus/names, Source post-write refresh, enlarged-text wrapping, terminology and Node URL test typing. |
| Roots | Pinned Git reference validation and two stale heading assertions only; no Roots runtime/artwork or visual baseline modification. |
| Tests/docs | Required fixtures, SQL security suite registration, existing phase reports/inventories and proposed CI. No credentials, generated exports or unapproved PNG additions. |

### Narrow Phase 4B test-infrastructure delta

- `tests/helpers/visual-evidence.ts` accepts optional `OHARA_VISUAL_OUTPUT_DIR`; absent that variable, existing capture destinations remain unchanged. It creates output parent directories, including the standalone Notes-toolbar capture path.
- Nine capture-producing specs now use that helper. Runtime assertions are unchanged. The rehearsal writes review-only screenshots to `/private/tmp/ohara-4b-visual-evidence`; Roots' `toHaveScreenshot` baselines are not redirected, weakened or regenerated.
- Workspace Playwright uses `reuseExistingServer: !process.env.CI` so CI cannot accidentally validate an unrelated server on port 4291. Roots already follows that rule.
- Two helper tests verify override/default behavior. `CHANGELOGCODEX.md` documents every Phase 4B code/config change.

## 3. Overlaps and ownership-sensitive review

No new main/branch commits since Phase 4A, so patches applied without conflicts or hunk reconciliation. This is an observed zero-overlap case, not proof that future or unpushed work cannot conflict.

Keep these separate:

- EventKit handoff `dac9849c57c80300bcda409e45e95bf19f0d5e14`, including its conflicting `090_calendar_external_links.sql`. Team main has `090_parent_deletion_lifecycle.sql` and `091_sources_v2.sql`. Nothing from the handoff was imported.
- Archived Tracker branch `bbd5c6cb73086b90e0a09318cdf0646455138a87`; do not revive legacy Tracker APIs/data contracts.
- Old Goal-card experiment `a0e954847d4dd40c35fdaadc0555b565a611fb74`; its Goal service/type overlap remains owner-review context, not a required merge.

Coordinate `constants/workspace.ts`, `store/uiStore.ts`, WorkspaceContext/Shell, shared Modal/Button/Card/Input/Typography/layout controls; Goal read hook/service; Project service/routes; Goal/Project Source hooks. These are documented ownership-sensitive seams. FriendsPopover changes positioning only; Circles changes dimensions/copy, not data services. Authentication presentation changes login/signup/PublicAuthShell only. Generic `lib/api/client`, root auth/session/bootstrap and global provider/deduplication infrastructure remain untouched.

## 4. Compatibility and integrity inspection

- No changes relative to base in `app/api`, `lib/db`, `supabase/migrations`, package manifests/lock, `app/_layout.tsx`, auth store, generic API client, or Momentum calculation/service modules. **Workspace V2.0 requires no additional migration.** Repository ledger marker is 091; no production ledger was queried or modified.
- All canonical brand assets and vector marks remain tracked, present and unchanged. Required new platform wrappers/context/services resolve in browser/export/type validation; native continues resolving the native variants.
- Contextual Vault verifies the authorized parent, queries authorized current Goals/links, then independently RLS-filters Entries. A visible link never substitutes for Entry authorization. Existing single-owner Sources and same-owner Goal/Project constraint remain intact.
- Auth network/redirect semantics and shared Entry version/capability paths are preserved. Browser tests use synthetic interception; disposable SQL suites supply actual local policy checks. Neither is a production-account smoke test.
- Calendar writes still target canonical occurrence IDs with existing idempotency; the guard prevents concurrent repeated clicks. Momentum read/current/history and immutable closed-week rules retain their existing implementation and tests. No AI generation or broad reconciliation is introduced.
- Existing approved Roots snapshot bytes, dependency lock and migrations remain unchanged. No screenshot-baseline update command was used.

## 5. Automated validation

All runs below execute from the **new rehearsal worktree**, not the original. Node `v24.18.0`, Playwright `1.62.0`, TypeScript `5.9.3`; dependencies installed with `npm ci` from the unchanged lockfile, including existing CSS-interop/Zustand patches.

| Check | Rehearsal result |
| --- | --- |
| Roots unit/boundary | 74 passed; zero failed/skipped |
| Roots browser interaction/visual acceptance | 26 passed; existing baselines retained |
| Workspace + landing/auth + Notes/Reflections browser | 50 passed |
| Entries/Projects/insights/Sources/Goals/lifecycle/workspace domain | 273 passed |
| Capture helper | 2 passed |
| Tasks / Momentum | 86 / 74 passed |
| Calendar / Auth | 10 / 8 passed |
| Friends / Circles | 13 / 30 passed |
| Prelaunch / Echo composer/reconciliation | 15 / 7 passed |
| Full migration chain + DB/security, hosted default ACL | All 17 suites passed |
| Full migration chain + DB/security, CLI default ACL | All 17 suites passed |
| Local hosted-preflight/apply rehearsal entry points | Exit 0, **no-op/skipped**: nothing pending after 091; not executed migration-mutation probes |
| TypeScript after full application browser routing | Passed |
| Web production-mode / iOS JavaScript exports | Both passed: `/private/tmp/ohara-4b-web`, `/private/tmp/ohara-4b-ios` |
| Final TypeScript / diff integrity | Passed, including after removing generated-only route churn from the candidate |
| CI proposal | YAML parsed; every shell step passes `bash -n`; history, dual-ACL and no-production-secret checks pass. Actual GitHub execution NOT RUN. |
| Dependency audit | **Nonzero: 59 baseline advisories**, including high/critical; see security section. Not a green security sign-off. |

Validation order: Roots unit → Roots isolated preview/browser → full application Workspace browser → TypeScript → web/iOS JS exports → final TypeScript/diff checks. Domain and disposable database tests ran independently. Roots' preview may regenerate a small router declaration; full-app generation must precede whole-app TypeScript. No casts, compiler relaxation or assertion removal.

Commands are the Phase 4A Integration Plan's full validation list plus `node --experimental-strip-types --test tests/helpers/*.test.ts`, the CLI-ACL DB run, preflight/apply entry points and `npm audit --json`. Explicit synthetic build values are `https://workspace-preview.invalid` / `preview-only`, with `CI=1`, `EXPO_OFFLINE=1`, `EXPO_NO_TELEMETRY=1`. No environment file was copied. These exports are **not deployable production-configured builds** and iOS JS export is not physical-device validation.

### Failures and limitations distinguished

- Initial dependency install lacked effective network/cache access; only this rehearsal's stalled process was stopped, then `npm ci` succeeded with permission. No original checkout dependencies were touched.
- Initial local PostgreSQL attempt failed at shared-memory creation (`Operation not permitted`), before tests; permission-enabled local runs pass both ACL modes.
- Initial sandboxed Roots server failed port startup (`Use port null instead?`), before browser assertions; permission-enabled run passes all 26. These were environment failures, not integration regressions.
- Expo reports unavailable `xcrun simctl` and existing require cycles. Do not interpret them as native-device verification.
- No application regression was observed in the passing suites. Manual/device tests and security findings remain independent gates.

### Evidence locations

Logs: `/private/tmp/ohara-4b-{roots-unit,roots-browser-verified,workspace-browser,domain,tasks,momentum,calendar,auth,friends,circles,prelaunch,echo-composer,db-hosted-verified,db-cli,preflight,apply,typescript,typescript-final,web-export,ios-export}.log`. Initial environment-failure logs are retained separately; use the `verified` logs for final Roots/hosted-DB results. Audit JSON: `/private/tmp/ohara-4b-dependency-audit.json`. Capture-only PNGs: `/private/tmp/ohara-4b-visual-evidence`. These are local evidence, not candidate source or production data.

## 6. Proposed CI workflow

Local, untracked proposal: `.github/workflows/workspace-validation.yml`. It has **not been committed, published or run on GitHub**.

- PR/manual triggers, read-only repository permission, no persisted checkout credentials, no production secrets/environments/deploy steps.
- macOS application job, Node 24 and locked install; full-history checkout (`fetch-depth: 0`) and explicit pinned Roots commit/tree availability checks.
- All listed domain suites; Roots browser before full Workspace browser; full-app TypeScript, web/iOS JS export checks, protected snapshot/lock/migration diff checks.
- Capture-only artifacts under runner temporary storage. Existing screenshot assertion tolerances remain unchanged. The macOS hosted runner still requires actual compatibility verification; local macOS success is not a claim of remote snapshot reproducibility.
- Ubuntu database matrix in hosted/CLI ACL modes, matching the repository's established PostgreSQL 17/pgvector/pg_cron harness; preflight/apply scripts run locally only.
- A separate `npm audit --package-lock-only --audit-level=high` gate deliberately remains failing on the current baseline until reviewed/remediated. No `continue-on-error` or silent allowlist hides that result.
- Existing `.github/workflows/db-chain.yml` is untouched. When approving publication, decide whether to retain the temporary duplicate DB coverage or consolidate jobs under required-check policy; do not silently remove existing checks.

Structural validation is not an actionlint/GitHub run; actionlint is not installed. Team must confirm action versions, runner availability, branch protections and required check names before enabling the proposal. No third-party action or dependency upgrade was introduced into the application.

## 7. Security and dependency findings

Fresh npm advisory response for the unchanged lockfile: **59 total = 1 critical + 17 high + 40 moderate + 1 low**. The previous report's 87 is historical; a different current audit count is not evidence of a dependency fix. `package-lock.json` is byte-identical to fetched upstream/main.

Priority examples:

- `shell-quote@1.8.3`: critical quote/object-operator command-injection advisory [GHSA-w7jw-789q-3m8p](https://github.com/advisories/GHSA-w7jw-789q-3m8p), plus high parse DoS. Present through the React Native/React DevTools dependency chain. Build/development reachability needs review; do not label it harmless based only on package classification.
- `prosemirror-view@1.42.2`, through Tiptap: high paste-handling XSS advisory [GHSA-c8x8-7fp4-3x9w](https://github.com/advisories/GHSA-c8x8-7fp4-3x9w). Relevant to the existing editor dependency surface and requires prompt security triage; exploitability in this app was not tested or asserted.
- Other high package groups reported: `@expo/cli`, `@expo/code-signing-certificates`, `@xmldom/xmldom`, `brace-expansion`, `browserslist`, `compression`, `expo`, `image-size`, `js-yaml`, `markdown-it`, `nanoid`, `node-forge`, `postcss`, `source-map-js`, `tmp`, `ws`.

No automatic audit fix/upgrade/override was applied. Some npm suggestions propose a major Expo downgrade, which is not a safe automatic remedy. Security owners must assess reachable paths and approve targeted compatible remediation or a documented policy exception before production release. Functional regressions passing do not waive this gate. The workflow YAML was parsed only as trusted local content; no untrusted YAML input was processed as part of this validation.

Candidate paths and patches are screened for environment/key filenames, private keys, common token formats and credential-bearing PostgreSQL URLs. No production credentials are required or deliberately included. This scoped scan is not exhaustive secret-detection certification. Approved synthetic test data remains clearly separated from real user content. No production database/service was contacted for testing.

## 8. Reviewable commit structure — no staging performed

The original nine feature groups remain useful review sections, but final shared files span several phases. Prefer fewer dependency-closed commits over artificial phase slices:

1. **Validation baseline:** Roots history/heading corrections + reference instructions; explicit Node URL test fix; capture helper and helper tests. These have no new runtime dependencies and prevent carrying known baseline test failures forward.
2. **Public landing/auth presentation:** complete landing prerequisite and final refinements as one coherent delta; auth shell platform files/CSS, login/signup, landing spec/browser/config. Include helper-based capture plumbing after step 1. Do not also cherry-pick the landing commit into a tree where its patch is already applied.
3. **Workspace implementation, atomic dependency closure:** foundation/context/theme and consumers, Home + Goal read options, contextual Vault reader, Goals, Projects, Source hook handling, cross-feature fixes and their matching domain/browser/SQL fixtures. Review as foundation → Home/Goal reads → Vault service → Goals/Projects/Sources → shared hardening, but retain them in one implementation commit unless exact hunk splits have been built and tested. Final Goal/Project files import the new Vault reader/context; separating them without those dependencies would break compilation. Matching copy assertions and shared fixture/config updates must travel with their implementation.
4. **CI and remaining validation infrastructure:** comprehensive workflow, CI server isolation and any remaining capture-only plumbing, with all required fixtures already present. Dependency review is an explicitly unresolved check, not silently green CI.
5. **Readiness documentation:** current inventory, reports/rollout, this rehearsal, manual QA and recovery instructions; choose evidence/archive policy separately. Preserve per-code-commit changelog entries instead of replacing the shared changelog wholesale.

This structure minimizes incomplete-import states; **only the full assembled candidate was validated**. Before future commit authorization, rehearse each selected boundary in another scratch tree and check TypeScript/imports/focused tests. No intermediate commit is claimed tested. Use explicit paths/hunks, never blanket staging. A single final Workspace implementation commit provides a clear rollback unit for the tightly coupled runtime changes.

## 9. Outstanding manual QA and release gates

All executable scenarios in [Phase 4A Integration Plan §8](OHARA-Workspace-V2.0-Integration-Plan.md#8-executable-manual-qa-handoff) and [Phase 3F Final Readiness §5](OHARA-Workspace-V2.0-Final-Readiness.md#5-manual-acceptance-checklist--all-pending-execution) remain **NOT RUN**:

- Physical iPhone/iPad installed build: launch/auth/background/session expiry; Home/Calendar/Goal/Project/Back/deep links; canonical occurrence/schedule/closed Momentum integrity; role/private/removed-member Vault and attached Sources; Note/Reflection edits/conflicts/retries; pickers; light/dark/safe areas/rotation/Dynamic Type/keyboard.
- Actual macOS/iOS Safari: responsive navigation/scroll, theme initialization, fonts/layout, forms/autofill, menus/modals, direct links and Back/Forward.
- VoiceOver and keyboard-only: names/roles/states, reading order, charts/Roots alternatives, focus containment/return/visibility, errors, 200% scaling, all status contrasts and touch targets. Chromium structural checks are not accessibility certification.

Record tester/date, candidate content manifest or future commit SHA, device/browser/OS, scenario steps, expected/actual and sanitized evidence. Use approved nonproduction accounts. EventKit's separate device/migration sign-off remains outside this candidate.

Still preventing release: high/critical dependency security disposition; actual proposed CI execution; teammate/owner review and confirmed integration destination; real-backend nonproduction auth/RLS/storage smoke tests; applicable manual/platform/accessibility acceptance; production SHA/ledger/rollback verification and separate explicit release authorization. No new schema blocker was introduced by Workspace itself.

## 10. Safe next steps and recovery

1. Preserve this detached candidate and the original source/Phase 4A backups. Review source diff and this report, including security findings and the local-only CI proposal.
2. Resolve the dependency-security work under separately scoped approval; do not mix EventKit/Tracker work into this candidate. Confirm team destination and shared-component/domain ownership reviews.
3. Before any future integration, fetch again and compare exact base/file/hunk changes. Apply only reviewed deltas in a fresh authorized branch/worktree; rerun regressions after any reconciliation. Do not force-push or replace teammates' files wholesale.
4. Separate authorization is required for staging/committing/pushing/PR/merge and for preview deployment. Use approved nonproduction configuration/accounts; current synthetic exports must never be promoted.
5. Record manual QA and resolve release blockers before production approval. Record actual currently deployed SHA, immutable rollback deployment/configuration and read-only migration ledger at release time, not from this local HEAD.

### Reproduce the approved starting candidate

After explicit authorization to create another local worktree, start at exact `b939327dfd70f44c650992e3c0337c8798a297d8`. Verify Phase 4A `SHA256SUMS`, then apply:

```sh
git apply --check --exclude='docs/ui-checkpoints/**' /path/to/phase4a/current/landing-base.patch
git apply --exclude='docs/ui-checkpoints/**' /path/to/phase4a/current/landing-base.patch
git apply --check --exclude='.expo/types/router.d.ts' --exclude='docs/ui-checkpoints/**' /path/to/phase4a/current/tracked.patch
git apply --exclude='.expo/types/router.d.ts' --exclude='docs/ui-checkpoints/**' /path/to/phase4a/current/tracked.patch
tar -xzf /path/to/phase4a/current/untracked.tar.gz --exclude '*.png'
```

Use a new empty/clean rehearsal directory only. This reconstructs the 125-file approved starting delta, not the additional Phase 4B CI/capture/report edits. For the complete final candidate, use the separate Phase 4B recovery package (base-relative patch plus explicit untracked archive/manifest); do **not** stack both recovery approaches or apply the landing prerequisite twice. Install locked dependencies separately, generate full application types, and run validation in the documented order.

The Phase 4B source-only package is `/Users/arthursilva/Desktop/OharaBackup/OHARA-Workspace-V2-Phase4B-2026-10-23`. It contains the base-relative binary patch, explicit untracked archive, per-file SHA-256 inventory, package checksums, recovery README and the dependency-audit JSON. It excludes generated route files, capture PNGs, dependency caches, exports and credentials; it does not change the Phase 4A package. Recover in a separate directory, compare hashes/diffs, and never reset/clean the original worktree. Production rollback is an eventual authorized deployment action, not a Git reset or database reversal.

Expo's generated declaration was saved separately at `/private/tmp/ohara-4b-router.generated.d.ts`, then only that rehearsal-generated file was returned byte-for-byte to the upstream version using a targeted patch. TypeScript still passes; `.expo` contributes no candidate change. This is not a reset or removal of user work. Capture PNGs were written outside the candidate from the start.

## 11. Final status

**Local functional integration rehearsal passed.** All listed functional/domain/browser/database suites, exports and final TypeScript/integrity checks pass. The original source and Phase 4A backup remain intact. The source-only candidate contains 130 paths (76 modified, 54 new); no generated routes, unapproved screenshot additions, secrets or migrations are included. Final package checksums and recovery content comparison are required and executed before handoff; see the package manifests for exact digests. Security/manual/remote-CI gates remain open: this is not a production release approval. Nothing staged, committed, pushed, merged or deployed.

## Appendix — exact review candidate paths

Exact paths relative to the rehearsal repository; generated/capture artifacts are excluded. This list supersedes the broader historical inventory for staging review only—no files have been staged.

- `.github/workflows/workspace-validation.yml` — new
- `app/(app)/_layout.tsx` — modified
- `app/(app)/dashboard.tsx` — modified
- `app/(app)/goals/[id]/vault.web.tsx` — new
- `app/(app)/goals/index.tsx` — modified
- `app/(app)/momentum.tsx` — modified
- `app/(app)/projects/[id].tsx` — modified
- `app/(app)/projects/index.tsx` — modified
- `app/(auth)/login.tsx` — modified
- `app/(auth)/signup.tsx` — modified
- `CHANGELOGCODEX.md` — modified
- `components/landing/landing-v2.css` — new
- `components/landing/LandingPage.tsx` — modified
- `components/landing/LandingPage.web.tsx` — new
- `components/landing/public-auth-v2.css` — new
- `components/landing/PublicAuthShell.tsx` — modified
- `components/landing/PublicAuthShell.web.tsx` — new
- `components/layout/AppNavigation.tsx` — modified
- `components/layout/AuthenticatedPageShell.tsx` — modified
- `components/layout/FeaturePageHeader.tsx` — modified
- `components/layout/GlobalCreateControl.tsx` — modified
- `components/layout/Screen.tsx` — modified
- `components/layout/workspace-navigation.ts` — new
- `components/layout/workspace-v2.css` — new
- `components/layout/WorkspaceContext.tsx` — new
- `components/layout/WorkspaceShell.tsx` — new
- `components/layout/WorkspaceShell.web.tsx` — new
- `components/ui/Button.tsx` — modified
- `components/ui/Card.tsx` — modified
- `components/ui/Input.tsx` — modified
- `components/ui/Modal.tsx` — modified
- `components/ui/Typography.tsx` — modified
- `constants/workspace.ts` — new
- `docs/constellation/REFERENCE_CONCEPTS.md` — modified
- `docs/design/OHARA-Goals-V2.0-Phase-3B.md` — new
- `docs/design/OHARA-Home-V2.0-Phase-2.md` — new
- `docs/design/OHARA-Landing-Page-V2.0-Specification.md` — new
- `docs/design/OHARA-Projects-V2.0-Phase-3C.md` — new
- `docs/design/OHARA-Vault-V2.0-Phase-3D.md` — new
- `docs/design/OHARA-Workspace-Design-System-V2.0.md` — new
- `docs/design/OHARA-Workspace-V2.0-Change-Inventory.md` — new
- `docs/design/OHARA-Workspace-V2.0-Final-Readiness.md` — new
- `docs/design/OHARA-Workspace-V2.0-Integration-Plan.md` — new
- `docs/design/OHARA-Workspace-V2.0-Integration-Rehearsal.md` — new
- `docs/design/OHARA-Workspace-V2.0-Phase-3E-Readiness.md` — new
- `docs/design/OHARA-Workspace-V2.0-Rollout.md` — new
- `docs/ui-checkpoints/goals-v2/README.md` — new
- `docs/ui-checkpoints/projects-v2/README.md` — new
- `docs/ui-checkpoints/readiness-v2/README.md` — new
- `docs/ui-checkpoints/vault-v2/README.md` — new
- `features/calendar/components/CalendarItemRow.tsx` — modified
- `features/calendar/components/CalendarScreen.tsx` — modified
- `features/calendar/components/HomeCalendarPreview.tsx` — modified
- `features/circles/components/CirclesPane.tsx` — modified
- `features/circles/components/CirclesScreen.tsx` — modified
- `features/circles/components/FeedPostCard.tsx` — modified
- `features/circles/components/PostComposer.tsx` — modified
- `features/circles/components/SavedPostsPane.tsx` — modified
- `features/constellation/fixture-boundary.test.ts` — modified
- `features/entries/components/CompletedReflection.tsx` — modified
- `features/entries/components/EchoCreationModal.tsx` — modified
- `features/entries/components/EchoNewMenu.tsx` — modified
- `features/entries/components/EntriesLibrary.tsx` — modified
- `features/entries/components/EntriesScreen.tsx` — modified
- `features/entries/components/NoteEditor.tsx` — modified
- `features/entries/components/NotesLibraryScreen.tsx` — modified
- `features/entries/components/QuickReflectionEditor.tsx` — modified
- `features/entries/components/ReflectionsScreen.tsx` — modified
- `features/entries/components/SharedEntryReadView.tsx` — modified
- `features/entries/context-vault.test.ts` — new
- `features/entries/echo-v1-ui.test.ts` — modified
- `features/entries/journal-prelaunch-ui.test.ts` — modified
- `features/entries/product-structure-ui.test.ts` — modified
- `features/entries/services/context-vault.ts` — new
- `features/friends/components/FriendsPopover.tsx` — modified
- `features/goals/components/GoalDetailHeader.tsx` — modified
- `features/goals/components/GoalsExperience.tsx` — new
- `features/goals/components/GoalsExperience.web.tsx` — new
- `features/goals/components/GoalsWorkspace.tsx` — modified
- `features/goals/components/GoalVault.tsx` — modified
- `features/goals/components/home/HomeEchoEntryPoints.tsx` — new
- `features/goals/components/home/NextStepPanel.tsx` — modified
- `features/goals/components/ManageGoalControl.tsx` — modified
- `features/goals/components/RecentActivityPanel.tsx` — modified
- `features/goals/components/VaultItemCard.tsx` — modified
- `features/goals/hooks/useActivity.ts` — modified
- `features/goals/hooks/useGoals.ts` — modified
- `features/goals/hooks/useVault.ts` — modified
- `features/goals/services/goal-service.ts` — modified
- `features/goals/vault-request-race.test.ts` — new
- `features/intelligence/contextual-insights.test.ts` — modified
- `features/intelligence/contextual-insights.ts` — modified
- `features/momentum/components/HomeMomentumSnapshot.tsx` — modified
- `features/projects/components/CreateProjectModal.tsx` — modified
- `features/projects/components/ManageProjectModal.tsx` — modified
- `features/projects/components/ProjectCard.tsx` — modified
- `features/projects/components/ProjectChat.tsx` — modified
- `features/projects/components/ProjectGoalsPanel.tsx` — new
- `features/projects/components/ProjectVaultWorkspace.tsx` — modified
- `features/projects/hooks/useProjectVault.ts` — modified
- `features/projects/intelligence.test.ts` — modified
- `features/projects/services/project-service.ts` — modified
- `features/projects/ui.test.ts` — modified
- `features/sources/components/SourceComposer.tsx` — modified
- `lib/goals/manual-create-v1.test.ts` — modified
- `scripts/db-chain/run.sh` — modified
- `scripts/db-chain/suites/vault-context.sh` — new
- `scripts/vault-context-security.test.sql` — new
- `store/uiStore.ts` — modified
- `tests/constellation/constellation.acceptance.spec.ts` — modified
- `tests/helpers/visual-evidence.test.ts` — new
- `tests/helpers/visual-evidence.ts` — new
- `tests/journal/library.spec.ts` — modified
- `tests/landing-v2/landing.spec.ts` — new
- `tests/landing-v2/playwright.config.ts` — new
- `tests/notes/library.spec.ts` — modified
- `tests/prelaunch/prelaunch-source.test.ts` — modified
- `tests/workspace-v2/fixtures.ts` — new
- `tests/workspace-v2/foundation.test.ts` — new
- `tests/workspace-v2/goals.spec.ts` — new
- `tests/workspace-v2/goals.test.ts` — new
- `tests/workspace-v2/home.spec.ts` — new
- `tests/workspace-v2/home.test.ts` — new
- `tests/workspace-v2/playwright.config.ts` — new
- `tests/workspace-v2/project-fixtures.ts` — new
- `tests/workspace-v2/projects.spec.ts` — new
- `tests/workspace-v2/projects.test.ts` — new
- `tests/workspace-v2/readiness.spec.ts` — new
- `tests/workspace-v2/vault.spec.ts` — new
- `tests/workspace-v2/workspace.spec.ts` — new
