# Workspace V2.0 — Phase 4C dependency security review

October 26, 2026. Local rehearsal only. No staging, commit, push, merge, deployment, production access, migration, EventKit import or Echo implementation.

## 1. Decision and boundaries

Targeted compatible remediation is applied. **Not approved for production.** The remaining audit gate is intentionally red. An integration **review** can be proposed after recovery ownership is clarified, with unresolved security findings visible; neither merging nor releasing is authorized by this report.

Candidate: `/private/tmp/ohara-workspace-v2-rehearsal`, detached at `b939327dfd70f44c650992e3c0337c8798a297d8`. This phase does not refresh/reconcile main; fetch and overlap review must be repeated before integration. Package declarations, Expo 55, React Native 0.83.2, React 19.2, Tiptap 2, Supabase, application source, permissions and schema are unchanged. No overrides, force fixes or dependency downgrades.

Readiness sources: Phase 4B Integration Rehearsal, Phase 4A Integration Plan, Phase 3F Final Readiness. Their prior execution records remain historical; this report distinguishes new executions below.

## 2. Preservation and recovery

- Before edits: all seven Phase 4B package checksums and all 130 candidate-file hashes matched. Index was empty; candidate had 76 tracked modifications and 54 untracked files.
- Immutable durable baseline: `/Users/arthursilva/Desktop/OharaBackup/OHARA-Workspace-V2-Phase4B-2026-10-23`. Its base-relative patch already includes the landing prerequisite; never apply that prerequisite twice.
- Additional local pre-change copy: `/private/tmp/ohara-4c-baseline.4bXOLR`, including the Phase 4B package and original dependency manifests. Phase 4A and 4B packages remain unchanged; their checksum manifests pass.
- **Unexpected original-source condition:** read-only inspection found `/private/tmp/ohara-workspace-v2` no longer has its `.git` link and is marked prunable by `git worktree list`. Seventeen of its 210 Phase 4A manifest paths are missing; the other 193 match. This turn made no writes there. Cause/time of loss is unknown; do not attribute it to a specific process or assume OS cleanup. Do not prune, reset or restore over the directory. The durable Phase 4A package passes all 13 checksums and retains recovery material. Original-worktree preservation cannot be certified from current disk state.
- Missing paths: `components/landing/{PublicAuthShell.web.tsx,public-auth-v2.css}`, `components/layout/{WorkspaceContext.tsx,WorkspaceShell.tsx,workspace-v2.css}`, `constants/workspace.ts`, `docs/design/{OHARA-Goals-V2.0-Phase-3B.md,OHARA-Workspace-Design-System-V2.0.md}`, `docs/ui-checkpoints/goals-v2/README.md`, `docs/ui-checkpoints/landing-v2/{hero-desktop.png,hero-mobile.png}`, `features/goals/components/GoalsExperience.tsx`, `features/goals/components/home/HomeEchoEntryPoints.tsx`, `tests/workspace-v2/{fixtures.ts,home.spec.ts,home.test.ts,workspace.spec.ts}`.
- Recovery proof: reconstructed the complete Phase 4A source in a **new** directory `/private/tmp/ohara-4c-original-recovery.ZjrLou` from the exact base and immutable backup; all 210 candidate hashes match, including the 17 missing original paths. Nothing was restored over the original. Work is recoverable even though that original temporary checkout is incomplete.

Recovery must use a new directory at the recorded baseline, verified patches and explicit untracked archive, never replacement of unrelated files. Supply dependencies and configuration separately; backups exclude credentials. Clarify original-worktree recovery with its owner before integration.

## 3. Audit reproduction and complete inventory

Commands: `npm audit --package-lock-only --json` and the same with `--omit=dev`. Initial sandbox DNS access failed; permission-enabled registry queries completed. Audit exit 1 means findings, not a successful security gate.

| Snapshot | Critical | High | Moderate | Low | Total affected packages |
| --- | ---: | ---: | ---: | ---: | ---: |
| Phase 4B, October 23 | 1 | 17 | 40 | 1 | 59 |
| Fresh unchanged lock, October 26 | 1 | 18 | 40 | 1 | 60 |
| Before, omit dev | 1 | 17 | 40 | 1 | 59 |
| Targeted candidate, full | 0 | 7 | 39 | 1 | 47 |
| Targeted candidate, omit dev | 0 | 7 | 39 | 1 | 47 |

