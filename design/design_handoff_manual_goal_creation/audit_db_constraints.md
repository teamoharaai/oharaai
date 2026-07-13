# Audit: DB Constraint Check — Category / SMART / Milestone Fields

**Scope:** Read-only. Whether `goals`/`measurables` columns for category,
SMART fields, and per-milestone `targetValue`/`targetUnit`/`frequency` are
`NOT NULL` at the database level, independent of what
`validateGoalFinalizeResponse` (`lib/ai/schemas/goal-creation.ts:53`) requires
app-side. No implementation, no migrations, no code changes.

Schema source: `supabase/migrations/001_core_schema_and_rls.sql` (`goals`:
lines 76–103; `measurables`: lines 164–177). Confirmed via
`grep -n "alter table public\.\(goals\|measurables\)" *.sql` across all 18
migration files that no later migration (002–018) alters, adds a constraint
to, or changes nullability/defaults on any column of either table — the only
post-001 `ALTER TABLE ... goals` statements are the two nullable FK
additions in `003_spaces_and_projects.sql:163-168`
(`goals_project_id_fkey`, `goals_space_id_fkey`), which don't touch
nullability of any existing column. `measurables` has zero `ALTER TABLE`
statements anywhere after its creation in 001.

---

## 1. Exact schema for each field `validateGoalFinalizeResponse` treats as required

### `goals`

| Column | Type | Nullable | Default | Validator requirement |
|---|---|---|---|---|
| `category` | `text` | **NOT NULL** | *(none)* | must be one of `GOAL_CATEGORIES` (`lib/goals/schema.ts:1-8`) |
| `smart_data` | `jsonb` | NOT NULL | `'{}'::jsonb` | must be an object; validator further requires each of `specific`, `measurable`, `achievable`, `relevant`, `timeBound` (`GOAL_SMART_KEYS`, `lib/goals/schema.ts:12-18`) to be present **and typed as a string** inside it |

There is no dedicated SMART column set (no `specific`, `measurable`,
`achievable`, `relevant`, `time_bound` columns exist on `goals`). All five
SMART fields live inside the single `smart_data jsonb` column. `jsonb` has
no internal schema at the Postgres level — nothing prevents inserting
`smart_data: {}` (the column's own default) or `smart_data: {"foo": 1}`.
The per-key string requirement enforced by `validateGoalFinalizeResponse`
(`lib/ai/schemas/goal-creation.ts:81-85`) exists **only** in that
application-level validator; there is no DB-level CHECK constraint, JSON
schema validation, or generated column enforcing the five-key shape.

`category` is the one column in this checklist with a true, unconditional
DB-level requirement: `text not null` with **no default value** (there is a
CHECK constraint restricting it to the six enum values when a value is
supplied, but the column itself has nothing to fall back on if omitted).

### `measurables` (per-milestone fields)

| Column | Type | Nullable | Default | Validator requirement |
|---|---|---|---|---|
| `target_value` | `numeric` | **nullable** (no `not null`) | *(none)* | `null`, or a `number` — conditionally **required** (must be a finite number) when `type === 'counter'`; must be `null` when `type === 'checklist'` (`lib/ai/schemas/goal-creation.ts:109-125`) |
| `target_unit` | `text` | **nullable** (no `not null`) | *(none)* | `null`, or a `string` — conditionally **required** (non-empty) when `type === 'counter'`; must be `null` when `type === 'checklist'` |
| `frequency` | `text` | **nullable** (no `not null`) | *(none)* | CHECK constraint restricts non-null values to `'daily' \| 'weekly' \| 'monthly' \| 'once'` — but validator additionally requires the field be **present and non-null**, one of `GOAL_MEASURABLE_FREQUENCIES` (`lib/ai/schemas/goal-creation.ts:99-101`); DB permits `NULL` outright |

None of `target_value`, `target_unit`, or `frequency` carry a `not null`
constraint at the DB level. All three are freely nullable columns with no
default. The validator's "required" treatment of these fields (unconditional
for `frequency`, conditional-on-`type` for the other two) is **entirely an
application-level rule** layered on top of a schema that itself imposes no
such requirement — a direct insert with all three set to `NULL` (or with
`frequency` omitted) is schema-legal today.

For reference, `measurables.type` itself (not in the checklist's named set,
but gates the conditional rules above) is `text not null` with **no
default**, CHECK-constrained to `'counter' | 'habit' | 'checklist'`
(`GOAL_MEASURABLE_TYPES`, `lib/goals/schema.ts:30`) — note the DB constraint
allows `'habit'`, a third value the validator's type union
(`GoalMeasurableType`) also includes but that `GoalFinalizeMeasurable`'s
producing pipeline doesn't appear to emit today (out of scope to verify
further here — validator/pipeline authoring is excluded).

