# Workspace V2.0 production release follow-up

Updated November 12, 2026. The release owner now authorizes production deployment after remaining issues are fixed. The owner separately approved the focused Tiptap 3 migration, preserving the existing UI and document format. This supersedes the earlier prohibition on that editor upgrade and production deployment; it does not waive tests, security findings or production safeguards.

## Dependency remediation

Fresh npm lockfile audit: **0 critical, 0 high, 0 moderate, 0 low — zero findings**. No audit ignores, threshold changes, skipped security checks or vulnerability exceptions. The earlier 51-entry audit and its proposed exceptions are superseded for this candidate.

| Dependency | Actual remediation and compatibility boundary |
| --- | --- |
| decode-uri-component | Vendor 0.5.1 replaces the 0.2.2 source backport. A small query-string 7.1.3 patch selects the ESM default export and retains legacy plus conversion at the query/fragment boundary. Real React Navigation path parsing, malformed/large input, web and native exports are tested. |
| Metro/image-size | Pin the existing Expo Metro family to vendor patch 0.83.8. Its supported image-asset parser no longer depends on image-size. Remove the old image-size patch; verify original brand image dimensions through buffer and file-backed Metro APIs and bounded malformed input. No incompatible image-size 2.x override. Expo SDK 55 stays unchanged. |
| Zod | Scope 4.6.6 to Expo CLI. Test the actual installed plugin schemas, strict generated commands and output/error handling. Confirm constrained collections reject before processing oversized elements. |
| Tiptap | Approved upgrade of the complete editor group to 3.33.1; remove the core backport. Keep explicit Link/Underline extensions, disable duplicate StarterKit registrations and new trailing-node behavior, and use `emitUpdate: false` for externally loaded documents. Pin compatible React DOM types to 19.2.3; no React upgrade or peer-dependency bypass. |
| glob/minimatch | Scope fixes to affected modern dependency ranges: glob 14.0.2 and minimatch 11.0.1. Keep legacy glob 7/minimatch 3 callers unchanged. Verify used glob/ignore/cancellation interfaces and full builds. |
| uuid | Scope vendor 11.1.1 to Xcode tooling; verify its actual generated identifier contract. |
| deepmerge | Replace Expo config's vulnerable implementation with maintained `@fastify/deepmerge` 3.2.4 via an explicitly named npm alias and a one-line factory adapter. This changes the actual implementation rather than its version label. Verify nested config/plugin merging, array concatenation, persisted config and prototype isolation. |

References: [decoder advisory](https://github.com/advisories/GHSA-qr28-fpjm-wq7f), [image parser advisory](https://github.com/advisories/GHSA-w3rx-r6r6-pgpr), [Zod advisory](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5), [Tiptap advisory](https://github.com/advisories/GHSA-cp6q-959q-f8rh), [Tiptap migration guide](https://tiptap.dev/docs/guides/upgrade-tiptap-v2), [deepmerge advisory](https://github.com/advisories/GHSA-gcqx-w48m-w2h4), [maintained replacement](https://github.com/fastify/deepmerge).

## Local validation

- Clean install applies all four current compatibility patches: Expo config, query-string, CSS interop and Zustand. Retired security backports are removed.
- **613 unit/domain tests PASS**, including 15 dependency/parser/tooling regressions.
- **26 Roots browser tests PASS**, unchanged historical reference images.
- **57 Workspace/landing/auth/Notes/Reflections browser tests PASS**. New migration coverage preserves V2 custom Goal/image/checklist nodes, stable IDs, marks, silent document loading and undo/redo. Existing clipboard sanitizer, ProseMirror schema validation and read-only checks remain intact.
- **17 database/security suites PASS** on the complete real migration chain. No schema migration is introduced.
- TypeScript, web production-mode export, iOS JavaScript export and final TypeScript PASS. Synthetic export settings are never deployed.
- Git diff integrity PASS. Generated route types remain unstaged.

The browser run exposed a duplicate Home alignment assertion measuring separate asynchronous layout frames. Both Home and sidebar tests now share one atomic measurement and wait for the unchanged subpixel contract; no UI/tolerance/baseline changes. An initial new undo test unintentionally grouped its synthetic document replacement with a user edit; it now checks undo against the actual initial document and tests silent replacement separately. The full 57-test browser run passed after those corrections.

## Remaining release execution

1. Push the reviewed candidate on the existing integration branch and require exact-head application, database and dependency CI.
2. Build its protected Preview using the existing Git-connected Vercel project and unchanged QA-only branch environment. Verify the deployed SHA and QA bundle before mutations.
3. Complete real public signup/confirmation/reset with the release-owner-approved inbox; no production account/password is changed. QA signup has created an unconfirmed account and recorded its confirmation email as sent; delivery/callback acceptance is pending.
4. Finish critical Safari/clipboard/keyboard/scaling checks on the final Preview. Record unavailable VoiceOver/device scenarios honestly; do not claim automated AX checks as manual certification.
5. Recheck main, production SHA, environment and read-only ledger. Use the established Vercel release path only after the gates are satisfied, retain the known-good rollback deployment, and verify production routing/auth/privacy afterward.

Current production is still unchanged. Existing rollback identity from the independently verified release record: deployment `dpl_Grk2Ht2xDs2PzXdbWWMA3HV5poKi`, SHA `b939327dfd70f44c650992e3c0337c8798a297d8`. No production migration or data mutation is part of this change.
