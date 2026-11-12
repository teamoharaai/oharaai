# Workspace V2.0 — Final Web Release Acceptance

Updated November 12, 2026. **NO-GO for production pending the specific gates below.** This report supplements the Phase 4H Preview Acceptance report; historical results are not represented as fresh tests of a new deployment.

## Latest publication and acceptance addendum

This addendum supersedes pending-publication statements in the original November 10 assessment below.

### Final application preview and CI follow-up

- Latest application/dependency SHA: **0cf7bfddcf2695477605f118f09a157dd329cc2c**. Protected Preview **dpl_DJmZw5PTBWsgyeRvcou27Xm5ErBC** is READY at https://oharaai-361sn8qjc-oharaais-projects.vercel.app. Client bundle rechecked against QA `rmzsdszjfrqlrykcxkhl`; production ref absent before any test mutation. Four synthetic account logins passed.
- Deployed Momentum recalculation accepted with no error; two existing account and three Goal closed snapshots remained byte-for-byte unchanged.
- Actual Safari on preceding application SHA 4522bd2 verified signed-out Note → login with exact `returnTo` → owner login → original Note, retaining `?from=library`. The final application delta is the compatible Forge tooling patch. Full public email/PKCE confirmation and recovery remain unverified.
- [CI run 43237574049](https://github.com/teamoharaai/oharaai/actions/runs/43237574049) passed both database profiles but failed one of 56 Workspace tests: Home dark alignment sampled separate card bounds while asynchronous reads could resize the layout. All other 55 passed. The follow-up samples all bounds atomically and waits for completion, retaining the same less-than-one-pixel assertion. All six Home tests passed three consecutive repetitions (18 total); exact follow-up CI must pass before integration. No application layout or baseline changed.
- Safari capture subsequently returned a blank image and no web-page accessibility controls even after raising its window. Remaining real clipboard, VoiceOver, zoom and full appearance acceptance are blocked by unavailable interactive evidence, not claimed passed.
- The exact latest PR SHA and final CI status are recorded in PR #28 after this test-only follow-up; the immutable application preview above remains the tested release artifact.

November 12 follow-up application SHA: **4522bd2f1ce008fd01b5948c6d5fa68299e66779**. Subsequent vendor-only Forge lock update is tracked by this report's commit and PR head. Exact final CI/deployment metadata is recorded in the PR handoff to avoid treating earlier runs as final-head acceptance.

Final audit refresh briefly rose to 52 entries due to four newly indexed node-forge findings. Compatible vendor version **1.4.3** fixes [GHSA-6889-vf6x-f3g5](https://github.com/advisories/GHSA-6889-vf6x-f3g5), [GHSA-w4xr-hqv8-ch44](https://github.com/advisories/GHSA-w4xr-hqv8-ch44), [GHSA-6cv4-p8m7-4r25](https://github.com/advisories/GHSA-6cv4-p8m7-4r25) and [GHSA-j8rw-jp99-435v](https://github.com/advisories/GHSA-j8rw-jp99-435v). Only this lock entry changes; Expo code-signing tooling accepts the existing ^1.3.3 range. No framework major or new override.

After the Forge update, clean install applies all five patches; the complete 610 unit/domain, 26 Roots browser, 56 Workspace browser, TypeScript and web/iOS JavaScript export checks pass again. Final November 12 audit is **0 critical / 7 high / 43 moderate / 1 low = 51**; node-forge is absent from findings. The other issue-specific decisions remain open.

- Published application commit: **3469e46dc61527f8316226b12e0d91742cd94547**, existing integration branch and Draft PR #28. Main remains b939327d after November 12 fetch.
- Exact-head [Workspace CI run 42890518399](https://github.com/teamoharaai/oharaai/actions/runs/42890518399): application and both database profiles PASS; dependency-review FAIL, intentionally enforced. [Database chain 42890518387](https://github.com/teamoharaai/oharaai/actions/runs/42890518387): both profiles PASS.
- Isolated Preview **dpl_EyAa2PhVUHMmANf1wqrJXMefReaq**, READY, Git SHA 3469e46, https://oharaai-fr0ogfvr7-oharaais-projects.vercel.app. Existing Git connection, six unchanged Preview/branch-only overrides, protection retained. Client bundle verified QA ref present and production ref absent before testing. No local export was deployed.
- Deployed explicit Momentum recalculation **accepted=true**, no error, both existing account snapshots and all three Goal snapshots unchanged. This closes the hosted rollover verification noted below.
- November 12 actual Safari: synthetic owner login succeeds; dark Note after Home theme switch/direct navigation shows correctly themed toolbar, Create and New Note controls. Earlier white button faces are absent in this tested scenario. Full theme/system-appearance matrix remains incomplete.
- Real signed-out Note deep link exposed a second redirect source: `lib/api/client.ts` session-expiration sign-out discarded returnTo. A narrow follow-up preserves the pre-sign-out destination and an already-present validated login returnTo; explicit logout behavior is unchanged. This touches auth/API-client ownership only for navigation, with no caching/token/provider/request deduplication refactor. Follow-up exact-head checks will be linked in PR #28.
- Real formatted clipboard attempts remain NOT VERIFIED: AX interaction did not focus/insert; coordinate fallback returned computer-use `noWindowsAvailable`. No successful paste or VoiceOver result is inferred.
- November 12 production ledger refreshed using both default_transaction_read_only and BEGIN READ ONLY: **91 rows, 91 distinct versions, latest 091 sources_v2**, followed by ROLLBACK. No database writes.
- Recovery archive verified byte-for-byte: `OharaBackup/OHARA-Phase4I-candidate-20261110-145100.tar.gz`, SHA-256 `36102c136d063d2da61d37e62881c9bc215c7f07371341ed9370b356de10e81a`. Original worktrees/untracked files remain preserved. The subsequent patch-format correction is recoverable in commit 3469e46.
- Six-page PDF handoff prepared outside the integration delta: update details, proposed iOS UI mapping, semantic tokens, naming and compatibility standards. Proposed native presentation is not claimed implemented.
- November 12 final redirect follow-up: **610 unit/domain tests, 26 Roots browser tests, 56 Workspace browser tests, TypeScript, web export, iOS JavaScript export and final TypeScript all PASS**. Database code/schema unchanged; prior full database profiles and hosted checks remain applicable. The new browser regression exercises a signed-out Note and asserts its exact returnTo after API expiration, rather than assuming an existing session proves the redirect path.

Production remains **NO-GO** for unresolved security disposition, full public email/callback acceptance and critical manual accessibility coverage. PR stays Draft; main and production remain unchanged.

## Candidate and scope

PR #28: https://github.com/teamoharaai/oharaai/pull/28, Draft, branch `codex/workspace-v2-integration`. Base tested preview SHA: `644ae2f47f93b577bad6de7d056d17d25888b544`. Phase 4I fixes are being published on this branch; exact new SHA, hosted CI and deployment results will be recorded after publication. Main remains `b939327dfd70f44c650992e3c0337c8798a297d8` (fetched November 10).

Only release-blocker fixes: compatible dependency patches, authentication failure/return-route handling, accessible Goal dialog names, Safari native control appearance, and Momentum rollover. No schema migration, scoring formula change, historical snapshot rewrite, native admission expansion, redesign, or production mutation.

## Automated validation

November 10 local: 609 unit/domain tests across Roots (74), domain/workspace/security helpers (289), Tasks (86), Momentum (77), Calendar (10), Auth (8), Friends (13), Circles (30), prelaunch (15), Echo composer (7). All passed. Roots browser 26 and Workspace/landing/auth/Notes/Reflections browser 55 passed. All 17 database/security suites passed under both hosted and CLI default-ACL profiles; full-chain/preflight/apply rehearsals passed. TypeScript, web production-mode export, iOS JavaScript export, and diff integrity passed. Roots router generation ran before full-app browser/type generation. Synthetic export configuration is never deployed.

The final four-decimal Momentum comparison received another full unit/domain run and actual QA rollover verification. Browser/export results precede only that narrowly scoped server-side precision correction. GitHub must validate the exact pushed head. Existing 644ae2f CI had application/database passes and an enforced dependency-review failure; that does not certify the new head.

## Security disposition

November 6 audit: 0 critical / 7 high / 44 moderate / 2 low (53 affected-package entries). November 10: **0 critical / 7 high / 43 moderate / 1 low (51)**. Propagated package entries are not independent vulnerabilities. Audit remains failing, unsuppressed, with no approved exception.

Compatible lock changes: Babel core 7.29.0 → 7.29.13 and related Babel 7 patch dependencies; postcss-selector-parser 6.1.2 → 6.1.5. Direct dependency ranges and framework majors unchanged. Existing patch-package postinstall applies the Tiptap, URI decoder, image parser, css-interop and Zustand patches on a clean install.

Owner for every unresolved decision: **Arthur Silva**, with a relevant editor/framework reviewer. The following are proposals, not accepted waivers. Review before release; any future exception should expire no later than November 24, 2026 and be retested at dependency/Expo/Metro/editor changes or new advisory publication.

| Package/advisory | Verified exposure and remediation | Required disposition/controls |
| --- | --- | --- |
| decode-uri-component 0.2.2; GHSA-vcc3-ghjq-m6fr, GHSA-qr28-fpjm-wq7f | Runtime query-string 7.1.3 in React Navigation and Expo Router. Backport upstream v0.5.1 single-pass decoder while preserving CommonJS and legacy plus handling. Malformed, large, Unicode and real route parser regressions pass with child-process deadlines. | Independent backport review; supported parent/module migration later. Version-based audit remains open. No blind ESM override. |
| image-size 1.2.1; GHSA-5p2g-fcmc-qvqq, GHSA-w3rx-r6r6-pgpr | Metro build image parser. Upstream bounds/progress checks backported for ICNS/JXL/HEIF; malformed and valid fixtures plus real brand PNG filepath/buffer tests pass. | Review compatible backport; retain reviewed assets and bounded isolated builds. Do not override to 2.x: verified Metro filepath incompatibility. No claim of arbitrary runtime-upload safety. |
| @tiptap/core 2.27.1; GHSA-cp6q-959q-f8rh | Runtime editor. Existing own-property backport covers app-used CJS/ESM/source; prototype/formatting/ProseMirror serialization tests pass. UMD is not patched or imported. Existing paste security retained. | Independent maintained-patch approval and real clipboard/reload/shared-read-only acceptance required. Version audit remains open; 3.x migration is outside scope. |
| zod 3.25.76; GHSA-mrhx-c7xc-m3w5 | Expo CLI 55.0.18 DevTools/CLI-extension validation of installed plugin metadata and child-process output. Supported inspected CLI 55.0.37 still uses this line; advisory fix is Zod >=4.6.6. | No safe major override established. Restrict plugins/build inputs to reviewed dependencies, no exposed development server or production write credentials in CI. Tooling exposure is not proof of absence of risk; issue-specific decision remains required. |
| deepmerge 4.3.1; GHSA-gcqx-w48m-w2h4 | Expo configuration/build input merging. Latest inspected version remains 4.3.1. | Trusted reviewed configuration; no compatible vendor release verified. Explicit decision required. |
| glob 10.5.0; GHSA-3g3m-2fjr-6pw4 | Build/tooling filesystem patterns. Fixed line >14.0.1 requires parent compatibility review. | No user-supplied build globs; time-bounded CI. Explicit decision required. |
| minimatch 9.0.9; GHSA-g3hv-75wg-m249 | Build/tooling pattern matching. Fix 11.0.1 is a major jump. | Reviewed patterns and time-bounded CI; explicit decision required. |
| uuid 7.0.3; GHSA-w5hq-g745-h8pq | xcode 3.0.1 build tooling calls uuid.v4() without a buffer; advisory-sensitive buffer API not used in that inspected caller. Fix 11.1.1 is a major jump. | Preserve inspected calling form; retest parent changes. Narrow reachability finding is not a blanket waiver. |

Babel GHSA-4x5r-pxfx-6jf8 and selector-parser GHSA-w9m9-85wc-3x92 / GHSA-rj75-hqrm-r3gf no longer appear after compatible lock updates. Registry audit does not recognize local source backports. No audit thresholds, ignores or continue-on-error added.

## Authentication

Real isolated QA password login, session rejection and refresh revocation passed. November 10 supported QA Admin-generated, no-email signup/confirmation and recovery tokens were consumed through public Auth verification/password endpoints: confirmation, confirmed login, reused token rejection, recovery verification, new-password login, old-password rejection, invalid token rejection and logout revocation passed. Private synthetic account credentials remain outside Git.

**This is not public signup/email-delivery/PKCE-browser acceptance.** No approved nonproduction mail capture is configured. Normal public registration, forgot-password delivery, full browser confirmation/recovery callback, and browser login with the reset password remain open. No production mail/SMS sent or auth policy weakened.

Code now displays safe explicit invalid/expired callback errors even with an existing session, preserves validated workspace return paths, rejects external/traversal redirects, trims login email and clears loading after rejected network calls. Automated callback/session/redirect tests pass; real refreshed-preview success-path confirmation remains required.

## Safari and accessibility

Actual Safari 26.6.2 on macOS 26.6.2: protected preview owner navigation, persisted dark Home, light Projects after reload, and dark Note were inspected November 10. Pale native button faces reproduced on the dark Note toolbar/Create controls. Scoped appearance:none and workspace color-scheme now leave existing theme colors/layout in control. Automated dark-editor appearance/reload assertions pass. **Actual Safari verification of this new build remains pending; root cause is a supported native-paint diagnosis, not a completed all-scenarios certification.**

Earlier Phase 4H actual Safari evidence includes Note/Reflection editing and persisted reload, authorized image/PDF display, Calendar navigation/Back/Forward, compact navigation keyboard/Escape/focus restoration. November 6 Manage Goal keyboard containment/Escape exercised; new named dialogs pass browser regression. Full keyboard matrix, destructive confirmations, VoiceOver, confirmed 200% zoom, increased text size, system appearance matrix and narrow reflow remain partial/NOT RUN. AX names alone are not VoiceOver acceptance. November 10 formatted clipboard attempt did not insert content; it is not a pass. Do not claim WCAG certification.

## Goal lifecycle and Momentum

Phase 4H web creation, association, pause/resume/completion/archive, Task occurrence replay, Calendar and Vault authorization results remain in the prior report. November 10 deployed QA web flow additionally passed association/detach/reassign, expiration, unauthorized deadline extension rejection, owner deadline extension/history, successor creation with Project/lineage/pending milestone and predecessor archive, and repeat successor idempotency.

Week rollover exposed a genuine bug: provisional publication overwrote the scalar closed-week baseline. The database rejected next-week publication correctly. Candidate now writes live score only to summary fields and repairs only recognized prior provisional/scalar collisions using four-decimal database precision and compare-and-set. Unknown mismatches fail closed; no historical rows are edited. Real QA candidate service under the existing user/week lease successfully closed the next week, preserved the original account snapshot and three Goal snapshots, and repeated without historical revisions. Hosted refreshed-preview verification remains required. Formula, timezone, closed publisher and canonical occurrence identities unchanged.

Gated native adopted Goal→Project assignment still returns GOAL_WRITE_UPGRADE_REQUIRED; pre-existing migrations 071/072 contract mismatch, not the supported web flow. Keep admission disabled; separate Goal/iOS ownership-reviewed contract work required. No protection trigger weakening.

## Environment, deployment and rollback

QA only: `rmzsdszjfrqlrykcxkhl`. Known isolated preview `dpl_C8FBD1KXcTJXhhZPDpR174n8s7SM`, https://oharaai-5il46ejeh-oharaais-projects.vercel.app, SHA 644ae2f. Six Preview/branch-only environment overrides and deployment protection must be rechecked before rebuilding. Fresh session inspected full client bundle for QA ref and absence of production ref before mutations. Never deploy local .invalid exports.

November 10 authenticated Vercel project inspection independently confirmed production remains READY/PROMOTED `dpl_Grk2Ht2xDs2PzXdbWWMA3HV5poKi`, SHA `b939327dfd70f44c650992e3c0337c8798a297d8`, immutable https://oharaai-8pnafuzum-oharaais-projects.vercel.app, aliases oharaai.com/www.oharaai.com. This is the retained rollback candidate, not a performed rollback. Production migration ledger was previously read-only verified through 091; refresh before final release. No schema changes required by this candidate. Do not roll back data history with an application rollback.

## Release gates and exact next actions

1. Codex: publish reviewed fixes to existing branch, run exact-head GitHub CI, rebuild only isolated Preview, verify deployed SHA/bundle identity and hosted Momentum behavior.
2. Arthur Silva + security reviewer: accept reviewed backports or require supported fixes; disposition each unresolved advisory explicitly. No self-approval. Dependency gate stays visible.
3. QA/release owner: approved QA email capture/delivery and actual signup/recovery callback acceptance; complete actual Safari theme, clipboard and critical accessibility matrix. Unexecuted scenarios remain open.
4. Goal/iOS owner: keep gated contract disabled; physical iOS, native pickers/EventKit, safe areas, Dynamic Type and VoiceOver require separate hardware acceptance. JavaScript export is not a signed native build.
5. Release owner: after gates pass, separately authorize main integration and production deployment. Reconcile fresh main, rerun required checks, refresh production ledger/SHA/rollback identity, verify production environment, stage the production build, smoke-test and then promote only under that authorization.

**Functional readiness: automated pass, fresh hosted acceptance pending. Security readiness: blocked. Accessibility readiness: incomplete. Backend readiness: extensive isolated QA passes, browser Auth delivery open. Deployment readiness: known production/rollback target; exact-head CI/preview pending. Production recommendation: NO-GO.**