---

## 2. Precedent check: existing insert paths outside `createGoalWithMeasurables`

Full-repo search (`grep -rn "\.from('goals')\.insert"` / a broader multi-line
check for `.from('measurables')` followed by `.insert(`, excluding
`node_modules`) found exactly **one** other direct insert into `goals`, and
**one** other direct insert into `measurables`.

### `goals.category` — no precedent found

- **`scripts/test-rls.ts:99-104`** — the only other `goals` insert path.
  ```ts
  const { data: goalData, error: goalErr } = await clientA.from('goals').insert({
    title: 'RLS Test Goal',
    category: 'mind',
    mode: 'commitment',
    smart_data: {},
  }).select('id').single();
  ```
  This script **does** supply `category` explicitly (`'mind'`) — it is not
  an example of omitting the NOT-NULL column and relying on a fallback. But
  it is not a usable precedent for partial/manual-insert handling, for two
  independent reasons that indicate the script itself is stale relative to
  the live schema:
  1. It inserts a `mode` column. Per `supabase/CLAUDE.md`, `goals.mode` "was
     dropped in the 2026-06-24 squash" — it does not exist in the current
     `goals` table (confirmed absent from the `create table public.goals`
     definition, `001_core_schema_and_rls.sql:76-103`). This insert would
     fail against the live schema today (`column "mode" does not exist`).
  2. It omits `user_id`, which is `uuid not null references auth.users(id)`
     with **no default** (`001_core_schema_and_rls.sql:78`) — also NOT NULL
     with no fallback, though outside this checklist's named field set. Even
     if the `mode` column were removed from the insert, this would still
     fail the `user_id` NOT NULL constraint as written.

  **Conclusion: no existing precedent** for a partial/manual `goals` insert
  that omits or defaults `category`. The one other candidate both supplies
  the column and is independently broken against the current live schema —
  it does not demonstrate any pattern for handling `category` as
  optional/defaulted, nor for `smart_data`.

### `measurables.target_value` / `target_unit` / `frequency` — live precedent exists

- **`features/goals/services/goal-service.ts:335-353`**, `createMeasurable()`:
  ```ts
  export async function createMeasurable(goalId: string, input: MeasurableInput): Promise<Measurable | null> {
    const { data, error } = await supabase
      .from('measurables')
      .insert({
        goal_id: goalId,
        title: input.title.trim(),
        type: input.type,
        target_value: input.targetValue ?? null,
        target_unit: input.targetUnit?.trim() || null,
        frequency: input.frequency ?? null,
        current_value: 0,
        sort_order: input.sortOrder ?? 0,
      })
      .select()
      .single();
    ...
  }
  ```
  Its input type, `MeasurableInput` (`features/goals/types.ts:66-73`),
  declares `targetValue?: number | null`, `targetUnit?: string | null`, and
  `frequency?: MeasurableFrequency | null` all as **optional**, each
  explicitly coalesced to `null` at the insert if absent. `title` and `type`
  are the only required (non-optional) fields on `MeasurableInput`.

  This is not dead code: it's called live from
  `features/goals/hooks/useGoalDetail.ts:110`
  (`createMeasurable(goalId, { ...input, sortOrder })`) — the "add a
  milestone to an existing goal" flow, separate from goal *creation*. It
  does not touch `goals` at all (`goalId` is a pre-existing goal it's
  attaching to), so it has no bearing on the `goals.category` question
  above, but it **is** a working, currently-shipping precedent for treating
  `target_value`, `target_unit`, and `frequency` as optional/nullable on
  `measurables` inserts outside `createGoalWithMeasurables` — consistent
  with the DB-level nullability found in §1.

**Conclusion:** No precedent exists for a partial insert of `goals.category`
or `goals.smart_data` outside `createGoalWithMeasurables`. A precedent
**does** exist, and is live in production code, for inserting `measurables`
rows with `target_value`/`target_unit`/`frequency` all `null` —
`createMeasurable()` already does this today for the milestone-add-to-
existing-goal flow, independent of `mapAiGoalDataToDbInserts`
(`lib/db/goals.ts:58-101`).

---

## Explicitly out of scope (not evaluated)

UI/UX recommendations, `artifacts` table, migration authoring, validator
authoring, `/api/goals/create` removal mechanics, and any judgment on
whether fields should be dropped, loosened, or kept required.

---

**Output confirmation:** this audit wrote only to
`design/design_handoff_manual_goal_creation/audit_db_constraints.md`. No
other file was read for modification purposes or changed.
