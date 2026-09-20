import type { Task, TaskOccurrence, TaskSchedule, TaskSections } from './types';

export const TASK_WEEKDAYS = [
  { value: 1, short: 'Mon' },
  { value: 2, short: 'Tue' },
  { value: 3, short: 'Wed' },
  { value: 4, short: 'Thu' },
  { value: 5, short: 'Fri' },
  { value: 6, short: 'Sat' },
  { value: 7, short: 'Sun' },
] as const;

export function dateInTimeZone(timezone: string, instant = new Date()): string {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(instant);
    const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return `${value.year}-${value.month}-${value.day}`;
  } catch {
    return instant.toISOString().slice(0, 10);
  }
}

export function localDateTimeInputValue(instant = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${instant.getFullYear()}-${pad(instant.getMonth() + 1)}-${pad(instant.getDate())}`
    + `T${pad(instant.getHours())}:${pad(instant.getMinutes())}`;
}

export function parseRetroactiveCompletionTime(
  value: string,
  nowEpoch = Date.now(),
): Date | null {
  const instant = new Date(value);
  if (Number.isNaN(instant.getTime()) || instant.getTime() > nowEpoch + 300_000) return null;
  return instant;
}

export function activeTaskSchedule(task: Task) {
  return task.schedules.find((schedule) => schedule.isActive) ?? null;
}

/**
 * Daily cadence = an active schedule that recurs every day. Daily Tasks live in
 * Today only and never enter Upcoming (design 003 / TD-021) — their future is
 * already defined, so a `next <tomorrow>` row is meaningless spam.
 */
export function isDailyCadence(task: Task): boolean {
  return activeTaskSchedule(task)?.recurrenceKind === 'daily';
}

export function scheduleLabel(task: Task): string {
  const schedule = activeTaskSchedule(task);
  if (!schedule) return task.dueDate ? `Expire ${shortDate(task.dueDate)}` : 'No deadline';
  if (schedule.recurrenceKind === 'daily') {
    return schedule.intervalCount === 1 ? 'Daily' : `Every ${schedule.intervalCount} days`;
  }
  if (schedule.recurrenceKind === 'weekly_count') {
    return `${schedule.targetCount ?? 0}×/week`;
  }
  const days = TASK_WEEKDAYS.filter((day) => schedule.weekdays.includes(day.value))
    .map((day) => day.short)
    .join(' · ');
  return schedule.intervalCount === 1 ? days : `Every ${schedule.intervalCount} weeks · ${days}`;
}

const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

export function shortDate(localDate: string | null): string {
  if (!localDate) return '';
  const [year, month, day] = localDate.split('-').map((part) => Number.parseInt(part, 10));
  if (!year || !month || !day || month < 1 || month > 12) return localDate;
  return `${SHORT_MONTHS[month - 1]} ${day}`;
}

/**
 * To-Do due-window filter (goal detail To-Do list). `all` is the default and the
 * only bucket that ever shows undated or far-future To-Dos, so filtering can never
 * strand a To-Do with no way back to it.
 */
export type TodoDueFilter = 'all' | 'thisWeek' | 'nextWeek' | 'thisMonth';

export const TODO_DUE_FILTERS: ReadonlyArray<{ value: TodoDueFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'thisWeek', label: 'This Week' },
  { value: 'nextWeek', label: 'Next Week' },
  { value: 'thisMonth', label: 'This Month' },
] as const;

export interface TodoDueWindows {
  thisWeekStart: string;
  thisWeekEnd: string;
  nextWeekStart: string;
  nextWeekEnd: string;
  thisMonthStart: string;
  thisMonthEnd: string;
}

function localDateString(dt: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
}

/**
 * Local-calendar bounds for the To-Do filter, computed once per render (weeks are
 * Monday-start, matching the weekday strip). To-Do `dueDate`s are `YYYY-MM-DD`
 * local strings, so every bound is a string too and filtering is a pure
 * lexicographic compare — no per-row Date parsing, so the list stays cheap as it
 * grows.
 */
export function computeTodoDueWindows(now = new Date()): TodoDueWindows {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const mondayOffset = (today.getDay() + 6) % 7; // days since Monday (0=Sun→6)
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - mondayOffset);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  const nextWeekStart = new Date(weekStart);
  nextWeekStart.setDate(weekStart.getDate() + 7);
  const nextWeekEnd = new Date(nextWeekStart);
  nextWeekEnd.setDate(nextWeekStart.getDate() + 6);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  return {
    thisWeekStart: localDateString(weekStart),
    thisWeekEnd: localDateString(weekEnd),
    nextWeekStart: localDateString(nextWeekStart),
    nextWeekEnd: localDateString(nextWeekEnd),
    thisMonthStart: localDateString(monthStart),
    thisMonthEnd: localDateString(monthEnd),
  };
}

/** Whether a To-Do's `dueDate` falls inside the selected filter window. */
export function todoMatchesDueFilter(
  dueDate: string | null,
  filter: TodoDueFilter,
  windows: TodoDueWindows,
): boolean {
  if (filter === 'all') return true;
  if (!dueDate) return false; // undated To-Dos live only under "All"
  if (filter === 'thisWeek') return dueDate >= windows.thisWeekStart && dueDate <= windows.thisWeekEnd;
  if (filter === 'nextWeek') return dueDate >= windows.nextWeekStart && dueDate <= windows.nextWeekEnd;
  return dueDate >= windows.thisMonthStart && dueDate <= windows.thisMonthEnd;
}

/**
 * Quick-plan chip dates for the To-Do quick-add row (set a due date at creation
 * without opening the calendar). Every value is a local-calendar `YYYY-MM-DD`
 * string — same canonical form as `dueDate` — so the caller can compare a chip to
 * the current selection with `===`. Weeks are Monday-start, matching the rest of
 * the To-Do date logic.
 */
export interface QuickPlanDates {
  today: string;
  tomorrow: string;
  thisWeekend: string;
  nextWeek: string;
}

export const QUICK_PLAN_CHIPS: ReadonlyArray<{ key: keyof QuickPlanDates; label: string }> = [
  { key: 'today', label: 'Today' },
  { key: 'tomorrow', label: 'Tomorrow' },
  { key: 'thisWeekend', label: 'This Weekend' },
  { key: 'nextWeek', label: 'Next Week' },
] as const;

export function computeQuickPlanDates(now = new Date()): QuickPlanDates {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const mondayOffset = (today.getDay() + 6) % 7; // days since Monday (0=Sun→6)
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - mondayOffset);
  // Saturday of the current Monday-start week. On Sunday that Saturday is already
  // past, so fall back to today — "this weekend" is the one you're in, never a
  // date in the past.
  const saturday = new Date(weekStart);
  saturday.setDate(weekStart.getDate() + 5);
  const thisWeekend = saturday >= today ? saturday : today;
  const nextWeek = new Date(weekStart);
  nextWeek.setDate(weekStart.getDate() + 7);
  return {
    today: localDateString(today),
    tomorrow: localDateString(tomorrow),
    thisWeekend: localDateString(thisWeekend),
    nextWeek: localDateString(nextWeek),
  };
}

function occurrenceSortValue(occurrence: TaskOccurrence): string {
  return `${occurrence.scheduledLocalDate ?? '9999-12-31'}T${occurrence.scheduledLocalTime ?? '23:59:59'}`;
}

export function buildTaskSections(tasks: readonly Task[], now = new Date()): TaskSections {
  const sections: TaskSections = { today: [], upcoming: [], anytime: [], completed: [] };
  for (const task of tasks) {
    const dailyCadence = isDailyCadence(task);
    const actionable = task.occurrences.filter((occurrence) =>
      occurrence.status === 'pending' || occurrence.status === 'missed',
    );
    for (const occurrence of actionable) {
      const timezone = occurrence.scheduleTimezone
        ?? activeTaskSchedule(task)?.timezone
        ?? 'UTC';
      const today = dateInTimeZone(timezone, now);
      const schedule = task.schedules.find((item) => item.id === occurrence.scheduleId);
      const periodStart = occurrence.scheduledLocalDate;
      const periodEnd = periodStart ? new Date(`${periodStart}T00:00:00Z`) : null;
      if (periodEnd) periodEnd.setUTCDate(periodEnd.getUTCDate() + (7 - periodEnd.getUTCDay()) % 7);
      const currentWeeklyPeriod = schedule?.recurrenceKind === 'weekly_count'
        && periodStart !== null && periodStart <= today
        && periodEnd !== null && today <= periodEnd.toISOString().slice(0, 10);
      if (!occurrence.scheduledLocalDate) {
        sections.anytime.push({ task, occurrence });
      } else if (
        occurrence.scheduledLocalDate === today
        || currentWeeklyPeriod
        || (occurrence.scheduleId === null && occurrence.scheduledLocalDate < today)
      ) {
        sections.today.push({ task, occurrence });
      } else if (occurrence.scheduledLocalDate > today && !dailyCadence) {
        // Daily Tasks never enter Upcoming (TD-021): their next occurrence is
        // always tomorrow, which is noise. Upcoming is fed only by On-set-days
        // next occurrences (and rolled Completions, once Phase 3 lands).
        sections.upcoming.push({ task, occurrence });
      }
    }
    for (const occurrence of task.occurrences.filter((item) => item.status === 'completed')) {
      sections.completed.push({ task, occurrence });
    }
  }
  sections.today.sort((a, b) => occurrenceSortValue(a.occurrence).localeCompare(occurrenceSortValue(b.occurrence)));
  sections.upcoming.sort((a, b) => occurrenceSortValue(a.occurrence).localeCompare(occurrenceSortValue(b.occurrence)));
  sections.anytime.sort((a, b) => a.task.sortOrder - b.task.sortOrder || a.task.createdAt.localeCompare(b.task.createdAt));
  sections.completed.sort((a, b) => (b.occurrence.completedAt ?? '').localeCompare(a.occurrence.completedAt ?? ''));
  // Collapse Upcoming to one row per task: its earliest future actionable
  // occurrence. Upcoming is already ordered by occurrenceSortValue above, so the
  // first entry seen per task.id is the earliest, and cross-task ordering by next
  // date is preserved (TD-002).
  const seenUpcoming = new Set<string>();
  sections.upcoming = sections.upcoming.filter(({ task }) => {
    if (seenUpcoming.has(task.id)) return false;
    seenUpcoming.add(task.id);
    return true;
  });
  return sections;
}

// ---------------------------------------------------------------------------
// Unified To-Do × Metric plan projection (Design: todo-metrics-unification, TM-2)
//
// A To-Do and a Metric are one entity: a To-Do is a projection of a `Task` with
// no active schedule + no counter; a Metric carries a schedule and/or a counter.
// `buildPlanItems` normalizes both into one shape so the scope organizer never
// branches on kind, and `bucketPlanItems` is the single pure bucketer the panel
// renders. Both are pure + fully unit-tested; scope switching re-runs them in
// memory (no fetch).
// ---------------------------------------------------------------------------

/**
 * A To-Do is a one-time user check-off: a binary `Task` (no counter) with no
 * active schedule. Everything else (recurring, counters, legacy imports) is a
 * Metric. Archived Tasks are neither.
 */
export function isToDoTask(task: Task): boolean {
  return task.source === 'user'
    && task.completionMode === 'binary'
    && task.status !== 'archived'
    && !activeTaskSchedule(task);
}

/** The occurrence a To-Do acts on: its open one, else its latest completed. */
export function todoDisplayOccurrence(task: Task): TaskOccurrence | null {
  const open = task.occurrences.find((item) => item.status === 'pending' || item.status === 'missed');
  if (open) return open;
  const done = task.occurrences
    .filter((item) => item.status === 'completed')
    .sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''));
  return done[0] ?? task.occurrences[0] ?? null;
}

export type PlanItemKind = 'todo' | 'metric';
export type PlanItemStatus = 'pending' | 'completed' | 'missed';

/**
 * One cell of a set-days Metric's weekly strip (Mon…Sun). `scheduled` marks the
 * chosen weekday(s); `status` is that day's occurrence state this week (`null`
 * when unscheduled or not yet materialized). The row strikes through completed
 * days and derives its days-counter from these cells.
 */
export interface WeekdayCell {
  weekday: number; // 1..7 (Mon..Sun), matching TASK_WEEKDAYS
  scheduled: boolean;
  occurrenceId: string | null;
  status: 'pending' | 'completed' | 'missed' | null;
  date: string; // YYYY-MM-DD of this weekday in the current week
  /** This day's logged quantity (quantity set-days Tasks); null for binary. */
  quantity: number | null;
}

/** Normalized row over the To-Do + Metric union. `date` is a local `YYYY-MM-DD`
 *  string (a To-Do's `dueDate`, a Metric occurrence's `scheduledLocalDate`) so
 *  bucketing is a pure lexicographic compare — no per-row Date parsing.
 *  `weekdayCells` is present only on a set-days weekly aggregate (the whole
 *  current week as one row); its `progress` is then the days-counter. */
export interface PlanItem {
  taskId: string;
  occurrenceId: string | null;
  title: string;
  kind: PlanItemKind;
  date: string | null;
  time: string | null;
  status: PlanItemStatus;
  progress: { done: number; target: number } | null;
  weekdayCells?: WeekdayCell[] | null;
}

function planStatus(status: TaskOccurrence['status']): PlanItemStatus | null {
  if (status === 'completed') return 'completed';
  if (status === 'missed') return 'missed';
  if (status === 'pending') return 'pending';
  return null; // skipped / cancelled → not shown in the plan
}

function hhmm(time: string | null): string | null {
  return time ? time.slice(0, 5) : null;
}

/** The seven local dates (Mon…Sun) of the Monday-start week containing `now`,
 *  plus that week's bounds and today — all canonical `YYYY-MM-DD` strings. */
function currentWeekBounds(now: Date): { start: string; end: string; today: string; dates: string[] } {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const mondayOffset = (today.getDay() + 6) % 7; // days since Monday (0=Sun→6)
  const monday = new Date(today);
  monday.setDate(today.getDate() - mondayOffset);
  const dates: string[] = [];
  for (let i = 0; i < 7; i += 1) {
    const day = new Date(monday);
    day.setDate(monday.getDate() + i);
    dates.push(localDateString(day));
  }
  return { start: dates[0], end: dates[6], today: localDateString(today), dates };
}

/**
 * A set-days weekly Metric that renders as one weekly strip: an active `weekly`
 * schedule with chosen weekday(s). Both check-off (binary) and measured
 * (quantity) Tasks aggregate — a quantity day logs its number through a per-day
 * stepper the strip discloses on tap, and its day completes when the target is
 * met (auto-completed by `optimisticQuantityDelta`), so the days-counter stays
 * honest either way.
 */
function isAggregatableSetDays(task: Task, schedule: TaskSchedule | null): boolean {
  return !!schedule
    && schedule.recurrenceKind === 'weekly'
    && schedule.weekdays.length > 0;
}

/** Collapse a set-days weekly Task's current week into one aggregate PlanItem:
 *  a 7-cell weekday strip + a days-counter (completed scheduled days / chosen
 *  days). Fully-done weeks report `completed` so they roll into history. */
function buildWeekAggregate(task: Task, schedule: TaskSchedule, week: ReturnType<typeof currentWeekBounds>): PlanItem {
  const byDate = new Map<string, TaskOccurrence>();
  for (const occ of task.occurrences) {
    if (occ.scheduledLocalDate && occ.scheduledLocalDate >= week.start && occ.scheduledLocalDate <= week.end) {
      byDate.set(occ.scheduledLocalDate, occ);
    }
  }
  const cells: WeekdayCell[] = week.dates.map((date, index) => {
    const occ = byDate.get(date) ?? null;
    const status = occ ? planStatus(occ.status) : null;
    return {
      weekday: index + 1, // dates[0] is Monday → weekday 1
      scheduled: schedule.weekdays.includes(index + 1),
      occurrenceId: occ?.id ?? null,
      status,
      date,
      quantity: occ ? occ.actualQuantity : null,
    };
  });
  const target = schedule.weekdays.length;
  const done = cells.filter((cell) => cell.scheduled && cell.status === 'completed').length;
  return {
    taskId: task.id,
    occurrenceId: null,
    title: task.title,
    kind: 'metric',
    date: week.today, // pin into the current week so it buckets as in-scope
    time: null,
    status: done >= target ? 'completed' : 'pending',
    progress: { done, target },
    weekdayCells: cells,
  };
}

/**
 * Project loaded goal Tasks into the unified `PlanItem[]` for a scope:
 * - **To-Do** → one item (its `dueDate` + display occurrence).
 * - **Set-days weekly Metric** (binary or quantity) → under **week/month**
 *   scope, one current-week **aggregate** row (weekday strip + days-counter;
 *   quantity days carry their per-day number too); under **today** scope it
 *   falls through to the earliest-actionable row so Today narrows to a single day.
 * - **Other Metric** → one item for its **earliest actionable** occurrence
 *   (collapse, TD-002 — a daily/set-days Task shows one "next step" row, not a
 *   wall of occurrences), plus one item per completed occurrence for history.
 * Metrics carry `progress` (done/target) when they measure a quantity.
 */
export function buildPlanItems(tasks: readonly Task[], scope: PlanScope = 'today', now = new Date()): PlanItem[] {
  const items: PlanItem[] = [];
  const aggregateWeek = scope === 'week' || scope === 'month';
  const week = aggregateWeek ? currentWeekBounds(now) : null;
  for (const task of tasks) {
    if (isToDoTask(task)) {
      const occ = todoDisplayOccurrence(task);
      const status = occ ? planStatus(occ.status) : 'pending';
      if (status === null) continue; // a skipped/cancelled To-Do has nothing to show
      items.push({
        taskId: task.id,
        occurrenceId: occ?.id ?? null,
        title: task.title,
        kind: 'todo',
        date: task.dueDate,
        time: hhmm(occ?.scheduledLocalTime ?? null),
        status,
        progress: null,
      });
      continue;
    }
    const schedule = activeTaskSchedule(task);
    if (aggregateWeek && week && isAggregatableSetDays(task, schedule)) {
      items.push(buildWeekAggregate(task, schedule as TaskSchedule, week));
      continue;
    }
    const progressFor = (occ: TaskOccurrence): PlanItem['progress'] =>
      task.completionMode === 'quantity'
        ? { done: occ.actualQuantity ?? task.legacyCurrentValue ?? 0, target: task.targetQuantity ?? 0 }
        : null;
    const actionable = task.occurrences
      .filter((occ) => occ.status === 'pending' || occ.status === 'missed')
      .sort((a, b) => occurrenceSortValue(a).localeCompare(occurrenceSortValue(b)));
    if (actionable.length) {
      const occ = actionable[0];
      items.push({
        taskId: task.id,
        occurrenceId: occ.id,
        title: task.title,
        kind: 'metric',
        date: occ.scheduledLocalDate,
        time: hhmm(occ.scheduledLocalTime),
        status: occ.status === 'missed' ? 'missed' : 'pending',
        progress: progressFor(occ),
      });
    }
    for (const occ of task.occurrences.filter((item) => item.status === 'completed')) {
      items.push({
        taskId: task.id,
        occurrenceId: occ.id,
        title: task.title,
        kind: 'metric',
        date: occ.scheduledLocalDate,
        time: hhmm(occ.scheduledLocalTime),
        status: 'completed',
        progress: progressFor(occ),
      });
    }
  }
  return items;
}

/**
 * The scope organizer's time window (TM-4/TM-5). The panel picks a scope and the
 * bucketer derives sections relative to it: **In-scope** is today → the end of
 * the scope, **Upcoming** is the next period after it (Today→tomorrow ·
 * This Week→next week · This Month→next month). Weeks are Monday-start.
 */
export type PlanScope = 'today' | 'week' | 'month';

export const PLAN_SCOPES: ReadonlyArray<{ value: PlanScope; label: string; inScopeLabel: string; upcomingLabel: string }> = [
  { value: 'today', label: 'Today', inScopeLabel: 'Today', upcomingLabel: 'Tomorrow' },
  { value: 'week', label: 'This Week', inScopeLabel: 'This week', upcomingLabel: 'Next week' },
  { value: 'month', label: 'This Month', inScopeLabel: 'This month', upcomingLabel: 'Next month' },
] as const;

export interface ScopeWindows {
  today: string;
  inScopeEnd: string;
  upcomingStart: string;
  upcomingEnd: string;
}

export function computeScopeWindows(scope: PlanScope, now = new Date()): ScopeWindows {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayStr = localDateString(today);
  if (scope === 'today') {
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const tomorrowStr = localDateString(tomorrow);
    return { today: todayStr, inScopeEnd: todayStr, upcomingStart: tomorrowStr, upcomingEnd: tomorrowStr };
  }
  if (scope === 'week') {
    const mondayOffset = (today.getDay() + 6) % 7; // days since Monday (0=Sun→6)
    const weekEnd = new Date(today);
    weekEnd.setDate(today.getDate() - mondayOffset + 6); // this week's Sunday
    const nextStart = new Date(weekEnd);
    nextStart.setDate(weekEnd.getDate() + 1);
    const nextEnd = new Date(weekEnd);
    nextEnd.setDate(weekEnd.getDate() + 7);
    return { today: todayStr, inScopeEnd: localDateString(weekEnd), upcomingStart: localDateString(nextStart), upcomingEnd: localDateString(nextEnd) };
  }
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const nextStart = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  const nextEnd = new Date(today.getFullYear(), today.getMonth() + 2, 0);
  return { today: todayStr, inScopeEnd: localDateString(monthEnd), upcomingStart: localDateString(nextStart), upcomingEnd: localDateString(nextEnd) };
}

export interface PlanBuckets {
  overdue: PlanItem[];
  inScope: PlanItem[];
  upcoming: PlanItem[];
  later: PlanItem[];
  someday: PlanItem[];
  completed: PlanItem[];
}

/**
 * Bucket the unified plan for a scope. **Total** — every item lands in exactly
 * one bucket, so nothing is ever stranded (the README "never strand a To-Do"
 * invariant): completed → completed; undated → someday; past-due → overdue
 * (pinned by the panel); within scope → inScope; the next period → upcoming;
 * anything further out → later. In-scope and Upcoming windows are contiguous, so
 * `later` is simply "beyond Upcoming."
 */
export function bucketPlanItems(items: readonly PlanItem[], scope: PlanScope, now = new Date()): PlanBuckets {
  const windows = computeScopeWindows(scope, now);
  const buckets: PlanBuckets = { overdue: [], inScope: [], upcoming: [], later: [], someday: [], completed: [] };
  for (const item of items) {
    if (item.status === 'completed') buckets.completed.push(item);
    else if (item.date === null) buckets.someday.push(item);
    else if (item.date < windows.today) buckets.overdue.push(item);
    else if (item.date <= windows.inScopeEnd) buckets.inScope.push(item);
    else if (item.date <= windows.upcomingEnd) buckets.upcoming.push(item);
    else buckets.later.push(item);
  }
  const byDate = (a: PlanItem, b: PlanItem) =>
    `${a.date ?? ''}T${a.time ?? '23:59'}`.localeCompare(`${b.date ?? ''}T${b.time ?? '23:59'}`);
  buckets.overdue.sort(byDate);
  buckets.inScope.sort(byDate);
  buckets.upcoming.sort(byDate);
  buckets.later.sort(byDate);
  buckets.completed.sort((a, b) => byDate(b, a)); // most recent first
  return buckets;
}

export function newTaskIdempotencyKey(prefix = 'task'): string {
  const random = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}:${random}`;
}
