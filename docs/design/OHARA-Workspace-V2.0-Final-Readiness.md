# OHARA Workspace V2.0 — Final readiness / Phase 3F

October 23, 2026. **Automated validation passed; manual acceptance and integration approval remain outstanding.** Nothing committed, pushed, merged or deployed. No production database/service changes, Echo AI implementation, or visual redesign.

## 1. Preservation and recovery

Worktree: `/private/tmp/ohara-workspace-v2`. Branch: `codex/workspace-design-system-v2-phase1`. HEAD remains `d286285dccd13cee607cd706fa56df589562e357`. Completed phases and unrelated files are preserved; nothing staged and no tracked deletions.

- Existing pre-3E checkpoint: `/private/tmp/ohara-phase3e-checkpoint.Rgtn2H` — 71 tracked changes plus 83 untracked files. Both previously recorded SHA-256 digests still match.
- New pre-3F checkpoint: `/private/tmp/ohara-phase3f-checkpoint.4iKL5d` — 113 tracked changes plus 88 untracked files. `tracked.patch` SHA-256: `d825cae4e4075cdf81374ae93b19a1aa2102d4fd0e5d63aa592b78cf671deb12`; `untracked.tar.gz`: `879ccfd5fe19b14721565b292927b878b3ef891925f671871ab2d8ec922ceac2`.
- Recovery was **executed**, not merely proposed: exported the recorded HEAD to `/private/tmp/ohara-recovery-3e.vzsDGc` and `/private/tmp/ohara-recovery-3f.08fLH2`, applied each binary patch, extracted each untracked archive, and passed reverse-apply checks. All restored untracked file bytes match their respective archives.
- Both checkpoints exclude ignored dependencies, credentials/environment files and generated runtime outputs. Keep needed secrets separately in the established secure configuration system. Temporary directories are not durable backups; copy the checkpoints to approved durable storage before OS cleanup or integration.
- Browser runs refreshed capture-only PNGs; the existing pre-3F capture files were restored byte-for-byte from the verified checkpoint afterward. Roots assertion snapshots were never updated. The final full-app generated route declarations also match the pre-3F checkpoint. No earlier runtime source change was lost.

## 2. Roots root cause and safe resolution

Failing test: `features/constellation/fixture-boundary.test.ts`, formerly “restored concept references preserve the exact commit 5df3a3b bytes and dimensions.” It required the exact five-file set, PNG signature, width/height and SHA-256 hashes under `docs/constellation/reference/5df3a3b/concepts/`:

| Missing filename (under that directory) | Dimensions | Original SHA-256 |
| --- | --- | --- |
| `1a-canvas-restrained.png` | 2362 × 1522 | `c4671e77d8527c9dbdd7e6fa7a304695f3c7bcdf53ea382e4673d2ea25244bca` |
| `1b-canvas-atmospheric.png` | 2362 × 1522 | `dfb44e2bbe126cff03ff944339da3dbc359fb1207c23f0b8417edcf1d3275f64` |
| `1c-goal-inspector.png` | 1642 × 1442 | `ddddf43f05e3b6d829729b19cd89a508e678a7401f58cf61cec1fd222f6752dc` |
| `1d-reflection-inspector.png` | 1642 × 1442 | `706bddc9a9e44b6695719cb4ff663d9339877e47d05ad16fbf51fcd7fc5762b7` |
| `1e-empty-state.png` | 1922 × 1282 | `4cbee78c45e0c870272bb6e614b659c2bead46871a600e862230cef645660470` |

Git provenance:

1. `5df3a3bc7b0e4d471fcaa0d679615b9a46c2b96f` introduced the originals at `handoff_constellation/concepts/` on July 28.
2. `7e52b7f` removed the handoff bundle that day. `cae56aa424ba3585364e29e303fb8f9839b01fa5` restored the five images under the documentation-reference path. The original and restored Git blob IDs match for every file: no recompression or replacement.
3. `854b2c4cb1e9a8f600f4fde2e99947823eb64fbe` deliberately removed the documentation copies on September 17, moving heavy historical references to `jvillalta1903-cmyk/oharaai-archive` with mirrored paths. `docs/CLAUDE.md` explicitly says not to copy archival content back in-tree. This was intentional archival, not an ignore rule or a Workspace V2.0 deletion.
4. The test was unchanged before/after that removal and at the Phase 3F baseline: file SHA-256 `e92dd05fce07f384a92b83d9de167cfa7d54ab8e09a2be939c07fb6129855b01`. Therefore the filesystem assumption predates Workspace V2.0.

