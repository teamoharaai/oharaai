# OHARA Workspace V2.0 — Phase 4E CI repair and integration review handoff

October 27, 2026. **Local CI corrections and validation complete. Ready for separately authorized blocked draft PR preparation/publication; NOT cleared for merge or production.** No staging, commit, push, merge, PR creation, GitHub workflow execution, preview deployment or production operation occurred.

## 1. Candidate integrity and protection

Authoritative candidate: `/private/tmp/ohara-workspace-v2-rehearsal`, intact Git worktree with detached HEAD **`b939327dfd70f44c650992e3c0337c8798a297d8`**. The incomplete original Workspace directory was not used or modified.

Before editing, verified:

- All **27 checksums** in `/Users/arthursilva/Desktop/OharaBackup/OHARA-Workspace-V2-Phase4D-Review-2026-10-26/SHA256SUMS`.
- All **137 candidate file hashes**, exact base-relative binary patch and complete untracked-path membership against that backup; index empty.
- Created `/private/tmp/ohara-4e-start.iBb6C7` as an independent copy of the verified recovery package and verified all checksums again. The durable Phase 4D package remains the immutable pre-change recovery source.
- Preserved the Phase 4C security-remediated lockfile byte-for-byte. Fresh installation has zero version mismatches with the lock and no missing nonoptional packages. No dependency downgrade, override or manifest edit.

Phase 4E's exact delta from 4D is **three paths only**:

1. `.github/workflows/workspace-validation.yml`: two semantic CI corrections and updated local-only header comment.
2. `CHANGELOGCODEX.md`: Phase 4E entry under Unreleased.
3. This new handoff document.

Final accumulated inventory: **138 paths, 77 modified tracked files and 61 untracked files**. All other inherited files remain byte-identical to 4D. Generated `.expo/types/router.d.ts` was saved to `/private/tmp/ohara-4e-generated-router.d.ts`, then returned to the original candidate bytes; final TypeScript passed. No application code, assertion baselines, schema, permissions or production configuration changed.

No upstream refresh/reconciliation was needed for this narrow CI edit, and no fetch was performed in 4E. Team main was last verified at the same base during 4D on October 26; **fetch and inspect incoming changes again before integration**, not a claim that main cannot have changed since then.

## 2. Exact CI corrections

### CI-1 — Supported screenshot-output context

Removed `OHARA_VISUAL_OUTPUT_DIR: ${{ runner.temp }}/ohara-visual-evidence` from `jobs.application.env`. Added the same value under the **Workspace, landing, authentication, Notes and Reflections browsers** step's `env`.

