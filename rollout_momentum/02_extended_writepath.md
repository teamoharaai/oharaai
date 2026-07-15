# Document 2 of 5 — Extend-Goal Write Path (Backend)

**Depends on:** Document 1 (schema) must already be merged.
**Codex model/effort: Sol, high effort.** This is the most judgment-heavy
piece in the whole set — type-aware computation across three measurable
types, a clone-with-reset write pattern that doesn't exist anywhere else
in the codebase, and real validation to prevent chain-forking. Same class
of new-integration work as the AI goal-suggestion route earlier in this
project.

---

## Context (for a conversation with no prior history)

Ohara supports goal "rollover": when a goal's deadline passes, a user can
extend it. This document covers the actual backend action that does the
extending. `goals.previous_goal_id` and `goals.prior_phase_summary`
(added in Document 1) already exist in the schema by the time this runs.

## Locked decisions relevant to this phase

- Triggered when a user chooses to extend an expired goal (deadline has
  passed, goal not marked complete).
- Creates a NEW `goals` row: template fields (title, category, etc. —
  exact list to be confirmed by the audit) copied from the old goal,
  `previous_goal_id` set to the old goal's id, new `deadline` from user
  input.
- Computes `prior_phase_summary` from the OLD goal's final measurable
  states, type-aware, and writes it onto the **new** goal:
  - `counter` → `{ title, achieved: current_value, target: target_value }`
  - `habit` / `checklist` → `{ title, completions: count of
    measurable_logs rows for that measurable, scoped to the old goal's
    lifetime }`
- Creates fresh `measurables` rows on the new goal: same title/type/
  target_value/target_unit/frequency as the old goal's measurables,
  `current_value` reset to 0, no `measurable_logs` carried over.
- Validates: the old goal's deadline has actually passed; the old goal
  does not already have a successor (no other goal's `previous_goal_id`
  already points at it — reject to prevent branching/forking the chain).

## Explicitly out of scope for this phase

Read-only guard on the old goal (Document 3), reflection/Echo entry
creation (Document 4), Momentum UI (Document 5), any change to how a
first-time goal is created (`app/api/goals/index+api.ts` stays
untouched — this is a new, separate endpoint).

## Audit to run first (paste into a fresh conversation, CC/Sonnet)

```markdown
# Audit: Extend-Goal Write Path — Context Gathering

**Concern (single):** Gather the context needed to implement the
extend-goal backend route. Read-only. No implementation.

## Checks
1. Report the exact current shape and logic of `createGoalWithMeasurables`
   (lib/db/goals.ts) — can it be reused/parameterized for a "clone from
   template" case, or does extend need its own dedicated insert logic?
2. Report the exact full column list of `goals` that would need copying
   from old to new on extend (beyond title/category — confirm whether
   things like `target_frequency` should also copy). Fact-finding only,
   no recommendation.
3. Report the exact query needed to count `measurable_logs` rows for a
   given measurable scoped to a goal's "lifetime" (creation to
   expiration) — confirm whether `measurable_logs.logged_at` combined
   with the old goal's `created_at`/`deadline` is sufficient, or whether
   date-range filtering needs anything else.
4. Report how `/api/goals` (manual creation route) currently validates
   input, to confirm whether the new extend route should reuse
   `validateManualGoalCreationInput` for the new-goal portion of its
   payload, or needs its own validator.
5. Report whether any existing route pattern in the repo already does a
   "read old row + compute derived data + write new row" transaction, to
   confirm the transactional/error-handling convention to follow (e.g.
   does Supabase usage here favor a single RPC/transaction, or sequential
   calls with manual rollback-on-error handling).
6. Fact-finding only — no implementation.

## Output
Output the full findings directly in this response. Do not create, write
to, or attempt to `mkdir` any file.
```

## Codex prompt (fill in [TBD] markers from the audit above before sending)

```markdown
# Implement: Extend-Goal Write Path

**Concern (single):** Implement the extend-goal backend action. Locked
contract below — fill in the [TBD] markers using the audit findings
before sending this to Codex.

## Locked contract
- New route: `app/api/goals/[id]/extend+api.ts` (POST), auth-gated
  (`withAuth`, matching existing route conventions).
- Request: `{ deadline: string }` (the only new user input needed).
- Validates: the goal at `[id]` belongs to the requesting user; its
  `deadline` has passed; no other goal already has `previous_goal_id`
  pointing at it (reject with a clear error if so).
- On success:
  1. Computes `prior_phase_summary` from the old goal's current
     measurables, per the locked type-aware shape above.
  2. Creates a new `goals` row: [TBD — exact field-copy list, per audit
     check #2], `previous_goal_id` = old goal's id, `deadline` = request
     value, `prior_phase_summary` = computed snapshot.
  3. Creates fresh `measurables` rows on the new goal, cloned from the
     old goal's measurable definitions (title/type/target_value/
     target_unit/frequency), `current_value` = 0, no logs copied.
  4. Returns the new goal (matching whatever shape `/api/goals` POST
     currently returns, for client consistency).
- Failure handling: [TBD — match existing transactional convention, per
  audit check #5].

## Explicitly out of scope
Read-only guard on the old goal, reflection/Echo entry creation, Momentum
UI, any change to `/api/goals`'s existing manual-creation path.

## Verification
`tsc --noEmit`. Live smoke test: extend an expired goal, confirm new goal
row created correctly, confirm `prior_phase_summary` matches expected
values for at least one measurable of each type, confirm the old goal is
unchanged, confirm a second extend attempt on the same old goal is
rejected.

## Output
Report the exact list of files created/modified.
```