# Audit Findings: Migration Conventions for Goal Rollover Schema

Source task: `rollout_momentum/01_schema_migration.md`, "Audit to run first" block.
Read-only — no schema changes, no migration file written.

## 1. Highest-numbered migration + naming convention

- Highest-numbered migration: **019** (`019_manual_goal_creation_target_frequency.sql`).
- Per `supabase/CLAUDE.md`: migrations 001–006 are narrative baseline files
  (squashed 2026-06-24 from the original 26 incremental migrations). 007–019
  were added since the squash. **Next new migration number: 020.**
- Filename convention: `NNN_description.sql`, zero-padded 3 digits, snake_case
  description.
- Style note (not stated in `supabase/CLAUDE.md` but observable by
  pattern-matching the most recent additions, e.g. 019 and 016): post-squash
  migrations open with a short header comment (`-- Migration NNN: Title` or a
  banner block), a one-line rationale/decision note, then the DDL. 019 in
  particular uses uppercase SQL keywords and omits the `public.` schema
  prefix (`ALTER TABLE goals ADD COLUMN ...`), diverging from the lowercase
  `public.`-prefixed style used in the squashed 001–006 baseline files. Either
  style applies cleanly; 019 is the closest precedent for "add nullable
  column(s) to an existing table."

## 2. RLS policy gap for a self-referencing FK read

**No gap.** The four existing policies on `goals` (001_core_schema_and_rls.sql:122-129)
are:

```sql
create policy "Users can select own goals" on public.goals
  for select using (user_id = auth.uid());
-- (insert/update/delete are the with-check/using equivalents, same predicate)
```

Each is evaluated per-row against that row's own `user_id` column — RLS does
not care how the row was reached (direct query vs. following a FK from
another row). A `select ... from goals where id = <previous_goal_id>` is just
another `select` against `goals`, so it's gated by the same
`user_id = auth.uid()` predicate as any other goals row. Since a rollover's
`previous_goal_id` will always point to a goal the same user created, the
existing select policy already covers reading it. **No RLS policy change
needed.**

Flag (not a policy gap, but adjacent): nothing in the schema enforces *at the
database level* that `previous_goal_id` points to a goal owned by the same
`user_id` — there's no CHECK/trigger tying the two rows' `user_id` together.
That invariant would need to hold by construction in the write path (the
rollover flow only ever links to a goal it just read as the current user's
own). Worth a one-line note in the implementation phase if a defense-in-depth
constraint is later desired; out of scope for this audit and for the schema-
only migration per the locked decisions.

## 3. Existing self-referencing FK pattern

**None exists.** Every FK in the current schema (001–019) points from one
table to a *different* table. Full inventory of `references public.X(id)`
FKs on tables that are not X itself:

- `milestones.goal_id -> goals.id` (on delete cascade)
- `measurables.goal_id -> goals.id` (on delete cascade)
- `interests.promoted_goal_id -> goals.id` (on delete set null)
- `interests.source_thorn_id -> echo_entries.id` (on delete set null) —
  added via `ALTER TABLE` in 002_echo.sql once `echo_entries` exists
- `echo_sessions.goal_id -> goals.id` (on delete set null)
- `echo_entries.goal_id -> goals.id` (on delete set null)
- `echo_entry_links.goal_id -> goals.id` (on delete cascade)
- `vault_items`/vaults `goal_id -> goals.id` (on delete cascade)
- `goals.project_id -> projects.id` (on delete set null, added via `ALTER
  TABLE` in 003_spaces_and_projects.sql)
- `goals.space_id -> spaces.id` (on delete set null, added via `ALTER TABLE`
  in 003_spaces_and_projects.sql)

`interests.source_thorn_id` initially looked like a candidate
self-referencing pattern (it references `echo_entries`, and `interests` is
Echo-adjacent) but `interests` and `echo_entries` are distinct tables — not
self-referencing.

