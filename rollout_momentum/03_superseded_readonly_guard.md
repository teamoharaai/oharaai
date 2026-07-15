# Document 3 of 5 — Superseded-Goal Read-Only Guard

**Depends on:** Document 1 (schema) and Document 2 (extend flow must
exist so superseded goals actually exist to test against).
**Codex model/effort: Terra, medium effort.** Mechanical guard logic, but
touches multiple files and needs consistent application across every
entry point the audit surfaces — medium rather than low given the
"don't miss one" risk.

---

## Context (for a conversation with no prior history)

Ohara supports goal "rollover" — extending a goal creates a new row and
leaves the old one in place as history (see Documents 1–2). This
document covers making that old, now-superseded goal read-only in the
UI once something else's `previous_goal_id` points back at it.

## Locked decisions relevant to this phase

- Not required for data integrity — the `prior_phase_summary` snapshot
  (Document 2) is already frozen at extension time regardless of whether
  the old goal stays editable. This phase exists to keep the historical
  record honest, not to prevent data corruption.
- Read-only, not deleted/hidden — the superseded goal and all its data
  remain fully visible, just non-interactive.
- The new (current-phase) goal is entirely unaffected — fully editable
  as normal.

## Explicitly out of scope for this phase

Any visual "archived" badge/label beyond disabling interactions — that's
an optional nice-to-have, not built by default unless separately
requested. The extend flow itself (Document 2, must already exist).
Momentum UI (Document 5).

## Audit to run first (paste into a fresh conversation, CC/Sonnet)

```markdown
# Audit: Goal/Measurable Mutation Entry Points — Superseded-Guard Context

**Concern (single):** Locate every UI/route entry point that mutates a
goal or its measurables, to determine where a superseded-goal guard needs
to be applied. Read-only. No implementation.

## Checks
1. Report every route/handler that writes to `goals` (update) —
   file/line for each.
2. Report every route/handler that writes to `measurables` (update,
   insert, delete) or triggers `completeMeasurable()` — file/line for
   each.
3. Report every UI component that renders an edit/complete/delete
   affordance for a goal or measurable (e.g. `GoalDetailHeader.tsx`'s
   inline edit, `MeasurableCard.tsx`'s controls, the checkmark) — exact
   file/line for each interactive element.
4. Report the cheapest way to determine "does this goal have a successor"
   at each of these points — e.g. a single indexed query
   (`exists(select 1 from goals where previous_goal_id = $1)`) versus
   something already fetched/available on the goal object client-side.
5. Fact-finding only — no implementation, no guard logic.

## Output
Output the full findings directly in this response. Do not create, write
to, or attempt to `mkdir` any file.
```

## Codex prompt (fill in [TBD] marker from the audit above before sending)

```markdown
# Implement: Superseded-Goal Read-Only Guard

**Concern (single):** Disable edit/complete/delete affordances on a goal
and its measurables once that goal has a successor. Locked decision:
read-only, not deleted/hidden — the goal and its data remain fully
visible.

## Locked contract
- Server-side: every mutation route identified by the audit (goal update,
  measurable update/insert/delete, `completeMeasurable`) rejects with a
  clear error if the target goal has a successor (`exists(select 1 from
  goals where previous_goal_id = <goal_id>)`).
- Client-side: every interactive affordance identified by the audit
  (inline edit fields, checkmark, +/toggle controls) is disabled
  (visually distinct — muted/non-interactive) when the goal has a
  successor. [Exact mechanism — prop-drilled flag vs. a shared hook —
  TBD per audit check #4.]
- The new (current-phase) goal is entirely unaffected — fully editable.

## Explicitly out of scope
Any visual "archived" badge/label beyond disabling interactions, the
extend-flow itself (must already exist), Momentum UI.

## Verification
`tsc --noEmit`. Live smoke test: extend a goal, then attempt to edit/
complete a measurable on the now-superseded old goal from every
identified entry point — confirm each is blocked both client- and
server-side. Confirm the new goal remains fully editable.

## Output
Report the exact list of files modified.
```