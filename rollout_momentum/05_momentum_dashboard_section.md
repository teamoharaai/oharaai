# Document 5 of 5 — Momentum Dashboard Section

**Depends on:** Documents 1 and 2 (schema + extend flow). Ideally
Document 4 too, so there's real reflection data to link to — though the
UI itself doesn't hard-require it; a card can render without a
reflection present.
**Codex model/effort: Terra, low-to-medium effort.** Presentational work
following an established pattern — the dashboard already handles
multiple goal-groupings (e.g. ungrouped goals). Main risk is the
component-reuse decision, which the audit should resolve before this
reaches Codex.

---

## Context (for a conversation with no prior history)

Ohara supports goal "rollover" (Documents 1–4). This document covers the
"Momentum" dashboard section — surfacing goals that are continuations of
a prior attempt, per the VP's naming rationale: having already pushed
toward a goal once means you already have momentum to carry forward.

## Locked decisions relevant to this phase

- Section shows goals where `previous_goal_id IS NOT NULL`.
- Purely organizational/visibility — no invented aggregate metric across
  the set (no "3 goals in momentum" combined score). This is consistent
  with the earlier Projects decision (no fabricated progress numbers)
  and the goal-ring decision (no fabricated fallback values).
- No `cycle_number`/"Phase 3" labeling — not needed now. Can be computed
  later by walking the `previous_goal_id` chain if ever wanted.
- Each card should surface: the goal itself (with its own independent
  deadline-decay ring, unaffected by any of this), the linked
  `prior_phase_summary` data (rendered per measurable, type-aware, per
  Document 2's shape), a link to the associated reflection entry if one
  exists, and a link back to the superseded old goal.

## Explicitly out of scope for this phase

Any change to non-continuation goal rendering (`GoalCard.tsx` stays as
is for regular goals). Projects (closed thread, untouched).

## Audit to run first (paste into a fresh conversation, CC/Sonnet)

```markdown
# Audit: Dashboard Section Pattern — Momentum Context

**Concern (single):** Determine how the dashboard's existing sectioning
(e.g. the "ungrouped goals" section) is structured, to build Momentum
consistently. Read-only. No implementation.

## Checks
1. Report the exact current structure of `app/(app)/dashboard.tsx` —
   every section it renders today, and the exact filtering/query logic
   for each (e.g. the ungrouped-goals filter referenced in an earlier
   audit).
2. Report whether `GoalCard.tsx` (or a variant) is reusable as-is for a
   Momentum card, or whether the extra surface (prior summary snippet,
   reflection link) needs a new component.
3. Report the most efficient query shape for "goals where
   previous_goal_id is not null" for the current user — confirm whether
   existing goal-fetching code already loads this field or needs an
   additive select.
4. Fact-finding only — no implementation, no visual design.

## Output
Output the full findings directly in this response. Do not create, write
to, or attempt to `mkdir` any file.
```

## Codex prompt (fill in [TBD] marker from the audit above before sending)

```markdown
# Implement: Momentum Dashboard Section

**Concern (single):** Add a new dashboard section listing continuation
goals. Locked decision: purely organizational, no invented metrics.

## Locked contract
- New section on `app/(app)/dashboard.tsx`, following the existing
  sectioning pattern found by the audit.
- Query: goals belonging to the current user where `previous_goal_id IS
  NOT NULL`.
- Each card surfaces: the goal itself (title, its own independent
  deadline-decay ring), the linked `prior_phase_summary` data (rendered
  per measurable, type-aware), a link to the associated reflection entry
  if one exists (via `echo_entry_links`), and a link back to the
  superseded old goal.
- [Exact component — new vs. reused — TBD per audit check #2.]
- No aggregate/computed metric across Momentum goals as a whole.

## Explicitly out of scope
Any change to non-continuation goal rendering, `cycle_number`/phase
labeling, Projects.

## Verification
`tsc --noEmit`. Live smoke test: after extending a goal (with and without
a completed reflection), confirm it appears correctly in the Momentum
section, confirm links to the old goal and reflection entry work, confirm
non-continuation goals are unaffected.

## Output
Report the exact list of files modified.
```