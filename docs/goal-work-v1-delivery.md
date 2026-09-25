# Goal work v1 — Task and Milestone workflows (Migration 074)

Status 2026-09-25: source prepared and verified locally. **Not deployed.** It depends on 072 and 073, which are also not deployed to production. Desktop routes and data are unchanged.

Team and agent context: the cross-repo changelog, debt register (TD-001…TD-005) and resume prompt live in the iOS repo at `design/ios-core/CHANGELOG.md`, `design/ios-core/TECH_DEBT.md` and `design/ios-core/prompts/resume-session-014.md`.

## Why

IOSB-002: no trusted Milestone write path existed, because desktop writes `milestones` rows directly under RLS. IOSB-003: `GET /api/tasks?goal_id=` reconciles schedules with one RPC per Task and returns unbounded occurrence history. Native Task and Milestone workflows needed an owner-checked, bounded, retry-safe contract.

## Contract

`public.goal_work_v1(action, payload)` is exposed through `/api/goals/work-v1` (`app/api/goals/work-v1+api.ts`, `lib/goals/goal-work-v1-http.ts`). Responses are private/no-store.

| Action | Method | Purpose |
| --- | --- | --- |
| `tasks` | GET | Non-archived Tasks for one Goal. Default page is 20, maximum 50, with signed owner/Goal-bound 15-minute cursors. Scheduled Tasks on the page are reconciled in **one set-based pass** (materialized from each schedule's frontier to today, with the canonical occurrence keys and missed rules of 059/063; nothing is materialized ahead of today). Inactive Goals are read without reconciling. |
| `milestones` | GET | Top-level Milestones, same paging. Each embeds its first 20 child steps plus exact `childCount` / `completedChildCount`. |
| `mutate` | POST | One of `task.create`, `task.update`, `task.schedule`, `task.progress`, `task.archive`, `milestone.create`, `milestone.update`, `milestone.complete`. |

Reads check ownership first: a missing or foreign Goal returns `GOAL_UNAVAILABLE` (404), never an empty page.

Every mutation carries a client `operationId`. The payload is normalized (NFC, Unicode trim, limits), digested, and serialized per identity. There is exactly one terminal row per identity in `goal_private.work_mutations`:

- A repeat with the same identity replays the recorded outcome with a **fresh projection**.
- A different payload under the same identity returns `OPERATION_PAYLOAD_MISMATCH` (409).
- Structural problems return `INVALID_FIELD` or `UNSUPPORTED_CONTRACT` (422) and are not recorded.
- State-dependent refusals are recorded as `not_committed` receipts (200).

Every response returns the affected Task, or the affected **top-level** Milestone with its children, so a client replaces exactly one item.

### Rules enforced on the server

**Goal lifecycle**
- Every child write requires an owned Goal in `active` status with no successor phase; otherwise the receipt is `GOAL_NOT_ACTIVE`.
- The Goal row is locked `FOR NO KEY UPDATE`, which serializes child writes and limit checks per Goal while a concurrent Goal complete or archive waits.

**Tasks**
- Task writes delegate to the canonical `create_task_v1`, `update_task_v1`, `replace_task_schedule_v1`, `set_task_occurrence_status_v1`, `adjust/set_task_occurrence_quantity_v1` and `archive_task_v1`. Desktop and native therefore share one rule set, and canonical exceptions map to stable reasons.
- The Task must belong to the addressed Goal and owner; otherwise the receipt is `TASK_UNAVAILABLE`.
- Edits and schedule changes compare an opaque `revision` (the row's `updated_at` in microseconds); a mismatch is `VERSION_CONFLICT`.
- Editing, rescheduling and archiving require an `active` Task (`TASK_NOT_ACTIVE`). A completed one-time Task can only be reopened.
- `update_task_v1` replaces every column it owns, so untouched fields are carried forward: `due_date`, `milestone_id`, and a To-Do's time of day.
- `binary` Tasks cannot have a target or unit (`FIELD_CONFLICT`).
- Completion mode cannot change once history exists (`MODE_LOCKED`, the canonical 048 rule).
- A `weekly_count` Task's mode and target belong to its schedule.

**Schedules**
- The choices are `once` (optional due date, today or later in the profile timezone, else `DATE_IN_PAST`), `daily`, `weekly` (ISO weekdays) and `weekly_count` (1–7, creation only).
- Changing to or from `weekly_count` returns `SCHEDULE_UNSUPPORTED`. This matches 059, which deferred frequency editing.
- Moving a one-time date keeps the same occurrence, including any quantity already logged. Other changes replace the schedule version, and the new schedule starts today. With 075, days the new version still schedules keep their occurrence: status and quantity carry over.

**Progress**
- Progress applies only to the **current** occurrence: the one-time occurrence, or the current day/week period after reconciling. Anything else returns `OCCURRENCE_STALE`.
- `complete` and `reopen` are for binary Tasks; `adjust` and `set` are for quantity Tasks. Going negative or using the wrong mode returns `PROGRESS_INVALID`.

**Milestones**
- One visible child level: a parent must be a top-level Milestone of the same Goal (`PARENT_INVALID`).
- Steps carry a title only.
- Only top-level Milestones and their direct children are writable (`MILESTONE_UNAVAILABLE`).
- Completion is explicit and one-way (`MILESTONE_COMPLETE`). A counter Milestone may be sealed early. Completing a parent does not complete its steps, and completing all steps does not complete the parent.
- Reached Milestones cannot be edited.

**Limits:** 100 non-archived Tasks per Goal, 100 top-level Milestones per Goal and 20 steps per Milestone (`LIMIT_REACHED`).

**Failures inside the canonical engine:** an unexpected exception (for example an unusable profile timezone) rolls back the whole call. No Task and no receipt remain, and the same identity can be retried.

## Deliberate later decisions (not built)

These remain open under IOSQ-006 (Tasks) and IOSQ-007 (Milestones):

**Tasks**
- Skip.
- Retroactive completion (`log_completed_task_v1`).
- Editing past occurrences.
- Time of day for To-Dos.
- Schedule interval greater than 1 (every 2 days, every 2 weeks) and schedule end dates. Native preserves them but can't author them.
- Weekly-count frequency editing.
- Task→Milestone links. `milestone_id` is preserved, never set natively.
- Reordering (`sort_order` stays 0, like the desktop route).
- Unarchive, delete, and archiving a completed one-time Task. The canonical archive requires `active`.
- Optimistic progress (native is confirmation-first).
- Today/Upcoming grouping.

**Milestones**
- Reopen/undo, delete, reorder.
- Photos (`photo_url` is untouched and not exposed).
- Reflection links.
- Step dates and descriptions.
- More than one child level.
- Paging steps beyond 20: legacy desktop data can exceed it. The count is exact and native says the rest are on desktop.
- The retired `prep` kind: new rows are always `achievement`.

**Operations**
- Receipt retention/cleanup for `work_mutations`.
- Operation lookup/close/discovery endpoints. Native retries the frozen request under the same identity instead. An abandoned uncertain create can still commit later if a delayed request arrives.
- Momentum refresh after child writes (Momentum is outside the current iOS scope).
- Desktop migration of Milestone writes onto this contract.

**Known behavior, documented rather than changed**
- Fixed by Migration 075: replacing a recurring schedule now keeps today's completed or partly logged occurrence on the new version, and a unique index allows one scheduled occurrence per Task per day.
- 073's `tasks`/`milestones` reads were removed on 2026-09-25; 074 is the only Task/Milestone contract.

## Verification

- `lib/goals/goal-work-v1-db.test.mjs`: 16 PostgreSQL integration cases, all passing. They run on a disposable Unix-socket cluster with the **real** Task chain applied.
  - Setup order: `manual-v1-db-scaffold.sql`, `goal-work-v1-db-scaffold.sql`, then 048, 056, 057, 059, 063, 064, 072, 073, 074.
  - Run with `GOAL_TEST_SOCKET=/tmp/ohara-goal-… LC_ALL=en_US.UTF-8 node --test`; the port defaults to 55441 and the database to `work`.
  - Covered: empty and foreign reads, bounded paging with page-only batch reconciliation and desktop frontier continuity, repeated and parallel identical writes, payload mismatch, structural validation, revision conflicts, mode and schedule rules, current-occurrence progress, archive, inactive or phased Goals, cross-owner isolation (foreign Goal, Task, Milestone and parent; per-owner operation identities; closed raw writes), Milestone hierarchy and completion, bounded step embedding, a mid-write engine failure leaving nothing behind, shared fixture round-trip, and account-deletion cascade.
- `lib/goals/goal-work-v1-http.test.ts`: 5 HTTP boundary tests, including that every fixture request reaches the RPC unchanged.
- Shared contract fixture `lib/goals/goal-work-v1.fixtures.json`. It is byte-identical to `OharaAITests/ContractFixtures/v1/goal-work-v1.json` in the iOS repo, which checks it with Swift encoding and decoding tests.
- The TypeScript check reports no errors in the new files.
- Not done: hosted preflight or deployment, and live native↔API↔database runs. Deployment has the same release gates as 072/073.