**Resolution:** correct the obsolete test source location. It now reads the original pinned Git tree/blobs directly, without restoring heavy binaries to the working tree. Every exact-name, PNG signature/dimension and SHA-256 assertion remains. Production-import boundary assertions are unchanged. These are historical design evidence, not application assets, current UI snapshots, or runtime fallbacks. No artwork was generated and no Roots runtime code changed.

The test requires Git history containing the pinned commit. It performs no network access or silent fallback/skip. A negative check with an isolated empty Git object directory failed with the explicit pinned-history setup error, as intended. Full-history CI or a deliberate fetch of that exact commit is a prerequisite; instructions are in [REFERENCE_CONCEPTS.md](../constellation/REFERENCE_CONCEPTS.md). The archive repository itself was not modified or required over the network.

### Additional stale Roots acceptance expectations

Running the broader existing Roots browser suite exposed one Focus interaction test expecting “Constellation” and “Constellation · Focus.” Runtime headings already became “Roots” and “Roots · Focus” in `b78c650` on September 19, before Workspace V2.0. Corrected those two exact heading expectations only. Same-route behavior, inspector/evidence assertions and existing screenshots remain enforced. No snapshot baseline was updated.

## 3. Automated validation — final results

| Check | Result |
| --- | --- |
| Complete Roots unit/boundary suite | **74 passed, 0 failed** |
| Roots browser visual/interaction acceptance | **26 passed, 0 failed**; existing snapshots compared, not replaced |
| Workspace, landing/auth, Notes/Reflections browser regression | **50 passed, 0 failed** |
| Domain/workspace: Entries, Projects, insights, Sources, Goals/lifecycle | **273 passed** |
| Tasks | **86 passed** |
| Momentum | **74 passed** |
| Calendar | **10 passed** |
| Auth | **8 passed** |
| Friends | **13 passed** |
| Circles | **30 passed** |
| Prelaunch | **15 passed** |
| Existing Echo composer/reconciliation | **7 passed**; no external AI generation |
| Real migration-chain/database/security harness | **All 17 suites passed** against disposable local clusters |
| TypeScript before and after correction | **Passed**, including final check after Roots acceptance |
| Web production export | **Passed**: `/tmp/ohara-3f-web` |
| iOS JavaScript export | **Passed**: `/tmp/ohara-3f-ios`; not an installed native build |
| `git diff --check` | **Passed** |

Commands used: `npm run test:constellation`; `npx playwright test --config tests/constellation/playwright.config.ts`; `npx playwright test --config tests/workspace-v2/playwright.config.ts`; the Phase 3E combined `node --experimental-strip-types --test` domain command; `npm run test:{tasks,momentum,calendar,auth,friends,circles,prelaunch,echo-composer}` individually; `bash scripts/db-chain/run.sh`; `npx tsc --noEmit`; `npx expo export --platform web|ios` separately.

Browser data are synthetic/intercepted. Database tests use disposable clusters, not production. Exports used explicit `https://workspace-preview.invalid` / `preview-only` Supabase values: these are build checks, **not deployable production-configured artifacts**. Logs: `/tmp/ohara-3f-*.log`. Final browser logs are `/tmp/ohara-3f-browser-final.log` and `/tmp/ohara-3f-roots-browser-final.log`; the earlier Roots run records the corrected stale-label failure. `/tmp/ohara-3f-tsc-final.log` is empty (successful final typecheck). `/tmp/ohara-3f-missing-history.log` is an intentional failing prerequisite probe, not an unresolved normal-suite failure.

