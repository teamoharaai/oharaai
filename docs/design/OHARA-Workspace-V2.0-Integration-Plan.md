# OHARA Workspace V2.0 — Final Integration Preflight

October 23, 2026 · Phase 4A · **Planning only; integration and release are not authorized.**

## 1. Decision summary

The completed implementation is preserved locally and normal automated validation is green. A successful fetch found **no incoming commits on the team's main branch**. This does not certify a production release or authorize integration. Confirm the team destination, prepare comprehensive CI with Roots history, review the accumulated delta, and execute manual/real-environment QA before release.

Recommended destination: a **new, team-approved integration branch based on freshly fetched `upstream/main`, in a fresh worktree**, then a reviewed PR to `teamoharaai/oharaai:main`. A suggested branch name is `codex/workspace-v2-integration`; it has not been created or selected as team policy. Neither the personal fork's old `main` nor the historic integration/release/EventKit branches is an appropriate assumed destination.

This phase changes documentation only. No staging, commit, push, merge, branch creation, deployment, production database access, runtime redesign or Echo AI implementation.

## 2. Current Git relationship and upstream review

| Item | Verified state after `git fetch --all --no-tags` |
| --- | --- |
| Worktree | `/private/tmp/ohara-workspace-v2` |
| Local branch | `codex/workspace-design-system-v2-phase1` (no configured tracking branch) |
| HEAD | `d286285dccd13cee607cd706fa56df589562e357` |
| Team remote | `upstream` → `https://github.com/teamoharaai/oharaai.git` |
| Team default | `upstream/HEAD` → `upstream/main` |
| Current upstream/main | `b939327dfd70f44c650992e3c0337c8798a297d8` |
| HEAD ahead / behind upstream/main | **1 / 0** |
| Incoming main commits / overlapping incoming main files | **0 / 0** |
| Local-only committed prerequisite | `d286285` — approved landing page V2; ten changed/added paths |
| Personal fork main | `origin/main` → `f49e3c26bedab843dcd799b98f073d6591674d0e`; 148 commits behind HEAD |
| Staged changes / tracked deletions | None / none |
| Preflight entry working delta | 116 tracked modifications + 90 untracked files, relative to HEAD |

Fetch updated remote metadata only; the index, HEAD and completed working files were not reconciled. There are no teammate commits added to team main since this worktree's committed base. Remote branches are not proof of unpushed teammate work; ask owners before future reconciliation and fetch again immediately before applying the delta.

### Other remote branches (not integration targets by assumption)

Counts below are HEAD-only / branch-only commits, not pending changes to main.

| Branch | Tip | Counts | Assessment |
| --- | --- | --- | --- |
| `upstream/agent/goal-card-pill-ui` | `a0e954847d4dd40c35fdaadc0555b565a611fb74` | 209 / 1 | July 21 Goal-card/cadence experiment. Overlaps changelog and `features/goals/services/goal-service.ts`; also changes GoalCard and Goal types. Do not import its old service/types wholesale. |
| `upstream/agent/landing-page-redesign` | `d5e8cd786ce80224caf9d44a2ecf660593d7a5b2` | 223 / 0 | Ancestor; no unique incoming work. |
| `upstream/feat/circles-home` | `46c15b7aa0669cedab8c10502fca8f9ea1e77fb4` | 95 / 0 | Ancestor; no unique incoming work. |
| `upstream/feat/tracker-metrics-archive` | `bbd5c6cb73086b90e0a09318cdf0646455138a87` | 121 / 6 | Explicitly archived/superseded Tracker work. Overlaps changelog, dashboard, GoalsWorkspace and Goal service. Includes old action/Entry/Goal/Momentum/Tracker API contracts and Goal hooks/types. Do not revive a duplicate Task system. |
| `upstream/feature/calendar-eventkit-ios-validation` | `dac9849c57c80300bcda409e45e95bf19f0d5e14` | 8 / 2 | Separate native validation handoff. Overlaps changelog, dashboard, CalendarScreen and DB harness; also touches native config/dependencies, Calendar routes/providers and migration numbering. Keep separate. |
| `origin/design/theme-implementation` | `3a273fdd0a5fdb7aa84bb9e4252f311762cd20af` | 214 / 0 | Ancestor in personal fork; not the current team baseline. |

