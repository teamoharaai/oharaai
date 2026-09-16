# Session 001 — Design settlement (Intelligence/Vaults review, §5 resolved)

- **Date:** 2026-09-16
- **Task(s):** T0.1 (settle design). No build task.
- **Agent/model:** Opus 4.8, high effort.
- **tsc baseline (before):** not run — **no product code changed** (docs only).

## Goal of this session

Resolve the audit-000 §5 open questions with the user and settle `PLAN.md` off
DRAFT. Per user direction, this expanded into an architecture discussion:
reviewed Ohara Intelligence + Vaults, reframed the "7-dot" as a goal-activity
signal (ecosystem), and split the Vaults/Notes/Intelligence work into its own
initiative.

## Changes (docs only)

- **`DECISIONS.md`** — TD-002 & TD-003 → accepted (TD-003 refined); added
  **TD-004** (daily/weekly only), **TD-005** (design sign-off → PRs),
  **TD-006** (L1 goal-activity: pure `lib/` derivation, source-agnostic union,
  `profiles.timezone` bucketing, 7-day row + heatmap, Analytics-surface
  placement), **TD-007** (L2 correlation seam designed but OFF), **TD-008**
  (two-initiative split; Vault-as-corpus; `insight` item = confirmable saved
  insight), **TD-009** (iOS reminders + iOS-contract scope dropped).
- **`PLAN.md`** — DRAFT → SETTLED. Phases A (Upcoming collapse) → B (L1
  occurrences + row) → C (union + heatmap); L2 seam OFF; scope split documented.
- **`design/001-activity-and-upcoming.md`** (new) — Upcoming-collapse change
  surface + test cases; L1 pure-function signature, timezone rule, 7-bucket
  ordering, reader, render contract, phasing, tests.
- **`design/002-vault-corpus-intelligence.md`** (new) — initiative #2 brief:
  Vault-as-corpus model, Notes=Entries finding, direction Vaults→Intelligence,
  `insight`-item loop, open questions for the design-with-owner session.
- **`OUTSTANDING.md`** — board updated (T0.1 done; T2 next; T4 = union+heatmap;
  L2/initiative-#2 parked); §5 marked resolved.
- **`docs/CLAUDE.md`** (root, via symlink) — corrected stale constitution text:
  Goals now list **Tasks** (047–051) as the repeatable measure with legacy
  trackers frozen/read-only (Data Model, Data Rules, Naming); AI Layer marks
  `vault-insights.ts` as PLANNED/not-built.
- **`lib/ai/CLAUDE.md`** — `vault-insights.ts` marked PLANNED (not an existing
  module); rate-limit rule noted as applying once built.
  (User-authorized L3/CEO-owned edits; kept surgical, per-file.)

## Key findings (grounding)

- Ohara Intelligence is output-only and starved: the summarization step that
  wrote `character_profile.patterns` was removed → profile ~never populated.
- "Notes" = the Entries system (rich Tiptap editor, `goalReference`/
  `intelligenceReference` marks, progress evidence); Vaults (`vault_items`) is a
  separate, unused store; `lib/ai/vault-insights.ts` does not exist.
- `types/activity.ts` already defines an extend-only `ActivityItem` union;
  `profiles.timezone` exists; `lib/time/zoned-calendar.ts` provides the tz
  helpers; `features/goals/dashboard-goal-activity.ts` is the union precedent.
- `AnalyticsPanel` + `IntelligencePanel` are both stub-fed (Strava demo) and
  waiting for a real data source — L1 is that source.

## Tests

- None (docs only). No `tsc`/`test:tasks` run this session.

## Decisions made

- TD-002 (accepted), TD-003 (accepted+refined), TD-004, TD-005, TD-006, TD-007,
  TD-008, TD-009 in `DECISIONS.md`.

## Follow-ups / handoff

- **Next action:** send settled design (`PLAN.md` + `design/001`) to the teammate
  for sign-off (TD-005), then implement **T2 (Upcoming collapse)** per
  `design/001` Part A, then **T3 (L1)**.
- Initiative #2 (`design/002`) is a separate hand-off to the Entries owner;
  blocked on L1 landing in its stable shape (Phase B).