The new affected package is Zod; a changing advisory feed is not a code regression. These are **npm affected-package counts**, including propagated parent findings, not 60 independent vulnerabilities. The fresh baseline contains 59 distinct direct advisory URLs. `tmp` is the pre-change dev-only difference. Framework build tools are installed through production dependencies, so `--omit=dev` is not a runtime reachability classification. Both build/CI and runtime risks matter.

Exhaustive evidence:

- [Human-readable 60-package inventory and all 25 changed install locations](security/OHARA-Phase4C-Advisory-Inventory.md).
- [Machine-readable inventory](security/OHARA-Phase4C-Advisory-Inventory.json): installed before/after versions, severity, directness, advisory IDs/URLs/affected ranges, shortest complete root dependency chains, **all immediate parent ranges**, lock dev flags, propagation, npm suggestions and context classification.
- Raw local audit records: `/private/tmp/ohara-4c-audit-{before,after}.json`, `/private/tmp/ohara-4c-audit-prod-{before,after}.json`. No private application data is included.

## 4. ProseMirror and Tiptap exposure

Confirmed import path: `NoteEditor.tsx` → web `RichTextEditor.web.tsx` → Tiptap 2 / `@tiptap/pm@2.27.2` → ProseMirror view. The editor accepts native clipboard HTML and has no override that bypasses the dependency's paste parser. Its `onUpdate` serializes JSON through `toV2Document`; server validation happens later and is not a browser-paste mitigation. Thus the vulnerable paste boundary is reachable in web Notes. We did not demonstrate arbitrary script execution against a live account.

