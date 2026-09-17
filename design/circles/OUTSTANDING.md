# Circles — Outstanding / Phase Board

Live status. Update at the end of each session. The next cold agent should read
this + `MEMORY.md` and know the exact next action.

Legend: ☐ not started · ◐ in progress · ☑ done · ⚠ blocked · ❓ needs user input

## Next action

**► Phase 4 — client services + store swap.** Phase 3 server layer is built
(changelog 003). Add `FEATURES.CIRCLES_ENABLED`; write
`features/circles/services/circles-service.ts` (`authedFetch` → the
`/api/circles/**` routes) and swap `useCirclesStore` actions from fixtures to
services with optimistic update + revert. Remove `SharedGoal.why` (CD-004 — no
longer backed by data). Keep `fixtures.ts` for tests only. DTO shapes to consume
are in `lib/db/circles-core.ts`; the route contract is in `docs/API_CONTRACT.md`
("Circles endpoints"). Before merging Phase 3, run `npm run test:circles:api`
against a signed-in dev session (see below).

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
| 4 Client services + store swap + `FEATURES.CIRCLES_ENABLED` | ☐ | Next action; consume DTOs from `lib/db/circles-core.ts`. Remove `SharedGoal.why` |
| 5 Real data (linkable picker, profiles, weekly count on Today's Focus, invite links) | ☐ | |
| 6 Tests (`test:circles`, `test:circles:db`) | ☐ | |
| 7 Docs (CLAUDE.md, API_CONTRACT, DECISIONS pointer, CHANGELOGCODEX) | ☐ | |
| 8 Signed-in QA + PR | ☐ | Popover position unverified (CD-010) |

## Open questions — RESOLVED (2026-09-17, Phase 1b)

- **Q1** → **CD-013**: show *who* encouraged (names on tap, via `get_profiles_by_ids`).
- **Q2** → **CD-014**: hide declines from the owner — sent list shows "Pending" (API-layer map).
- **Q3** → **CD-015**: keep old posts linking a now-private/withdrawn Goal (snapshots stand).
- **Q4** → **CD-016**: invite links reusable; redeeming auto-sends a *pending* friend request
  (verify `redeem_invite_link` behavior in Phase 5).

None changed 053's schema — implementations land in Phase 3 (Q1 endpoint, Q2 map) and Phase 5 (Q4).

## Follow-ups / risks to verify

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
