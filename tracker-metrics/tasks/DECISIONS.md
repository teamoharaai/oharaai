# Tasks Initiative — Decision Log

ADR-style. One entry per judgment call. Newest at top. Never rewrite history —
supersede with a new entry. IDs are **`TD-NNN`** (Tasks-Decision), distinct from
the parent tracker-metrics `D-NNN`.

Format: `TD-NNN` · date · status (accepted | proposed | superseded) · context →
decision → consequence.

---

## TD-026 · 2026-09-17 · accepted — P1 committed directly to `main` on user direction; TD-005 PR/sign-off flow waived for this landing

**Context:** TD-005 lands `features/tasks/*` changes via teammate sign-off → reviewed
PR. The user directed "commit to main" for the Phase-1 work (cadence axis, due-date
drop, placeholders, Daily∉Upcoming reclassify, Completions lane, Add Task form
copy/milestone toggle).

**Decision:** Commit P1 directly to `main` per the user's explicit instruction,
**waiving** the TD-005 PR + teammate-sign-off flow for this landing (same one-off
pattern as TD-015 for PR #22). Commit is local; **not pushed** unless the user asks.
Does not supersede TD-005 as standing policy — future `features/tasks/*` work still
expects the PR/sign-off flow unless waived again.

**Consequence:** The `features/tasks` slice owner did not review this before it hit
`main`; notify post-hoc. All changes are pure L1 UI, tsc-clean, and `test:tasks`
66/66. A live GUI drive was not performed (auth/extension blocker), so runtime UI
confirmation is outstanding.

## TD-025 · 2026-09-17 · accepted — Add Task form: keep Completion/Cadence headers; collapse milestone link behind "More options"

**Context:** User reviewed the Add Task form copy. Considered renaming the
**Completion** (Check off / Quantity) and **Cadence** (Once / Daily / On set days)
section headers, and flagged the optional milestone link as feeling pointless
("could serve as something" later, e.g. driving milestone progress from tasks).

**Decision:** After reviewing alternatives, **keep "Completion" and "Cadence"**
headers unchanged and keep all chip labels. **Collapse the milestone picker behind
a "More options" toggle** (chevron + caption) instead of removing it — it stays
available but off the common path. Within "More options", the milestone list is
itself a **second click-to-reveal** ("Link a milestone (optional)") that expands
**this goal's milestones only** (None + the goal's incomplete milestones). Both
toggles auto-expand on edit when the Task already has a linked milestone, so an
existing tie stays visible. Pure L1 copy/layout; no mechanics change; milestone
association still writes `tasks.milestone_id` as before.

**Consequence:** The form's default view is shorter (title · Completion · Cadence),
milestone linking is two taps away, and the picker is scoped to the goal. The link
is preserved for a future feature (task→milestone progress) rather than dropped;
"for now" it is deliberately minimal.

## TD-024 · 2026-09-16 · accepted — The cadence-axis form migration is non-destructive for legacy schedules

**Context:** Collapsing the five recurrence chips to the cadence axis (TD-016)
means the form can no longer author two things it used to: an `intervalCount` of 2
(the retired "Every 2 weeks" chip) and the `none`-recurrence Optional Due Date
(TD-016 / §6 drop it). Editing a pre-existing Task through the new form must not
silently destroy data the UI can't re-express.

**Decision:** `TaskForm` preserves both on save without offering an input:
- `preservedIntervalCount = activeSchedule?.intervalCount ?? 1` — an existing
  every-2-weeks schedule keeps `intervalCount: 2` when re-saved as **On set days**;
  new Tasks are always `1`. (Any weekly schedule — former Weekly/Custom/biweekly —
  maps to the single **On set days** chip on load.)
- `preservedDueDate = task?.dueDate ?? null` — the dropped due-date **input** no
  longer writes, but an existing `dueDate` is passed through unchanged rather than
  nulled. The `Task.dueDate` column stays (later cleanup, per §6).

