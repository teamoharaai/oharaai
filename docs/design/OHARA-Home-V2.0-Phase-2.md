# OHARA Home V2.0 — Phase 2 review

Local implementation, 2026-10-19, in `/private/tmp/ohara-workspace-v2` on `codex/workspace-design-system-v2-phase1`. Existing Phase 1 and approved landing/auth changes are preserved. No commit, push, merge, deployment, production service access, schema change, or dependency installation in this phase.

## Presentation and hierarchy

- A local-date overline and time-appropriate serif greeting use the existing session display name (existing email fallback retained). Supporting copy is calm and independent of Momentum loading or streaks.
- Desktop retains the approved aligned structure: Momentum and Next Steps on the left, Calendar and Today's Focus on the right. Card bottoms remain aligned when Goal score details expand.
- Mobile prioritizes Calendar/Today's Focus, then upcoming milestones, then Momentum. The selected Calendar day survives desktop/mobile rearrangement. The Phase 1 house icon, official brand marks, sidebar, drawer, account positioning and theme controls are unchanged.
- Momentum shows the published score separately from its weekly change. The existing chart renders up to six published weekly snapshots on the existing 0–100 scale, with a textual accessible summary. Fewer than two historical points produces explanatory text rather than an invented trend. Goal scores are a keyboard-accessible disclosure.
- Next Steps retains the existing maximum of three dated, incomplete top-level milestones from active Goals, with original ordering/navigation. Past dates use neutral “Due [date]” copy rather than pressure-oriented messaging. No active Goals leads to the existing Goal-creation route.
- Calendar retains the current weekly projection, selected-day agenda and original item ordering. The preview remains bounded to three items on small screens/four otherwise, with a full-list route when needed. Day controls expose pressed state, and Back to today is available after selecting another day.
- A restrained lower strip offers New note and Write a reflection. These open existing Notes/Journal creation flows; no library, editor, or AI work is mounted on Home.
- Draft-query handling and the saved-draft toast remain available. No social feed, community promotion or new Circles functionality was added to Home. Global navigation was not changed in this Home-only phase.

## Real data and preserved responsibilities

| Surface | Existing source | Phase 2 use |
| --- | --- | --- |
| Greeting | `useSession` user metadata/email | Display name only; no auth changes |
| Today's Focus / Calendar | `useCalendarItems` → `/api/calendar/items` and existing Apple provider | Same current-week range, current ownership/assignment scope, optional connected events |
| Next Steps | `useGoals`, `useHomeSummary`, Project store; `selectActiveGoals`, `getUpcomingGoalSteps` | Same active lifecycle filter, milestone selection/order and context |
| Momentum | `useMomentumHomeSummary` → read-only `/api/momentum` | Published current score, weekly delta, history and active Goal summaries |
| Notes / reflections | Existing `/notes?create=note`, `/journal?create=new` | Navigation only; private content remains in its existing workspace |

Calendar item clicks still open the selected date in the full Calendar. Task execution stays in that existing workflow; there is no second completion implementation or new prioritization algorithm on Home. Momentum formulas, authoritative week semantics, closed snapshots, provider permissions, scheduling, storage and API contracts are untouched.

## Loading, empty and error handling

Calendar and Momentum failures are isolated, show helpful messages and offer their existing read-only refresh operations. Partial Calendar results remain usable with a warning that some data may be missing or stale. Neither a failed request nor initial loading is presented as an empty day or zero score.

The Goal service previously returned `[]` for a failed database read. An optional `throwOnError` read option now lets the existing `useGoals` hook distinguish that failure from an empty success, retain existing stored data on failure, and expose an additive `error` field. Direct service callers keep the previous default. This is a narrow error-propagation correction, not a new request/cache layer. Home alone consumes the new display signal; other pages have not been redesigned.

## Phase 2 file inventory

Application:

- `app/(app)/dashboard.tsx`: greeting, card order/alignment, selected-day state and shortcut placement.
- `features/calendar/components/HomeCalendarPreview.tsx`: agenda presentation, errors/retry, selection and overflow affordances.
- `features/goals/components/home/NextStepPanel.tsx`: milestone hierarchy, loading/error/empty states and Goal navigation.
- `features/goals/components/home/HomeEchoEntryPoints.tsx` (new): Notes/Journal shortcuts.
- `features/momentum/components/HomeMomentumSnapshot.tsx`: published-history chart, score labels, details disclosure and retry.
- `features/goals/hooks/useGoals.ts`, `features/goals/services/goal-service.ts`: additive read-error reporting described above.

Validation/documentation:

- `tests/workspace-v2/home.spec.ts`, `home.test.ts` (new); `fixtures.ts`, `playwright.config.ts` extended.
- `docs/ui-checkpoints/home-v2/` (new); existing workspace/landing checkpoints refreshed by their regression suite.
- This review, `OHARA-Workspace-V2.0-Rollout.md`, and `CHANGELOGCODEX.md`.

No changes to public landing/auth source, workspace navigation architecture, shared chart implementation, backend endpoints, schemas, auth/session, global providers, `lib/api/client`, scheduling or native navigation. Existing tracked/untracked Phase 1 changes remain uncommitted; the main checkout is untouched.

## Validation

- All 13 browser scenarios passed: six Home scenarios plus the seven existing workspace/landing/auth checks.
- Home checks cover populated/history, empty, loading, failed reads/retries, long agendas, active lifecycle filtering, Goal-score keyboard disclosure, day switching, resize selection, existing destination URLs, no generation/recalculation POSTs during reads, and card alignment.
- Responsive checks cover 320, 390, 768, 1024, 1100, 1280 and 1440px; both themes receive a fresh-load test. Browser visual viewport scale is asserted at 1 (100% zoom).
- All six Home/foundation unit tests passed. Existing prelaunch, auth, Friends, Projects, Entries/shared-collaboration, Calendar, Momentum and Tasks suites passed.
- TypeScript retains only the known `lib/goals/manual-create-v1.test.ts(6,41)` URL overload diagnostic; no new errors. No configured lint script. `git diff --check` passed.
- Final production web and iOS JavaScript exports passed. Native simulator/device behavior and connected Apple events on a physical device are not validated: this environment has no usable iOS simulator. No production account/content was used.

## Screenshots and local preview

Screenshots contain synthetic, intercepted test data—not real user records or claimed product metrics:

- `docs/ui-checkpoints/home-v2/desktop-light.png`
- `docs/ui-checkpoints/home-v2/desktop-dark.png`
- `docs/ui-checkpoints/home-v2/mobile-light.png`
- `docs/ui-checkpoints/home-v2/mobile-dark.png`

From the worktree, run `npx playwright test --config tests/workspace-v2/playwright.config.ts` to reproduce all browser checks and screenshots. The config starts an isolated synthetic preview on localhost:4291 and stops it afterward. For interactive inspection with the same fixtures, use `npx playwright test --config tests/workspace-v2/playwright.config.ts --grep 'Home light' --debug`; the test browser is authenticated only through synthetic fixtures. Do not use those placeholder credentials as a real account.

## Remaining review boundary

Visual approval and physical iOS-device QA remain. Existing Metro require-cycle warnings and the baseline TypeScript issue are not addressed by this visual phase. Broader midnight/live-date rollover, data freshness architecture, and independent page redesigns are outside this pass. Stop after Home; Goals and Projects require the next explicit approval.