The isolated Roots preview regenerates `.expo/types/router.d.ts` for its intentionally smaller route tree. Running a whole-app typecheck immediately afterward consequently reports missing application routes, not a product regression. The final validation order restores the full application route context by running Workspace acceptance after Roots, then reruns TypeScript without casts, suppressions or compiler relaxation. Use this order in the shared working directory, or isolate preview builds in CI.

Existing Metro require-cycle warnings and unavailable `xcrun simctl` remain environment/technical-debt notes. No production performance numbers or physical-device success are inferred from local tests.

## 4. Complete implementation/change inventory

[Full path-by-path working-tree inventory](OHARA-Workspace-V2.0-Change-Inventory.md) lists all accumulated tracked modifications and non-ignored untracked additions against the preserved HEAD. It includes prior phases, not just Phase 3F; do not stage it indiscriminately.

| Area | Completed local implementation / preserved boundary |
| --- | --- |
| Public landing/auth | Approved gradients, white palette, brand/copy, editorial spacing, form alignment; existing auth routes |
| Foundation | Scoped web themes/type, sidebar and mobile drawer, create/account controls; native shell retained |
| Home | Published Momentum, Next Step, Calendar/Today's Focus hierarchy, independent loading/error states |
| Goals | Library/detail navigation, lifecycle/category/context filters, Overview/Tasks/Milestones/Vault, canonical creation and lifecycle operations |
| Projects | List/grid and category coding, independent Goal-free workspaces, Overview/Goals/Vault, collaboration, task/milestone controls and chat |
| Vault | Existing Notes/Reflections/Sources hierarchy, viewer-RLS contextual aggregation/deduplication, unchanged ownership/sharing, compatible legacy links |
| Phase 3E | Source stale-response/tab persistence, Calendar pending/error handling, activity error isolation, dialog focus/semantics, enlarged-text wrapping, terminology and Node URL test typing |
| Phase 3F only | Historical Roots test reads pinned Git bytes; two exact Roots browser labels corrected; reference/readiness/rollout/changelog documentation |

Prior design/validation reports remain authoritative for each implementation: [foundation](OHARA-Workspace-Design-System-V2.0.md), [Home](OHARA-Home-V2.0-Phase-2.md), [Goals](OHARA-Goals-V2.0-Phase-3B.md), [Projects](OHARA-Projects-V2.0-Phase-3C.md), [Vault](OHARA-Vault-V2.0-Phase-3D.md), [hardening](OHARA-Workspace-V2.0-Phase-3E-Readiness.md), [rollout](OHARA-Workspace-V2.0-Rollout.md).

No Phase 3F production code, schema migration, dependency, editor, scoring, provider, caching, auth bootstrap or API contract changed. The main checkout and production services were untouched.

## 5. Manual acceptance checklist — ALL pending execution

Record tester, date, device/OS/browser/build SHA, scenario, result and evidence. Automated Chromium checks cover subsets; they do not mark any manual checkbox below complete.

### Physical iOS — actual iPhone/iPad and installed build required

- [ ] Cold/warm launch, sign-in/up, sign-out, expired session, background/foreground.
- [ ] Home → Calendar → Task → Goal → Vault; Project/Goal navigation and native Back/legacy Roots links.
- [ ] Goal creation, scheduling, milestone/lifecycle/successor behavior; independent Project creation and collaboration roles.
- [ ] Vault owner/admin/member/guide reads, private Entry denial, removed collaborator denial, shared images and Source permissions using approved test accounts.
- [ ] Complete one Task occurrence; verify Calendar and Momentum update once, with historical snapshots intact. Check Apple Calendar permissions/projections separately.
- [ ] Edit/save Notes and Reflections, shared read-only behavior, failed save/retry, Source pickers/upload/rename/delete/cancel.
- [ ] Light/dark launch, rotation, safe areas, touch targets, keyboard avoidance/dismissal and larger Dynamic Type.

### Safari — actual macOS Safari and iOS Safari required