**Consequence:** No data loss on edit. Re-authoring an every-2-weeks interval or a
due date is intentionally not possible in v1 (interval → future advanced toggle;
dated one-shots → Milestones per CLAUDE.md).

## TD-023 · 2026-09-16 · accepted — Category starter chips (TD-022) deferred out of Phase 1

**Context:** Phase 1 shipped TD-022 as built — a static `Record<GoalCategory,
TaskSuggestion[]>` rendering 2-3 bare-title chips on the zero-task empty state.
On review the user found it flat: it reads as a dead-end (title only, hides the
measure/cadence it prefills; appears in one place then vanishes), the hardcoded
set feels arbitrary, and there is no skip/dismiss or anything that makes the
surface inviting.

**Decision:** **Remove the starter-chip surface from Phase 1 entirely** — the
`suggestions.ts` map, the `TaskSuggestion` type, the `category` prop, and the
`TaskForm` prefill plumbing that only served the chips. TD-022's underlying call
(static map over a full template system; the chip surface is the seam AI plugs
into later) is **not reversed** — only its Phase-1 shipment is withdrawn. A
starter-chip surface returns via its **own design pass**, which must decide: chip
content shows measure·cadence (not a bare label), a **session-level Skip** (free,
pure-UI) vs a **persisted dismiss** (needs storage → CTO/L3), and whether it
persists beyond the empty state. Enriched-static and AI-generated (Appendix A) are
both candidate sources for that pass.

**Consequence:** Phase 1 = cadence axis (Once/Daily/On set days), drop Optional Due
Date, `Quantity`/`Units` placeholders, **Daily ∉ Upcoming** reclassify, and the
Completions lane. No `category` dependency; the `GoalCategory` import is dropped
from `TasksPanel`. TD-022 moves to a follow-up on the UX board.

## TD-022 · 2026-09-16 · accepted — Category task suggestions ship as static starter chips; template system rejected

**Context:** Should Tasks vary by goal `category` (~12 `GoalCategory` values)?
A full template system (curated/editable sets × 12 + picker + maintenance) is
costly and prescriptive.

**Decision:** Ship **static starter chips** on the zero-task empty state
(`TasksPanel.tsx:414`): 2-3 per category from a `Record<GoalCategory,
TaskSuggestion[]>` (title + suggested measure + cadence), one tap prefills
`TaskForm`. No schema, no new screen. **Reject** the full template system. The
chip surface is intentionally the seam AI suggestions later plug into (design 003
Appendix A). Ships in Phase 1.

**Consequence:** Cheap on-ramp for fresh goals; upgradeable to model-generated
chips without new UI.

## TD-021 · 2026-09-16 · accepted — View home = per-goal TasksPanel (Today + Week); Daily never enters Upcoming

**Context:** User wants a "map" / Today + Weekly view and the daily-Upcoming spam
gone. Options were a new cross-goal route, the dashboard zone, or the per-goal
panel.

**Decision:** Enrich **`features/tasks/components/TasksPanel.tsx`** with **Today**
+ **Week** (Mon→Sun grid via `startOfIsoWeekYmd`/`ActivityDayBucket`). The real
spam fix is a **classification rule in `buildTaskSections` (`utils.ts:57`):
Daily never enters Upcoming** — Upcoming is fed only by On-set-days next
occurrences and rolled Completions. TD-002 collapse stays as a net.

**Consequence:** Per-goal scope, reuses the component; no new route/dashboard grid.

## TD-020 · 2026-09-16 · accepted — Completions absorb the retroactive Log-completed flow

**Context:** "One time" is being reframed as **Completions** (ad-hoc, day-anchored
checklist). A separate `LogCompletedForm` (`TasksPanel.tsx:267`) already records
retroactive completions via `log_completed_task_v1`.