[GHSA-c8x8-7fp4-3x9w](https://github.com/advisories/GHSA-c8x8-7fp4-3x9w) is fixed from 1.42.3. Applied **1.42.2 → 1.42.8**, within every existing parent range. Its required `prosemirror-model` patch is **1.25.11 → 1.25.12**. The model changelog confirms validation now happens in node/mark creation; view catches invalid context construction. This is why merely asserting that unknown fields are rejected is incorrect: unknown fields can be discarded safely, while declared attribute validators must execute.

New tests exercise (1) actual Note clipboard paste, heading/bold/link preservation, inert hostile markup, and the emitted save JSON; (2) the installed browser ProseMirror modules with an isolated schema, comparing valid string context with invalid array-valued context before insertion can flatten it. The second is a dependency security-contract test, not a claim that OHARA configures that test attribute. Existing Entry formatting, image/card, link validation, permission and concurrency tests remain.

Native `RichTextEditor.tsx` and `QuickReflectionEditor.tsx` use React Native `TextInput`; this ProseMirror HTML-paste path is not used there. Shared web Notes still use a read-only Tiptap view; no edit/authorization change was made.

**Separate unresolved Tiptap finding:** [GHSA-cp6q-959q-f8rh](https://github.com/advisories/GHSA-cp6q-959q-f8rh), `@tiptap/core@2.27.1`, propagates across the installed extension family. Patched line begins at 3.30.4; registry's latest 2.x is 2.27.3 and remains in the advisory range. Upgrading the editor family to 3.x is not authorized here. Custom Goal/reference/image renderers call `mergeAttributes`; API V2 validation rebuilds allowed fields and restricts link protocols, reducing exposure through normal writes. However legacy HTML and all clipboard/schema routes are not exhaustively proven safe against prototype-key injection. **Do not certify this unreachable or waived.** Owner review/material-upgrade approval is required.

## 5. shell-quote: installed fix and bundled caveat

Exact installed chain: `react-native@0.83.2` → `react-devtools-core@6.1.5` → `shell-quote@1.8.3` (`^1.6.1`). Applied **1.12.0**, satisfying that constraint. [Operator injection](https://github.com/advisories/GHSA-w7jw-789q-3m8p) is patched from 1.8.4; [parser complexity](https://github.com/advisories/GHSA-395f-4hp3-45gv) from 1.9.0. Version 1.8.5 does not exist; registry verification prevented assuming a nonexistent patch.

Tests reject newline/CR/Unicode-line-break operator and comment tokens, including env-function injection; preserve editor argument quoting; parse a bounded 16,000-token input without losing tokens. Tests do not execute generated shell commands.

**Important limitation:** `react-devtools-core/dist/standalone.js.map` includes the source of an older bundled shell-quote implementation, including vulnerable quote/parse code. Updating `node_modules/shell-quote` does not rewrite that bundle. The source map's `src/editor.js` imports only `parse`, using local `REACT_EDITOR`; launch uses argument-array `spawn` (with a Windows cmd path). No caller passing attacker-controlled object operators to `quote` was found in this inspected bundle. The advisory's critical precondition is not established in that caller, but the parser risk remains if local configuration is untrusted. This is not a blanket claim of safety.

React Native's `Libraries/Core/setUpReactDevTools.js` imports the package's **backend** under `__DEV__`; the backend map does not include shell-quote. OHARA application sources do not import the standalone tool. Normal web/API runtime reachability was not found. Do not expose developer tools publicly or run untrusted editor configuration. Track bundled-code remediation separately with the native/tooling owner; zero critical npm findings does not mean the embedded code disappeared.

## 6. Other selected compatible fixes

All updated audited packages satisfy their original immediate parent constraints; zero package nodes added/removed, no major-version boundary crossed. `package.json` is byte-identical. Lock metadata/integrities and 25 install locations were reviewed. Clean `npm ci` installed 863 packages and both existing CSS-interop/Zustand patches applied successfully.

| Package | Before → after | Exposure and decision |
| --- | --- | --- |
| ws | 7.5.10 → 7.5.13; 8.20.0 → 8.22.0 (two copies) | Metro/native DevTools, Expo CLI, Supabase Realtime's Node transport. Patched fragment/memory handling within each major; browser uses its native WebSocket. No Supabase/auth upgrade. Bundled tool code is not guaranteed replaced by transitive updates. |
| @xmldom/xmldom | 0.8.11 → 0.8.15 | Expo/plist native configuration parsing/serialization; XML injection and parser resource-exhaustion fixes. Not used as a Source upload parser in app code. |
| brace-expansion | 1.1.12 → 1.1.21 (four copies); 5.0.5 → 5.0.12 | Codegen/glob/minimatch/fingerprint/test tooling; bounded expansion fixes, same major lines. Untrusted repository patterns still deserve CI isolation. |
| browserslist | 4.28.1 → 4.29.4 | Babel/Metro target resolution; cache/stats findings. Its five supporting mapping/database packages update within their existing ranges; these are the reviewed resolver's dependency closure, not separate feature upgrades. |
| compression | 1.8.1 → 1.8.2 | Expo development HTTP middleware; premature-close memory leak. Production adapter is `expo-server/adapter/vercel`, not the CLI development server. |
| js-yaml | 3.14.2 → 3.15.2; 4.1.1 → 4.3.2 | Coverage configuration and native xcpretty tooling; parser complexity fixes on both majors. Do not treat untrusted YAML/build configuration as harmless. |
| markdown-it | 14.3.0 → 14.3.3 | Tiptap PM markdown dependency. No direct app Markdown parser caller found; compatible rich-text dependency update removes reported parsing DoS findings. |
| nanoid | 3.3.11 → 3.3.20 | Navigation/router and PostCSS IDs; generator bounds fixes. No user-controlled size caller found in OHARA. Navigation behavior regression-tested. |
| source-map-js | 1.2.1 → 1.2.2 | PostCSS build sourcemap parser; malformed indexed-map offset DoS. Updating it does **not** fix PostCSS's separate arbitrary-file-read finding. |
| tmp | 0.2.5 → 0.2.7 | `patch-package` install tooling, prefix/postfix traversal. Existing patch install verified; not assumed harmless because dev-only. |

Supporting version details are in the complete lock inventory. Framework/React/Tiptap/auth/storage direct packages and patches were not materially changed.

## 7. Remaining advisories: no approved exceptions

The seven high package findings reduce to four unresolved underlying packages (`image-size`, `node-forge`, `postcss`, `zod`) plus propagation through `@expo/cli`, `@expo/code-signing-certificates`, `expo`. Exact advisory IDs and installed paths for **all 47 remaining packages**, including the Tiptap family, are enumerated in the inventory.

The following are **proposed review assignments**, not assigned people or accepted risk. Every unresolved entry needs a named team owner and approval. Re-review by **November 2, 2026**, earlier on a vendor patch, changed exposure, or any integration/production promotion. No exception may silently carry into production.

| Exact remaining package/version | Available remediation / compatibility issue | Evidence, interim boundary and proposed owner |
| --- | --- | --- |
| node-forge 1.4.0; @expo/code-signing-certificates 0.0.6; @expo/cli 55.0.18; expo 55.0.8 | Signature-validation advisory affects <=1.4.0; registry latest is still 1.4.0. npm proposes an unrelated Expo downgrade: rejected. | Expo CLI iOS signing and certificate library import forge; do not process untrusted signing certificates. Native signing/distribution exposure requires release/security owner review. No custom crypto patch. |
| image-size 1.2.1 | Minimum fix for reported ranges is 2.0.3 (latest 2.0.4), outside Metro's `^1.0.2`; 1.x latest remains 1.2.1. | Metro `src/Assets.js` parses repository image assets. No Source upload caller found; not proof that all build inputs are trusted. Build/native owner must approve upstream/major compatibility work. |
| postcss 8.4.49 | Fixed line must exceed 8.5.22 (latest 8.5.31), outside Expo Metro's `~8.4.32`. A narrow override is a possible follow-up, not yet compatibility-certified or applied. | Metro PostCSS transformer processes local CSS, normally `map:false`, but config may enable maps. No public user-CSS processor found. Build owner: isolated untrusted-PR jobs/no release secrets; review nativewind/Metro compatibility before override. |
| zod 3.25.76 | Advisory fixed at 4.6.6 (latest 4.6.7), outside CLI `^3.25.76`; no forced major replacement. | CLI DevTools plugin/MCP schema validation. No app runtime Zod import found (one TODO only). Tooling owner must review input bounds and supported CLI update; keep dev tools nonpublic. |
| @tiptap/core 2.27.1 and installed Tiptap extension/react/starter-kit family | >=3.30.4 needed; coordinated major editor migration requires approval. | Web editor `mergeAttributes` call sites exist; prototype-key reachability unresolved. Editor/security owner; no blanket waiver based on current server allowlisting. |
| decode-uri-component 0.2.2; query-string 7.1.3; propagated @react-navigation/core / expo-router | Patched decode line must exceed 0.4.2 (latest 0.5.1), outside query-string `^0.2.2`. | External deep-link/query parsing is a plausible web/native input boundary. Routing owner must evaluate supported navigation update or narrowly proven override. Untrusted malformed URL regression remains follow-up. |
| postcss-selector-parser 6.1.2 | Low recursion fix 6.1.3; complete reported quadratic fix >=7.1.6 (latest 7.1.7), outside Tailwind/PostCSS-nested 6.x constraints. | Build selector parsing. Build owner; no arbitrary major override or claim that only developer inputs eliminate CI risk. |
| uuid 7.0.3; xcode 3.0.1 (and propagated config-plugins) | Buffer-bound fix >=11.1.1 (latest 14.0.3), outside xcode `^7.0.3`. | Native project tooling; malicious buffer/offset call not demonstrated. Native build owner must inspect actual generator usage and supported xcode upgrade before exception. |
| @babel/core 7.29.0 | Compatible 7.x releases exist (latest 7.29.7); low-priority compiler change deferred from this high/critical pass. | Build/compiler boundary; not risk-free on untrusted source/configuration. Build owner can schedule a separate targeted patch with transform/export comparisons. |
| Bundled shell-quote in react-devtools-core 6.1.5 standalone | Installed module patched, embedded copy remains outside npm audit accounting. Supported DevTools bundle update needs owner review. | `parse(REACT_EDITOR)` caller found, object-token `quote` caller not found; development/native-tooling owner, local trusted configuration only. |

Existing mitigations describe observed configuration or proposed operating restrictions, not new enforced controls or approved policy exceptions. No advisory is suppressed in CI. Core build/native framework upgrades and Tiptap 3 are stopped for explicit review.

## 8. Regression results

Validation uses synthetic intercepted browser data and disposable local PostgreSQL; no production accounts or content. Node 24.18.0 / TypeScript 5.9.3 / Playwright 1.62.0. Roots isolated router runs before full Workspace routing and final TypeScript. Capture-only evidence goes to `/private/tmp/ohara-4c-visual-evidence`; existing Roots assertion images are unchanged.

| Check | Result |
| --- | --- |
| Fresh locked installation / existing patches | Passed |
| Focused Entry / Source tests | 89 / 11 passed |
| shell-quote focused security tests | 3 passed |
| Roots unit / browser | 74 / 26 passed |
| Domain/workspace + helpers (includes new three security tests) | 278 passed |
| Tasks / Momentum | 86 / 74 passed |
| Calendar / Auth / Friends / Circles | 10 / 8 / 13 / 30 passed |
| Prelaunch / Echo | 15 / 7 passed |
| Full database/security chain, hosted and CLI ACL | 17 suites passed in each mode; 001–091 disposable migrations only |
| Preflight/apply rehearsal commands | Exit 0, explicitly skipped/no-op: nothing pending after 091 |
| Workspace/landing/auth/Notes/Reflections browser final | 52 passed (50 existing + two added) |
| Final TypeScript / web export / iOS JS export | All passed; TypeScript also passed after exports and after removing generated-only route churn |
| Final integrity / preservation comparison | Passed; only prior Phase 4B changelog and Notes browser spec differ among its 130 manifest files; other Phase 4C paths are additions to that inventory |
| npm security gate | Fails intentionally: 47 remaining affected packages, seven high |

Initial focused browser run passed, but a clean install/full run exposed two new-test assumptions: arbitrary cursor placement could merge a pasted heading into a paragraph, and unknown attributes are discarded rather than necessarily rejected. The fixtures now select the document explicitly and test a declared validator with valid/invalid slice contexts. A subsequent test inspected final DOM, where insertion can legitimately flatten open context; it now asserts the parsed slice at `handlePaste`. Existing 50 browser scenarios passed in those runs. No product fix, relaxed assertion baseline or security bypass was used to hide a failure.

Evidence logs: `/private/tmp/ohara-4c-*.log`; use `workspace-browser-verified.log` for the final run, not earlier new-test setup failures. `xcrun simctl` unavailable and existing Metro import-cycle warnings do not constitute device validation. Synthetic exports are not deployable production builds; iOS JS export is not a native signing/device test.

Exports: `/private/tmp/ohara-4c-web`, `/private/tmp/ohara-4c-ios`, using explicit `https://workspace-preview.invalid` / `preview-only` configuration. The generated route declaration was saved as `/private/tmp/ohara-4c-router.generated.d.ts`, then returned byte-for-byte to the candidate's base with a targeted patch. `.expo` contributes no final delta. Units were repeated after clean install. Index remains empty; baseline migrations, API/database code, package declarations and Roots snapshots are unchanged.

## 9. CI and release policy

`.github/workflows/workspace-validation.yml` remains unpublished and unchanged. Its helper-test glob includes the new security unit tests; Workspace matching includes the new Notes browser tests. Full-history Roots requirements and the high/critical audit check remain mandatory. No `continue-on-error`, allowlist, severity downgrade or secret-bearing configuration was added. CI's clean-checkout dependency diff guard checks for changes during the run, not differences from the old baseline, so a future reviewed lockfile commit is compatible with it.

Recommended policy: keep full-dependency audit (not production-only), block critical/high findings until remediation or **explicit, scoped, expiring owner approval**; separately require review of reachable moderate editor/URL issues and bundled vulnerabilities not represented in the lock audit. Store any approved exception by exact advisory/package/version with compensating control, named approver and deadline; do not alter the current gate as part of this phase. Required GitHub execution is still NOT RUN.

Manual physical iOS, actual Safari, VoiceOver/keyboard, Dynamic Type/contrast, real nonproduction auth/RLS/storage, native signing and full upstream reconciliation remain outstanding as described in Phase 4A/3F. No new migration is required. No automatic recommendation to merge: resolve recovery state, review the lock/test/doc delta and assign residual security owners first. Production remains blocked by the unresolved security disposition plus manual/preview/release-approval gates.

## 10. Recovery and next authorized step

Keep the Phase 4B passing baseline immutable. Phase 4C adds only the lockfile, this report/inventory, security test changes and its changelog entry. Never reconstruct by copying the entire incomplete original directory over the rehearsal. Use exact base + verified base-relative patch + explicit untracked archive in a separate recovery directory, verify content hashes, then `npm ci` and the documented test order.

Final durable checkpoint location: `/Users/arthursilva/Desktop/OharaBackup/OHARA-Workspace-V2-Phase4C-2026-10-26`. It contains the full accumulated candidate's base-relative binary patch, explicit untracked archive, path/hash inventory, status, audit records, validation summary and checksums. No secrets, dependency trees, exports, generated routes or unapproved screenshots. Verify `SHA256SUMS` and every content-manifest entry after reconstruction. Do not layer this full-candidate package over Phase 4B's patch or reapply the landing prerequisite.

Next proposed authorization: review residual risks and original-source recovery; approve any required framework/editor upgrade separately, or explicitly decide whether a draft integration PR with failing security gate is useful. Do not merge or deploy while the report's gates remain unresolved.
