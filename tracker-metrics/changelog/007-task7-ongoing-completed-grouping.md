# Session 007 — Task 7: Ongoing/Completed tracker grouping

- **Date:** 2026-09-11
- **Task(s):** Task 7
- **Agent/model:** Opus 4.8, low effort (per PLAN allocation; Codex `gpt-5.6-terra` slot)
- **tsc baseline (before):** clean (exit 0)

## Goal of this session

Partition the goal-detail trackers into **Ongoing** and **Completed** sections
driven by the Task-6 log-derived `periodState.isCompleted`, replacing the single
flat list in `TrackersPanel.tsx`. Small, mostly-visual (L1/L2) change. No card,
habit-history, display, uncomplete-gesture, or dashboard/legacy-route work (that
is Tasks 8/9).

## Changes

- **`features/goals/tracker-grouping.ts`** (new, relative imports — D-004) — pure
  partition core, mirroring the Task-6 pattern of keeping testable logic out of
  the component:
  - `isTrackerCompleted(tracker)` → `tracker.periodState?.isCompleted ?? false`
    (null cadence / not-yet-hydrated → not complete → Ongoing).
  - `partitionTrackersByCompletion(trackers)` → `{ ongoing, completed }`. Sorts
    the input by `sortOrder` once (non-mutating copy), then splits, preserving
    ascending `sortOrder` within each section. Generic over a minimal
    `{ sortOrder; periodState: { isCompleted } | null }` shape so tests can use
    light fixtures while `readonly Tracker[]` still satisfies it.
- **`features/goals/components/TrackersPanel.tsx`** — replaced the flat
  `sortedTrackers = [...trackers].sort(...)` + `.map()` with:
  - `hasTrackers = trackers.length > 0` (empty-state + add-form `marginTop` now key
    off this instead of `sortedTrackers.length`).
  - `const { ongoing, completed } = useMemo(() => partitionTrackersByCompletion(trackers), [trackers])`
    — memoized so add-form typing / unrelated re-renders don't re-copy/sort.
  - `renderSections()` builds a **flat** array of sibling nodes:
    `[Ongoing header?, ...ongoing cards, Completed header?, ...completed cards]`.
    A section (and its header) is skipped entirely when empty
    (`sectionTrackers.length === 0`). Headers use the file's existing overline
    typography (`TYPE.overline` + `FONT.ui.semibold` + `letterSpacing: 1.5` +
    uppercase, `color.text.secondary`), with `accessibilityRole="header"` +
    `accessibilityLabel="Ongoing/Completed trackers"`. First rendered header gets a
    2px top margin; a following header gets an 18px group gap.
  - `renderTrackerCard(tracker)` keyed by `tracker.id`. **All cards and both
    headers are siblings in one parent**, so React preserves a card's instance
    (and its in-flight `isSaving`) when an optimistic completion flips
    `isCompleted` and the card moves from Ongoing to Completed — no
    unmount/remount.

Locked scope respected: `TrackerCard` untouched; counter/checklist display still
reads the legacy scalar (Task 8); no `onUncompleteTracker` gesture; no dashboard /
`due-today` / `complete-tracker` changes (Task 9, D-009).

## Tests

- Added: `features/goals/tracker-grouping.test.ts` (10 cases)
  - `isTrackerCompleted`: null → false; true/false pass through.
  - checklist + habit with a current-period log (derived `isCompleted: true`) →
    Completed.
  - counter below target (`isCompleted: false`) → Ongoing; at/above → Completed.
  - null-cadence → Ongoing.
  - empty section → empty array (panel renders no header) — both "nothing
    completed" and "all completed" directions.
  - `sortOrder` preserved within each section, independent of input order.
  - partition does not mutate the input array.
  - text-level (reads `TrackersPanel.tsx`): uses `partitionTrackersByCompletion`
    inside `useMemo(..., [trackers])`, dropped `sortedTrackers`, renders
    conditional `accessibilityRole="header"` sections labeled `'Ongoing'`/
    `'Completed'` guarded by `sectionTrackers.length === 0`.
- Commands run + result:
  - `npx tsc --noEmit` → **pass (exit 0)** before and after.
  - `node --experimental-strip-types --test features/goals/tracker-grouping.test.ts`
    → **10 passed / 0 failed**.
  - Task 6 suites (`tracker-optimism`, `tracker-boundary`,
    `tracker-detail-state`) → **20 passed / 0 failed**.
  - `features/goals/*.test.ts` (all) → **43 passed / 0 failed**.
  - `npm run test:momentum` → **64 passed / 0 failed**.

## Decisions made

- None. No new `DECISIONS.md` entry needed (Task 7 is a pure application of the
  Task-6 contract; the null-cadence-stays-Ongoing and completion-semantics calls
  were already settled in PLAN + D-008).

## Follow-ups / handoff

- **Next action:** **Task 8** — tracker card + habit-history rewrite. Drive
  counter/checklist **display** from `periodState.currentValue`/`isCompleted`;
  replace habit dot math with the seven `periodState.recentPeriods` buckets; add
  the accessible complete/uncomplete toggle and thread `onUncompleteTracker`
  (already on `useGoalDetail`) through `TrackersPanel` → `TrackerCard`; confirm/
  remove the dead `TrackerList` in `GoalsWorkspace`.
- **Interim (unchanged):** counter/checklist visible display still reads the
  legacy scalar until Task 8; grouping keys off `periodState` correctly now.
- Live DB untouched this session (no migration, no data writes).
- No commit made (user has not asked to commit).