**Decision:** One ad-hoc lane. Completions covers both forward ("do today") and
retroactive ("already did"), reusing the existing RPC. The current **Anytime**
(no-schedule) section is Completions' backlog tail.

**Consequence:** Simpler mental model; retroactive path reused, not rebuilt.

## TD-019 · 2026-09-16 · accepted — Promotion loop: 3-day rolled streak → offer Daily; Skip is counted

**Context:** Graduation path from ad-hoc → committed rhythm.

**Decision:** After a Completion is **done 3 days running** via Roll, prompt
"make it Daily?" with **Promote** or **Skip**. Persist a **promotion skip count**
per candidate (behavioral signal; feeds the TD-007 seam, which stays OFF — no
`character_profile` writes here). Re-offer on the next qualifying streak.

**Consequence:** Net-new persisted state (a `tasks` column or side table) — **L3
schema, CTO + team**. Closes the behavior→structure loop.

## TD-018 · 2026-09-16 · accepted — Roll is Completion-only; inserts a pending future occurrence

**Context:** User wants to "roll" a task forward one day at a time (stock-roll
metaphor) without committing to a schedule.

**Decision:** **Roll applies only to Completions.** It inserts a **pending
occurrence** for a future day (appears in Upcoming/Week). Daily and On-set-days
are not rollable (their future is already defined).

**Consequence:** Backend work (**L3**): occurrence creation is RPC-only today
(`log_completed_task_v1`) with no "create one occurrence for date X"; Roll needs a
new RPC + `source='rolled'` added to the `task_occurrences.source` CHECK
(migration `048_…:114`). Never writes `trackers`/`tracker_logs`.

## TD-017 · 2026-09-16 · accepted — Streak and Quantity are separate counts and never merge

**Context:** User's core conflict — rolling a task repeatedly "just becomes a
counter," colliding with the Quantity counter.

**Decision:** Two distinct counts. **Streak** (cadence: how many days/times you
showed up) is **derived history** from completed occurrences (reuse
`buildActivityWindow`), applies to any task, feeds the heatmap. **Quantity**
(measure: amount per occurrence) exists only when the user picks Quantity mode.
**Rolling builds a Streak, never a Quantity.**

**Consequence:** Rolling never silently converts a task to a counter; the two
axes stay orthogonal.

## TD-016 · 2026-09-16 · accepted — Tasks modeled on two orthogonal axes (Cadence × Measure)

**Context:** Five recurrence chips (`One time / Daily / Weekly / Every 2 weeks /
Custom`) mixed two independent questions, causing overlap ("One time"≈"Daily",
Weekly≈Custom).

**Decision:** Model Tasks on **Cadence** (Completion → On-set-days → Daily) ×
**Measure** (Check-off | Quantity). "On set days" merges Weekly+Custom (tap
weekdays; 1 day = once/week). "Every 2 weeks" demoted from top-level. Drop the
Optional Due Date (one-time dated events are Milestones per CLAUDE.md). Any
cadence carries either measure.

**Consequence:** Removes every recurrence overlap; the picker becomes honest about
the two real recurrence kinds (`daily`/`weekly`) plus a no-schedule ad-hoc lane.

## TD-015 · 2026-09-17 · accepted — T4 (PR #22) merged on user go-ahead; teammate sign-off (TD-005 cond. a) WAIVED, not obtained

**Context:** T4 (Phase C union + heatmap) shipped as PR #22 — tsc clean,
test:tasks 63/63, pre-commit `/code-review high` triaged. TD-005 gates merge of
`features/*` slices on **(a)** teammate sign-off **and (b)** user go-ahead. For
T4, (b) was given explicitly; (a) was NOT obtained. The user also attempted cloud
`/code-review ultra 22`, which could not start — the Claude GitHub App lacks
access to `teamoharaai/oharaai` (repo not in the App's selection / connection
expired), an access issue outside this initiative.

