# Session 007 — Phase 7 (docs)

- **Date:** 2026-09-17
- **Task(s):** Phase 7 (docs) — lift "No feed", add Circles to the constitution, document the goals-lane weekly-count endpoint, root DECISIONS pointer
- **Agent/model:** Opus 4.8
- **tsc baseline (before):** clean

## Goal of this session

Bring the project's written record in line with a shipped Circles layer: lift the
CLAUDE.md "No feed" prohibition, register Circles in the Data Model + Naming
sections, document `GET /api/goals/weekly-task-counts` in `API_CONTRACT.md`, and
add a root `DECISIONS.md` pointer to `design/circles/DECISIONS.md`. Docs only.

## Changes

- **`docs/CLAUDE.md`** (root constitution; `CLAUDE.md` is a symlink to it):
  - **Data Model** — new **Circles** bullet: friends-only layer = Home
    (`/dashboard`), the 053–054 tables + `goals_one_public_per_user` index, the
    CD-004 privacy spine (`circles_goal_summary` whitelist), the
    `FEATURES.CIRCLES_ENABLED` gate, and the server/client file map.
  - **What NOT To Build** — lifted the blanket "No feed": Circles (Home) is now
    named as the one shipped social surface behind the flag, while a
    public/discovery feed, profile pages, and social push notifications stay
    Phase-2 "not built".
  - **Naming** — added Circles (= Home / `/dashboard`), noting a shared record is
    a "post" and the tables keep the `circle_*` prefix.
- **`docs/API_CONTRACT.md`** — added `GET /api/goals/weekly-task-counts` right
  after the Circles endpoints section, **explicitly flagged as the goals lane, not
  `/api/circles/**`**: owner-tz Monday-start week (CD-003), own goals only (RLS),
  goals without occurrences absent from the map (graceful degradation), and the
  raw `{ counts: { [goalId]: { done, target } } }` response (no `ApiResponse`
  envelope, unlike the Circles routes).
- **`docs/DECISIONS.md`** (append-only) — new dated entry pointing to
  `design/circles/DECISIONS.md` as the authoritative CD-001…CD-022 log, framing
  Circles as the first feature to consume a friend edge as an authz primitive
  (ties into the migration-030 friend-graph decision above it).

## Tests

- Docs only; no test/source change. `npx tsc --noEmit` → **pass** (before and
  after — the `CLAUDE.md` symlink edit doesn't touch code).

## Decisions made

- None new. The root `DECISIONS.md` entry is a pointer to the existing
  `design/circles/DECISIONS.md`, not a new decision.

## Follow-ups / handoff

- **Next: Phase 8 (signed-in QA + PR).** In a signed-in browser verify the
  profile popover drops from the top-nav avatar (CD-010, unverifiable signed-out),
  light/dark, <720 / 720–1080 / ≥1080 widths, and the mobile avatar menu (Circles,
  Saved, Goal invitations). Also fold in the Phase 5a Today's-Focus weekly-count
  browser render. Then open the PR from `feat/circles-home` and **flip
  `FEATURES.CIRCLES_ENABLED` to true** — do not merge without user go-ahead.
