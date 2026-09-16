# Tasks (Metrics → Tasks salvage) — Working Directory

Nested initiative under `tracker-metrics/`. It follows the **same session
protocol** as the parent tracker-metrics work, but its subject is different:

> The teammate's **Tasks** taxonomy (migrations 047–051; `features/tasks/`)
> superseded Metrics on the live DB and **froze legacy `tracker_logs` writes**.
> Tasks is a more dynamic/flexible planning model (per-goal tasks, versioned
> schedules, materialized occurrences). This initiative **salvages the valuable
> UX from tracker-metrics sessions 3–10 onto Tasks**, and fixes the gaps that
> regressed vs. Metrics.

See `../MEMORY.md` and `../DECISIONS.md` (D-001…D-012) for the parent history and
the cutover discovery. The full salvage source is the **`feat/tracker-metrics-archive`**
branch (Tasks 3–10, incl. Task 10). Two pieces are already ported onto Tasks on
**`feat/port-tracker-optimism-boundary`** (optimism + boundary-refresh).

## Three user-stated goals for this initiative

1. **Save most of sessions 3–10.** Decide per-piece what ports onto Tasks, what
   needs modification, and what is discarded (superseded by the server model).
2. **Restore the 7-dot activity visual.** Metrics showed 7 dots (recent periods)
   as habit history; Tasks dropped it. Re-conceive it as a **cross-feature
   "which days did you engage this goal" visual** — a dot per day reflecting any
   activity (task/milestone/reflection), so the user sees when they are active.
   (Exploratory — the cross-feature wiring is still being designed by the user.)
3. **Fix Tasks disorganization.** Creating a task "spams" the same task into
   Upcoming (one row per pre-materialized future occurrence). Collapse Upcoming
   to one row per task.

## Files

| File | Purpose |
|---|---|
| `PLAN.md` | Draft initiative plan (phases/tasks). Not yet fully settled — open questions flagged; refine with the user before building. |
| `MEMORY.md` | Compounding facts for this initiative (Tasks schema/RPCs, salvage map, gotchas). Read first. |
| `DECISIONS.md` | Dated decision log (ADR-style), ids `TD-NNN` (Tasks-Decision) to avoid clashing with the parent `D-NNN`. |
| `OUTSTANDING.md` | Live task board + next action. |
| `changelog/` | One file per session (start from `TEMPLATE.md`). |
| `audits/` | Point-in-time verification/analysis. `000-tasks-system-audit.md` is the founding audit. |

## Session protocol

Identical to `../README.md`: read `MEMORY.md` → `OUTSTANDING.md` → the active
`PLAN.md` section + root `CLAUDE.md`; baseline `npx tsc --noEmit`; work the active
task; test (`npm run test:tasks`); then document (changelog → OUTSTANDING →
DECISIONS → MEMORY → audits) and append to root `CHANGELOGCODEX.md`.

## Current status (session 000)

**Audit + scaffold only.** No product code changed this session. Founding audit
in `audits/000-tasks-system-audit.md`; salvage map + issue root-causes recorded.
**Next:** settle `PLAN.md` phase ordering with the user (esp. the activity-visual
data model), then start with the highest-value, lowest-risk fix (Upcoming
collapse) or the history-dot visual.