**Decision:** Merge PR #22 to `main` on the user's explicit go-ahead, **waiving**
the TD-005 teammate-sign-off condition for this PR. Squash-merged as `a73ffde`;
branch deleted. This does NOT supersede TD-005 as the standing policy — it is a
one-off waiver the user directed for T4; future `features/*` slices still expect
teammate sign-off unless the user again waives it.

**Consequence:** The `features/goals` render slice + the `lib/` union reader
landed on `main` without the teammate's review. The teammate (features/tasks +
features/goals owner) should be notified post-hoc so they can flag anything in a
follow-up; the L1 output contract is unchanged and placement is provisional
(TD-012), so any objection moves only the mount point, not the reader/contract.
Cloud ultrareview remains available once GitHub App access is restored.

---

## TD-012 · 2026-09-16 · accepted — Teammate sign-off on PR #21; L1 is the engagement seam (not the whole recap context); placement is provisional

**Context:** The `features/tasks` slice owner (also the weekly-recap + Entries
owner) signed off on PR #21 (T1/T2/T3) with 👍 and no requested changes, raising
two notes.

**Note 1 — T1 boundary refresh timezone (confirmed):** The midnight-boundary
refresh must use canonical profile/schedule tz, not device tz. **Verified:**
`features/tasks/task-boundary.ts` derives the boundary from
`occurrence.scheduleTimezone → active schedule.timezone → 'UTC'` (the same
precedence `buildTaskSections` uses), via `zonedDateParts` / `localDateToUtcStart`
in that canonical tz — never the browser/device clock. `useTaskBoundaryRefresh`
also fires on RN foreground + web visibility/focus, so the timer is never trusted
alone. No change needed.

**Note 2 — L1 seam scope:** The owner accepts `ActivityDayBucket[]` as the stable
L1 **engagement/activity** seam and endorses Phase C adding sources behind the
same signature. **Caveat to honor:** the bucket shape is NOT the entire future
weekly-recap context — the recap will combine this structured signal with richer
Task/Milestone/Reflection/Note context. So: keep `ActivityDayBucket[]` frozen and
source-additive (T4), but do NOT expand it into a general recap payload; richer
recap context is assembled by the recap pipeline (TD-007, still OFF), not baked
into L1.

**Decision:** Sign-off recorded (TD-005 gate cleared → PR #21 merged, TD-011).
The 7-day-row placement in `GoalAnalyticsCard` (TD-010) is explicitly
**provisional** — the owner plans a Goals V2.0 UI-polish pass and may relocate the
presentation later; that is safe precisely because it moves only the mount point,
not the reader/contract.

**Consequence:** T4 (Phase C union + heatmap) proceeds under the frozen L1 shape.
The recap owner owns any richer-context aggregation. Presentation surface may move
without reader/contract changes.

---

## TD-014 · 2026-09-16 · accepted — `entry_created` = `echo_entries.created_at` on confirmed links; dashboard reducer left in place

**Context:** Phase C adds an `entry_created` source to the L1 reader. The design
(design/001 Part B) said to "generalize the existing
`features/goals/dashboard-goal-activity.ts` union, moved to `lib/`." That reducer
(`resolveGoalActivityByGoalId`) answers "latest activity per goal" and keys off
`entries.updated_at`. The T4 signal is a per-day engagement union that must key
off when the Entry was *created*, and the reader lives in `lib/db` which must not
import from `features/*` (features/CLAUDE.md rule 2). Goal-linked Entries also
come in confirmed vs unconfirmed (`ai_suggested`) flavors.

**Decision:**
- `entry_created` resolves the engagement day from **`echo_entries.created_at`**,
  NOT `updated_at`. `updated_at` answers a different ("latest touch") question.
- Count only **confirmed** goal links (`echo_entry_links` `container_type='goal'`,
  `confirmed=true`), matching `fetchLatestReflectionTimestamps` and the
  Constellation Entry-count scoping — unconfirmed `ai_suggested` links are
  advisory, not engagement.
- The union is a **new pure module** (`lib/activity/goal-activity-sources.ts`),
  not a move of `dashboard-goal-activity.ts`. That reducer stays as-is (it still
  serves the dashboard "latest activity" question); moving it wholesale would
  conflate two derivations. The reader composes the new pure mappers, satisfying
  the "generalized into `lib/`" intent without cross-feature imports.

**Consequence:** The two questions stay separate and independently testable. If a
future consumer wants unconfirmed-link or `updated_at` semantics, that is an
explicit new source, not a silent change to this one. Flagged in changelog/004.

---

## TD-013 · 2026-09-16 · accepted — Heatmap window = 70 days; one window feeds both renders

**Context:** Phase C adds a GitHub-style heatmap alongside the 7-day emblem row,
both on `GoalAnalyticsCard` (TD-010). The heatmap needs a longer window than the
row; `useGoalActivityWindow(goalId, days)` already takes a `days` param and the
route clamps [1,120].

**Decision:** Use a **70-day** heatmap window (10 clean Monday-aligned weeks) and
reuse the **same** `useGoalActivityWindow(goal.id, 70)` call for both renders —
the 7-day row is the window's **last 7 buckets** (`buckets.slice(-7)`, still
oldest→newest with today last). No sibling hook, no second request. (Initial
build used two hook calls; the pre-commit review collapsed them, which also
halves the full-history DB read — see the T5 note.)

