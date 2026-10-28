# Workspace V2.0 — Integration publication

Date: October 27, 2026. **DRAFT — NOT APPROVED FOR MERGE OR PRODUCTION.**

## Provenance and isolation

- Team base: `b939327dfd70f44c650992e3c0337c8798a297d8`, freshly fetched from `teamoharaai/oharaai:main` during Phase 4F; no incoming changes at assembly.
- Source: `/private/tmp/ohara-workspace-v2-rehearsal`. Its Phase 4E recorded status, accumulated patch, untracked membership and 138 candidate hashes matched the durable handoff in `/Users/arthursilva/Desktop/OharaBackup/OHARA-Workspace-V2-Phase4E-Handoff-2026-10-27`; package checksums verified.
- Fresh worktree: `/private/tmp/ohara-workspace-v2-integration`; branch: `codex/workspace-v2-integration`. Recovery material applied exactly once. Original worktrees and backups preserved; no EventKit or Tracker import.
- Exact inventory: [review inventory](OHARA-Workspace-V2.0-Integration-Review-Inventory.md), plus the Phase 4E handoff already included in the 138-file candidate. Phase 4F adds this report and the explicitly approved branch-only `vercel.json` deployment guard, with its changelog entry. Total approved changed paths: 140.
- Excluded: credentials/environment files, node_modules, generated exports/router declarations, caches, local browser evidence and unrelated source files. No database migrations introduced.

## Commit structure

| Group | Commit | Scope |
| --- | --- | --- |
| A | `2a2d0c5f48ebd0d33b0922a6d6775978d367a107` | Roots original references, validation foundations |
| B | `e483aae62c3005d0016af33156f3429509d701e4` | Landing/auth presentation, Workspace, Home, Goals, Projects, Vault and associated tests |
| C | `02fc9c851d338fadea01669c60f8fdbb51247e3e` | Compatible dependency remediation and regression tests |
| D | `0579032fccea79ed839a4aeeefbbf93be03609f4` | Reviewed validation workflow, readiness documentation, approved branch deployment guard |
| Receipt | This documentation-only commit; resolve with `git log -1 --format='%H %s'` at publication | Actual PR URL, push receipt and initial CI evidence; no source/config/test/lock changes |

Archived committed-source snapshots are checked for type/import consistency with the freshly installed final reviewed dependency tree and standard Expo generated type reference. This does not claim separate locked installs or complete functional validation at each intermediate boundary. Final-branch validation is recorded below.

## Remote and deployment safety

The authenticated account has team-repository push permission, not administration permission. Main currently reports no branch protection or required checks; repository rulesets are empty. These are owner review items, not authorization to merge. Hook enumeration is unavailable with current permissions; no additional token scopes were requested.

