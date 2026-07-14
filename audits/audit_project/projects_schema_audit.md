# Audit: Projects — Current Schema & Purpose

**Concern (single):** Establish what Projects actually is today — schema,
current write/read sites, relationship to Goals — to know how much of
"Projects as mission-control grouping goals" is already built vs. net new.
Read-only. No design proposals, no schema changes.

## Checks
1. Full current `projects` table schema (columns, types, constraints,
   indexes) — exact migration file and line.
2. Confirm the exact nature of `goals.project_id` — nullable? Can a goal
   exist without a project? Is there a reverse "default project" concept?
3. Report every live UI/route that reads or writes `projects` today — file
   paths, and whether each is fully wired or stubbed (matching the
   `measurable-service.ts` vs. Vaults comparison from the earlier audit).
4. Report `ProjectCard.tsx`'s current full data dependency — what does it
   render beyond the goal-preview ring list we already touched (title,
   status, any progress-aggregation-across-goals logic)?
5. Report whether `projects` has its own embedding columns / any
   embedding pipeline, mirroring goals/echo/vault_items — or confirm
   absence.
6. Report whether any code today aggregates goal-level data up to a
   project level (e.g. "3 of 5 goals in this project complete") — exact
   logic and location, or confirm no aggregation exists yet.

## Explicitly out of scope
Any schema change, mission-control design, rollover/Momentum, SMART
format, goal breakdown/QA structure (separate threads).

---

## 1. Full `projects` table schema

**File:** `supabase/migrations/003_spaces_and_projects.sql:129–157`. This is the baseline (post-squash, applied 2026-06-24); confirmed no later migration (007–019) touches `projects` via `alter table` — grep across all migration files found zero hits.

```sql
create table public.projects (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  title       text not null,
  description text,
  status      text not null default 'active' check (status in ('active','complete','archived')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  space_id    uuid references public.spaces(id) on delete set null
);

create index idx_projects_user_id on public.projects (user_id);
create index idx_projects_status on public.projects (status);
create index projects_space_id_idx on public.projects (space_id);
```

RLS: enabled, standard owner-only CRUD policies (`auth.uid() = user_id` for select/insert/update/delete). `updated_at` trigger wired (`projects_updated_at`).

8 columns total. No `progress`, no `color_theme`, no `deadline`, no `embedding*` columns — none of the richer fields `goals` has.

## 2. `goals.project_id` nature

- **Column origin:** `supabase/migrations/001_core_schema_and_rls.sql:92` — declared as a bare `uuid` (nullable, no default, no check).
- **FK added later:** `003_spaces_and_projects.sql:163–165` — `goals_project_id_fkey`, `on delete set null`.
- **Nullable — confirmed.** A goal can exist with `project_id = null`; this is in fact the default/common case (dashboard explicitly filters `goals.filter((g) => g.projectId === null)` for the ungrouped-goals section — `app/(app)/dashboard.tsx:585`).
- **No "default project" concept anywhere.** No trigger, no service code, no UI auto-assigns a goal to a fallback/default project. Grep across migrations and `lib/db/goals.ts` / `project-service.ts` shows nothing resembling it. `on delete set null` on the FK means deleting a project silently orphans its goals back to ungrouped — there's no reassignment or default-bucket behavior.
- Indexed via `idx_goals_project_id` (`001_core_schema_and_rls.sql:133`).

## 3. Live UI/routes reading or writing `projects`

All fully wired (real Supabase reads/writes, not stubbed) — this is a materially different state than the `measurable-service.ts`-vs-Vaults gap from the earlier audit; there is no vestigial/dead path here.

