# Circles — Outstanding / Phase Board

Live status. Update at the end of each session. The next cold agent should read
this + `MEMORY.md` and know the exact next action.

Legend: ☐ not started · ◐ in progress · ☑ done · ⚠ blocked · ❓ needs user input

## Next action

**► Phase 6 (tests) / Phase 7 (docs), then Phase 8 (signed-in QA + PR).** Fix 0
and Phase 5a are done (changelog 005). `CIRCLES_ENABLED` still **false** (flip in
Phase 8 QA). Phase 5b (invite links) is **deferred** (CD-022 — `redeem_invite_link`
diverges from CD-016). The Fix-0 HTTP token pass is **done** (comment delete →
200; live token pass now 20/20; audit 003).

**Fix 0 DONE (2026-09-17):** migration `054` (`delete_circle_comment` SECURITY
DEFINER RPC, CD-021) **applied + verified live** (audit 003); `lib/db/circles.ts`
repointed; harness extended (053+054, `npm run test:circles:db` green); types
regenerated; `tsc` clean. Latest applied migration = **054**.

**Phase 5a DONE (2026-09-17):** Today's Focus shows the milestone fraction **and**
this week's Task count (`done/target`, owner-tz Monday-start) for own goals,
degrading gracefully when a goal has no occurrences. New:
`lib/db/tasks.ts:fetchWeeklyTaskCountsByGoal`, `GET /api/goals/weekly-task-counts`,
`features/goals/services/weekly-task-count-service.ts`, dashboard wiring. `tsc`
clean. Live browser render folds into Phase 8 QA.

Still open from Phase 5: linkable picker / profile hydration were already done in
Phase 4 (verified 19/20 in audit 002) — no redo. Feed pagination cursor
(`before=`) is in the service but the store loads page 1 only (later enhancement).

**Phase 4 acceptance MET (2026-09-17):** `FEATURES.CIRCLES_ENABLED` added;
service layer + store + hook + all components swapped off fixtures onto the real
endpoints with optimistic update + revert; `SharedGoal.why` removed (CD-004);
CD-005 editable description + CD-013 encouragers-on-tap implemented; fixtures are
test-only (zero production importers); `npx tsc --noEmit` clean. Live signed-in
round-trip deferred to Phase 8 (dev server off; needs user access token).

**Phase 3 acceptance MET (2026-09-17):** `npm run test:circles:api` ran green
against a live signed-in session (owner `e4245ec3…`, expo web on :8099 → live
project `rrgiqemscnyaqkculnmb`). All 8 reads 200; unauth feed/mutation 401;
empty body 400; missing delete 404; create post 201 (appeared in feed) → own
delete 200 (soft-deleted, data clean). Server was stopped after the run.

## Phase board

| Phase | Status | Notes |
|---|---|---|
| 0 Prototype (fixture UI) | ☑ | `f083ba5` on `feat/circles-home` |
| 1 Draft Migration 053 + local harness | ☑ | `audits/000` — suite passes |
| 1b L3 sign-off + open questions | ☑ | Sign-off CD-017; Q1–Q4 → CD-013…CD-016 |
| 2 Promote + apply 053 live | ☑ | Applied + verified live 2026-09-17 (audit 001); latest applied = 053 |
| 3 `lib/db/circles.ts` + `app/api/circles/**` | ☑ | Built (changelog 003); tsc clean; `test:circles:api` green vs live signed-in session 2026-09-17 |
| 4 Client services + store swap + `FEATURES.CIRCLES_ENABLED` | ☑ | Built (changelog 004); tsc clean; flag off; CD-004/005/013 done; CD-019/020 recorded; fixtures test-only |
| 5 Real data (linkable picker, profiles, weekly count on Today's Focus, invite links) | ◐ | 5a weekly count DONE (changelog 005); picker/profiles done in Phase 4; **5b invite links deferred (CD-022)** |
| Fix 0 Comment soft-delete (migration 054) | ☑ | Applied + verified live 2026-09-17 (audit 003, CD-021); harness 053+054 green |
| 6 Tests (`test:circles`, `test:circles:db`) | ☐ | `test:circles:db` now covers 053+054; node mapper tests still to add |
| 7 Docs (CLAUDE.md, API_CONTRACT, DECISIONS pointer, CHANGELOGCODEX) | ☐ | API_CONTRACT needs the `GET /api/goals/weekly-task-counts` note (CTO lane, not a Circles route) |
| 8 Signed-in QA + PR | ☐ | Popover position unverified (CD-010); Phase 5a browser render + optional Fix-0 HTTP token pass |

## Open questions — RESOLVED (2026-09-17, Phase 1b)

- **Q1** → **CD-013**: show *who* encouraged (names on tap, via `get_profiles_by_ids`).
- **Q2** → **CD-014**: hide declines from the owner — sent list shows "Pending" (API-layer map).
- **Q3** → **CD-015**: keep old posts linking a now-private/withdrawn Goal (snapshots stand).
- **Q4** → **CD-016**: invite links reusable; redeeming auto-sends a *pending* friend request
  (verify `redeem_invite_link` behavior in Phase 5).

None changed 053's schema — implementations land in Phase 3 (Q1 endpoint, Q2 map) and Phase 5 (Q4).

## Blocking defect for QA — RESOLVED (2026-09-17)

- **Comment soft-delete (403 `42501`) is FIXED.** Migration `054` added the
  `delete_circle_comment(uuid)` SECURITY DEFINER RPC (CD-021), applied + verified
  live (audit 003) — including the signed-in HTTP token round-trip (comment delete
  → 200, live token pass now **20/20**). No longer blocks Phase 8.

## Follow-ups / risks to verify

- **Phase 5b invite links deferred (CD-022).** `redeem_invite_link` (028)
  auto-accepts (creates an `accepted` edge, not a pending request) and there is no
  get-or-create "my invite link" RPC — both contradict CD-016. Reconciliation is a
  future L3 decision (reconcile 028→CD-016, or supersede CD-016 to auto-accept).
- **API_CONTRACT** should note `GET /api/goals/weekly-task-counts` (CTO/goals lane,
  not a `/api/circles/**` route) added for the Today's Focus weekly count.

- Weekly Task count uses materialized `task_occurrences` for the current week.
  **Phase 2 live read (2026-09-17):** horizon is healthy overall (global max
  ~4 weeks out, 69 active occ this week). Edge found — active daily task
  `985be6df-5305-40b6-ad99-000bf6471985` (start_date 09-14) has **zero**
  materialized occurrences. Impact is bounded: the summary shows *no* weekly
  count for such a goal (target=0 → null), never a wrong number. Pre-existing
  Tasks-materialization issue, not 053; resolve in the Tasks lane / Phase 5.
- Mobile (<900px) has no Add people screen → invite link unreachable on phones.
- Intelligence insight fetch no longer runs on Home load (was only there).
- Design canvas artifact (claude.ai "OHARA Circles") predates the Home/privacy
  changes — refresh or retire.