Existing Vercel history includes automatic review-branch previews. The user explicitly approved `git.deploymentEnabled.codex/workspace-v2-integration = false` in `vercel.json` before publication. This documented branch-specific switch prevents automatic Vercel deployments for this branch without changing main, other branches or project settings. See [Vercel Git configuration](https://vercel.com/docs/project-configuration/git-configuration). GitHub workflows contain validation only, not deployment jobs.

## Final local validation

Fresh Phase 4F results, executed against the assembled four-commit branch (runtime tree at `62d20355525b9555001ac24f5aba6b923747f483`; subsequent report updates do not alter runtime/test/dependency files):

| Check | Result |
| --- | --- |
| Fresh locked install and existing patches | Passed; 863 packages; lock unchanged |
| A/B/C/D archived-source type/import boundaries | Passed with final installed dependency tree and standard generated Expo reference |
| Roots unit / original Chromium visual acceptance | 74 / 26 passed |
| Entries, Projects, insights, Sources, Goals, lifecycle, workspace, helpers | 278 passed |
| Tasks / Momentum / Calendar | 86 / 74 / 10 passed |
| Auth / Friends / Circles | 8 / 13 / 30 passed |
| Prelaunch / Echo composer | 15 / 7 passed |
| Workspace, landing, auth, Notes and Reflections Chromium | 52 passed |
| Full database/security chain | All 17 suites passed in each of hosted and CLI ACL modes |
| Local preflight/apply rehearsals | Exit 0; skipped because nothing is pending after 091, not new migration execution |
| TypeScript after browsers, after exports, after generated-router restoration | Passed |
| Web / iOS JavaScript export | Passed with synthetic configuration; not native build/device acceptance |
| Exact manifest and Git integrity | 137 original blobs byte-identical; approved changelog delta; exactly 140 changed paths; no migration, baseline or generated-route changes |
| Fresh high-severity dependency audit | Expected failure, exit 1: 0 critical / 6 high / 39 moderate / 1 low = 46 affected-package entries |

Totals: **595 unit/domain and 78 browser checks passed**. No new functional or dependency regression observed locally. Existing Metro import-cycle warnings remain. Local evidence is in `/private/tmp/ohara-4f-*.log`, audit JSON, browser captures and synthetic export directories. Generated router evidence was preserved separately, then restored to committed bytes; it is not staged. Both pinned Roots Git objects are available locally. Actual hosted results, including one flaky first attempt, are recorded below; no actionlint pass or actual hardware pass is claimed.

Required order: Roots unit/browser before the full Workspace browser router generation; TypeScript after full-app generation and again after web/iOS exports. Database tests use disposable local databases in hosted and CLI ACL modes. Export configuration is synthetic and nonproduction. Screenshot output stays outside the repository.

## Publication receipt

Normal non-force push succeeded to `upstream` (`https://github.com/teamoharaai/oharaai.git`) at `refs/heads/codex/workspace-v2-integration`. Published implementation/CI SHA: **`0579032fccea79ed839a4aeeefbbf93be03609f4`**. Tracking now points to that review branch, not main. Team main was freshly checked before push and remains **`b939327dfd70f44c650992e3c0337c8798a297d8`** in the PR base.

Opened [DRAFT PR #28](https://github.com/teamoharaai/oharaai/pull/28), **Workspace V2.0 — Experience Redesign & Security Remediation**, against `teamoharaai/oharaai:main`. API verification confirms OPEN and `isDraft: true`. No merge or deployment occurred. No force push, shared-history rewrite, production setting change or production database operation occurred.

This fifth, documentation-only receipt records remote identifiers after publication. It is pushed normally without amending published history. Its final hash is available in branch history and the user-facing handoff. Any synchronization-triggered CI for that receipt is a separate run; completed results below belong specifically to the implementation SHA above.

### Observed GitHub Actions

The first immediate PR query showed no checks while GitHub registered the workflows; subsequent queries confirmed both expected `pull_request` runs, with no manual workflow dispatch.

| Run / job | Observed result at implementation SHA |
| --- | --- |
| [Workspace validation #40568556665](https://github.com/teamoharaai/oharaai/actions/runs/40568556665) | Overall failed because the dependency gate remains red |
| application | Success: locked install, pinned Roots Git objects, unit/domain checks, browsers, TypeScript, exports and diff integrity completed |
| database (hosted) / database (cli) | Both success |
| dependency-review | Expected failure at `npm audit --package-lock-only --audit-level=high`, exit 1; 46 findings: 6 high, 39 moderate, 1 low |
| [Existing Database chain #40568556566](https://github.com/teamoharaai/oharaai/actions/runs/40568556566) | Success in both ACL modes |

Actual application runner: `macos-15-arm64`, image `20260907.0337.1`. Full-history checkout and both original Roots object assertions passed. Workspace browser suite: **52 passed**. Roots browser suite: **25 passed and 1 flaky**, with the flaky test passing under the existing retry configuration. Its first attempt was a 30-second `page.goto` load timeout at `tests/constellation/constellation.acceptance.spec.ts:115`, for the canonical desktop `1a-canvas-restrained` case; it was not a visual-baseline mismatch. The root cause of that hosted navigation timeout is not proven. Keep this CI stability issue visible for the next review; no timeout/retry/assertion/baseline changes were made. The hosted runner also reported arm64 capacity/queue constraints, which are not proof of the timeout's cause.

Read-only deployment queries returned **no deployments** for the implementation SHA, and commit statuses contained no Vercel deployment status. The committed branch-only prevention remains in place. This records observed state, not administrator-level inspection of unavailable webhook settings. No deployment command was issued.

## Open security and release blockers

- Dependency audit remains an enforced, expected failing gate: Phase 4E baseline was 0 critical, 6 high, 39 moderate and 1 low affected-package entries (not distinct advisory counts). Refresh before publication; do not suppress findings.
- Open review includes Expo/CLI, node-forge, image-size, postcss and zod high findings; Tiptap major-version remediation and bundled react-devtools shell-quote analysis also remain unresolved. See [security review](OHARA-Workspace-V2.0-Dependency-Security-Review.md). No security exception or out-of-scope major upgrade is authorized.
- Physical iOS, Safari and accessibility/manual acceptance remain unchecked. Real-backend multi-role Vault permissions, storage and attached Sources require approved nonproduction fixtures. Synthetic local/browser validation does not substitute for those checks.
- Required reviewers by responsibility: application/workspace owner, authentication and authorization/storage owner, Tasks/Calendar/Momentum owner, dependency/security owner, CI/release owner, and physical-device/Safari/accessibility QA. No individual approval is claimed.
- Hosted application/database execution and original Roots Git object availability are now verified at the implementation SHA. The first-attempt Roots navigation flake, final-tip CI status, dependency remediation/acceptance decisions and branch-protection policy still require review before promotion. Roots CI uses full history and explicit object assertions; do not regenerate historical artwork or rebaseline snapshots to conceal differences.

## Recovery and next authorized steps

Review the draft and actual CI evidence. Do not merge, deploy, mutate production, or approve exceptions under Phase 4F. Local commits plus preserved Phase 4E recovery checksums retain the complete candidate. Nothing has changed on main or production, so no production rollback is required. Any future release must record the then-current deployed SHA and independent rollback target before separate authorization.