The six branch-only archived Tracker commits are `3f63ee5`, `24ef2cb`, `bb4df13`, `1b65996`, `ffc91ee`, `bbd5c6c` (September 9–14). EventKit's branch-only commits are `a0f4253` and `dac9849` (October 8). They predate the current worktree base and are **not newly incoming main commits**. Their changed-file sets were inspected for overlap; this is not a full code review or approval to integrate those branches.

Local alternatives also exist: `integration/ceo-main-2026-08-09` at `792dc8b`, `release/prelaunch-web` at `ced7f3a`, `codex/sources-v2` at `b939327`, and `codex/landing-page-v2` at `d286285`. Their names do not establish current team integration policy. Existing worktrees/checkpoints must remain intact.

**EventKit collision:** its `090_calendar_external_links.sql` conflicts numerically with main's already-recorded `090_parent_deletion_lifecycle.sql`; main also has `091_sources_v2.sql`. The handoff's October 8 production-ledger statements are historical. Do not apply that migration, copy its branch tree over main, or combine it with Workspace release work. Its owner must reconcile numbering and complete native validation under separate authorization.

## 3. Complete accumulated change inventory

The exhaustive 206-path Phase 3F inventory is [OHARA-Workspace-V2.0-Change-Inventory.md](OHARA-Workspace-V2.0-Change-Inventory.md). Preserve that historical inventory, including all relevant untracked files. This phase adds this Integration Plan and adds a documentation-only changelog entry; therefore the working inventory becomes **116 tracked modifications + 91 untracked files = 207 paths**.

Do not omit the already-committed landing prerequisite: its ten paths are changelog, `components/landing/LandingPage.web.tsx`, `components/landing/landing-v2.css`, landing specification, `tests/landing-v2/{landing.spec.ts,playwright.config.ts}`, and `docs/ui-checkpoints/landing-v2/{desktop,mobile,hero-desktop,hero-mobile}.png`. Three of these are not in the 206-path working inventory: `playwright.config.ts` and both `hero-*.png`. Total unique accumulated candidate paths relative to upstream/main after this report: **210**. These are inventory counts, not a staging recommendation.

| Logical group | Contents and important seams |
| --- | --- |
| 1. Public landing / authentication presentation | Local landing commit plus final forest gradients, white palette, editorial/copy refinements, OharaAI branding, `PublicAuthShell` platform files/CSS, login/signup form layout and browser checks. Supabase auth calls and routes unchanged. |
| 2. Global Workspace V2.0 | `constants/workspace.ts`; `WorkspaceContext`, `WorkspaceShell` platform variants, navigation map/CSS; protected route layout; shared Screen/page/header/create/nav components; Button/Card/Input/Typography; scoped `store/uiStore.ts` theme hook; workspace dimension consumers in Momentum, Calendar and Circles; FriendsPopover anchoring. |
| 3. Home | Dashboard, HomeCalendarPreview, NextStepPanel, new HomeEchoEntryPoints, HomeMomentumSnapshot; additive Goal read-error/retry support. Published Momentum remains separate from recalculation. |
| 4. Goals | Goals route/GoalsExperience web and native wrapper; GoalsWorkspace/GoalDetailHeader/ManageGoalControl; all-lifecycle reads; meaningful milestone counts, not a new progress formula. Existing Task/Milestone/lifecycle operations retained. |
| 5. Projects | Library/detail routes; ProjectCard, new ProjectGoalsPanel, CreateProjectModal/ManageProjectModal/ProjectChat; list/grid/category controls; deferred chat; capability-based actions; error-aware Project service. |
| 6. Vault | New scoped `features/entries/services/context-vault.ts`; GoalVault/ProjectVaultWorkspace, Source hooks, VaultItemCard, Project aggregation; web legacy Goal Vault redirect; SourceComposer and canonical Entry/Note/Reflection view/copy changes. Viewer RLS and existing ownership/mutation contracts retained. |
| 7. Cross-feature hardening | Source read/write races and parent refresh; activity errors; CalendarItemRow duplicate-write guard; Modal naming/focus restoration; Project wrapping; Reflections terminology in navigation/landing/Entries/Circles/insights; test-only Node URL import in manual-create test. Shared files require hunk-level grouping. |
| 8. Roots test/reference correction | `features/constellation/fixture-boundary.test.ts`, `tests/constellation/constellation.acceptance.spec.ts`, `docs/constellation/REFERENCE_CONCEPTS.md`. Exact historical bytes verified from pinned Git objects; two stale heading assertions corrected. No Roots runtime/artwork change. |
| 9. Documentation / tests / evidence | Changelog, foundation/Home/Goals/Projects/Vault/3E/3F/rollout/inventory/this report; `tests/workspace-v2/**`; changed existing Entry/Project/insight/journal/landing/prelaunch assertions; new contextual Vault and request-race tests; disposable Vault SQL suite and DB harness registration; synthetic UI checkpoint PNGs/READMEs. |