GitHub permits the `runner` context at `jobs.<job_id>.steps.env`, not job-level `env`. This follows the [documented context availability rules](https://docs.github.com/en/actions/reference/workflows-and-actions/contexts#context-availability). The evidence helper still resolves capture paths under the supplied external directory. The existing helper tests pass; this run produced **82 capture-only PNGs outside the repository**, under `/private/tmp/ohara-4e-visual-evidence`. Roots assertion snapshots are separate and unchanged. No Playwright assertion, capture helper or application code was edited.

### CI-2 — Explicit supported macOS runner

Changed only the application job's `runs-on` from `macos-14` to **`macos-15`**, not `macos-latest`. Ubuntu database/audit runners are unchanged.

GitHub's [runner-image catalog](https://github.com/actions/runner-images#available-images) maps `macos-15` to **arm64**. The [published image inventory](https://github.com/actions/runner-images/blob/main/images/macos/macos-15-arm64-Readme.md) lists macOS 15, Bash, Git, tar, Xcode command-line tools and Node. The job deliberately installs **Node 24** through existing `actions/setup-node@v7`, rather than relying on the image's preinstalled Node 22. The action defaults to the host architecture; no architecture override was added. [setup-node metadata](https://github.com/actions/setup-node/blob/v7/action.yml)

Playwright's [supported platform requirements](https://playwright.dev/docs/intro#system-requirements) cover macOS 14+ and Node 24. The locked Chromium installer command succeeded locally using the available cache; no new browser download is claimed. The hosted job retains `npx playwright install chromium` and must exercise that installation on its actual runner. The runner label fixes the OS family, not an immutable image revision; record the hosted image version during later approved execution.

**Important boundary:** the local machine is **macOS 26.6.2 arm64**, Node **24.18.0**, not a GitHub-hosted macOS 15 VM. Clean install, exports and existing Roots visual comparisons passed locally; hosted macOS 15 rendering, action startup, package installation and toolchain compatibility remain **NOT EXECUTED**. No baseline was regenerated or tolerance relaxed to hide a platform difference.

## 3. Workflow validation evidence and limits

`actionlint` and Go are not installed/on PATH. No validator or toolchain was installed globally and no application dependency was added. This limitation is explicit; **no actionlint pass is claimed**.

Executed a temporary targeted validator at `/private/tmp/ohara-4e-validate-workflow.cjs`; evidence is `/private/tmp/ohara-4e-workflow-validation.log`:

- YAML parse passed; all **13 shell blocks** passed `bash -n`.
- Inspected every current expression against its documented key/context allowance: `github.workflow` and `github.ref` in concurrency, `runner.temp` in browser-step environment, and `matrix.default-acl` in database-job environment. All **four expression occurrences** passed.
- Negative control: the verified pre-fix workflow fails this same context check specifically at job-level `OHARA_VISUAL_OUTPUT_DIR`.
- Deep semantic comparison against the archived pre-fix YAML confirms **exactly the runner change and environment relocation**, with no other workflow semantics changed.
- Confirmed `contents: read`, full-history checkout, Node 24, unchanged audit command and absence of `continue-on-error`.
- Both pinned Roots Git objects are available: commit `5df3a3bc7b0e4d471fcaa0d679615b9a46c2b96f` and its `handoff_constellation/concepts` tree.

This is a narrow executable check of all expressions present, **not a general GitHub Actions expression parser or hosted schema validation**. The subsequent authorized PR should run actionlint/full workflow validation and actual Actions. No workflow dispatch, publishing, remote checks or branch-protection changes occurred here.

## 4. Fresh functional regression results

All rows below are new Phase 4E executions, not reused 4D passes. Tests used synthetic browser fixtures and disposable local database clusters, never production data/accounts.

| Check | Result |
| --- | --- |
| Locked npm install and existing patches | Passed; 863 packages, lock unchanged |
| Playwright Chromium installation command | Passed; existing cache accepted |
| Workflow structure, current expressions, negative control, semantic scope | Passed as scoped above; actionlint unavailable |
| Roots historical pin / unit tests | Available / **74 passed** |
| Roots Chromium visual/interaction acceptance | **26 passed**, original baselines |
| Workspace/landing/auth/Notes/Reflections browser regressions | **52 passed**, including clipboard security checks |
| Entries/Projects/insights/Sources/Goals/lifecycle/workspace/helpers | **278 passed** |
| Tasks / Momentum / Calendar | **86 / 74 / 10 passed** |
| Auth / Friends / Circles | **8 / 13 / 30 passed** |
| Prelaunch / Echo composer | **15 / 7 passed** |
| Full database/security chain, hosted-default ACL | **All 17 suites passed** |
| Full database/security chain, CLI-default ACL | **All 17 suites passed** |
| TypeScript after full-app browser run, after exports, after generated-file restoration | Passed |
| Web JavaScript export | Passed, `/private/tmp/ohara-4e-web` |
| iOS JavaScript export | Passed, `/private/tmp/ohara-4e-ios` |
| Diff integrity, unchanged baselines/lock/schema, empty index | Passed |
| npm high-severity audit gate | **Failed, exit 1**, with unresolved findings below |

Totals: **78 browser checks and 595 unit/domain checks passed**. No expensive requested suite was omitted. No new functional failure was observed. Existing Metro import-cycle warnings remain; no unrelated refactor was made.

Installation first failed with sandbox DNS `ENOTFOUND`; it succeeded with approved network access. See `ohara-4e-npm-ci-verified.log` for the successful run, not the earlier failure. Existing optional fsevents install-script approval warnings were not bypassed. Other logs use `/private/tmp/ohara-4e-*.log`.

Validation order: clean locked install → units → Roots isolated browser/router → full Workspace browser/router → TypeScript → web/iOS exports → TypeScript → generated-file restoration → TypeScript and integrity. The database modes ran independently. Browser/export configuration explicitly used synthetic `.invalid` Supabase values. **Do not deploy these exports.** iOS JS export is not native compilation/signing or physical-device acceptance.

## 5. Security gate and fresh audit metadata change

No dependency versions or security policy changed in this phase. The workflow still runs `npm audit --package-lock-only --audit-level=high`; no bypass, allowlist or artificial green result was introduced.

| Audit record | Critical | High | Moderate | Low | Affected package entries |
| --- | ---: | ---: | ---: | ---: | ---: |
| Verified Phase 4D, October 26 | 0 | 7 | 39 | 1 | 47 |
| Fresh Phase 4E, October 27, identical lock | 0 | 6 | 39 | 1 | 46 |

The fresh response omits the propagated `@expo/code-signing-certificates` entry and no longer propagates forge through the CLI; **`node-forge@1.4.0` itself remains high**. Current high entries: `@expo/cli`, `expo`, `image-size`, `node-forge`, `postcss`, `zod`. Underlying certificate-verification evidence and owner-review requirements have not disappeared. These are npm package/propagation counts, not independent vulnerabilities or a measured exposure reduction.

Other response changes include `fixAvailable: true` for forge and several framework paths, and a revised selector-parser advisory range (`<6.1.5` instead of the previous `<7.1.6`). No fix was installed or compatibility-tested; a future dependency-remediation authorization should refresh candidate versions and constraints. Do not reuse 4C's “no fix available” or framework-downgrade suggestion as a timeless registry fact. Raw current response: `/private/tmp/ohara-4e-audit.json`; the previous raw response remains in the durable 4D package. This is **audit metadata drift**, not a Phase 4E remediation. The gate still fails, and production remains blocked.

## 6. Security owner decision packet

The following summarizes existing [4C evidence](OHARA-Workspace-V2.0-Dependency-Security-Review.md) and [4D dedicated findings](OHARA-Workspace-V2.0-Integration-Review.md). It does not invent new reachability conclusions. Remediation thresholds are the reviewed advisory bounds, not a newly tested upgrade plan. All rows need a named accountable owner; responsibility labels below are not invented approvals.

| Finding / reviewed version | Evidence and unresolved boundary | Required decision and reviewers |
| --- | --- | --- |
| **Forge / certificates:** node-forge 1.4.0; code-signing-certificates 0.0.6; GHSA-86w9-cpqp-85rv | CLI/certificate code invokes forge verification; ordinary app crypto import not found. Signing-input trust and adversarial verification remain unresolved. A disappearing propagated parent entry does not fix installed forge. | **Security + native signing/release + framework owner:** refresh now-advertised remediation, approve and validate a compatible fix, or explicitly accept a bounded signing-input mitigation with expiry. No crypto rewrite or exception approved here. |
| **Zod / Expo CLI:** Zod 3.25.76, CLI 55.0.18; GHSA-mrhx-c7xc-m3w5 | DevTools/MCP schemas import Zod; no app runtime caller found. Exact unbounded-collection input reachability is not proven or excluded. Reviewed fixed line 4.6.6+ crosses CLI's current major range. | **Security + framework/tooling owner:** supported CLI/dependency fix or documented bounded-input exception. Keep developer tools nonpublic, but do not treat that recommendation as proof of remediation. |
| **Image-size / Metro:** 1.2.1; GHSA-5p2g-fcmc-qvqq and GHSA-w3rx-r6r6-pgpr | Metro parses repository/dependency image assets. No Source-upload caller found; build inputs are not universally proven trusted. Reviewed fixed line 2.0.3+ is outside Metro's 1.x range. | **Security + framework/native build owner:** supported update or compatibility-tested override under new authorization; otherwise time-bounded build-input/isolation exception. No new exploit conclusion. |
| **PostCSS / source maps:** 8.4.49; GHSA-6g55-p6wh-862q, GHSA-r28c-9q8g-f849, plus GHSA-fxqj-rqcc-2cmp and GHSA-qx2v-qp2m-jg93 | Metro transforms CSS; default map-off reduces one path, but config can enable maps. No public user-CSS processor found; untrusted PR/build parsing remains relevant. Reviewed complete fixed line 8.5.23+ is outside Expo's tilde range. | **Security + framework/build/UI-tooling owner:** approve tested Metro/NativeWind-compatible remediation or expiring restricted-build exception. Do not give release credentials to untrusted builds. Fresh audit fix hints are not validation. |
| **Tiptap mergeAttributes:** core 2.27.1; GHSA-cp6q-959q-f8rh | Custom web editor renderers use mergeAttributes. Server allowlisting does not establish safety for every legacy/paste path. Separate from the already-remediated ProseMirror slice-context bug; reviewed fix line 3.30.4+. | **Security + editor owner:** approve coordinated editor remediation/major migration with clipboard/save/read-only regressions, or explicit evidence-backed, time-bounded exception. This runtime concern cannot be hidden by build-only classifications. |
| **Embedded React DevTools:** react-devtools-core 6.1.5 standalone, embedded old shell-quote; GHSA-w7jw-789q-3m8p / GHSA-395f-4hp3-45gv | Installed shell-quote 1.12.0 is fixed, but standalone bundle still contains old code. Inspected caller parses local REACT_EDITOR; object-token quote call not found. RN's dev-gated backend map lacks shell-quote. Neither observation is blanket harmlessness. | **Security + native/tooling owner:** supported bundle remediation or expiring exception specifying trusted local configuration, tool exposure and evidence gaps. npm's zero critical count does not certify bundled code. |

Also retain routing/URL decoding, selector parsing, uuid/native tooling and low Babel findings from the complete inventory. No unresolved finding is silently waived because it is moderate or not listed as a separate high parent today.

For **every** accepted exception require: advisory/package/version/path; evidence and exposure assumptions; enforced compensating controls; named approver; exact expiry; vendor/change/release retest trigger; and explicit merge/release disposition. No exception is granted by this document. Re-review by **November 2, 2026**, or sooner on an upstream fix, exposure change or promotion. The unchanged audit check will remain failing unless findings are fixed; any team exception workflow must be separately authorized and transparent, not a hidden CI bypass.

## 7. Commit and PR handoff (text only)

Preserve the Phase 4D [A–D path/hunk plan](OHARA-Workspace-V2.0-Integration-Review-Inventory.md):

- **A — Validation foundations:** Roots history/test corrections, Node URL typing, capture helpers and only matching capture-path hunks.
- **B — Landing and Workspace:** the coherent shared design/Home/Goals/Projects/contextual Vault implementation, hardening and matching tests; landing prerequisite once.
- **C — Security remediation:** reviewed 4C lock delta and security regression tests. **No 4E dependency delta.**
- **D — CI and release documentation:** now includes these two workflow repairs, the Phase 4E changelog entry and this additional handoff path. A–C boundaries are unchanged; the historical 4D inventory remains a 137-path record, extended to 138 by this document.

No intermediate commits were constructed or validated. Verify build integrity at each boundary during separately authorized assembly. Do not stage generated routes, screenshots, logs, secrets, caches or exports. Proposed branch `codex/workspace-v2-integration` and team-main destination require the separate integration/publication phase; no branch or PR is created here.

### Draft PR description — ready to copy after authorization

**Title: Workspace V2.0 — Experience Redesign & Security Remediation**

**Status: DRAFT — MERGE AND PRODUCTION BLOCKED**

#### Summary

Integrates the approved Landing Page V2.0/authentication presentation and Workspace design foundation, refined Home, Goals and Projects experiences, and unified contextual Vault. Goals retain Overview/Tasks/Milestones/Vault; Projects retain Overview/Goals/Vault and category-coded list/grid presentation. Vault groups Notes, Reflections and Sources without a competing library or new permission model. Existing brand assets, routes and writing workspaces are preserved.

Echo remains the name for existing intelligence/contextual insights; this PR does **not** implement Echo V2.0, a new AI pipeline or generation-on-page-mount behavior. Existing Task recurrence/scheduling, Calendar occurrence actions and Momentum V1.1 calculations/closed-week history remain canonical. Viewer-RLS Vault reads, canonical Entry authorization and race/error/focus safeguards remain enforced. No new database migration or auth model change is included; EventKit and archived Tracker stay separate.

Includes compatible Phase 4C transitive dependency fixes, including ProseMirror clipboard validation, plus targeted security regressions. Direct framework/editor dependency declarations remain unchanged. Phase 4E repairs workflow environment-context placement and selects macos-15; it does not alter dependencies or soften the high-severity audit policy.

#### Validation evidence

- Fresh local Phase 4E: 78 browser checks, 595 unit/domain checks, 17 database/security suites in each ACL mode, TypeScript and web/iOS JavaScript exports passed.
- Locked reinstall and Chromium installation command passed; original Roots snapshots and pinned historical Git objects verified. Capture evidence stayed outside the repository.
- Targeted workflow/YAML/shell checks passed, including pre-fix negative context control. actionlint unavailable; actual GitHub-hosted macOS 15 execution **not yet performed**.
- Fresh unchanged-lock audit still fails: **0 critical / 6 high / 39 moderate / 1 low = 46 affected package entries**. Prior reviewed audit was 47/7 high; the difference is metadata propagation, not a new fix or waiver.

#### Blockers / reviewer decisions

Security/framework/native/editor owners must resolve or explicitly disposition forge/certificates, Zod/CLI, image-size/Metro, PostCSS, Tiptap mergeAttributes and embedded DevTools risks, plus the remaining inventory. No approved exceptions exist. Keep the dependency audit failure visible.

CI owners must execute the corrected workflow after authorization, verify hosted snapshots/toolchain/full-history access and set required checks without suppressing findings. Product/domain owners must review the accumulated shared interfaces and fetch/reconcile any new teammate changes.

Still pending: approved real nonproduction auth/RLS/storage/shared-image tests; installed physical iOS; actual desktop/mobile Safari; VoiceOver, keyboard/focus, text scaling, contrast and touch-target acceptance; production environment/current deployment SHA and rollback confirmation. Synthetic JS exports are not deployable artifacts or native-device evidence.

**Required reviewers by responsibility:** product/design; shared shell/theme/auth/cache ownership; Goals/Projects/Task/Calendar/Momentum domains; Vault/Source authorization and storage; editor; framework/native build/signing; security; CI/release engineering; iOS/Safari/accessibility QA.

**Do not merge or deploy until these gates are closed and separate release authorization is recorded.**

## 8. Remaining gates and next authorized operation

CI-1 and CI-2 are corrected **locally**. Remaining merge/production gates are unresolved security disposition with a failing audit; actual approved remote CI (including hosted visual compatibility and full validator coverage); owner review; real nonproduction permission/storage testing; physical iOS, Safari and accessibility acceptance; environment/deployed SHA/rollback confirmation; and explicit publication/merge/deployment authority.

Recommended next authorization: prepare the explicit A–D commits on a fresh integration branch after refreshing team main and checking ownership overlaps, then publish a **blocked draft review PR**, if the team wants review while security work remains open. That authorization should also explicitly permit normal PR-triggered nonproduction CI. Do not treat authorization to publish a draft PR as authorization to merge, create a preview deployment, change dependencies or deploy production. Resolve dependency findings in a separately scoped remediation phase with the responsible owners.

Manual checklist remains entirely pending: physical iOS launch/auth/navigation/Tasks/Calendar/Vault/editing/pickers/safe areas/Dynamic Type; macOS/iOS Safari navigation/forms/modals/themes/deep links/history; VoiceOver/keyboard/focus/text scaling/contrast/touch targets; nonproduction owner/admin/member/guide/removed-member RLS/storage/image checks. Record tester, date, device/browser/OS, tested SHA, role, expected/actual result and evidence. Do not mark these complete from Chromium automation or JS exports.

## 9. Evidence and recovery handoff

Final package: `/Users/arthursilva/Desktop/OharaBackup/OHARA-Workspace-V2-Phase4E-Handoff-2026-10-27`. It contains the accumulated base-relative patch, explicit untracked archive, 138-path hash manifest, validation/audit logs and the targeted validator. Original 4D and earlier backups remain intact. Restore only into a new empty checkout/archive of the recorded base, verify `SHA256SUMS`, apply the single accumulated patch once, extract untracked files, and verify every file hash. Do not stack older phase patches or repeat the landing prerequisite. Supply credentials through the existing secure process, never through these backups.

**STOP: Phase 4E local CI repair, validation and blocked draft-PR handoff complete. No staging, commit, push, merge, PR publication, deployment or production mutation.**
