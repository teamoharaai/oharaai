# Audit: Full Column Inventory — `goals` Table

Read-only audit. Source of truth: `supabase/migrations/001_core_schema_and_rls.sql`
(the current, live-schema-verified baseline — see header comment there:
"This file reflects VERIFIED LIVE SCHEMA as of the audit, not the aspirational
state of any historical migration file"), plus `003_spaces_and_projects.sql`
for two FK constraints added after the fact. Migrations 002, 004–018 were
checked and do not touch `goals` or `measurables` (only `003` does, for FKs
only — no new columns).

Per `supabase/CLAUDE.md`: 001–006 are the squashed baseline (applied
2026-06-24), 007–018 added since. Next new migration number would be 019.

---

## 1. Complete column inventory — `goals`

| # | Column | Type | Nullable | Default | Notes |
|---|--------|------|----------|---------|-------|
| 1 | `id` | `uuid` | N | `gen_random_uuid()` | PK |
| 2 | `user_id` | `uuid` | N | — | FK → `auth.users(id)`, `on delete cascade` |
| 3 | `title` | `text` | N | — | |
| 4 | `category` | `text` | N | — | `check (category in ('body','mind','money','create','connect','contribute'))` — see §3 |
| 5 | `status` | `text` | N | `'active'` | `check (status in ('active','complete','stagnant','discovered'))` |
| 6 | `smart_data` | `jsonb` | N | `'{}'::jsonb` | |
| 7 | `is_private` | `boolean` | N | `true` | Unused as of 2026-06-24; reserved for future social/sharing layer (see `DECISIONS.md` per column comment) |
| 8 | `community_id` | `uuid` | Y | — | No FK constraint. Unused as of 2026-06-24; reserved for future social/sharing layer |
| 9 | `created_at` | `timestamptz` | N | `now()` | |
| 10 | `updated_at` | `timestamptz` | N | `now()` | No update trigger wired (see note below) |
| 11 | `description` | `text` | Y | — | See §2 |
| 12 | `color_theme` | `text` | N | `'ocean'` | No CHECK constraint on allowed values |
| 13 | `deadline` | `timestamptz` | Y | — | See §2 |
| 14 | `progress` | `numeric` | N | `0` | |
| 15 | `ai_generated` | `boolean` | N | `false` | |
| 16 | `project_id` | `uuid` | Y | — | FK → `public.projects(id)`, `on delete set null` (constraint `goals_project_id_fkey`, added in `003_spaces_and_projects.sql`, not in the original `001` table body) |
| 17 | `visibility` | `text` | N | `'private'` | `check (visibility in ('private','circle','public'))` |
| 18 | `space_id` | `uuid` | Y | — | FK → `public.spaces(id)`, `on delete set null` (constraint `goals_space_id_fkey`, added in `003_spaces_and_projects.sql`) |
| 19 | `embedding` | `vector` | Y | — | pgvector, no dimension specified in this DDL |
| 20 | `embedding_text` | `text` | Y | — | |
| 21 | `embedding_model` | `text` | Y | — | |

**Not a column:** `goals.mode` was dropped in the 2026-06-24 squash (was a
single-value CHECK column carried from the pre-squash migration 026). Do not
reintroduce it; `lib/db/goals.ts` no longer inserts it.

**Indexes:** `idx_goals_status`, `idx_goals_visibility`, `idx_goals_project_id`,
`goals_space_id_idx`.

**RLS:** enabled, standard owner-only (`user_id = auth.uid()`) policies for
select/insert/update/delete.

**Known inconsistency (documented in the migration itself, not an audit
finding):** `goals` has no `updated_at`-refresh trigger, unlike `projects` /
`spaces` / `vault_items` / `vaults`, which all use `handle_updated_at()`. The
`updated_at` column exists and defaults on insert, but will not auto-refresh
on update.

---

## 2. Description / deadline columns — confirmed present

- **Description:** `goals.description` — `text`, nullable, no default. Present.
- **Deadline:** `goals.deadline` — `timestamptz`, nullable, no default. Present.

No other description- or deadline-like columns exist (no `notes`, `summary`,
`due_date`, `target_date`, `end_date`). These are the only two.

---

## 3. `goals.category` — type and allowed values

- **Type:** plain `text` column with an inline `CHECK` constraint. Not a
  Postgres `enum` type, not a FK to a lookup table.
- **Allowed values** (from the CHECK): `body`, `mind`, `money`, `create`,
  `connect`, `contribute` — exactly 6, all lowercase, no others permitted at
  the DB layer.
- Implication for a manual-creation field default: any hardcoded default must
  be one of these 6 exact string literals or the insert will fail the CHECK
  constraint. No lookup table exists to query allowed values at runtime — the
  6-value set is fixed in the migration DDL itself (and would need a new
  migration to change).

---

## 4. `createMeasurable()` reachability — independent of goal creation

**Confirmed: yes, fully independent.**

`createMeasurable(goalId, input)` in
`features/goals/services/goal-service.ts:335` does a single `insert` into
`public.measurables` keyed only on the `goal_id` parameter passed in. It has
no dependency on how the goal was created, no check for existing measurables,
and no coupling to any goal-creation transaction or side effect.

- Insert payload: `goal_id`, `title`, `type`, `target_value`, `target_unit`,
  `frequency`, `current_value: 0`, `sort_order`. All satisfy the
  `measurables` table's columns/constraints from `001_core_schema_and_rls.sql`
  (`type` CHECK: `counter`/`habit`/`checklist`; `frequency` CHECK:
  `daily`/`weekly`/`monthly`/`once`, nullable).
- **Caller:** `features/goals/hooks/useGoalDetail.ts:105-115`
  (`onAddMeasurable`), invoked from the goal-detail screen for an arbitrary
  `goalId`. It computes `sortOrder` as `currentMeasurables.length`, which is
  `0` when the goal has zero existing measurables — i.e., the exact case of a
  freshly created goal with none yet. No special-casing is needed or present
  for that state.
- RLS on `measurables` only requires `goal_id in (select id from goals where
  user_id = auth.uid())` — any goal owned by the calling user qualifies,
  regardless of creation path (manual or otherwise).

**Conclusion:** a goal created through a new manual-creation path, with zero
measurables at creation time, can call `createMeasurable()` afterward exactly
as any existing goal does today. No changes to `createMeasurable()` or its
caller are implied by adding a manual creation path.