### Do not stage automatically

- `.expo/types/router.d.ts` is generated by the active Expo router root. Preserve it in recovery but regenerate/review in integration; do not stage the isolated Roots preview's route list.
- All `docs/ui-checkpoints/**` PNGs are review evidence, not runtime dependencies. Preserve them in backups. The repository archive policy places heavy/history binaries outside the active repository: choose only approved living visual evidence with the team, and archive/link the rest. Do not blanket-stage capture churn or silently discard it.
- Exclude ignored `.env*`, credentials, `.vercel` metadata, `.expo` caches, `node_modules`, test results/traces, temporary exports and machine-local logs. Do not copy another checkout's duplicate RichTextEditor files or unrelated assets. None are present in this worktree's nonignored candidate list.
- Do not stage report claims without their source/test dependencies. Current tests, fixtures and new platform files are real required additions, not disposable files merely because Git marks them untracked.

## 4. Recovery checkpoints and durable backup

Approved location (user correction): `/Users/arthursilva/Desktop/OharaBackup` — not the initially suggested OHARA/Backups path.

Durable package target: `/Users/arthursilva/Desktop/OharaBackup/OHARA-Workspace-V2-Phase4A-2026-10-23`.

| Checkpoint | Contents | SHA-256 |
| --- | --- | --- |
| Pre-3E `ohara-phase3e-checkpoint.Rgtn2H/tracked.patch` | 71 tracked paths | `185ca0c95740c32c2513ec5ec25118c1e8c9647dbfd29c04fa958e43849805db` |
| Pre-3E `untracked.tar.gz` | 83 files | `02323a99b3fbba880ab7d0d300ff6c59a1e7766222575ee8202980a2c67027dd` |
| Pre-3F `ohara-phase3f-checkpoint.4iKL5d/tracked.patch` | 113 tracked paths | `d825cae4e4075cdf81374ae93b19a1aa2102d4fd0e5d63aa592b78cf671deb12` |
| Pre-3F `untracked.tar.gz` | 88 files | `879ccfd5fe19b14721565b292927b878b3ef891925f671871ab2d8ec922ceac2` |

Phase 4A rechecked all four hashes, byte-compared every archived untracked file against its prior recovered copy, and repeated reverse-apply checks in `/private/tmp/ohara-recovery-3e.vzsDGc` and `/private/tmp/ohara-recovery-3f.08fLH2`; all passed. Originals remain untouched.

The package contains both original checkpoint directories plus a **current** binary HEAD delta, exact nonignored untracked archive, and the binary `upstream/main → d286285` prerequisite patch. The last patch prevents dependence on the continued existence of an otherwise local-only landing commit. Exact upstream/HEAD hashes are in the README; package checksums are in `SHA256SUMS`, and the 210-path content manifest is `current/file-sha256.json`. Restore only into a new empty recovery directory, never over a dirty checkout. Dependencies and deployment credentials must be supplied separately through approved channels.

Pre-copy screening: candidate filenames and text were checked for environment/key files, private keys, common API-token formats and credential-bearing PostgreSQL URLs; no hits. Earlier checkpoint archive/patch scans likewise had no hits. This is a scoped secret check, not a claim of exhaustive secret-detection certification. No ignored environment files, Git credential/config stores, dependencies, runtime exports or raw production content are included. Synthetic screenshots/tests are preserved.

Recovery was rehearsed from exact upstream baseline `b939327` in `/private/tmp/ohara-phase4a-recovery.QThCPa`: apply the landing prerequisite patch, apply the current HEAD delta, extract the untracked archive, then verify the tracked patch in reverse-check mode and SHA-256-check all 210 candidate files. All passed. The completed documentation is recaptured into the final archive and verified independently before handoff; original checkpoint bytes remain unchanged. This package is a durable local copy, not an off-device disaster-recovery backup.