| File | Role |
|---|---|
| `features/projects/services/project-service.ts` | Service layer: `fetchProjects`, `fetchProjectWithGoals`, `fetchGoalsByProject`, `createProject`, `updateProject`, `deleteProject`. All live Supabase calls. |
| `features/projects/store.ts` | Zustand `useProjectStore` — `projects`, `loadProjects`, `createProject`, `updateProject`. Wraps the service layer, no stub state. |
| `features/projects/components/ProjectCard.tsx` | Dashboard card — collapsed/expanded project row with goal-ring grid. Fully wired. |
| `app/(app)/dashboard.tsx` | Loads `useProjectStore`, renders `ProjectCard` per project, computes each card's goal subset by `g.projectId === project.id`. |
| `app/(app)/projects/create.tsx` | Create-project screen → `useProjectStore().createProject`. Live. |
| `app/(app)/projects/[id].tsx` | Project detail screen: fetch via `fetchProjectWithGoals`, inline edit (title/description) via `updateProject`, delete via `deleteProject`, "+Add Goal" deep-links to `/goals/create?projectId=`. Two `TODO` comments in this file (lines ~226, ~316) note a **space badge** and **manage-members visibility** are deliberately withheld pending a `space_id` join on the project query — i.e. `projects.space_id` exists in schema but isn't selected/joined anywhere yet. |
| `app/goals/create.tsx` | Reads `useProjectStore().projects` to populate a "Link to a project" picker (lines 753–814); writes `project_id` on goal insert (line 466). |
| `lib/db/goals.ts` | `getProjectTitle(projectId)` (line 578) — single-project title lookup used to display a goal's parent-project label. Also batch-resolves `projectTitleById` for a list of goals (lines 578–611) — used somewhere goal lists need to show project name without the full project object. |
| `features/echo/services/echo-service.ts` | Batch-fetches goal `project_id` + project titles (lines 578–611) to attach `projectId`/`projectTitle` to Echo-linked goal summaries (line 655–656) — read-only, no writes. |
| `app/(app)/_layout.tsx` | Just registers the two project route screens in the stack navigator. |
| `store/clearAllStores.ts` | Resets `useProjectStore` on sign-out. |

**Note — cross-feature import:** `project-service.ts:2–4` imports directly from `features/goals/types` and `features/goals/services/goal-service`. `features/CLAUDE.md` rule 2 says feature slices must not cross-import (`features/goals/` must never import `features/echo/`, and by the same rule `features/projects/` importing from `features/goals/` is the same class of violation) — shared code is supposed to live in `lib/`. This predates this audit and is flagged as an existing fact, not something to fix here.

## 4. `ProjectCard.tsx` data dependency beyond the ring list

Full prop surface: `{ project: Project; goals: GoalWithMeasurables[] }` — goals are pre-filtered by the dashboard, not fetched by the card itself.

Beyond the already-covered ring-progress list, the card:
- Renders `project.title` (via `ProjectTitleRow`) and `project.description` (2-line truncated) with a tap target that navigates to `/projects/[id]`.
- Has local `expanded` state (default collapsed) toggled by a chevron button — no persistence, resets on remount.
- Per-goal, computes an `activityLabel` string (`"{n} items · {n} reflections"`) from `goal.vaultItemCount` / `goal.echoLinkCount` — these counts come pre-attached on the `GoalWithMeasurables` object (enriched upstream, not queried by the card).
- Per-goal, computes a due-date label/color via `resolveDueDate` (overdue = danger red, ≤14 days = secondary text color, else muted) — same three-tier logic, purely goal-level, not project-level.
- **No project-level progress aggregation in this component.** `ProjectCard.tsx` does not compute or render any "X of Y goals complete" or averaged-progress figure — that logic exists only in `app/(app)/projects/[id].tsx` (see #6 below), not on the dashboard card.

## 5. Embedding columns / pipeline on `projects`

**Absent — confirmed.** The `projects` table (schema in #1) has no `embedding`, `embedding_text`, or `embedding_model` columns, unlike `goals` (`001_core_schema_and_rls.sql:95–97`) and `vault_items` (per `004_vaults_and_embeddings.sql`, HNSW-indexed). No migration adds embedding columns to `projects` at any point post-baseline. No service file references `projects` + embeddings together. Projects are entirely outside the vector-search/RAG surface today.

## 6. Goal-level → project-level aggregation

Exactly one instance, and it's simple:

**`app/(app)/projects/[id].tsx:66–68`** (project detail screen):
```ts
const aggregateProgress = project.goals.length > 0
  ? Math.round(project.goals.reduce((sum, goal) => sum + goal.progress, 0) / project.goals.length)
  : 0;
```
A flat average of each child goal's `progress` field (0–100), rendered as a single progress bar in the project hero card. No weighting, no status-based counting (no "3 of 5 complete" anywhere), no per-category breakdown.

No other aggregation exists — `ProjectCard.tsx` (dashboard) does not aggregate at all (see #4), and `project-service.ts` does not compute or return any derived/aggregate field; `fetchProjectWithGoals` just concatenates the raw goal list onto the project object and lets the caller do it.

---

**Summary:** Projects is a small, fully-wired CRUD feature — not a stub. Schema is minimal (8 columns, no progress/embedding/richer fields goals has). `project_id` on goals is nullable with no default-project fallback. The one "mission control" primitive that exists today is a flat average-progress bar on the detail screen; everything else (grouping, goal-ring previews, activity labels) is presentational, computed from goal-level fields already fetched elsewhere. The `space_id` column exists on `projects` but is unused end-to-end — no query selects it, and two UI locations explicitly stub out space-dependent features pending that join.
