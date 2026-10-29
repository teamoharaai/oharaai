# OHARA Workspace V2.0 — Phase 3E readiness

Started October 22; completed October 23, 2026. Local cross-feature validation and targeted corrections only. This is not a production release, accessibility certification, or physical-iOS sign-off.

## Preservation and completed feature inventory

Worktree: `/private/tmp/ohara-workspace-v2`. Branch: `codex/workspace-design-system-v2-phase1`. Base HEAD: `d286285dccd13cee607cd706fa56df589562e357`. No commit, push, merge, deployment, production migration, or production-data mutation was performed. The main checkout was not edited.

Before Phase 3E edits, 71 tracked modifications and 83 non-ignored untracked files were checkpointed in `/private/tmp/ohara-phase3e-checkpoint.Rgtn2H/`:

- `tracked.patch`: binary-capable HEAD diff; reverse-apply check succeeded before changes. SHA-256: `185ca0c95740c32c2513ec5ec25118c1e8c9647dbfd29c04fa958e43849805db`.
- `untracked.tar.gz`: exact Git untracked inventory; archive listing verified. SHA-256: `02323a99b3fbba880ab7d0d300ff6c59a1e7766222575ee8202980a2c67027dd`.
- `README.md`: safe recovery instructions into a separate checkout at the recorded HEAD. Ignored dependencies, credentials/environment files and runtime build output intentionally excluded. Move the checkpoint to durable storage before temporary-file cleanup.

Both checkpoint hashes were verified again after implementation. No checkpoint file was modified.
All 83 checkpointed untracked files remain present. No tracked files were deleted and nothing is staged.

| Completed work | Preserved implementation |
| --- | --- |
| Public landing/auth | Approved gradients, white palette, editorial copy, brand assets, existing auth routes and validation |
| Phase 1 foundation | Scoped web tokens, typography, sidebar, mobile drawer, appearance and account/create controls; native shell retained |
| Phase 2 Home | Dated greeting, published Momentum snapshot, Next Step, Calendar/Today's Focus, independent loading/error states, responsive ordering |
| Phase 3B Goals | Library-first browsing; lifecycle/category/context filters; Overview/Tasks/Milestones/Vault; existing creation, lifecycle, successor and task domains |
| Phase 3C Projects | List-first library plus grid/category coding; Overview/Goals/Vault; independent Goal-free Projects; collaboration, assignments, chat, history and canonical Task writes |
| Phase 3D Vault | Notes/Reflections/Sources navigation; scoped contextual aggregation; deduplication; viewer RLS; legacy Goal Vault web redirect; existing Source ownership |

Earlier phase reports and synthetic screenshots remain in `docs/design/` and `docs/ui-checkpoints/`. There is no separate persisted Phase 3A audit document in this worktree; the later implementation reports document the adopted relationships and constraints. Phase 3E does not invent a global All library or remove existing data readers/routes.

### Phase 3E delta inventory

- Domain/UI corrections: `features/goals/hooks/{useVault,useActivity}.ts`, `features/projects/hooks/useProjectVault.ts`, `features/projects/components/{ProjectVaultWorkspace,CreateProjectModal}.tsx`, `features/goals/components/{GoalVault,VaultItemCard}.tsx`, `features/calendar/components/CalendarItemRow.tsx`, `components/ui/Modal.tsx`, `app/(app)/projects/{index,[id]}.tsx`.
- Terminology/navigation/test typing: `components/layout/workspace-navigation.ts`, `components/landing/LandingPage{,.web}.tsx`, `features/entries/components/ReflectionsScreen.tsx`, `features/intelligence/contextual-insights.ts`, `lib/goals/manual-create-v1.test.ts`.
- Regression evidence: new `features/goals/vault-request-race.test.ts` and `tests/workspace-v2/readiness.spec.ts`; expanded insight/foundation/Goal/Vault tests, combined Playwright config, legacy Reflections browser label assertions and `scripts/vault-context-security.test.sql`.
- Documentation: this report, rollout, `CHANGELOGCODEX.md`, enlarged-text checkpoint/README and refreshed synthetic screenshots produced by existing suites.
- No new schema migrations, dependency changes, API contracts or production configuration changes.