## 5. Integration prerequisites and ownership coordination

### Assets and source completeness

- All tracked `assets/brand` files and canonical vector mark source files exist and are unchanged by Workspace. `BrandIcon.tsx`/`VaultIcon.tsx` remain canonical. OHARA public/auth mark uses `ohara-logo.png`; Echo uses `echo-logo.png`; Goals uses the existing canonical `today-logo.png` mapping. Roots/Momentum use existing vectors, Project/Notes/Reflections/Calendar/Circles/Vault use their established icon mappings. The user-approved house icon remains Home.
- Existing goal mark, add-entry, theme-mode, goal/project logo files and unused historical artwork remain accounted for; no substitute artwork was generated. Inter/Lora remain existing locked dependencies loaded at root; no new fonts/dependencies.
- Phase 4A TypeScript and all 74 Roots tests pass. No missing platform/source dependency was reported. New source, test and documentation files are in the explicit inventory and recovery archive.
- Existing approved design/landing changes were not modified during this preflight.

### API, database and authentication

- Compared with fetched upstream/main, there are **no changes to `app/api`, `lib/db`, `supabase/migrations`, package manifests/lock, `app/_layout.tsx`, or `lib/api/client`** in the accumulated candidate. No schema application is required by Workspace V2.0.
- Existing migration chain ends at 091; repository `scripts/db-chain/hosted-applied-through` records 091. This is repository evidence, **not a fresh production-ledger read**. Future release owner must verify the actual target environment read-only.
- Scoped contextual Vault reads reuse authorized parent/Goal/link/Entry projections and existing Source APIs. Private visibility, single-owner Source ownership, same-owner Goal/Project constraint, version-checked Entry writes and canonical Task occurrences remain authoritative. No service-role browser query or replacement access model.
- Goal read options (`status: 'all'`, `throwOnError`) are additive; Project reads now expose errors. Client Source hook ordering and post-write parent refresh changed, so they require revalidation against teammates' domain updates even without API changes.
- Auth login/signup changes are presentation only; root bootstrap/session/auth store and global providers are unchanged. Workspace introduces a scoped presentation context, not a new authentication provider.
- Momentum formulas, New York weeks, published read contract and closed snapshots are unchanged. Echo changes are deterministic copy; no new AI generation, keys or reconciliation infrastructure.

### Explicit coordination touchpoints

| Ownership area | Files/services to review |
| --- | --- |
| Caching / request coordination | `features/goals/hooks/useGoals.ts` touches the existing keyed in-flight/freshness path for retry/error/all-status support. `features/goals/hooks/useVault.ts`, `features/projects/hooks/useProjectVault.ts`, Project route/service alter scoped races/refreshes. These are not a global caching rewrite, but must be coordinated. |
| Authentication | `app/(auth)/login.tsx`, `signup.tsx`, `components/landing/PublicAuthShell*`: layout/labels only. Auth/session infrastructure unchanged. |
| Providers / theme | New `components/layout/WorkspaceContext.tsx`, WorkspaceShell variants, `(app)/_layout.tsx`, `store/uiStore.ts`: scoped appearance/dimensions; root provider/bootstrap untouched. |
| Shared UI | Button/Card/Input/Typography/Modal, Screen/AuthenticatedPageShell/FeaturePageHeader/GlobalCreateControl/AppNavigation; review optional Modal name and web focus restoration with component owner. |
| Friends/Circles | FriendsPopover positioning; CirclesPane/CirclesScreen/FeedPostCard/PostComposer/SavedPostsPane dimensions/copy. Friends/Circles data services unchanged. |
| Generic API client/global deduplication | No `lib/api/client` or generic fetch/cache infrastructure change. Preserve teammates' ownership. |
| Constants/store | `constants/workspace.ts`, `store/uiStore.ts` cross the documented architecture/CTO ownership lanes; request review, do not assume UI-only ownership. |

Zero incoming main overlaps today is not permission to overwrite teammate work tomorrow. Repeat the comparison before integration and resolve shared-file hunks with owners; never use whole-file “ours/theirs” to bypass review.

## 6. Proposed commit sequence (not executed)

Use explicit reviewed paths/hunks, never `git add .` or `git add -A`. Each code-bearing commit carries its own changelog entry and matching tests. The nine inventory groups are review areas, not nine independently compilable snapshots.

