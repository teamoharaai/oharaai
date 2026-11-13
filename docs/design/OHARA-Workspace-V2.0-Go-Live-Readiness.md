# Workspace V2.0 — Go-Live Readiness (Phase 4G)

October 28 investigation; hosted validation finalized October 29, 2026. **NO-GO for merge and production.** Targeted fixes pass functional validation; the dependency gate remains failed. This report does not grant a vulnerability exception or certify unexecuted QA.

## Candidate and integrity

- Existing [draft PR #28](https://github.com/teamoharaai/oharaai/pull/28), branch `codex/workspace-v2-integration`, repository `teamoharaai/oharaai`.
- Start SHA `65dd1a1e297a428cb53aa989599cff048d341672`; freshly fetched team main `b939327dfd70f44c650992e3c0337c8798a297d8`. No incoming commits, conflicts or teammate overwrites at preflight. No EventKit/Tracker import.
- Authoritative working directory `/private/tmp/ohara-workspace-v2-integration`. All 33 Phase 4E backup checksums passed. All 138 reviewed paths accounted for: 137 original non-changelog blobs matched; approved Phase 4F changelog, deployment guard and publication report retained. Original development/rehearsal worktrees and durable backups preserved.
- Validated application candidate SHA: **`335f53fac998f26ff105e31b0c5cda040cc97873`**, committed and normally pushed to the existing draft PR. The subsequent report-only commit records hosted results without changing that application tree. No main update or deployment.
- Change scope: two locked dependency versions, the existing patch-package mechanism, focused security tests, bounded Roots test-server setup, changelog and this report/inventory. No application redesign, schema migration, permissions/cache/provider refactor or security-gate weakening.

## Security remediation

Initial refreshed audit: **0 critical / 6 high / 39 moderate / 7 low = 52 affected-package entries**. Final compatible tree: **0 critical / 4 high / 38 moderate / 8 low = 50 entries**, still exit 1. Metadata changes in severity classification are not claimed as fixes. [Complete current inventory](security/OHARA-Phase4G-Advisory-Inventory.md).

| Issue | Exposure and exact change | Evidence / disposition |
| --- | --- | --- |
| node-forge [GHSA-86w9-cpqp-85rv](https://github.com/advisories/GHSA-86w9-cpqp-85rv) | 1.4.0 → 1.4.2, satisfying Expo CLI and certificate library `^1.3.3`. Native signing/build tooling; no new app crypto API. | Canonical signature accepted; signature with extra nested DigestAlgorithm element rejected. Registry finding removed. No custom cryptography patch. |
| PostCSS source-map processing | 8.4.49 → 8.5.31 via exact same-major override; Expo Metro's original tilde was narrower. Build-time CSS/source maps, also Tailwind. | Outside-directory and missing-source-file map annotations blocked; legitimate adjacent map works. Advisory family GHSA-6g55-p6wh-862q, GHSA-r28c-9q8g-f849, GHSA-fxqj-rqcc-2cmp, GHSA-qx2v-qp2m-jg93 removed from audit. No unsafeMap opt-in introduced. Exports/browser compatibility required below. |
| image-size [GHSA-5p2g-fcmc-qvqq](https://github.com/advisories/GHSA-5p2g-fcmc-qvqq), [GHSA-w3rx-r6r6-pgpr](https://github.com/advisories/GHSA-w3rx-r6r6-pgpr) | **Unresolved high: 1.2.1 retained.** The attempted 2.0.4 override passed buffer sizing but broke Metro `getAssetData`, which also passes filesystem paths. It produced an HTTP 500 / TextDecoder argument error. The override was withdrawn; no Metro/framework patch was introduced. | Added a regression exercising both real Metro entry points against four OHARA PNGs with independent IHDR dimensions. It fails against 2.0.4 and passes on the retained parser. The old parser's malformed-ICNS hang was confirmed in a bounded child process; this is not resolved or waived. Require a supported compatible fix or separately reviewed backport before release. |
| Tiptap [GHSA-cp6q-959q-f8rh](https://github.com/advisories/GHSA-cp6q-959q-f8rh) | Installed 2.27.1 retained; backport upstream [01d7af8](https://github.com/ueberdosis/tiptap/commit/01d7af8c983ee5954c63734f4fa46cb23ae3246d) own-data-property treatment for JSON `__proto__` into source and app-consumed ESM/CJS entries. | Clean-install patch applies; CJS/ESM prototype/formatting checks and real ProseMirror serializer attribute capture pass. Original regression fails against unpatched code. No Tiptap 3 migration. Version-based audit remains open; this is a maintained local mitigation requiring editor/security review, not an exception or vendor-patched release claim. UMD artifact is not patched or used by this app; do not adopt it as a safe alternative. |
| Expo CLI / Zod [GHSA-mrhx-c7xc-m3w5](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5) | Zod 3.25.76 retained. Installed CLI 55.0.18 and latest SDK-55 CLI 55.0.37 both require `^3.25.76`; registry fixed line starts at 4.6.6. Used in CLI DevTools/MCP validation, not an application route import found in source review. | **Unresolved high** plus Expo/CLI parent entries. No forced Zod/Expo major replacement. Oversized schema-input exposure remains an evidence gap; bounded development access is not proof of non-reachability. |
| Embedded React DevTools | RN 0.83.2 → react-devtools-core 6.1.5. Latest published 6.x remains 6.1.5; latest overall 8.0.0 crosses majors. Installed shell-quote is fixed but standalone bundle still embeds older code. | Existing parse(REACT_EDITOR) evidence retained; dev-gated native backend is distinct. Do not infer safety from npm's zero critical count. Framework/native tooling review needed; no arbitrary minified-bundle surgery or unsupported DevTools replacement. |
| deepmerge and remaining inventory | deepmerge 4.3.1 latest still reported for GHSA-gcqx-w48m-w2h4; Expo build configuration consumers. Other moderate/low findings remain in linked inventory. | No forced framework downgrade or blanket build-only dismissal. Review controlled build inputs and the complete dependency set. |

The final lock delta changes only node-forge and PostCSS. image-size and queue remain at their original locked versions. Existing patched ProseMirror/shell-quote resolutions are preserved. The npm audit command/gate is unchanged and continues to fail honestly.

## Owner decisions / exception proposals — NOT APPROVED

The user designated **Arthur Silva** as security/release owner and requested the safest decisions. Recommended decision: **do not accept unresolved risk merely to release; keep NO-GO**. General team approval and the user's ownership designation are not issue-specific acceptance.

| Proposed temporary exception scope | Risk / required controls before considering it | Named owner, expiry and required approval |
| --- | --- | --- |
| Zod/Expo CLI high findings only | Oversized validation inputs can exhaust tooling memory. Require no public dev/MCP server, loopback-only development, no release secrets in untrusted PR jobs, bounded inputs for any enabled extension, and separate evidence that production bundles do not expose this parser. Prefer supported remediation. | Arthur Silva; proposed expiry **November 4, 2026** or earlier supported fix/exposure change. Explicit advisory/version/control/merge-and-release approval required; **not granted**. |
| image-size 1.2.1 build parser | Malformed image input can hang the build parser; 2.x is not API-compatible with this Metro. Limit bundled assets to reviewed repository files and isolate build jobs with timeouts and no production write credentials. Runtime-upload use has not been certified safe by this build-path analysis. | Arthur Silva with framework/tooling reviewer; proposed expiry November 4, 2026. Supported remediation or explicit issue-specific acceptance required; **not granted**. |
| Tiptap version finding with local backport | Runtime prototype-to-DOM injection risk. Require independent patch review, clean-install enforcement, CJS/ESM/serializer and clipboard regressions, no UMD/CDN import, and supported-major migration plan. | Arthur Silva with editor reviewer; proposed expiry November 4, 2026. Explicit acceptance of the maintained backport required; **not granted**. |
| Embedded DevTools bundle | Native/development parser/command configuration risk outside normal installed-module audit. Require trusted REACT_EDITOR, no public inspector/devtools, release-mode bundle checks and supported RN-compatible replacement plan. | Arthur Silva with native/tooling reviewer; proposed expiry November 4, 2026. Explicit evidence-bound disposition required; **not granted**. |
| Remaining moderate/low inventory, including deepmerge | Build-input poisoning, parsing, routing and other risks must be classified individually. Restricted CI credentials and trusted config are proposed controls, not proof of remediation. | Arthur Silva; review by November 4, 2026. No blanket exception proposed or approved. |

No audit exclusions, fail-open flags, hidden approvals or security-threshold changes. Any exception workflow needs transparent team policy rather than disguising a failing audit as a pass.

## CI investigation and correction

Before changes, application/database jobs succeeded, but the first Roots desktop case required retry on two hosted runs (30s page.goto timeout; later ERR_ABORTED). It failed during navigation, not a screenshot comparison. All historical Git object assertions succeeded; approved screenshots remained unchanged. No skip/fixme/only was introduced.

The configured webServer checked only a listening port; this is not evidence that Metro compilation and fixture hydration finished. Added a separate bounded 120s loopback-only global setup navigation, requiring the actual fixture canvas, settled fonts and no uncaught page errors. Tests retain their existing budgets, assertions, baselines, tolerances and retry policy. Local validation additionally disables retries. Hosted run 40859574076 then passed all 26 Roots tests without a retry; setup compilation/hydration took 32,703ms, beyond the old first-test navigation budget. This validates the readiness correction for this run, not a guarantee against all future flakes or an invented explanation for every prior ERR_ABORTED.

Main has no enforced branch protection, required status checks or active rulesets in the read-only API result. Required-check configuration is a release-owner decision; no settings changed. GitHub reviews/review requests were empty at preflight; the user's approval to start preparation is recorded, not fabricated code-review approvals.

## Automated validation

Execution evidence uses `/private/tmp/ohara-4g-*`; no logs, credentials, generated routes, exports or capture-only screenshots are staged. Final dependency-tree results are recorded after completion; earlier checks are not substituted for them.

- Clean npm install and all three patch-package patches: passed.
- Focused security/compatibility tests: **8 passed**; malformed ICNS negative control timed out safely against the retained parser, documenting an unresolved vulnerability rather than a passing mitigation.
- Roots setup before the final image-parser change: two full independent server starts, **26 + 26 passed with retries disabled**.
- Final compatible tree: Roots **26 passed with retries disabled**; Workspace/landing/auth/Notes/Reflections browsers **52 passed**; domain/unit/security-boundary suites **600 passed**, no skips. **TypeScript passed**, then **web production-mode export and iOS JavaScript export passed**, then **TypeScript passed again** with full application route declarations. An intermediate new-test URL typing error was corrected by explicitly importing Node's URL type; no application type contract changed. These synthetic `.invalid` exports must never be deployed.
- Database/security suites: **all 17 passed in each hosted and CLI ACL mode**, disposable local databases only. Dependency changes introduce no SQL or harness modifications.
- Dependency gate: **fails, exit 1** with the inventory above. This is a release blocker, not a functional test failure.

### Hosted results — October 29

[Workspace validation 40859574076](https://github.com/teamoharaai/oharaai/actions/runs/40859574076), exact application SHA above: **application passed**, **database (hosted) passed**, **database (cli) passed**, **dependency-review failed** on the disclosed audit. Application log confirms 26 Roots tests without retries, 52 Workspace browser tests, TypeScript, web/iOS exports and diff integrity. Pinned Roots history was available. Separate [Database chain 40859574072](https://github.com/teamoharaai/oharaai/actions/runs/40859574072) also passed. Overall Workspace workflow is correctly red because security is unresolved. These are executed results, not a waiver or preview acceptance.

## Preview and Vercel setup

No deployment exists for the starting PR SHA. The exact-branch `vercel.json` automatic-deployment guard remains unchanged while isolation is unverified. Do not deploy `.invalid` test exports, use `deploy --temporary`, modify production domains/aliases, or treat main as a preview environment.

Per the user's setup request, followed [Vercel's official guide](https://vercel.com/get-started.md) and official Codex MCP configuration guidance. Installed **Vercel CLI 65.5.0** under `/Users/arthursilva/.local`, without sudo or permission changes, and the official guidance plugin/MCP at user scope. The user approved team access in Safari. Authenticated inspection now succeeds for project `prj_IBQ9gdBUAXkua6A7wH1ThkCj5Xvj`, team `team_tSJmkDha1V5AK3EObeGDw011`. No settings, secrets, domains or deployments were changed. The CLI login is separate and is not needed for these authenticated MCP reads.

Preview URL/SHA: **not available**. Authenticated, non-decrypted environment metadata confirms the same Supabase URL and anonymous-key records target production, preview and development, with no branch-specific override. AI-provider records also span all three targets. The service-role key and site URL are production-only. This is not an isolated, fully configured staging backend. No approved nonproduction Supabase project/test accounts have been supplied. Production `rrgiqemscnyaqkculnmb.supabase.co` was not copied into the candidate or used for test writes. Preview must stay disabled until an approved separate backend, branch-scoped credentials and auth callbacks are configured; no credentials were printed or decrypted.

The user's later conditional instruction to push main if no isolated setup is possible is recorded. It is not invoked: access now works, but the absence of staging is not proof that staging is impossible. The safest release recommendation remains NO-GO with open security/QA gates.

## Real-backend, Safari and accessibility acceptance

**NOT EXECUTED against a real preview.** No test data was written to production. Fixture-based Chromium success is not real auth/RLS/storage acceptance. Tester/device/SHA/evidence must be recorded for each row when the isolated preview is available.

| Required check | Current result / expected acceptance |
| --- | --- |
| Sign-up/login/logout/session/protected routes/callbacks | Pending real nonproduction accounts; routes and redirects must not cross into production |
| Goal create/open/Task/Milestone/Extend/Start New Phase/history | Pending; verify canonical lifecycle history, no duplicated task system |
| Independent Project, Goal association, Overview/Goals/Vault, invitations/roles | Pending; verify owner/admin/member/guide boundaries |
| Note/Reflection editing, Source upload/read/images, deduplication | Pending; use disposable nonproduction records and actual storage |
| Private/unauthorized/removed-member Vault access | Pending; deny metadata, content and signed-file access, not just hidden buttons |
| Calendar occurrence completion and Momentum | Pending; one canonical completion/event, refresh and immutable closed weeks |
| Actual macOS and iOS Safari | Pending landing/auth/Home/Goals/Projects/Vault, themes, wrapping, modals, menus, deep links/history |
| Accessibility | Pending actual keyboard focus, modal containment/restoration, VoiceOver, zoom/text scaling, contrast, touch targets, names/errors |
| Physical native iOS | Separate release gate: signed build, auth/navigation/editing/pickers/Tasks/Calendar, safe areas/Dynamic Type; JS export is insufficient |

Record tester, date, device/OS/browser, tested SHA, account role, expected/actual result and evidence. Any shared-code privacy/data-integrity/core-behavior defect also blocks web. EventKit stays separate.

## Production compatibility and rollback preparation

Read-only production ledger query used both `BEGIN READ ONLY` and `default_transaction_read_only=on`, then ROLLBACK. Current latest migrations: 091 sources_v2, 090 parent_deletion_lifecycle, 089 client_cutover_flags, 088 project_member_self_leave, 087 notes_library_folders, 086 echo_canonical_mirror. Candidate adds **no migrations**; local full-chain checks pass. This is not a full live permission/storage test or a comparison of every stored migration body.

GitHub's latest successful Production deployment record: **7070102853**, SHA **`b939327dfd70f44c650992e3c0337c8798a297d8`**, immutable deployment URL **https://oharaai-8pnafuzum-oharaais-projects.vercel.app**, created October 14, 2026. Authenticated Vercel inspection confirms deployment `dpl_Grk2Ht2xDs2PzXdbWWMA3HV5poKi` is **READY**, target production, Git ref main at that exact SHA, with `www.oharaai.com` and `oharaai.com` aliases. This is the retained rollback candidate, not a performed rollback. Recheck immediately before any separately authorized release; do not mutate database history to roll back application UI.

## Release decision

**NO-GO.** Confirmed blockers: unresolved security decisions/audit; absent isolated preview/backend; real permission/storage QA; Safari/accessibility acceptance; owner review and required-check policy; explicit go-live approval after those gates. Native signed-device acceptance remains separately required and also blocks web if a shared-code privacy/integrity defect appears.

Continue independent safe remediation and the existing draft PR. Do not merge, force-push, deploy production, alter production settings or waive findings. Team access is resolved. The next environment action requires an approved isolated backend/test-account set, not another redesign or a competing PR.
