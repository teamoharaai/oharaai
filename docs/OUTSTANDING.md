# Outstanding Questions — Ohara
# Append-only. Date each entry. Resolve by referencing the DECISIONS.md entry that closes it.

---

## 2026-06-25 — Should the post-goal-creation action_logs capture step be deprecated?

**Context:** The existing goal-creation flow ends with a post-finalization turn ("What's one action you can take today?") that persists the user's response to `action_logs` via `POST /api/actions`. This data surfaces in the Next Action dashboard slot.

**Open question:** Now that the Next Action UI slot is planned to be replaced by due-today measurables output (Block 4 — see DECISIONS.md), the `action_logs` capture step at goal creation produces data that will no longer be displayed anywhere on the dashboard.

Should this capture step be:
- (A) Deprecated: remove the post-goal-creation action prompt turn and the `POST /api/actions` call from `app/goals/create.tsx`. `action_logs` data still exists in the DB but nothing writes new rows.
- (B) Preserved: keep the capture step; a future feature may surface `action_logs` elsewhere (e.g., a standalone task list, goal detail "commitments" section).
- (C) Deferred: leave it running for pilot, decide after observing whether action data has any value in analysis.

**Owner:** CTO + VP Product decision. No code change until resolved.

---
- AI-backed goal-suggestion route (Haiku, replaces prototype's local keyword
  heuristic) — separate future session. Button ships visible/disabled
  (`aiAssistEnabled: false`) in manual goal creation. See DECISIONS.md
  Session Addendum #9.
- `constants/themes.ts` `CATEGORY_THEME_MAP` (keys: fitness/health/career/...)
  is a pre-existing, already-broken mapping unrelated to `goals.category` —
  always misses, left untouched. Risk: a future editor could mistake it for
  canonical since it sits near the correct `CATEGORY_COLOR_THEME`. Flagged,
  not fixed. See DECISIONS.md Session Addendum #10.