1. **Landing/auth:** integrate the already-local landing commit plus final landing/auth refinements as a coherent public presentation change. Include landing test/config and only approved evidence. Do not apply both the prerequisite patch and cherry-pick the same commit. Review whether to retain its commit or consolidate it under team policy; no history rewrite is implied here.
2. **Workspace foundation:** tokens, presentation contexts, platform shells, shared primitives, layout and all required dimension consumers/Friends anchoring as one buildable unit. Bring foundation fixture/config dependencies with it. Keep domain-dependent test scenarios out until their implementations exist.
3. **Home and additive Goal reads:** Home components and error/status/retry additions, with current-score/history semantics and focused tests.
4. **Contextual Vault read foundation:** new RLS-scoped metadata reader, aggregation tests and local SQL suite/harness registration. This provides the import dependency used by final Goal/Project implementations without exposing a second library.
5. **Goals:** GoalsExperience platform files/routes, header/workspace/Vault integration and lifecycle/error/copy behavior, including Source hook hardening required by those final files and matching tests.
6. **Projects:** list/detail/panels, shared Project service and Vault Source integration/races, collaboration/chat/errors, with tests. Do not land a final service file without the contextual reader from step 4.
7. **Cross-feature completion:** Calendar pending guard, optional activity errors, shared modal focus/names, final Reflections/navigation/Vault integration, insight copy, remaining Entry/Circles terminology and URL test typing; full cross-feature tests. If a feature commit already needs these hunks, move them earlier with its tests rather than creating a broken intermediate commit.
8. **Roots + CI prerequisite:** pinned reference/heading correction and reference documentation, together with separately approved CI history/validation setup. Do not weaken assertions or add archived images to active source.
9. **Final documentation/evidence:** updated inventory, rollout/readiness/this plan, selected synthetic captures or archive links; reconcile per-commit changelog entries rather than blindly replacing the shared file.

Shared test fixtures and Playwright config must evolve with available features. Validate each proposed commit's build/imports and focused tests in the fresh integration worktree. If selective staging cannot keep a boundary buildable, combine dependent commits and explain that choice. No stage/commit split was tested or performed during Phase 4A.

## 7. CI and Roots history

Pinned commit: `5df3a3bc7b0e4d471fcaa0d679615b9a46c2b96f`, tree `handoff_constellation/concepts`. Verified locally as a commit, as an ancestor of freshly fetched upstream/main, and by all original filename/dimension/SHA assertions. The current checkout is not shallow. Original assets are therefore reachable through the trusted team's main history; no archive download or regenerated fixture is needed.

**CI gap:** the only checked-in workflow is `.github/workflows/db-chain.yml`. It runs the full database chain plus preflight/apply rehearsals in hosted/CLI default-ACL modes. It does not run Roots, TypeScript, Workspace browsers or exports, and its checkout does not request full history. Existing green database CI alone cannot sign off this release.

In a separately authorized CI change, configure the application-validation job with full history (`actions/checkout` `fetch-depth: 0`), or deliberately fetch the exact pinned commit from the verified team remote before Roots tests. Then require:

```sh
git cat-file -e 5df3a3bc7b0e4d471fcaa0d679615b9a46c2b96f^{commit}
git cat-file -e 5df3a3bc7b0e4d471fcaa0d679615b9a46c2b96f:handoff_constellation/concepts
npm run test:constellation
```

No test should fetch implicitly, silently skip, regenerate artwork, or relax exact hashes. Source-only exports are runtime artifacts, not adequate checkouts for this history-based test. The actual remote CI run remains pending; no workflow was changed here.

### Required validation after reconciliation

Install with the unchanged lockfile and repository patch-package process. Run in nonproduction with approved test configuration:

```sh
npm run test:constellation
npm run test:constellation:acceptance
npx playwright test --config tests/workspace-v2/playwright.config.ts
node --experimental-strip-types --test features/entries/*.test.ts features/projects/*.test.ts features/intelligence/*.test.ts features/sources/*.test.ts features/goals/*.test.ts lib/goals/*.test.ts tests/workspace-v2/*.test.ts
npm run test:tasks
npm run test:momentum
npm run test:calendar
npm run test:auth
npm run test:friends
npm run test:circles
npm run test:prelaunch
npm run test:echo-composer
npm run test:db
npx tsc --noEmit
git diff --check
```

