# Circles — Outstanding / Phase Board

Live status. Update at the end of each session. The next cold agent should read
this + `MEMORY.md` and know the exact next action.

Legend: ☐ not started · ◐ in progress · ☑ done · ⚠ blocked · ❓ needs user input

## Next action

**► Phase 1b — get L3 sign-off on draft Migration 053** (CEO: types + CLAUDE.md
"No feed" rule; CTO: schema, RLS, RPC contract). Present
`db/053_circles_social_layer.sql`, `audits/000-migration-053-local-security.md`,
and open questions Q1–Q4 below. **Do not promote or apply 053 before sign-off is
recorded as a CD entry.** After sign-off → Phase 2.

## Phase board

| Phase | Status | Notes |
|---|---|---|
| 0 Prototype (fixture UI) | ☑ | `f083ba5` on `feat/circles-home` |
| 1 Draft Migration 053 + local harness | ☑ | `audits/000` — suite passes |
| 1b L3 sign-off + open questions | ❓ | Q1–Q4 |
| 2 Promote + apply 053 live | ☐ | Blocked on 1b |
| 3 `lib/db/circles.ts` + `app/api/circles/**` | ☐ | Contract draft in PLAN §4 |
| 4 Client services + store swap + `FEATURES.CIRCLES_ENABLED` | ☐ | Remove `SharedGoal.why` |
| 5 Real data (linkable picker, profiles, weekly count on Today's Focus, invite links) | ☐ | |
| 6 Tests (`test:circles`, `test:circles:db`) | ☐ | |
| 7 Docs (CLAUDE.md, API_CONTRACT, DECISIONS pointer, CHANGELOGCODEX) | ☐ | |
| 8 Signed-in QA + PR | ☐ | Popover position unverified (CD-010) |

## Open questions (need user input)

- **Q1** Encourage: show *who* encouraged, or only counts?
- **Q2** Declined invite: notify the inviter, or leave it "Pending" from their view?
  (Schema stores `declined`; the owner's sent list would reveal it unless the API hides it.)
- **Q3** Making a Goal private / withdrawing an invite: keep old posts that link it?
  (Current schema keeps them — links are snapshots.)
- **Q4** Invite links: single-use or reusable; should redeeming auto-send a friend request?

## Follow-ups / risks to verify

- Weekly Task count uses materialized `task_occurrences` for the current week —
  verify the occurrence horizon covers the full week for weekly schedules (Phase 2 live read).
- Mobile (<900px) has no Add people screen → invite link unreachable on phones.
- Intelligence insight fetch no longer runs on Home load (was only there).
- Design canvas artifact (claude.ai "OHARA Circles") predates the Home/privacy
  changes — refresh or retire.
