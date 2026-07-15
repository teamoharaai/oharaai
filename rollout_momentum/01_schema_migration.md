# Document 1 of 5 — Schema Migration: Goal Rollover Fields

**Depends on:** nothing — this is the foundation everything else builds on.
**Codex model/effort: Terra, low effort.** Two nullable columns, one
index, no logic — mechanical, same class as the CATEGORY_THEME_MAP
deletion earlier in this project.

---

## Context (for a conversation with no prior history)

Ohara is adding goal "rollover": when a goal's deadline passes, a user
can extend it. Extending creates a **new** goal row (not a mutation of
the old one) linked back to the old one, with a locked summary of what
was accomplished written onto the new goal. This document covers only
the schema addition needed to support that — no write-path logic, no UI.

## Locked decisions relevant to this phase

- `previous_goal_id`: nullable, self-referencing FK on `goals`. When set,
  this goal is a continuation of the referenced (older) goal.
- `prior_phase_summary`: nullable jsonb on `goals`. Will be written by a
  later phase (Document 2) — this phase only adds the column.
- Expiration itself is computed at read-time (`deadline < now()`) — no
  new status column, no scheduled job, nothing else to add here.

## Audit to run first (paste into a fresh conversation, CC/Sonnet)

```markdown
# Audit: Migration Conventions for Goal Rollover Schema

**Concern (single):** Determine the correct way to add `previous_goal_id`
and `prior_phase_summary` to `goals`, consistent with current migration
conventions. Read-only. No schema changes, no migration file written.

## Checks
1. Report the current highest-numbered migration file and the convention
   used for numbering/naming new migrations post-squash (per
   `supabase/CLAUDE.md` if it exists, or by pattern-matching the most
   recent additions like migration 019).
2. Report whether the existing goals RLS policies (select/insert/update/
   delete) would need any change to support a self-referencing FK read
   (i.e., does a policy scoped to `user_id = auth.uid()` already cover
   reading `previous_goal_id`'s target row, since both rows belong to the
   same user) — confirm or flag a gap.
3. Report whether any other table in the schema already uses a
   self-referencing FK pattern, to confirm/deny an existing convention to
   follow (e.g. naming, on-delete behavior).
4. Report the exact current `goals` table column list and types (for
   confirming the new columns don't collide with anything and confirming
   correct placement/ordering conventions used elsewhere).
5. Fact-finding only — do not write the migration.

## Output
Output the full findings directly in this response. Do not create, write
to, or attempt to `mkdir` any file.
```

## Codex prompt (fill in the migration file path/number from the audit above before sending)

```markdown
# Implement: Goal Rollover Schema — previous_goal_id + prior_phase_summary

**Concern (single):** Add two columns to `goals` per the locked decision
below. [Migration file path/number: fill in from audit finding #1.]

## Locked contract
- `previous_goal_id uuid, nullable, references goals(id) on delete set
  null` — self-referencing. When set, this goal is a continuation of the
  referenced goal.
- `prior_phase_summary jsonb, nullable` — written by a later phase, not
  this one. This phase only adds the column.
- One index: `idx_goals_previous_goal_id on goals (previous_goal_id)`.
- No RLS policy changes unless the audit found a gap in check #2. If the
  audit confirmed existing policies already cover this, do not add
  anything.

## Explicitly out of scope
Any write-path logic, any UI change, any other schema change.

## Verification
`tsc --noEmit` (regenerate DB types if that's the existing convention
after a migration). Confirm migration applies cleanly against the current
baseline.

## Output
Report the exact migration file created/modified.
```