Run Roots browser preview **before** the full Workspace browser suite: its isolated router changes generated `.expo/types/router.d.ts`. Regenerate full-app route types before final TypeScript; never suppress route errors to compensate. Run production-mode web and iOS JavaScript exports in fresh output directories using explicit nonproduction build values, as in the Phase 3F report. Do not deploy synthetic `workspace-preview.invalid` / `preview-only` builds. Repeat the existing CI database preflight/apply rehearsals locally/CI, never against production under this phase.

Prior Phase 3F evidence: Roots 74 unit + 26 browser; Workspace/landing/auth/Notes/Reflections 50 browser; domain/workspace 273; Tasks 86; Momentum 74; Calendar 10; Auth 8; Friends 13; Circles 30; prelaunch 15; Echo 7; all 17 DB suites; TypeScript and web/iOS JS exports passed. These are recorded previous executions, not a claim that the entire suite reran in Phase 4A. This phase reran Roots 74, TypeScript and diff checks; no runtime code changed.

## 8. Executable manual QA handoff

Source: [Phase 3F Final Readiness](OHARA-Workspace-V2.0-Final-Readiness.md), including remaining Phase 3E accessibility gaps. **Every scenario below is NOT RUN.** Chromium fixture tests and JS exports do not mark physical iOS/Safari/VoiceOver tests passed.

For each scenario record: tester, date, exact candidate Git SHA/deployment URL or native build, device/OS/browser version, account role, steps, expected/actual, pass/fail/blocked and sanitized evidence. Use an approved nonproduction environment and synthetic accounts/content. Never remove a real collaborator or alter production records for a test.

### Physical iOS — actual iPhone/iPad and installed candidate required

- [ ] **IOS-01 Authentication:** cold launch → sign in → background/foreground → expire session → sign in again → sign out. Expect correct protected-route behavior, no previous-user content or crash. Exercise sign-up validation with approved test accounts.
- [ ] **IOS-02 Navigation:** Home → Calendar → a Task's Goal → Project → contextual Vault → Note/Reflection; native Back and a Roots legacy Vault link. Expect correct parent/context and return destination.
- [ ] **IOS-03 Home/Goals/Projects:** open populated, empty and failed-read states; create a test Goal/Goal-free Project; exercise lifecycle/successor and role-appropriate controls. Expect no hidden functionality or fabricated zero values.
- [ ] **IOS-04 Schedule integrity:** complete one binary and one quantity occurrence, repeat-tap while pending, retry a forced failure; inspect Calendar and published Momentum. Expect correct occurrence/date/assignee and one effective successful operation; closed weeks unchanged. Check recurrence/timezone/DST using approved fixtures.
- [ ] **IOS-05 Vault access:** owner/admin/member/guide/outsider/removed test member open direct and Goal-linked Entries/Sources. Expect canonical deduplication, private denial, authorized image/file reads and author-only mutations. Linking must not grant sharing.
- [ ] **IOS-06 Sources:** file/photo picker success, cancellation, denied permission, upload failure/retry, open/rename/delete own test Source; switch away/back. Expect no orphan UI duplicates or stale resurrected items. Test shared read-only access.
- [ ] **IOS-07 Editing:** edit/save Note and Reflection, shared read-only view, concurrent-version conflict, offline failure/retry. Expect preserved content and no silent overwrite or Echo-editor misrouting.
- [ ] **IOS-08 Appearance/input:** light/dark cold starts, rotation, notch/home-indicator safe areas, keyboard show/hide, smallest/largest supported Dynamic Type and touch targets. Expect readable unclipped controls and reachable confirmations.
- [ ] **IOS-09 Native calendar boundary:** validate current supported provider behavior; use the separate EventKit owner/handoff checklist for permissions/multiple calendars/read/write/device privacy. Do not merge the handoff branch or apply its migration as a QA shortcut. If EventKit is a native release requirement, its independent sign-off is mandatory.

### Safari — actual macOS Safari and iOS Safari required