- [ ] Desktop/tablet/mobile widths; expanded/collapsed sidebar/drawer, scrolling and no trapped/overflowing content.
- [ ] Navigation, deep links, reload and Back/Forward retain Goal/Project/Vault context.
- [ ] Auth/creation/editor forms: labels, validation, autofill, keyboard input and failed submissions.
- [ ] Menus/modals: open/close, Escape where supported, background scrolling, focus restoration and destructive confirmation.
- [ ] Font loading, typography, icons/brand assets, gradients and text wrapping against approved screenshots.
- [ ] Fresh light/dark initialization and reduced motion without white-flash surfaces or blocked controls.

### Accessibility — hands-on assistive technology and visual assessment required

- [ ] VoiceOver on macOS/iOS: reading order, landmarks, headings, labels, state/error announcements, charts and Roots inspector behavior.
- [ ] Keyboard-only all primary workflows; visible focus, no trap outside dialogs, focus not obscured, dialog/menu containment and return.
- [ ] Review remaining legacy dialog names and icon-only controls, not just the Project/Source dialogs corrected in Phase 3E.
- [ ] 200% text, browser zoom/reflow and native Dynamic Type across forms, editors, calendars and dialogs without lost controls.
- [ ] Measure remaining status/disabled/focus color pairs and touch-target spacing. Core token contrast checks are not whole-site WCAG certification.

## 6. Outstanding integration/release gates

- **No failing automated check remains in the normal full-history local workflow.** Integration CI must have the pinned historical Git commit; a shallow/source-only checkout without it will correctly fail the Roots reference check.
- Manual iOS, Safari and assistive-technology acceptance above are unexecuted. Existing Phase 3E accessibility gaps (legacy names, charts/canvas semantics, all colors/targets/scaling) require review and explicit disposition before a broad accessibility claim or final release approval.
- Upstream reconciliation and co-founder overlap review are not performed in this phase. The accumulated dirty worktree must be reviewed; successful local tests do not authorize integration.
- No explicit commit/push/merge/deployment authorization. No real-environment preview or production smoke testing was performed.
- Broader cache/provider changes, Source pagination/global All, linking UX and Echo AI remain deferred scope, not hidden additions.

## 7. Safe integration prerequisites and recommended sequence

1. Preserve checkpoints durably, review the path inventory and separate source/test/document changes from synthetic screenshot evidence. Retain unrelated untracked files; do not use blanket staging or destructive cleanup.
2. Complete manual acceptance on approved test accounts/builds, record results, resolve or explicitly accept remaining gaps. Confirm the integration/CI checkout can read the pinned Roots commit.
3. Obtain authorization for integration; fetch/reconcile current upstream in a recoverable checkout, inspect incoming changes and co-founder ownership, and preserve the reviewed Workspace delta. Do not force-push or overwrite partner work.
4. Rerun all listed suites/typecheck/exports after reconciliation. Verify the production migration ledger/readiness separately; this patch adds no schema changes and does not authorize migration application.
5. Review and authorize specific commits, then push through the established repository path. Use the existing nonproduction preview/release workflow with real configuration and approved test data; verify deployed SHA and auth/role workflows.
6. Obtain separate production approval, record the current production SHA and rollback target, deploy through the existing workflow, then verify boot/auth, Home, Goal/Project, collaborator Vault and canonical Task/Momentum flows. Stop and roll back safely on failed gates.

## 8. Rollback considerations

- Local recovery: reconstruct a checkpoint into a separate directory at the recorded base HEAD; compare before restoring files. Do not reset the working tree or discard unrelated work.
- Future release rollback: record the last known-good deployment/configuration before deployment and retain its artifact. Redeploy that known-good SHA through the existing process if required; never assume this old local base HEAD is the current production rollback target.
- No database rollback is introduced by Phase 3F. Do not delete or reverse user data to undo a UI/test release. Check compatibility with any concurrent migrations before selecting a rollback SHA.
- Keep schema/API/session compatibility, content ownership and closed Momentum history intact. Review errors without logging private Entry content or credentials.

**Stop here: Phase 3F automated resolution and manual-QA preparation complete; integration and deployment remain gated.**