## Cross-feature findings and corrections

- Home links to Calendar, Goal context, Momentum and existing Note/Reflection creation routes. Project section navigation and browser Back/Forward preserve the selected workspace. Calendar retains Goal/Project/Task context in its existing deep link. Roots' legacy web Goal Vault link redirects to the canonical contextual Vault; native routing remains separate.
- Goal/Project Source hooks now reject superseded read results after a successful edit/delete, reject results from a previous parent visit (including A → B → A), and deduplicate insert responses. Ten executable async-ordering tests run the actual transpiled hooks with a deterministic dispatcher; they are not substitutes for React or RLS tests.
- Successful Project Source writes refresh the existing parent projection. This prevents remounting the Vault tab from restoring the pre-edit/pre-delete Source list. Source creation uses the same post-write reload when available. This is a scoped domain read after a mutation, not a new cache or read-triggered computation pipeline.
- Optional Goal activity JSON errors and invalid response shapes now finish loading and display an error while Goal Tasks remain usable.
- Calendar completion has a synchronous pending guard, disabled/busy semantics and a visible retryable failure. It still calls the same occurrence mutation and idempotency mechanism; no scheduling, scoring or snapshot logic changed.
- Nested legacy Reflection routes correctly select Reflections in the sidebar. Remaining public demo/coming-soon and deterministic insight copy uses Reflections/Echo. Technical `/journal` URLs, schemas and historical user-authored titles are retained. The finalized Phase 3E terminology supersedes earlier landing-spec branding suggestions.
- Project headers wrap controls at enlarged text sizes instead of squeezing the title into a narrow column. At normal size, the approved layout is retained.
- Source actions have button roles and 44-point minimum targets. Project creation and Source details have dialog names; New Project has an explicit action name. Web dialog dismissal restores trigger focus after the portal closes. Native focus behavior is unchanged.

### TypeScript root cause

`manual-create-v1.test.ts` used an unqualified global `URL`. React Native's global URL/URLSearchParams declaration exposes `IterableIterator`, whereas Node's `readFileSync` PathLike expects Node URL with the newer `URLSearchParamsIterator`/iterator helpers. Explicitly importing `URL` from `node:url` fixes this test-only declaration collision. It is the same Node runtime constructor, with no casts, suppression, compiler changes or production behavior changes. The 15 manual-create tests pass and are also included in the wider domain run.

## Security and data integrity

The full disposable database harness applies the real migration chain and runs 17 suites. Expanded Vault SQL tests cover direct Project Entries, Goal-linked and multi-Goal content, deduplication, private Entries, owner/admin/member/guide views, removed members, Source visibility, author-only mutations, cross-owner rejection, reassignment, detachment, archived parents and deleted-parent preservation. All assertions run locally with rollback/disposable clusters, not production users.

Existing `validate_goal_project_owner_v1` still rejects cross-owner Goal attachment. No RLS, ownership trigger, storage policy or migration changed in Phase 3E. Archived authorized context remains readable; archiving is not silently treated as deletion. Shared Goal membership does not itself expose private Entries. UI fixtures demonstrate presentation only; database tests provide actual policy evidence.

Notes retain the existing editor, autosave/version-conflict path, shared read-only capabilities and image authorization. Reflections retain both canonical and compatible legacy editing/deletion. Existing Task/Milestone writes, lifecycle rules, Momentum V1.1 weights, New York week semantics and closed immutable snapshots are unchanged. Echo remains deterministic; no external AI generation was introduced.

## Performance and stability

Measured assertions are bounded local behaviors, not production latency claims:

- Home browser scenarios assert zero POST requests and zero reconciliation/recalculation/full Entry-library requests while rendering.
- Goal library browsing asserts zero Entry reads; contextual Entries load on demand. Denied Project detail asserts zero Entry reads.
- Project conversation makes zero chat reads before disclosure. Canonical Task completion produces one mutation in its integration test.
- Calendar's pending-click regression asserts one mutation while the first request is outstanding; a subsequent explicit retry is a second attempt.
- Error/loading/empty distinctions, partial Vault results with retry, stale-response ordering and responsive overflow are tested.

Project core/secondary hydration can still repeat some domain reads. Source mutation success intentionally reloads the existing Project projection; a narrower parent-update interface is a future optimization. If that refresh fails, the Project error/retry surface must be used; no offline convergence is promised. There is no production-shaped timing benchmark or first-render improvement claim. Existing Metro import-cycle warnings remain; auth/cache/provider ownership was not refactored.

## Validation results

Final local results follow. These are validation evidence, not production release sign-off.

| Check | Result |
| --- | --- |
| Workspace/landing/Notes/Reflections browser suite | 50 passed, 0 failed (2.0 minutes) |
| Entry, Project, insight, Source, Goal/lifecycle and workspace unit/source tests | 273 passed |
| Manual Goal creation | 15 passed, included above |
| Task tests | 86 passed |
| Momentum tests | 74 passed |
| Calendar tests | 10 passed |
| Auth | 8 passed |
| Friends | 13 passed |
| Circles | 30 passed |
| Prelaunch | 15 passed |
| Legacy Echo composer/reconciliation | 7 passed |
| Roots/Constellation | 73 passed, 1 pre-existing missing-reference-fixture failure |
| Full real migration chain/database/security | All 17 suites passed |
| TypeScript | Passed, no diagnostics |
| Final web production export | Passed: `/tmp/ohara-3e-web-final` |
| Final iOS JavaScript export | Passed: `/tmp/ohara-3e-ios-final` — not native-device validation |
| `git diff --check` | Passed |

Commands:

```sh
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
npm run test:constellation
bash scripts/db-chain/run.sh
npx tsc --noEmit
CI=1 EXPO_PUBLIC_SUPABASE_URL=https://workspace-preview.invalid EXPO_PUBLIC_SUPABASE_ANON_KEY=preview-only npx expo export --platform web --output-dir /tmp/ohara-3e-web-final
CI=1 EXPO_PUBLIC_SUPABASE_URL=https://workspace-preview.invalid EXPO_PUBLIC_SUPABASE_ANON_KEY=preview-only npx expo export --platform ios --output-dir /tmp/ohara-3e-ios-final
git diff --check
```

Browser fixtures intercept API/database traffic with synthetic data on local port 4291; no production accounts were used. Notes/Reflections tests are included in this shared local configuration, avoiding the user's existing port 8091 server. Logs are `/tmp/ohara-3e-*.log`, ephemeral local evidence. Early iterations failed on outdated test labels/Calendar month-view assumptions and on the genuine dialog-focus defect; final results must be read separately. Expo reports unavailable `xcrun simctl` and existing require cycles; successful JS export does not resolve native-device validation.

## Accessibility and visual review

Chromium coverage includes 100% zoom, 320/390-pixel mobile, tablet and desktop sizes, expanded/collapsed rail, dark/light states, keyboard filters, mobile drawer focus containment/return, dialog keyboard containment/return, and Project header text-only scaling to 200% at 768 pixels. Text scaling doubles computed text sizes and line heights without doubling inherited sizes; this is not a substitute for OS Dynamic Type or native browser zoom testing.

Core token tests check 4.5:1 text contrast on page/card, selected rows and primary controls in both themes. They do not cover every status color, image or legacy control. Updated synthetic screenshots remain in the prior checkpoint folders; `docs/ui-checkpoints/readiness-v2/project-tablet-200-text.png` documents the enlarged-text case.

Remaining WCAG 2.2 AA review gaps: other legacy dialogs may still lack explicit dialog names; icon-only/export controls outside the patched Sources/Calendar scope need target-size review; charts/Roots canvas require keyboard and screen-reader review; full Safari/VoiceOver/NVDA, focus-not-obscured, all status colors and 200% scaling across every dialog/editor are not certified. No automated accessibility certification is claimed.