- [ ] **SAF-01 Navigation/scroll:** desktop, narrow phone and tablet; sidebar collapse/drawer open, long page/list scroll. Expect no horizontal overflow, clipped footer or competing scroll traps.
- [ ] **SAF-02 Theme:** cold-load light/dark with stored and system preference; reload and switch. Expect correct initial surfaces/contrast without persistent white blocks.
- [ ] **SAF-03 Layout/type:** inspect landing/auth/Home/Goal/Project/Vault at 100%, then browser zoom/text scaling; long labels and empty/error states. Expect approved layout, aligned forms, readable fonts/icons, no rotated/clipped artwork.
- [ ] **SAF-04 Forms:** login/signup validation/autofill, search/filter, create/edit and failed-submit retry. Expect associated labels, keyboard submission, preserved input and clear errors.
- [ ] **SAF-05 Menus/modals:** keyboard-open Create, Manage Goal/Project, Source detail and confirmation; Tab/Shift-Tab, Escape and backdrop dismissal. Expect visible contained focus, reachable actions, no background interaction and return to trigger.
- [ ] **SAF-06 Links/history:** directly load Goal Tasks/Milestones/Vault, Project Goals/Vault, Sources query and legacy Reflection/Vault links; reload, Back/Forward, modified-click/new-tab. Expect selected context and canonical route, not a stale local tab.

### Accessibility — hands-on assistive technology required

- [ ] **A11Y-01 VoiceOver:** traverse navigation, headings, forms, selected tabs/filters, Task state, errors and dialogs on macOS/iOS. Expect meaningful names, state announcements and logical reading order; separately inspect Momentum chart/Roots canvas alternatives.
- [ ] **A11Y-02 Keyboard-only:** sign in, navigate, search/filter, open Goal/Project/Vault, edit an owned Entry, cancel destructive dialogs. Expect all actions reachable without pointer, no trap except intentional modal containment.
- [ ] **A11Y-03 Focus:** drawer/modal open/close, route changes, failed submission and validation errors. Expect focus visible, unobscured, deliberate and restored; review legacy dialogs too.
- [ ] **A11Y-04 Scaling:** 200% browser zoom/text and large native Dynamic Type across pages/editors/modals; narrow reflow. Expect no lost text, overlapping controls or inaccessible action buttons.
- [ ] **A11Y-05 Contrast/targets:** measure both themes' status/error/disabled/focus states, charts and icon controls; inspect actual hit areas/spacing. Core-token automated contrast is not whole-app certification. Record any exception for release-owner disposition.
- [ ] **A11Y-06 Names/states:** verify icon-only exports/menu buttons, input errors, busy/disabled controls, selected filters and loading announcements. Expect name/role/value and non-color state cues.

## 9. Blockers versus deferred improvements

| Gate | Current state / required disposition |
| --- | --- |
| Permission to integrate | **Blocked pending separate explicit authorization.** No staging/committing/merging/pushing in Phase 4A. |
| Team branch and ownership | **Unconfirmed.** Team must approve the fresh-main integration/PR destination and review shared UI/constants/store/domain seams; no assumption about unpushed work. |
| Comprehensive CI | **Pending.** Checked-in CI covers DB only; full application validation and history prerequisite must run on the reconciled candidate. Local Roots history is verified, actual CI isn't. |
| Durable recovery | **Verified locally.** Both original checkpoints and the complete current candidate are preserved in the approved Desktop folder; recovery and hashes pass. Keep the package before cleaning temporary storage. |
| Manual/platform QA | **Pending.** Physical iOS required for native release; real Safari and accessibility-critical workflows required for web release. |
| Preview and runtime compatibility | **Pending.** Use approved nonproduction backend/accounts; verify auth redirects, real RLS/storage and exact candidate SHA. |
| Production environment/rollback | **Pending release phase.** Current deployed SHA/immutable deployment ID/ledger and known-good rollback artifact have not been queried or certified. |
| EventKit branch | **Separate release gate.** Migration collision and device acceptance prohibit combining it unreviewed. Not a new Workspace migration requirement. |

Deferred, not silently implemented: complete global Vault All/paginated Source totals; relationship-only linking API; cross-owner Goals in one Project (currently rejected); repeated Project hydration optimization; legacy stored Goal percentage decisions; broad cache/provider work; Echo AI; comprehensive legacy-control accessibility remediation. Any confirmed critical accessibility, privacy, data-loss or auth defect is a release blocker, not a discretionary deferred improvement.

The earlier dependency audit reported 87 findings on the unchanged lockfile; severity/reachability must be triaged under the team's release/security policy. This phase did not rerun that audit or certify those findings safe. Existing Metro require-cycle warnings remain documented technical debt, not evidence of a new Workspace regression.