**Consequence:** Goal-detail makes one activity request and one union read, not
two. The L1 output shape is unchanged; only the mount composition changed. The
window length is a render-side constant — trivially retunable (63/84/…) without
touching the reader or pure fn.

---

## TD-011 · 2026-09-16 · accepted — T1+T2+T3 land as one PR in three coherent commits

**Context:** TD-005 requires `features/tasks` changes land as reviewed PRs after
sign-off. T1 was already committed+pushed (`0317484`); T2 + T3 were uncommitted
working-tree changes. All three had to land together (T1 has no PR of its own).
The working tree also carried session-001 `docs/CLAUDE.md` + `lib/ai/CLAUDE.md`
constitution corrections.

**Decision:** Open **one PR** (`feat/port-tracker-optimism-boundary` → `main`,
PR #21) carrying T1+T2+T3. Group the new work into **three commits**: (1) T2 =
`features/tasks/*`; (2) T3 = `lib/activity` + `lib/db/goal-activity` +
`types/activity` + `features/goals/*` + `app/api/goals/activity-window` +
`package.json`; (3) docs = `tracker-metrics/tasks/**` + `CHANGELOGCODEX.md` +
the two CLAUDE.md corrections. The CLAUDE.md edits were **kept** in the docs
commit (not dropped) because they are session-001 corrections of this
initiative — they cite `design/002` and the Tasks-canonical / vault-insights
facts this initiative established, and are already logged in the CHANGELOGCODEX
session-001 entry.

**Consequence:** History is not rewritten (T1 stays as its own commit). Reviewer
sees T2, T3, and docs as separate reviewable units under one PR. Merge remains
gated on teammate sign-off + user go-ahead (TD-005). If the review forces code
changes, they append as new commits (supersede, don't rewrite).

---

## TD-010 · 2026-09-16 · accepted — L1 emblem row lands in `GoalAnalyticsCard`, not the unmounted `AnalyticsPanel`/`IntelligencePanel`

**Context:** `design/001` Part B (and TD-006) said to render the 7-day emblem row
"on the goal Analytics surface" and to position
`features/goals/components/IntelligencePanel.tsx` **beneath** `AnalyticsPanel.tsx`.
Building T3 revealed those two components are **never mounted** — no screen imports
`AnalyticsPanel` or `IntelligencePanel` (they are stub-only design artifacts). The
live goal-detail analytics surface is `GoalAnalyticsCard` (headed "GOAL ANALYTICS")
inside the `ContextRail` of `SelectedGoalWorkspace` (`GoalsWorkspace.tsx`).

**Decision:** Render the emblem row inside `GoalAnalyticsCard`, under a "LAST 7
DAYS" `SectionHeading`, fed by a new `useGoalActivityWindow` hook →
`/api/goals/activity-window`. The "IntelligencePanel beneath AnalyticsPanel"
instruction is **moot** (both unmounted) and is deferred to whenever those panels
are actually wired to a screen — a separate effort, not part of initiative #1.

**Consequence:** The design's named anchors were factually wrong vs. the codebase;
this records the real placement without re-litigating the settled contract (the L1
data shape is unchanged). New CTO-owned surface added on the feature branch
(`app/api/goals/activity-window+api.ts`), lands via reviewed PR (TD-005). If the
reviewer prefers a different surface (e.g. the `overview` tab or a future mounted
`AnalyticsPanel`), only the mount point moves — the L1 core/reader/component are
placement-agnostic.

---

## TD-001 · 2026-09-15 · accepted — Tasks salvage is a nested initiative under `tracker-metrics/`

**Context:** The trackers→tasks cutover (parent D-012 discovery) froze legacy
writes and made most of tracker-metrics Tasks 3–10 obsolete against prod, but the
user wants to preserve most of that work by porting it onto the canonical Tasks
model, plus fix Tasks regressions (Upcoming spam, missing 7-dot history).

**Decision:** Run this as a **nested initiative** at `tracker-metrics/tasks/`,
reusing the parent's session protocol/doc set, with its own `TD-NNN` decision
namespace. The parent tracker-metrics initiative stays **closed** (its ship call
stands historically; its code lives on `feat/tracker-metrics-archive`).

**Consequence:** New work is documented here; the archive branch is the salvage
source of record. Cross-references use parent `D-NNN` / this file's `TD-NNN`.

---

## TD-002 · 2026-09-15 (accepted 2026-09-16) · accepted — Upcoming collapses to one row per task

**Context:** `reconcile_task_occurrences_v1` pre-materializes a 28-day horizon;
`buildTaskSections` + `TasksPanel` render one row per future occurrence, so a
daily task repeats ~28× in Upcoming (audit 000 §3A).

**Decision (proposed, pending user OK):** Upcoming should show **one row per
task** — its next actionable occurrence plus a schedule summary — not one row per
materialized day. Implement as a pure change in `features/tasks/utils.ts`
(`buildTaskSections` de-dupes upcoming by `task.id`, keeping the earliest future
occurrence) + a `TasksPanel` render tweak, with unit tests.

**Consequence:** No schema/RPC change; the 28-day horizon stays
(it's fine as data). Purely a presentation fix. Lands via design sign-off →
PR (TD-005). Per-week roll-up was considered and rejected (still repeats a
daily task within a week).

---

## TD-003 · 2026-09-15 (accepted+refined 2026-09-16) · accepted — 7-dot visual becomes cross-feature "goal activity", occurrences first

**Context:** Metrics' 7 dots were 7 cadence periods of one tracker. The user
wants a 7-**day** visual of **which days they engaged the goal** across tasks,
milestones, and reflections (goal #2), and is still designing the cross-feature
wiring.

**Decision (proposed):** Build in two phases. **Phase 1:** a 7-day dot row from
`task_occurrences` for the goal's tasks (reusing the archived
`tracker-display` label/dot rendering, re-pointed), so the visual ships against
data that already exists. **Phase 2:** generalize the per-day "was there
activity?" signal to a union of task occurrences + milestone completions +
reflection entries, in the user's timezone. Keep the day-activity derivation
pure + node-tested.

**Consequence (if accepted):** Phase 1 is self-contained and low-risk; Phase 2
depends on resolving the activity data model (audit 000 §5 Q1) and likely a
shared read across features (`lib/`), respecting the no-cross-feature-import rule.

**Refinement (2026-09-16):** The activity data model is now settled — see
**TD-006** for the L1 "goal activity" architecture (pure derivation in `lib/`,
source-agnostic union, profile-timezone bucketing, 7-day row + heatmap renders),
**TD-007** for the deferred L2 correlation seam, and **TD-008** for the
Vaults↔Notes↔Intelligence split. The "7 dots" is the 7-day render of L1.

---

## TD-004 · 2026-09-16 · accepted — Schedule model stays daily/weekly-only (no monthly)

**Context:** Audit 000 §5 Q2. Metrics had a monthly cadence; Tasks
`task_schedules.recurrence_kind` is `daily | weekly` only. Prod had 0 monthly
trackers.

**Decision:** Do **not** add monthly. Adding it means changing
`task_schedules.recurrence_kind` (a server RPC/schema change in the teammate's
model), which is out of scope for a salvage initiative with zero demonstrated
demand.

**Consequence:** If monthly is ever needed it is specified as a server proposal
for the teammate, not built here. No client work assumes monthly.

---

## TD-005 · 2026-09-16 · accepted — Land `features/tasks/` changes via design sign-off, then PRs

**Context:** Audit 000 §5 Q3. `features/tasks/` is the teammate's active slice
(CLAUDE.md L2/L3); they also own the weekly-recap pipeline (TD-007) and the
Entries/Notes surface (TD-008).

**Decision:** This initiative's settled design docs (`PLAN.md` +
`design/001…`) go to the teammate for **sign-off first**; once agreed, code
lands as **reviewed PRs** against their slice. No unilateral edits to
`features/tasks/` ahead of sign-off.

**Consequence:** Matches L3 for shared contracts. The already-pushed
`feat/port-tracker-optimism-boundary` (T1) follows the same path — PR + review
before merge.

---

## TD-006 · 2026-09-16 · accepted — "Goal activity" (L1) is a pure, source-agnostic derivation in `lib/`

**Context:** The user reframed the 7-dot visual as a self-feeding "goal
engagement" signal: per-day, per-goal, rich enough to feed Ohara Intelligence
and render as both a weekday (MTWTFSS) emblem row and a GitHub-style heatmap.
The union spans features (tasks + entries + milestones), which cannot
cross-import (`features/CLAUDE.md`).

**Decision:**
- **L0 signal capture** already exists: `task_occurrences` (completed), goal-linked
  Entries (`echo_entry_links`), `milestones.completed_at`.
- **L1 derivation lives in `lib/`** (shared), as a **pure, source-agnostic**
  function that buckets a normalized `GoalActivityEvent[]` (each already carrying
  a local `YYYY-MM-DD`) into an ordered day window. A thin `lib/db` reader
  resolves raw rows → local dates using `lib/time/zoned-calendar.ts`
  (`localDateForInstant`, `addLocalDays`, `startOfIsoWeekYmd`) and the user's
  **`profiles.timezone`** (single profile tz — the only rule that survives the
  cross-feature union; per-schedule tz does not).
- **Buckets are oldest→newest, today last** (the archived `tracker-display`
  ordering). 7-day row = window of 7; heatmap = same fn over a longer window.
- **Phase B ships occurrences-only** (`task_completed`), so it renders against
  data that exists. **Phase C** adds the union sources (`entry_created`,
  `milestone_completed`) for the multi-emblem row — same output shape, more
  sources; no contract change.
- **Placement:** renders on the goal **Analytics** surface; the existing
  `features/goals/components/IntelligencePanel.tsx` sits **beneath**
  `AnalyticsPanel.tsx` (both are stub-fed today). L1 is the first real data
  source for that surface.
- The day-badge model generalizes `types/activity.ts`'s extend-only
  `ActivityItem` union (add a `task_completed` variant; extend-only per
  `types/CLAUDE.md`). Full spec: `design/001-activity-and-upcoming.md`.

**Consequence:** One derivation, many renders (row, heatmap, and later the recap
+ Intelligence stats). No writes to the frozen `trackers`/`tracker_logs`. Pure
core is node-testable (D-004: relative imports + `import type`).

---

## TD-007 · 2026-09-16 · accepted — L2 (correlation → `character_profile`) is a designed seam, kept OFF

**Context:** Ohara Intelligence is output-only and starved: `app/api/intelligence`
reads `profiles.character_profile` and emits one observational sentence, but the
summarization step that once wrote `character_profile.patterns` was removed
("never adopted"), so the profile is ~never populated. The engagement signal
(L1) is the natural substrate to repopulate it. The user's teammate is building a
**weekly-recap pipeline** that will consume this, and the "what feeds it / when
is a correlation valid" rules are not yet decided.

**Decision:** Design the **seam only** — L1's output shape is stable and
recap-ready — and keep L2 **OFF** in this initiative: **no** summarization step,
**no** writes to `character_profile`, no flag to flip. The recap owner decides
correlation semantics.

**Consequence:** This initiative never couples to correlation rules it doesn't
own; L1 is the clean hand-off. Revisit when the recap pipeline lands.

---

## TD-008 · 2026-09-16 · accepted — Two initiatives; Vault-as-corpus; insight item = confirmable saved insight

**Context:** The user wants Vaults revived and connected to "Notes." Findings:
"Notes" = the **Entries** system (`features/entries/`, `entry_type='note'`,
migrations 036/042) — a rich Tiptap editor with `goalReference` marks (one note →
many goals), `intelligenceReference` marks (highlight + question; **no AI call in
v1**), and checkbox→goal progress evidence. Vaults (`vault_items`) is a separate,
older, mostly-unused goal content store with embeddings. Two content stores were
competing.

**Decision:**
- **Split into two initiatives.** *(#1)* **Tasks-salvage** (this one): Upcoming
  collapse + L0/L1 + the Analytics/heatmap render. Touches only `features/tasks`,
  a shared `lib/` reader, and the goal-detail panels. *(#2)* **Vaults↔Notes↔
  Intelligence corpus**: its own design brief (`design/002-…`), needs the Entries
  owner; consumes the same L1 signal but is not built here.
- **Vault-as-corpus model:** the Vault is a goal's **aggregated corpus +
  workspace view**, not a rival editor. It aggregates goal-linked note-Entries +
  Echo reflections + vault-native artifacts (links, documents, confirmed
  insights). Notes stay authored in the Notes editor; their `goalReference` marks
  surface them in the goal's Vault. **Direction is Vaults→Intelligence** (the
  vault is the source Ohara reads), not Intelligence→vault.
- **`insight` vault item = option (ii):** a confirmable, saved insight
  (`metadata.confirmed`, the existing AI rule) persisted into the vault so it
  re-enters the corpus.

**Consequence:** One authoring surface (Notes), one aggregation/retrieval surface
(Vault-as-corpus), one render surface (the two goal panels). Initiative #2 is
L3 and is handed off, not built blind.

---

## TD-009 · 2026-09-16 · accepted — iOS reminders and iOS-contract scope dropped from this initiative

**Context:** The founding prompt included (F) porting the archived iOS-contract
framework + authoring `contracts/ios/v1/tasks.json`, and an iOS
reminder/Later-Busy-OK postponement signal.

**Decision:** **Drop both** from this initiative. No `tasks.json`, no porting
`lib/api/ios-contract.ts` / `contracts/ios/v1/*` / `docs/IOS_API_CONTRACT_V1.md`,
no reminder/notification capture.

**Consequence:** Significant scope reduction. If iOS builds against Tasks later,
the framework port + a tasks contract is its own tracked effort (note: origin's
`lib/api/contracts.ts` is a subset missing `requestId` + several error codes, so
it must be reconciled first). Reminders are parked as a documented future L0
input.
