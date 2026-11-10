# Workspace V2.0 — Phase 4H Preview Acceptance

Updated November 6, 2026. **NO-GO for production; isolated preview verified and core real-backend scenarios passed, with security and manual acceptance gates still open.** Initial hosted scenarios ran November 3; Safari checks continued November 4 and 6. Lifecycle/PDF tests and dependency/PR status were refreshed November 6.

## 1. Preview identity and repository state

- Repository: `teamoharaai/oharaai`; [PR #28](https://github.com/teamoharaai/oharaai/pull/28), OPEN and Draft, freshly confirmed November 6.
- Branch: `codex/workspace-v2-integration`; exact tested SHA **`644ae2f47f93b577bad6de7d056d17d25888b544`**.
- Vercel project `prj_IBQ9gdBUAXkua6A7wH1ThkCj5Xvj`, team `team_tSJmkDha1V5AK3EObeGDw011`.
- Final Preview deployment **`dpl_C8FBD1KXcTJXhhZPDpR174n8s7SM`**, READY, exact Git SHA above.
- [Immutable preview](https://oharaai-5il46ejeh-oharaais-projects.vercel.app).
- [Branch preview](https://oharaai-git-codex-workspace-v2-integration-oharaais-projects.vercel.app).
- An earlier preview was superseded after fixing its temporary site URL; acceptance uses only the final deployment.
- Existing Vercel Authentication protection retained. CLI authorization and protected requests succeeded. A path-plus-deployment CLI invocation initially hit protection; the documented full-URL invocation reached the application and returned its JSON 401. No protection settings were disabled.
- Automatic branch deployment guard remains false in `vercel.json`. Explicit nonproduction builds only; no main merge or production deployment.
- Team main last refreshed November 2: `b939327dfd70f44c650992e3c0337c8798a297d8`, unchanged. November 3 PR head remains 644ae2f.

## 2. Independent QA backend

**OHARA Workspace V2**, Free plan, Nano, Oregon, PostgreSQL 17.11.0.003; project ref **`rmzsdszjfrqlrykcxkhl`**; API **`https://rmzsdszjfrqlrykcxkhl.supabase.co`**.

Distinct from production ref `rrgiqemscnyaqkculnmb`. No production user data, Auth accounts, files, storage objects or service credentials copied.

- Initial QA SQL: zero public application tables, zero Auth users, zero storage buckets, no migration ledger.
- Canonical migrations **001–091 applied successfully to QA only**. Ledger: 91 rows, 91 distinct versions, min 001/max 091. Zero public application tables without RLS.
- Buckets: public avatars; private goal-note-photos, milestone-photos, note-images and sources.
- No Edge Functions, Auth hooks, GitHub connection or custom SMTP. Phone and external OAuth providers disabled. Email confirmation enabled; security notification switches off. Application-schema trigger/function inspection found no outbound HTTP/net hooks.
- Synthetic users created through Admin Auth API with confirmed email, avoiding outbound confirmation email. No email invitations were sent; Project invitations targeted synthetic user IDs.
- Dedicated CLI profile `ohara-workspace-v2-qa`; operations guard the exact linked QA ref. The account-level management credential is not claimed to be project-restricted.

Production accounts do **not** exist here. Normal production passwords/accounts cannot be used to review the isolated app.

## 3. Isolation evidence

Six branch overrides target only Preview and `codex/workspace-v2-integration`:

| Variable | QA treatment |
| --- | --- |
| EXPO_PUBLIC_SUPABASE_URL | Independent QA URL |
| EXPO_PUBLIC_SUPABASE_ANON_KEY | QA anonymous credential, JWT ref/role verified |
| SUPABASE_SERVICE_ROLE_KEY | QA service credential, server-only sensitive variable |
| EXPO_PUBLIC_SITE_URL | Exact branch preview URL |
| ANTHROPIC_API_KEY | Empty branch-specific value masks inherited provider key |
| VOYAGE_API_KEY | Empty branch-specific value masks inherited provider key |

Original environment record IDs/scopes unchanged. No production variables were decrypted or modified. No secret values recorded here.

Final exported client bundle `entry-201020734138fdf10e2dc5eb0115dca2.js` inspected in full (4,543,015 characters): QA ref and correct preview site URL present; production ref, temporary invalid site URL and QA service credentials absent. The HTML response was 200.

Server isolation is independently evidenced by QA-issued JWT acceptance, deployed API writes appearing in this QA database, and Source deletion removing the QA Storage object through the server-only cleanup path. No production-backed application requests were used.

QA Auth Site URL and exact branch `/callback` and `/` redirect entries were confirmed in the QA Supabase dashboard after a fresh reload November 4 (two allowed URLs). Actual confirmation/recovery callback flow remains **NOT RUN**. Provider OAuth and SMTP workflows are not certified.

## 4. Real-backend results

Executed through the protected deployed API and/or the exact Supabase RPC used by the application. Backend rows were checked, rather than trusting only success messages.

| Area | Executed evidence | Result |
| --- | --- | --- |
| Auth fixtures | Six synthetic owner/admin/member/guide/outside/removed identities; login, user identity, refresh and profile rows | PASS |
| Session rejection | Bad password rejected; logout revoked tested refresh token; deployed Entry route returns JSON 401 without an app token | PASS |
| Registration UI | Admin fixture creation is not registration acceptance; real signup/confirmation/recovery not executed | NOT RUN |
| Owner Notes and Reflections | Deployed create/read/edit persisted; full structured content; repeated stale-version PATCH returns 409; version increment exactly once | PASS |
| Private Entries | Outsider GET/PATCH/DELETE 404; direct RLS query returns no row | PASS |
| Projects | Independent team and guide Projects created; invitations accepted; canonical membership roles verified | PASS |
| Sharing vs linking | Linked-private Entries remained unavailable to collaborators before explicit sharing | PASS for tested team Reflection and guide Note/Reflection; team Note denial executed before a diagnostic status-expectation correction |
| Shared Entries | Admin/member/guide can read; capabilities prohibit edit/delete; attempted mutations denied; direct RLS visibility confirmed | PASS |
| Removed collaborator | Removed from guide Project; membership absent; Note/Reflection API and RLS access denied | PASS |
| Management/chat | Member management denied; admin update persisted; member chat row readable by admin | PASS |
| Sources | Synthetic text upload; Source replay returns one row; signed download returns exact bytes; outsider API/Storage access denied | PASS |
| Source deletion | Owner removal deletes canonical row and actual QA Storage object; server reports storageRemoved true | PASS |
| Project Sources | Admin-created direct Project link visible to member, denied to outsider | PASS |
| Canonical Goal creation | Existing verification gate temporarily allowed only synthetic owner; register/submit/replay returns one Goal; outsider header denied | PASS |
| Tasks | Daily Task create/replay gives one Task; complete/replay gives same receipt; actual occurrence remains completed | PASS |
| Milestones | Create and completion accepted; canonical Goal Milestones read retains one item | PASS |
| Current web Goal → Project | Created through `/api/goals`, the endpoint used by ManualGoalCreationV22; Project assignment persisted on the canonical Goal row | PASS |
| Gated native/canonical Goal → Project | Existing linking RPC rejects adopted Goal with HTTP 400 / P0001 / GOAL_WRITE_UPGRADE_REQUIRED | **FAIL in gated native path — see below; not the current web creation path** |
| Calendar | Replayed recurring Task completion projects one completed occurrence; unassigned shared Project Task excluded from member default Calendar | PASS |
| Momentum reads/publication | GET leaves profile and Goal/account history unchanged; explicit recalculation publishes current profile | PASS |
| Goal lifecycle | Separate synthetic web Goal: owner pause (`stagnant`), resume (`active`), complete with progress 100, and archive persisted through the same RLS update path used by the web service; outsider update leaves owner row unchanged | PASS for these transitions; expiry/successor and complete browser lifecycle NOT RUN |
| Goal-linked Vault/dedup | Goal-owned shared Source appears once in Project Vault with correct origin and member access; private Source stays private; Goal/Project Note links alone do not grant sharing | PASS for tested link Sources and Note visibility |
| PDF Source | Synthetic one-page PDF uploaded to QA Storage and registered through deployed Sources API; signed response has PDF MIME type and exact SHA-256 match; outsider access 404; Sources link opens rendered PDF in actual Safari | PASS; PDF retained in isolated QA for review |
| Shared Note images | Team owner/admin/member and guide receive signed images with matching download hashes; outsider/removed collaborator signing denied; owner image renders in Safari | PASS |
| Closed-week immutability | Current-week Task reopened and recalculated, then recompleted; all existing closed-week rows remain byte-equivalent | PASS for one account snapshot (no eligible-activity baseline); populated Goal/multiweek historical scenarios NOT RUN |

The Sources test removed only its synthetic text Source and storage object; those test artifacts were intentionally disposable. Other QA fixtures are retained for continued acceptance.

A diagnostic script initially expected a void Supabase RPC to return 204; actual successful response was 200. Corrected only the scratch test expectation, read persisted sharing state, and continued. This was not an application failure or product patch.

Two additional scratch expectations were corrected without product changes: Source visibility must be `vault_members`, not `shared` (the unsupported value safely defaulted private); first-time Momentum closure may append a historical snapshot, so immutability asserts preservation of existing rows rather than preventing new closure. Repeated PASS entries in the scratch result ledger represent retries, not additional distinct scenarios.

The November 4 lifecycle Goal creation returned no response before the client timed out. Before retrying November 6, a read-only QA query found exactly one matching active synthetic Goal (`4281af41-073a-4b4e-899c-0cd204c8bd9f`); the helper resumed from that ID without repeating creation. Transitions then passed and the Goal was left archived. This recovered an uncertain outcome; it is not proof of idempotency for the legacy creation endpoint. No production content was queried or changed.

### Confirmed Goal–Project contract incompatibility

1. Create a Goal through deployed `POST /api/goals/manual-v1?action=register` and `submit` under the explicitly allowlisted synthetic owner.
2. Attempt owner-authorized `assign_goals_to_project_v1` using an independent team Project.
3. Actual result: **HTTP 400**, PostgreSQL **P0001**, **GOAL_WRITE_UPGRADE_REQUIRED**; reproduced with the same controlled fixture.

Root cause:

- Migration 071's `assign_goals_to_project_v1` directly updates `goals.project_id` through the legacy definer.
- Migration 072's `goal_private.protect_goal` requires `goal_manual_executor` for adopted/date-contract Goals.
- The Project service still invokes this legacy RPC. There is no accepted canonical project-assignment mutation in the inspected path.

Both migrations are identical to upstream/main; this is **pre-existing contract incompatibility**, not evidence that Workspace V2.0 introduced it. The inspected web UI still uses the legacy Goal creation endpoint, whereas this failure concerns adopted canonical Goals and cross-client integration. Do not claim all ordinary web Goals are broken, or widen canonical admission to work around it.

Follow-up exercised the actual web endpoint and successfully linked its Goal to a Project, then validated Goal-linked Vault, Calendar and Momentum. `docs/manual-goal-v1-delivery.md` describes the native foundation as gated, without Project association. Treat the failing adopted-Goal case as a prerequisite to native-contract rollout, not as a regression in the current web path. Keep admission closed; release owners must explicitly preserve that boundary.

Smallest defensible remediation: a separately reviewed canonical ownership-checked Project assignment/detachment operation, with execution authority, version/receipt behavior and compatibility matching the existing Goal protocol. Add adopted/legacy Goal tests covering owner/member/outsider, reassignment, archived Project, replay and immutable authority. Do **not** disable the protection trigger or broadly grant its executor role. Coordinate with the Goal/iOS contract owner before any backend migration. No workaround or schema change made in this phase.

The temporary QA gate was restored in a finally block and independently verified: **enabled=false, verification_only=true, allowlisted=0**. Existing Goal remains available for read/child-work investigations; no general admission was opened.

## 5. Safari, accessibility and native acceptance

Tester: Codex via native Safari UI controls on user's Mac, model identifier **Mac16,12** (no serial number collected). macOS **26.6.2**, Safari **26.6.2**. Exact preview SHA above.

Executed on actual Safari:

- Protected landing → Get Started → signup → login navigation; synthetic owner login succeeds and renders the authenticated Home dashboard.
- Home → Projects → team Project → contextual Vault → shared Note; structured content and the authorized image render.
- Note title and rich text edited through Safari; Saved state observed. Independent deployed API read confirms title/body changes and preservation of the image; reload retains the changes. Echo remains closed by default.
- November 4: owner Reflection menu exposes Edit Entry/Delete; edited synthetic Reflection in its composer, saved, and verified the new text independently through deployed Entry GET (HTTP 200).
- Calendar month grid loads recurring occurrences; opening a day and its Task navigates to the correct Goal's Tasks section and focused Task. Home → Calendar → browser Back → Forward restores the expected routes.
- Compact-width navigation opens and closes; selecting Home closes the drawer and focuses the main content. Using Safari Option-Tab, reached Skip to content and the drawer trigger, opened with Return, advanced to Home, and Escape closed the drawer and restored focus to its trigger. Plain Tab did not traverse links in the same way under current Safari preferences; no global keyboard setting changed. Full focus wrapping and all dialogs are not certified.
- Manage Goal closes with Escape when focus is inside its title field. Full trigger-focus restoration for that dialog remains unverified.
- November 6: Sources lists the uploaded synthetic PDF. Opening it renders its actual one-page text in Safari's PDF viewer; the temporary signed URL was redacted from logged UI text. The viewing tab was closed and Safari returned to Sources.
- Light-mode Home and dark-mode Note rendered. Dark selection persists after reload. An earlier capture showed pale controls; November 4 inspection of the same preview shows correctly dark editor controls and sidebar without any source patch. This intermittent appearance is **not claimed fixed**; theme-transition/reload coverage remains open.
- Named controls are exposed in the accessibility tree, but that alone does not establish screen-reader or keyboard usability.

Local screenshot evidence: `/private/tmp/ohara-phase4h-qa.KVhbQw/safari-home.png` and `safari-note-dark.png` (earlier capture). A fresh light-to-dark navigation and Home reload November 4 rendered dark cards/controls correctly; recorded as `safari-home-dark-nov4.png` in the same directory. This does not establish the cause of the earlier intermittent appearance. Evidence is not staged; credentials are excluded.

**NOT RUN:** registration/confirmation/recovery completion; full Goal lifecycle through Safari UI; phone-width/mobile-device responsiveness; comprehensive theme initialization/transition matrix; complete modal focus containment/restoration; complete keyboard-only workflows; VoiceOver; text scaling; measured contrast/touch targets; full deep-link Back/Forward matrix; physical iOS Safari; signed-native iOS acceptance. The tested compact desktop window is not physical iOS evidence.

A production-account sign-in attempted in the QA preview is not a valid synthetic-account acceptance test. The completed owner sign-in used the separate synthetic QA account with user authorization.

## 6. Security refresh and owner dispositions

November 6 lockfile-only npm audit: **0 critical, 7 high, 44 moderate, 2 low — 53 affected-package entries**. Same seven high package entries listed below. Lockfile unchanged. November 2 was 66 entries (57 moderate); October 29 was 50 / four high. Feed/count changes without package edits are not remediation. November 6 summary and high advisory details were captured in tool output; historical raw November 2 audit remains `/private/tmp/ohara-4h-audit-2026-11-02.json`.

| Installed high package | Finding and evidence | Required disposition |
| --- | --- | --- |
| decode-uri-component 0.2.2 | [GHSA-qr28-fpjm-wq7f](https://github.com/advisories/GHSA-qr28-fpjm-wq7f): malformed encoded input can cause quadratic decoding work. Also moderate GHSA-vcc3-ghjq-m6fr. Reached transitively through query-string; runtime routing exposure must not be dismissed as build-only. | Vendor patched line is 0.5.1. Registry metadata checked November 3 declares `type: module`; installed query-string 7.1.3 requests `^0.2.2`. A blind override crosses both the supported range and a module boundary; compatibility is not established. Validate a supported update/reviewed backport and routing/deep-link negative controls. Do not force npm's suggested Router 58 major upgrade. |
| query-string 7.1.3 | Propagated decode-uri-component finding | Same decoder remediation; not an independent waiver. |
| @react-navigation/core 7.17.0 | Propagated query-string finding | Navigation/runtime regression coverage required. |
| expo-router 55.0.7 | Propagated query-string finding | Remain on supported framework line; no speculative major migration. |
| image-size 1.2.1 | [GHSA-5p2g-fcmc-qvqq](https://github.com/advisories/GHSA-5p2g-fcmc-qvqq), [GHSA-w3rx-r6r6-pgpr](https://github.com/advisories/GHSA-w3rx-r6r6-pgpr). Prior bounded negative control confirmed parser hang; 2.0.4 broke Metro's filepath API. | Supported Metro-compatible remediation or reviewed backport, not another blind override. Reviewed assets/time-limited isolated builds are proposed controls, not a fix. |
| zod 3.25.76 | [GHSA-mrhx-c7xc-m3w5](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5). Prior source review identified CLI DevTools/MCP consumer; oversized-input exposure not fully resolved. | Supported tooling update or reviewed fix; no arbitrary Zod major override. |
| @expo/cli 55.0.18 | Propagated Zod high finding | Same tooling disposition. |

Owner: **Arthur Silva**, security/release; framework/navigation/editor reviewer still needed. **No issue-specific exceptions accepted.** Prior proposed November 4 exceptions were never approved and that date has now passed; they cannot authorize a release.

Tiptap 2.27.1 maintained CJS/ESM backport and its open version finding remain as documented in the [Phase 4G review](OHARA-Workspace-V2.0-Go-Live-Readiness.md); UMD is not covered. Remaining moderate/low findings also need review. Expo's own package classification changed to moderate in the refreshed feed; that is not a claimed fix.

No exclusions, threshold changes or audit suppression. No application/dependency patches made during this acceptance continuation.

## 7. CI and local integrity

November 6 GitHub read confirms exact SHA 644ae2f and Draft status:

- [Workspace validation 40860855008](https://github.com/teamoharaai/oharaai/actions/runs/40860855008): application and both database modes SUCCESS; dependency-review FAILURE.
- [Database chain 40860855078](https://github.com/teamoharaai/oharaai/actions/runs/40860855078): hosted and CLI modes SUCCESS.
- Vercel Preview status SUCCESS for final deployment.
- These workflow runs completed October 29; they were inspected, not rerun during Phase 4H.

Prior 600 domain/unit tests, 26 Roots, 52 browser tests, TypeScript, web/iOS exports and 17 database suites are historical CI evidence, not substitutes for the real-backend failures/missing manual acceptance above.

Repository changes in this phase are two reports only. No source/config/lockfile/migration changes. Scratch QA helpers and credential files are outside the repository and must never be staged. Git diff integrity check passes.

## 8. Recovery and evidence handling

The old temporary integration directory lost its Git pointer and tracked files between sessions; cause unverified. Recovered exact reviewed SHA into managed worktree:

`/Users/arthursilva/.codex/worktrees/workspace-v2-preview-qa/oharaai`

Copied only two surviving pending reports. Detached HEAD retained; no reset, clean, prune, branch rewrite or silent teammate overwrite. Original source directories, unrelated primary-worktree files and Desktop/OharaBackup recovery material remain untouched.

Local synthetic fixture IDs and result records are under `/private/tmp/ohara-phase4h-qa.KVhbQw`. Credential state is mode 0600 and must not enter Git, reports or public backups. Scratch files are not durable recovery substitutes. QA database persists independently; re-identify synthetic fixtures before any cleanup. Do not broadly delete QA accounts/data.

## 9. Outstanding blockers and next steps

1. Preserve the gated native Goal boundary. Current web Goal association passed; adopted Goal association needs a separate protocol-owner resolution before native admission, not an unreviewed Workspace migration.
2. Complete expiry/successor and populated Goal/multiweek historical acceptance. Pause/resume/complete/archive through the current web RLS path and actual Safari PDF rendering now passed, alongside the previously tested Calendar, Momentum, Vault and image scenarios.
3. Complete real signup/redirect recovery and remaining Safari workflows; reproduce or clear the intermittent theme appearance with focused transition/reload checks.
4. Execute accessibility and physical iOS gates, recording tester/device/build/evidence.
5. Remediate high findings or obtain explicit, issue-specific, time-bounded security disposition; dependency CI remains red.
6. Team review and separate release authorization remain necessary. PR stays Draft.

## 10. Production and rollback prerequisites

No production service, database, environment, domain or alias changed. No main merge, production deploy or production migration. No paid provisioning or external AI requests.

Previously verified rollback candidate: `dpl_Grk2Ht2xDs2PzXdbWWMA3HV5poKi`, main SHA `b939327dfd70f44c650992e3c0337c8798a297d8`, [immutable URL](https://oharaai-8pnafuzum-oharaais-projects.vercel.app). Reconfirm live aliases/SHA and retained deployment immediately before a separately authorized release. Workspace candidate introduced no migration; any future contract fix needs its own migration/compatibility review. Do not roll back database history to undo UI changes.

**Recommendation: NO-GO for merge/production.** Preview isolation and the tested current web workflows are verified. The unresolved security gate and remaining manual/device acceptance prevent release sign-off. The adopted-Goal incompatibility is separately scoped to the gated native protocol and must not be represented as a current web Goal-linking failure. PR stays Draft; no main merge or production change is authorized by this phase.

## 11. Requested post-push handoff

User requested November 4: after the update is pushed, produce a PDF documenting the actual released update, an iOS UI framework based on the approved site, and aligned naming/code standards. Bind the report to the eventual pushed SHA and distinguish branch push, preview deployment and production release. Include web-to-iOS component/navigation/token mappings, existing canonical domain/data names, user-facing terminology, accessibility/platform adaptations and proposed standards requiring approval. Do not silently rename existing APIs/tables or imply native implementation has shipped. This deliverable is pending the release milestone; no final release PDF generated during acceptance.