## 10. Recommended preview and release workflow — future authorization only

1. Confirm durable recovery, destination/owners and explicit integration scope. Fetch again, inspect every incoming commit and compare its file/hunk changes against both `d286285` and the complete uncommitted delta.
2. Create a fresh integration worktree from current team main only after authorization. Keep this completed worktree and backups untouched. Apply the reviewed landing prerequisite once, then explicit Workspace source/test/doc groups. Do not copy a whole directory tree over teammate work. Preserve unrelated/untracked files; no reset/clean/force push.
3. Resolve overlap conservatively with owners. Recheck API/migration/dependency differences; stop on new schema/auth/Task/Momentum changes requiring architecture approval. Review each logical commit and rerun the suites above after reconciliation.
4. With push/PR approval, use the team's confirmed review destination. Do not create a new deployment process: existing repository Vercel config uses `expo export -p web`, `dist/client`, the `api/index.ts` server wrapper and `dist/server/**`. Actual Git project linkage, preview branch behavior and access restrictions must be confirmed with the release owner; they are not established solely by `vercel.json`.
5. After preview authorization, build the exact candidate with approved nonproduction variables and backend, not test-fixture credentials. Record deployment ID/URL/Git SHA/build logs/environment identity (no secret values); verify deep-link routing, sign-up/sign-in callback origins and storage configuration. Confirm the deploy is nonproduction before any test writes.
6. Execute the manual checklist and owner/admin/member/outsider Vault smoke tests against real nonproduction RLS/storage. Verify Task occurrence idempotency/schedule and current/closed Momentum behavior; optional Echo/activity failures must not block core pages. Review sanitized network failures, console errors and server logs. Inspect loading/error states and no expensive AI/reconciliation on ordinary reads.
7. Production approval is separate. Before approval, require green reconciled CI/exports, resolved critical security/accessibility failures, reviewed migration compatibility and documented manual results. Confirm team main has not moved unreviewed. Do not infer production configuration from the synthetic exports.
8. Authorized release owner records current production SHA/deployment ID and rollback target, deploys via the established Vercel workflow, verifies exact new Git SHA, and repeats core production smoke checks with safe approved accounts. Stop/rollback on auth failure, denied/private-content leak, lost/duplicated writes, broken navigation/storage or serious runtime errors.

## 11. Rollback strategy

Before any future promotion, record in the release ticket: current production URL, immutable deployment ID/URL, Git SHA, deployment time, verified environment/configuration reference (no secrets), read-only migration-ledger state, approved candidate SHA, and a tested known-good rollback deployment. Confirm these from the deployment provider/established release records; **neither local HEAD nor upstream/main is proof of the currently deployed SHA**. These fields are intentionally unverified in Phase 4A.

Prefer promoting the retained known-good artifact through the established provider workflow after compatibility review; otherwise rebuild/redeploy its exact SHA with the approved matching configuration. Keep teammate changes in view when choosing a rollback. Workspace adds no schema changes, so do not reverse migrations or delete user data to roll back this UI/read-path release. Concurrent migrations may change that safety assessment and must be reviewed before promotion/rollback.

For source-level rollback, use reviewed reverse commits on the integration branch in dependency-reverse order; do not reset a shared branch or partially remove a context/service still imported by later commits. Recovery patches are for new recovery checkouts, not destructive replacement of the main worktree. Compare checksums and diffs before any restoration.

## 12. Phase 4A completion evidence

- Fetch succeeded for both remotes; HEAD remains `d286285dccd13cee607cd706fa56df589562e357`; upstream/main remains `b939327dfd70f44c650992e3c0337c8798a297d8`.
- Original Phase 3E/3F hashes, restored untracked bytes and reverse-apply checks pass.
- Roots: 74 passed, zero failed/skipped. TypeScript: passed. Diff whitespace check: passed.
- Durable package: both original checkpoints retain their recorded hashes; current source reconstruction passes reverse-apply and all 210 content hashes. Final documentation and package checksums are verified in the durable copy before handoff.
- No new runtime code, schema, assets or dependency changes. Manual scenarios remain NOT RUN. No stage/commit/push/merge/deploy.

**Stop after preflight. The next phase requires separate explicit authorization.**