## Known issues and recommended release blockers

**October 23 follow-up:** Phase 3F resolves item 1 below using pinned historical Git objects while honoring the archive policy. This section remains the historical Phase 3E result; see `OHARA-Workspace-V2.0-Final-Readiness.md` for current results and remaining gates.

1. **Release validation blocker (existing test fixture, not runtime regression):** `test:constellation` expects five immutable PNGs under `docs/constellation/reference/5df3a3b/concepts`. The directory is absent from both the current worktree and base HEAD's tracked tree; the test itself is unchanged. Restore the authenticated original bytes with their recorded hashes, or resolve the fixture-distribution policy with the Roots owner. Do not skip or weaken the test to advertise a green suite.
2. **Native release blocker (unverified):** no physical iOS/device/VoiceOver acceptance was performed. JS export alone is insufficient for an iOS release.
3. **Integration/release gate:** upstream reconciliation, code review, real-environment preview QA and explicit commit/push/deploy approval remain outstanding. No production readiness claim follows from synthetic local tests.
4. **Accessibility follow-up, medium:** remaining legacy dialog naming, chart semantics and full assistive-technology/zoom coverage require review before claiming AA or approving an accessibility-critical launch.
5. **Deferred/low-to-medium:** repeated Project hydration reads, bounded Source pagination, no fabricated global All, and relationship-only linking UX remain existing architectural/product boundaries. No expanded permissions, cache framework, new AI API or editor redesign belongs in this patch.

## Physical iOS and manual acceptance checklist

- [ ] Install a reviewed native build on supported iPhone and iPad; exercise cold start, authentication, background/foreground and expired sessions.
- [ ] Navigate Home → Calendar → Task → Goal → contextual Vault and Project → Goal/Vault; exercise native Back and legacy Roots Vault deep links.
- [ ] Check owner/admin/member/guide and removed-collaborator access with approved nonproduction accounts; private content must remain inaccessible.
- [ ] Edit/save a Note and Reflection; verify shared read-only behavior, image access, version conflict, offline failure and explicit retry.
- [ ] Add/rename/delete Sources with document/image pickers; cancel permission prompts; switch Project tabs after success and retry failed post-write refresh.
- [ ] Complete a Task occurrence once, inspect Milestone/lifecycle/successor behavior and Momentum current/closed-week integrity. Verify no extra writes on navigation.
- [ ] Verify light/dark, keyboard avoidance, safe areas, rotation, largest supported Dynamic Type, VoiceOver labels/order/focus, modal dismissal and touch targets.
- [ ] Validate Apple Calendar/EventKit permissions and projections using the existing native handoff checklist; do not infer this from web fixtures.
- [ ] Run Safari desktop/iOS and screen-reader web checks; review all remaining accessibility gaps above.

## Recommended next phase and integration sequence

Stop after Phase 3E for review. Next is a separately authorized integration/QA gate, not another redesign or Echo API integration:

1. Preserve the checkpoint durably and review the complete accumulated landing/auth and Workspace diff separately from this hardening delta.
2. Resolve the Roots fixture failure and manual accessibility/native gates; review this report and screenshots.
3. With authorization, fetch/reconcile upstream in a recoverable checkout, inspect co-founder overlap, rerun the complete suite/export and verify no migration drift. Phase 3E introduces no migrations.
4. Review and explicitly authorize commit/push. Test a nonproduction preview with real test accounts and approved data before a separate production authorization.
5. Plan rollback and post-deploy smoke checks before deployment; none are performed in this phase.

Phase 3E leaves `lib/api/client`, authentication/bootstrap, global provider architecture, caches, Friends/Circles services and global request deduplication untouched. Shared Modal changes are optional naming and web-only focus restoration; Source reload uses the existing Project read service. Coordinate those shared UI touchpoints with other work before integration.