**Conclusion: `goals.previous_goal_id -> goals.id` would be the first
self-referencing FK in the schema.** There's no existing naming/on-delete
convention to match — the locked decision's `on delete set null` is
consistent with the general convention used for every other *nullable*
optional-reference FK in the schema (`interests.promoted_goal_id`,
`echo_sessions.goal_id`, `echo_entries.goal_id`, `goals.project_id`,
`goals.space_id` all use `on delete set null`; only the *required*
container-ownership FKs like `milestones.goal_id`/`vault_items` use `on
delete cascade`). Since `previous_goal_id` is optional/nullable metadata
about a goal, not an ownership/containment link, `on delete set null` is the
correct choice by analogy even though no self-referencing precedent exists.

## 4. Current `goals` table — full column list and types

From `001_core_schema_and_rls.sql:76-97` (squashed baseline) plus the one
additive column from `019_manual_goal_creation_target_frequency.sql`. This is
the complete, current column list — no other migration (007–018) touches
`goals`.

| # | Column | Type | Constraints |
|---|--------|------|-------------|
| 1 | `id` | `uuid` | primary key, default `gen_random_uuid()` |
| 2 | `user_id` | `uuid` | not null, references `auth.users(id)` on delete cascade |
| 3 | `title` | `text` | not null |
| 4 | `category` | `text` | not null, check in `('body','mind','money','create','connect','contribute')` |
| 5 | `status` | `text` | not null, default `'active'`, check in `('active','complete','stagnant','discovered')` |
| 6 | `smart_data` | `jsonb` | not null, default `'{}'::jsonb` |
| 7 | `is_private` | `boolean` | not null, default `true` (unused, reserved) |
| 8 | `community_id` | `uuid` | nullable (unused, reserved) |
| 9 | `created_at` | `timestamptz` | not null, default `now()` |
| 10 | `updated_at` | `timestamptz` | not null, default `now()` |
| 11 | `description` | `text` | nullable |
| 12 | `color_theme` | `text` | not null, default `'ocean'` |
| 13 | `deadline` | `timestamptz` | nullable |
| 14 | `progress` | `numeric` | not null, default `0` |
| 15 | `ai_generated` | `boolean` | not null, default `false` |
| 16 | `project_id` | `uuid` | nullable; FK to `projects(id)` on delete set null added in 003 |
| 17 | `visibility` | `text` | not null, default `'private'`, check in `('private','circle','public')` |
| 18 | `space_id` | `uuid` | nullable; FK to `spaces(id)` on delete set null added in 003 |
| 19 | `embedding` | `vector` | nullable |
| 20 | `embedding_text` | `text` | nullable |
| 21 | `embedding_model` | `text` | nullable |
| 22 | `target_frequency` | `jsonb` | nullable, added in 019 |

No naming collision with `previous_goal_id` or `prior_phase_summary` — both
names are free.

**Placement/ordering convention:** the baseline (001) declares all columns
inline in the `create table` statement in a single block, with cross-table
FK constraints (`project_id`, `space_id`) added later via `ALTER TABLE` once
the referenced tables exist. Post-squash additive columns (e.g. 019's
`target_frequency`) are appended via `ALTER TABLE ... ADD COLUMN` — physical
column order therefore just reflects migration order, not any semantic
grouping. There's no convention requiring new columns to be inserted "near"
related existing columns (Postgres can't do that with `ADD COLUMN` anyway).
Correct placement for `previous_goal_id` and `prior_phase_summary` is simply
two more `ADD COLUMN` statements in migration 020, no positional
significance.

## Summary for the implementation phase

- Target migration: `020_<description>.sql`.
- `previous_goal_id uuid, nullable, references goals(id) on delete set null`
  — first self-referencing FK in the schema; `on delete set null` matches the
  existing convention for optional/non-ownership goal references.
- `prior_phase_summary jsonb, nullable` — no collision, no convention issue.
- One index: `idx_goals_previous_goal_id on goals (previous_goal_id)` —
  consistent with existing indexes on `goals` (`idx_goals_project_id`,
  `goals_space_id_idx`, etc.), all single-column non-unique.
- **No RLS policy changes required** (see #2).
