import { useMemo, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, TextInput, View, useWindowDimensions } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Button } from '@/components/ui/Button';
import { DatePicker, type DatePickerDensity } from '@/components/ui/DatePicker';
import { Modal } from '@/components/ui/Modal';
import { OverflowMenu, type OverflowAction } from '@/components/ui/OverflowMenu';
import { Typography } from '@/components/ui/Typography';
import { RADIUS, SPACE, TYPE } from '@/constants/design';
import type { GoalMilestone, GoalStatus } from '@/features/goals/types';
import { useThemeColors } from '@/store/uiStore';
import { useGoalTasks } from '../hooks/useGoalTasks';
import type { Task, TaskCompletionMode, TaskOccurrence, TaskScheduleInput } from '../types';
import {
  activeTaskSchedule,
  bucketPlanItems,
  buildPlanItems,
  dateInTimeZone,
  newTaskIdempotencyKey,
  PLAN_SCOPES,
  scheduleLabel,
  shortDate,
  TASK_WEEKDAYS,
  type PlanItem,
  type PlanScope,
  type WeekdayCell,
} from '../utils';

function TaskRow({
  task,
  occurrence,
  readOnly,
  onComplete,
  onAdjust,
  onEdit,
  onArchive,
  showNextDate,
}: {
  task: Task;
  occurrence: Task['occurrences'][number];
  readOnly: boolean;
  onComplete: (completed: boolean) => void;
  onAdjust: (delta: number) => void;
  onEdit: () => void;
  onArchive?: () => void;
  showNextDate?: boolean;
}) {
  const colors = useThemeColors();
  const completed = occurrence.status === 'completed';
  // "next <date>" only means something for a repeating Task; a one-time Task's
  // date is already carried by its "Expire <date>" label, so don't repeat it.
  const recurring = task.schedules.some((schedule) => schedule.isActive);
  const nextDate = showNextDate && recurring ? shortDate(occurrence.scheduledLocalDate) : '';
  const binary = task.completionMode === 'binary';
  const quantity = occurrence.actualQuantity ?? task.legacyCurrentValue ?? 0;
  const mutationDisabled = readOnly || task.status === 'archived';
  const rowActions: OverflowAction[] = [];
  if (!readOnly && task.status === 'active') {
    rowActions.push({ key: 'edit', label: 'Edit', onPress: onEdit });
    if (onArchive) rowActions.push({ key: 'archive', label: 'Archive', destructive: true, onPress: onArchive });
  }
  return (
    <View style={{ borderBottomColor: colors.border.divider, borderBottomWidth: 1, paddingVertical: SPACE.lg }}>
      <View style={{ alignItems: 'center', flexDirection: 'row', gap: SPACE.lg }}>
        <Pressable
          accessibilityLabel={completed ? `Mark ${task.title} incomplete` : `Complete ${task.title}`}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: completed, disabled: mutationDisabled || !binary }}
          disabled={mutationDisabled || !binary}
          onPress={() => binary && onComplete(!completed)}
          style={{
            alignItems: 'center',
            backgroundColor: completed ? colors.accent.primary : 'transparent',
            borderColor: completed ? colors.accent.primary : colors.border.input,
            borderRadius: RADIUS.round,
            borderWidth: 1.5,
            height: 26,
            justifyContent: 'center',
            width: 26,
          }}
        >
          {completed ? <Ionicons color={colors.text.inverse} name="checkmark" size={16} /> : null}
        </Pressable>
        <Pressable accessibilityRole="button" disabled={readOnly || task.status !== 'active'} onPress={onEdit} style={{ flex: 1 }}>
          <Typography variant="emphasis-sm" style={completed ? { color: colors.text.muted } : undefined}>{task.title}</Typography>
          <Typography variant="caption" style={{ marginTop: 2 }}>
            {scheduleLabel(task)}{nextDate ? ` · next ${nextDate}` : ''}{task.milestoneId ? ' · Linked milestone' : ''}
          </Typography>
        </Pressable>
        {task.completionMode === 'quantity' ? (
          <View style={{ alignItems: 'center', flexDirection: 'row', gap: SPACE.md }}>
            <Pressable disabled={mutationDisabled || quantity <= 0} onPress={() => onAdjust(-1)} style={{ padding: SPACE.md }}>
              <Ionicons color={colors.text.secondary} name="remove" size={18} />
            </Pressable>
            <Typography variant="emphasis-sm">
              {quantity}{task.targetQuantity ? ` / ${task.targetQuantity}` : ''}{task.quantityUnit ? ` ${task.quantityUnit}` : ''}
            </Typography>
            <Pressable disabled={mutationDisabled} onPress={() => onAdjust(1)} style={{ padding: SPACE.md }}>
              <Ionicons color={colors.text.accent} name="add" size={18} />
            </Pressable>
          </View>
        ) : null}
        {rowActions.length ? <OverflowMenu accessibilityLabel={`Actions for ${task.title}`} actions={rowActions} size={28} /> : null}
      </View>
    </View>
  );
}

function Choice({ active, children, onPress }: { active: boolean; children: string; onPress: () => void }) {
  const colors = useThemeColors();
  return (
    <Pressable
      onPress={onPress}
      style={{
        backgroundColor: active ? colors.background.selectedRow : colors.background.input,
        borderColor: active ? colors.border.accent : colors.border.input,
        borderRadius: RADIUS.round,
        borderWidth: 1,
        paddingHorizontal: SPACE.lg,
        paddingVertical: SPACE.md,
      }}
    >
      <Typography variant="caption" style={{ color: active ? colors.text.accent : colors.text.secondary }}>{children}</Typography>
    </Pressable>
  );
}

const ALL_WEEKDAYS = TASK_WEEKDAYS.map((day) => day.value);

/** Header summary for the collapsed Schedule section. */
function scheduleSummary(weekdays: readonly number[]): string {
  if (weekdays.length === 0) return 'Once';
  if (weekdays.length === TASK_WEEKDAYS.length) return 'Every day';
  return TASK_WEEKDAYS.filter((day) => weekdays.includes(day.value)).map((day) => day.short).join(' · ');
}

function TaskForm({
  goalId,
  milestones,
  task,
  initialPreset,
  deadlineDensity,
  visible,
  onClose,
  onCreate,
  onUpdate,
  onReplaceSchedule,
  onArchive,
}: {
  goalId: string;
  milestones: readonly GoalMilestone[];
  task: Task | null;
  /** New-Task seed: 'reminder' opens the form pre-set to a daily (every-day) recurrence. */
  initialPreset: 'task' | 'reminder';
  /** Cross-goal deadline density for the deadline picker's amber ramp. */
  deadlineDensity?: DatePickerDensity;
  visible: boolean;
  onClose: () => void;
  onCreate: ReturnType<typeof useGoalTasks>['create'];
  onUpdate: ReturnType<typeof useGoalTasks>['update'];
  onReplaceSchedule: ReturnType<typeof useGoalTasks>['replaceSchedule'];
  onArchive: ReturnType<typeof useGoalTasks>['archive'];
}) {
  const colors = useThemeColors();
  const isReminder = !task && initialPreset === 'reminder';
  const activeSchedule = task ? activeTaskSchedule(task) : null;
  // A weekly_count ("N×/week") Task can't be re-authored through the weekday strip
  // (its empty weekdays read as "Once"), so the form treats it read-only: title +
  // milestone editable, frequency shown as a note, and save never touches the
  // schedule. Editing the frequency itself is deferred (TM-6 Phase 3 scope).
  const isWeeklyCount = activeSchedule?.recurrenceKind === 'weekly_count';
  // Preserve an existing `intervalCount` (e.g. a legacy every-2-weeks schedule) —
  // the form no longer authors it, but saving must not silently reset it.
  const preservedIntervalCount = activeSchedule?.intervalCount ?? 1;
  // The weekday strip IS the schedule: no days = a one-time Task ("Once"), all
  // seven = daily, some = weekly on those days (that many times a week). Map an
  // existing Task back onto it; a new Reminder presets to every day, a new Task
  // to "Once".
  const initialWeekdays = activeSchedule
    ? activeSchedule.recurrenceKind === 'daily' ? ALL_WEEKDAYS : activeSchedule.weekdays
    : isReminder ? ALL_WEEKDAYS : [];
  const [title, setTitle] = useState(task?.title ?? '');
  const [target, setTarget] = useState(task?.targetQuantity?.toString() ?? '');
  const [unit, setUnit] = useState(task?.quantityUnit ?? '');
  const [weekdays, setWeekdays] = useState<number[]>([...initialWeekdays]);
  const [startDate, setStartDate] = useState(activeSchedule?.startDate ?? '');
  // One "Deadline" field: a recurring schedule's end date, or a one-time Task's due date.
  const [deadline, setDeadline] = useState(activeSchedule?.endDate ?? task?.dueDate ?? '');
  const [milestoneId, setMilestoneId] = useState(task?.milestoneId ?? '');
  // Schedule + the optional count/deadline/milestone collapse into title-like
  // section headers. On edit, expand what already carries data so it's visible.
  const [showSchedule, setShowSchedule] = useState(Boolean(activeSchedule));
  const [showMore, setShowMore] = useState(
    Boolean(task)
    && Boolean(task?.milestoneId || task?.targetQuantity != null || task?.quantityUnit || task?.dueDate || activeSchedule?.endDate || activeSchedule?.startDate),
  );
  const [showMilestones, setShowMilestones] = useState(Boolean(task?.milestoneId));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const inputStyle = { ...TYPE.bodySmall, backgroundColor: colors.background.input, borderColor: colors.border.input, borderRadius: RADIUS.sm, borderWidth: 1, color: colors.text.primary, padding: SPACE.lg };

  const everyDayActive = weekdays.length === TASK_WEEKDAYS.length;
  const toggleDay = (value: number) =>
    setWeekdays((current) => (current.includes(value) ? current.filter((day) => day !== value) : [...current, value]));
  const toggleEveryDay = () => setWeekdays(everyDayActive ? [] : [...ALL_WEEKDAYS]);

  async function save() {
    const parsedTarget = target.trim() ? Number(target) : null;
    if (!title.trim()) return setError('Give this Task a short name.');
    if (task && isWeeklyCount) {
      // Frequency is read-only here: preserve the weekly_count schedule + counter
      // target untouched and save only title/milestone. Never call
      // onReplaceSchedule — that would drop the schedule (empty weekdays = "Once").
      setSaving(true);
      const ok = await onUpdate(task.id, {
        title: title.trim(),
        completionMode: 'quantity',
        targetQuantity: task.targetQuantity,
        quantityUnit: task.quantityUnit,
        dueDate: null,
        milestoneId: milestoneId || null,
      });
      setSaving(false);
      if (ok) onClose();
      return;
    }
    if (parsedTarget !== null && (!Number.isFinite(parsedTarget) || parsedTarget <= 0)) {
      return setError('A count must be a positive number, or leave it blank.');
    }
    // Completion mode is inferred: any count/units makes it a counter, otherwise a
    // simple check-off (there is no separate mode toggle). The weekday strip is the
    // schedule — no days = a one-time Task (deadline is its due date), all seven =
    // daily, some = weekly on those days until the deadline.
    const hasQuantity = target.trim() !== '' || unit.trim() !== '';
    const mode: TaskCompletionMode = hasQuantity ? 'quantity' : 'binary';
    const isRecurring = weekdays.length > 0;
    const deadlineValue = deadline.trim() ? deadline.trim() : null;
    const onceDueDate = isRecurring ? null : deadlineValue;
    const schedule: TaskScheduleInput | null = isRecurring
      ? {
          recurrenceKind: everyDayActive ? 'daily' : 'weekly',
          intervalCount: everyDayActive ? 1 : preservedIntervalCount,
          weekdays: everyDayActive ? [] : weekdays,
          startDate: startDate || null,
          endDate: deadlineValue,
          localTime: null,
        }
      : null;
    setSaving(true);
    const input = {
      title: title.trim(),
      completionMode: mode,
      targetQuantity: mode === 'quantity' ? parsedTarget : null,
      quantityUnit: mode === 'quantity' ? (unit.trim() || null) : null,
      dueDate: onceDueDate,
      milestoneId: milestoneId || null,
    };
    let ok: boolean;
    if (task) {
      ok = await onUpdate(task.id, input);
      if (ok) {
        ok = await onReplaceSchedule(task.id, schedule, onceDueDate, newTaskIdempotencyKey('schedule'));
      }
    } else {
      ok = await onCreate({ goalId, ...input, idempotencyKey: newTaskIdempotencyKey('create'), schedule });
    }
    setSaving(false);
    if (ok) onClose();
  }

  async function archive() {
    if (!task) return;
    setSaving(true);
    const ok = await onArchive(task.id);
    setSaving(false);
    if (ok) onClose();
  }

  const heading = task ? 'Edit Task' : isReminder ? 'Add Reminder' : 'Add Task';
  const submitLabel = saving ? 'Saving…' : task ? 'Save' : isReminder ? 'Add Reminder' : 'Add Task';

  return (
    <Modal visible={visible} onClose={onClose} closeDisabled={saving} contentStyle={{ maxHeight: '90%', maxWidth: 620, width: '94%' }}>
      <ScrollView contentContainerStyle={{ gap: SPACE.lg }} keyboardShouldPersistTaps="handled">
        <Typography variant="heading" style={{ fontSize: 24 }}>{heading}</Typography>
        <TextInput accessibilityLabel="Task title" onChangeText={setTitle} placeholder={isReminder ? 'What do you want to be reminded of?' : 'What do you want to do?'} placeholderTextColor={colors.text.muted} style={inputStyle} value={title} />

        {isWeeklyCount ? (
          <View style={{ gap: SPACE.xs }}>
            <Typography variant="field-label">Schedule</Typography>
            <Typography variant="caption" style={{ color: colors.text.secondary }}>
              Repeats {activeSchedule?.targetCount ?? 0}×/week. Changing the frequency here is coming soon — for now, archive and re-add to adjust it.
            </Typography>
          </View>
        ) : (
          <>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded: showSchedule }}
              onPress={() => setShowSchedule((value) => !value)}
              style={{ alignItems: 'center', flexDirection: 'row', gap: SPACE.sm, justifyContent: 'space-between', minHeight: 40 }}
            >
              <View style={{ alignItems: 'center', flexDirection: 'row', gap: SPACE.xs }}>
                <Ionicons color={colors.text.accent} name={showSchedule ? 'chevron-down' : 'chevron-forward'} size={16} />
                <Typography variant="field-label">Schedule</Typography>
              </View>
              <Typography variant="caption" style={{ color: colors.text.secondary }}>{scheduleSummary(weekdays)}</Typography>
            </Pressable>
            {showSchedule ? (
              <View style={{ gap: SPACE.sm }}>
                <ScrollView
                  contentContainerStyle={{ alignItems: 'center', flexDirection: 'row', gap: SPACE.sm }}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                >
                  {TASK_WEEKDAYS.map((day) => (
                    <Choice key={day.value} active={weekdays.includes(day.value)} onPress={() => toggleDay(day.value)}>
                      {day.short}
                    </Choice>
                  ))}
                  <Choice active={everyDayActive} onPress={toggleEveryDay}>Every day</Choice>
                </ScrollView>
                <Typography variant="caption" style={{ color: colors.text.muted }}>
                  No days = a one-time task. Pick one day to repeat weekly on it; pick several for that many times a week. Add a deadline below to set how long it runs.
                </Typography>
              </View>
            ) : null}
          </>
        )}

        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: showMore }}
          onPress={() => setShowMore((value) => !value)}
          style={{ alignItems: 'center', flexDirection: 'row', gap: SPACE.xs, minHeight: 36 }}
        >
          <Ionicons color={colors.text.accent} name={showMore ? 'chevron-down' : 'chevron-forward'} size={14} />
          <Typography variant="caption" style={{ color: colors.text.accent }}>More options</Typography>
        </Pressable>
        {showMore ? (
          <View style={{ gap: SPACE.lg }}>
            {!isWeeklyCount ? (
              <>
                <View style={{ gap: SPACE.xs }}>
                  <View style={{ flexDirection: 'row', gap: SPACE.md }}>
                    <TextInput accessibilityLabel="Count" keyboardType="numeric" onChangeText={setTarget} placeholder="Quantity" placeholderTextColor={colors.text.muted} style={[inputStyle, { flex: 1 }]} value={target} />
                    <TextInput accessibilityLabel="Units" onChangeText={setUnit} placeholder="Units" placeholderTextColor={colors.text.muted} style={[inputStyle, { flex: 1 }]} value={unit} />
                  </View>
                  <Typography variant="caption">Optional — add a count and units to track a number; leave blank for a simple check-off.</Typography>
                </View>
                <View style={{ alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.md }}>
                  {weekdays.length > 0 ? (
                    <DatePicker accessibilityLabel="Start date" allowClear compact onChange={setStartDate} placeholder="Start date" value={startDate} />
                  ) : null}
                  <DatePicker accessibilityLabel="Deadline" allowClear compact density={deadlineDensity} minimumDate={startDate || undefined} onChange={setDeadline} placeholder="Deadline" value={deadline} />
                </View>
              </>
            ) : null}
            {milestones.length ? (
              <>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ expanded: showMilestones }}
                  onPress={() => setShowMilestones((value) => !value)}
                  style={{ alignItems: 'center', flexDirection: 'row', gap: SPACE.xs, minHeight: 36 }}
                >
                  <Ionicons color={colors.text.accent} name={showMilestones ? 'chevron-down' : 'chevron-forward'} size={14} />
                  <Typography variant="caption" style={{ color: colors.text.accent }}>Link a milestone (optional)</Typography>
                </Pressable>
                {showMilestones ? (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.md }}>
                    <Choice active={!milestoneId} onPress={() => setMilestoneId('')}>None</Choice>
                    {milestones.filter((item) => !item.completedAt).map((item) => <Choice key={item.id} active={milestoneId === item.id} onPress={() => setMilestoneId(item.id)}>{item.title}</Choice>)}
                  </View>
                ) : null}
              </>
            ) : null}
          </View>
        ) : null}
        {error ? <Typography variant="caption" style={{ color: colors.feedback.danger.text }}>{error}</Typography> : null}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: SPACE.md }}>
          {task ? <Button disabled={saving} onPress={() => void archive()} size="compact" variant="secondary">Archive</Button> : <View />}
          <Button disabled={saving} onPress={() => void save()} size="compact">{submitLabel}</Button>
        </View>
      </ScrollView>
    </Modal>
  );
}

const TIME_PATTERN = /^([01]?\d|2[0-3]):[0-5]\d$/;

/** A single To-Do checklist row: check off (strikes through), rename, retime, delete. */
function ToDoRow({
  task,
  occurrence,
  readOnly,
  deadlineDensity,
  onToggle,
  onRename,
  onChangeSchedule,
  onDelete,
}: {
  task: Task;
  occurrence: TaskOccurrence | null;
  readOnly: boolean;
  deadlineDensity?: DatePickerDensity;
  onToggle: (complete: boolean) => void;
  onRename: (title: string) => void;
  onChangeSchedule: (dueDate: string | null, dueTime: string | null) => void;
  onDelete: () => void;
}) {
  const colors = useThemeColors();
  const currentTime = occurrence?.scheduledLocalTime ? occurrence.scheduledLocalTime.slice(0, 5) : '';
  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState(task.title);
  const [editingWhen, setEditingWhen] = useState(false);
  const [dateDraft, setDateDraft] = useState(task.dueDate ?? '');
  const [timeDraft, setTimeDraft] = useState(currentTime);
  const [whenError, setWhenError] = useState<string | null>(null);
  // Web hover preview: hovering a To-Do strikes it through as an affordance for
  // "click to complete" (there is no checkbox). On touch there is no hover, so a
  // tap toggles completion directly.
  const [hovered, setHovered] = useState(false);
  const completed = occurrence?.status === 'completed';
  const meta = [task.dueDate ? `By ${shortDate(task.dueDate)}` : null, currentTime || null].filter(Boolean).join(' · ');
  const inputStyle = { ...TYPE.bodySmall, backgroundColor: colors.background.input, borderColor: colors.border.input, borderRadius: RADIUS.sm, borderWidth: 1, color: colors.text.primary, padding: SPACE.md };

  const commitRename = () => {
    const next = draft.trim();
    if (next && next !== task.title) onRename(next);
    setRenaming(false);
  };

  const openWhen = () => {
    setDateDraft(task.dueDate ?? '');
    setTimeDraft(currentTime);
    setWhenError(null);
    setEditingWhen(true);
  };
  const saveWhen = () => {
    const rawTime = timeDraft.trim();
    if (rawTime && !TIME_PATTERN.test(rawTime)) {
      setWhenError('Enter a time as HH:MM (24-hour), or leave it blank.');
      return;
    }
    const normalizedTime = rawTime ? rawTime.padStart(5, '0') : null;
    onChangeSchedule(dateDraft.trim() || null, normalizedTime);
    setEditingWhen(false);
  };

  if (renaming) {
    return (
      <View style={{ alignItems: 'center', borderBottomColor: colors.border.divider, borderBottomWidth: 1, flexDirection: 'row', gap: SPACE.md, paddingVertical: SPACE.md }}>
        <TextInput accessibilityLabel="Edit to-do" autoFocus onChangeText={setDraft} onSubmitEditing={commitRename} placeholder="To-do" placeholderTextColor={colors.text.muted} style={[inputStyle, { flex: 1 }]} value={draft} />
        <Pressable onPress={commitRename} style={{ minHeight: 36, justifyContent: 'center', paddingHorizontal: SPACE.sm }}>
          <Typography variant="emphasis-sm" style={{ color: colors.text.accent }}>Save</Typography>
        </Pressable>
        <Pressable onPress={() => setRenaming(false)} style={{ minHeight: 36, justifyContent: 'center', paddingHorizontal: SPACE.sm }}>
          <Typography variant="caption" style={{ color: colors.text.secondary }}>Cancel</Typography>
        </Pressable>
      </View>
    );
  }

  const actions: OverflowAction[] = [];
  if (!readOnly) {
    actions.push({ key: 'edit', label: 'Edit', onPress: () => { setDraft(task.title); setRenaming(true); } });
    // A completed one-time Task is no longer 'active', and update_task_v1 only
    // retimes active Tasks — so only offer retiming while the To-Do is open.
    if (!completed) actions.push({ key: 'when', label: meta ? 'Change time' : 'Add a time', onPress: openWhen });
    actions.push({ key: 'delete', label: 'Delete', destructive: true, onPress: onDelete });
  }

  return (
    <View style={{ borderBottomColor: colors.border.divider, borderBottomWidth: 1, paddingVertical: SPACE.md }}>
      <View style={{ alignItems: 'center', flexDirection: 'row', gap: SPACE.md }}>
        <Pressable
          accessibilityLabel={completed ? `Mark ${task.title} not done` : `Complete ${task.title}`}
          accessibilityRole="button"
          accessibilityState={{ checked: completed, disabled: readOnly || !occurrence }}
          disabled={readOnly || !occurrence}
          onHoverIn={() => setHovered(true)}
          onHoverOut={() => setHovered(false)}
          onPress={() => onToggle(!completed)}
          style={{ flex: 1 }}
        >
          {({ pressed }) => {
            const strike = completed || ((hovered || pressed) && !readOnly && !!occurrence);
            return (
              <>
                <Typography
                  variant="emphasis-sm"
                  style={{
                    color: completed ? colors.text.muted : strike ? colors.text.secondary : colors.text.primary,
                    textDecorationLine: strike ? 'line-through' : 'none',
                  }}
                >
                  {task.title}
                </Typography>
                {meta ? <Typography variant="caption" style={{ marginTop: 2 }}>{meta}</Typography> : null}
              </>
            );
          }}
        </Pressable>
        {actions.length ? <OverflowMenu accessibilityLabel={`Actions for ${task.title}`} actions={actions} size={28} /> : null}
      </View>
      {editingWhen ? (
        <View style={{ gap: SPACE.sm, marginLeft: 36, marginTop: SPACE.md }}>
          <View style={{ alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.md }}>
            <DatePicker accessibilityLabel="To-do date" allowClear compact density={deadlineDensity} onChange={setDateDraft} placeholder="Date" value={dateDraft} />
            <TextInput accessibilityLabel="To-do time" onChangeText={setTimeDraft} placeholder="HH:MM" placeholderTextColor={colors.text.muted} style={[inputStyle, { width: 92 }]} value={timeDraft} />
            <Pressable onPress={saveWhen} style={{ justifyContent: 'center', minHeight: 36, paddingHorizontal: SPACE.sm }}>
              <Typography variant="emphasis-sm" style={{ color: colors.text.accent }}>Save</Typography>
            </Pressable>
            <Pressable onPress={() => setEditingWhen(false)} style={{ justifyContent: 'center', minHeight: 36, paddingHorizontal: SPACE.sm }}>
              <Typography variant="caption" style={{ color: colors.text.secondary }}>Cancel</Typography>
            </Pressable>
          </View>
          {whenError ? <Typography variant="caption" style={{ color: colors.feedback.danger.text }}>{whenError}</Typography> : null}
        </View>
      ) : null}
    </View>
  );
}

/** What the unified add-row hands up on submit. The parent maps it to a single
 *  create write: a one-time To-Do (`weekdays` empty — `date` is its due date,
 *  defaulting to today when unset) or a recurring Task (`weekdays` chosen — `date`
 *  is the optional end date). `quantity`/`unit` promote either to a measured Task. */
export interface TodoDraft {
  title: string;
  weekdays: number[];
  everyDay: boolean;
  /** Due date when one-time; recurrence end date when repeating. */
  date: string | null;
  quantity: number | null;
  unit: string | null;
}

/** The single inline add composer (merges the old quick To-Do row and the
 *  recurring-task "+" composer). Type a title, then optionally reveal:
 *  a repeat strip (M T W T F S S — makes it a recurring weekly/daily Task) and a
 *  units toggle (Qty + Units — makes it a measured Task). One calendar picker
 *  doubles as the due date (one-time) or the optional end date (repeating). All
 *  choices commit in one create write. Always open under the Tasks header (no
 *  reveal button); the whole composer resets after each add (title, date, repeat,
 *  and units) so it never leaves prefilled data behind. */
function ToDoAddRow({
  onAdd,
  autoFocus = false,
  deadlineDensity,
  onClose,
}: {
  onAdd: (draft: TodoDraft) => Promise<void>;
  autoFocus?: boolean;
  deadlineDensity?: DatePickerDensity;
  onClose?: () => void;
}) {
  const colors = useThemeColors();
  const [draft, setDraft] = useState('');
  const [date, setDate] = useState('');
  const [showRepeat, setShowRepeat] = useState(false);
  const [weekdays, setWeekdays] = useState<number[]>([]);
  const [showUnits, setShowUnits] = useState(false);
  const [qty, setQty] = useState('');
  const [unit, setUnit] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recurring = weekdays.length > 0;
  const everyDay = weekdays.length === TASK_WEEKDAYS.length;
  const toggleDay = (value: number) =>
    setWeekdays((current) => (current.includes(value) ? current.filter((day) => day !== value) : [...current, value]));
  const toggleEveryDay = () => setWeekdays(everyDay ? [] : TASK_WEEKDAYS.map((day) => day.value));
  const iconButton = (active: boolean) => ({
    alignItems: 'center' as const,
    borderColor: active ? colors.accent.primary : colors.border.input,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    height: 34,
    justifyContent: 'center' as const,
    width: 34,
  });
  const inputStyle = { ...TYPE.bodySmall, backgroundColor: colors.background.input, borderColor: colors.border.input, borderRadius: RADIUS.sm, borderWidth: 1, color: colors.text.primary, padding: SPACE.md };
  // Suppress the app-wide green :focus-visible outline for this always-open
  // composer's fields (inline outline:none beats the global.css rule on web).
  const noFocusRing = (Platform.OS === 'web' ? { outlineStyle: 'none' } : null) as object | null;
  const submit = async () => {
    const title = draft.trim();
    if (!title || submitting) return;
    let quantity: number | null = null;
    if (showUnits && qty.trim()) {
      const parsed = Number(qty);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        setError('A count must be a positive number.');
        return;
      }
      quantity = parsed;
    }
    setError(null);
    setSubmitting(true);
    try {
      await onAdd({
        title,
        weekdays,
        everyDay,
        date: date || null,
        quantity,
        unit: showUnits ? (unit.trim() || null) : null,
      });
      // Full reset after each add so the inline editor never leaves prefilled
      // data behind — title, date, repeat, and units all clear.
      setDraft('');
      setDate('');
      setWeekdays([]);
      setShowRepeat(false);
      setQty('');
      setUnit('');
      setShowUnits(false);
      setError(null);
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <View style={{ gap: SPACE.sm, paddingVertical: SPACE.sm }}>
      <View style={{ alignItems: 'center', flexDirection: 'row', gap: SPACE.md }}>
        <TextInput
          accessibilityLabel="Add a to-do"
          autoFocus={autoFocus}
          blurOnSubmit={false}
          onChangeText={setDraft}
          onSubmitEditing={() => void submit()}
          placeholder="＋ Add a to-do…"
          placeholderTextColor={colors.text.muted}
          returnKeyType="done"
          style={[{ ...TYPE.bodySmall, color: colors.text.primary, flex: 1, paddingVertical: SPACE.sm }, noFocusRing]}
          value={draft}
        />
        {submitting ? (
          <ActivityIndicator color={colors.accent.primary} size="small" />
        ) : draft.trim() ? (
          <Pressable accessibilityLabel="Save to-do" onPress={() => void submit()} style={{ minHeight: 36, justifyContent: 'center', paddingHorizontal: SPACE.sm }}>
            <Typography variant="emphasis-sm" style={{ color: colors.text.accent }}>Add</Typography>
          </Pressable>
        ) : onClose ? (
          <Pressable accessibilityLabel="Done adding to-dos" onPress={onClose} style={{ minHeight: 36, justifyContent: 'center', paddingHorizontal: SPACE.sm }}>
            <Typography variant="caption" style={{ color: colors.text.secondary }}>Done</Typography>
          </Pressable>
        ) : null}
      </View>
      {/* Control row: due/end date, a repeat toggle (reveals the weekday strip),
          and a units toggle (reveals Qty + Units). */}
      <View style={{ alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm }}>
        <DatePicker
          accessibilityLabel={recurring ? 'End date' : 'Due date'}
          allowClear
          compact
          density={deadlineDensity}
          onChange={setDate}
          placeholder={recurring ? 'Ends (optional)' : 'Pick a date'}
          value={date}
        />
        <Pressable
          accessibilityLabel="Repeat on days"
          accessibilityRole="button"
          onPress={() => setShowRepeat((current) => !current)}
          style={iconButton(showRepeat || recurring)}
        >
          <Ionicons color={showRepeat || recurring ? colors.text.accent : colors.text.secondary} name="repeat" size={18} />
        </Pressable>
        <Pressable
          accessibilityLabel="Units"
          accessibilityRole="button"
          onPress={() => setShowUnits((current) => !current)}
          style={iconButton(showUnits)}
        >
          <Ionicons color={showUnits ? colors.text.accent : colors.text.secondary} name="calculator-outline" size={18} />
        </Pressable>
      </View>
      {showRepeat ? (
        <ScrollView
          contentContainerStyle={{ alignItems: 'center', flexDirection: 'row', gap: SPACE.sm }}
          horizontal
          showsHorizontalScrollIndicator={false}
        >
          {TASK_WEEKDAYS.map((day) => (
            <Choice key={day.value} active={weekdays.includes(day.value)} onPress={() => toggleDay(day.value)}>{day.short}</Choice>
          ))}
          <Choice active={everyDay} onPress={toggleEveryDay}>Every day</Choice>
        </ScrollView>
      ) : null}
      {showUnits ? (
        <View style={{ alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm }}>
          <TextInput accessibilityLabel="Count" keyboardType="numeric" maxLength={10} onChangeText={setQty} placeholder="Qty" placeholderTextColor={colors.text.muted} style={[inputStyle, { flexGrow: 0, width: 72 }, noFocusRing]} value={qty} />
          <TextInput accessibilityLabel="Unit label" maxLength={10} onChangeText={setUnit} placeholder="Units" placeholderTextColor={colors.text.muted} style={[inputStyle, { flexGrow: 0, width: 84 }, noFocusRing]} value={unit} />
        </View>
      ) : null}
      {error ? <Typography variant="caption" style={{ color: colors.feedback.danger.text }}>{error}</Typography> : null}
    </View>
  );
}

/** A set-days weekly Metric shown as one weekly strip: the chosen weekdays, each
 *  struck through as its day is completed, plus a derived "done / chosen days"
 *  counter (distinct from the quantity counter). A check-off (binary) Task
 *  toggles a day on tap; a measured (quantity) Task discloses a per-day `+/-`
 *  stepper below the strip so each day logs its own number — the day completes
 *  when its target is met. */
function WeekAggregateRow({
  task,
  cells,
  progress,
  quantity,
  readOnly,
  onEdit,
  onToggleDay,
  onAdjustDay,
}: {
  task: Task;
  cells: readonly WeekdayCell[];
  progress: { done: number; target: number };
  /** Present for a measured set-days Task; null for a plain check-off. */
  quantity: { target: number | null; unit: string | null } | null;
  readOnly: boolean;
  onEdit: () => void;
  onToggleDay: (occurrenceId: string, complete: boolean) => void;
  onAdjustDay: (occurrenceId: string, delta: number) => void;
}) {
  const colors = useThemeColors();
  const measured = quantity != null;
  const [selectedWeekday, setSelectedWeekday] = useState<number | null>(null);
  const rowActions: OverflowAction[] = [];
  if (!readOnly && task.status === 'active') rowActions.push({ key: 'edit', label: 'Edit', onPress: onEdit });
  const selectedCell = measured && selectedWeekday != null ? cells.find((cell) => cell.weekday === selectedWeekday) ?? null : null;
  return (
    <View style={{ borderBottomColor: colors.border.divider, borderBottomWidth: 1, gap: SPACE.md, paddingVertical: SPACE.lg }}>
      <View style={{ alignItems: 'center', flexDirection: 'row', gap: SPACE.md }}>
        <Pressable accessibilityRole="button" disabled={readOnly || task.status !== 'active'} onPress={onEdit} style={{ flex: 1 }}>
          <Typography variant="emphasis-sm">{task.title}</Typography>
          <Typography variant="caption" style={{ marginTop: 2 }}>
            {scheduleLabel(task)}{measured && quantity?.unit ? ` · ${quantity.unit} each` : ''}{task.milestoneId ? ' · Linked milestone' : ''}
          </Typography>
        </Pressable>
        <Typography variant="emphasis-sm" style={{ color: progress.done >= progress.target ? colors.text.accent : colors.text.primary }}>
          {progress.done} / {progress.target} days
        </Typography>
        {rowActions.length ? <OverflowMenu accessibilityLabel={`Actions for ${task.title}`} actions={rowActions} size={28} /> : null}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm }}>
        {cells.map((cell) => {
          const letter = TASK_WEEKDAYS[cell.weekday - 1].short.slice(0, 1);
          const completed = cell.status === 'completed';
          const missed = cell.status === 'missed';
          const partial = measured && !completed && (cell.quantity ?? 0) > 0; // logged but not yet at target
          const isSelected = measured && selectedWeekday === cell.weekday;
          const interactive = cell.scheduled && !!cell.occurrenceId && !readOnly;
          const border = !cell.scheduled
            ? colors.border.divider
            : completed
              ? colors.accent.primary
              : isSelected || partial
                ? colors.border.accent
                : missed
                  ? colors.feedback.danger.text
                  : colors.border.input;
          const textColor = !cell.scheduled
            ? colors.text.muted
            : completed
              ? colors.text.muted
              : missed
                ? colors.feedback.danger.text
                : colors.text.primary;
          return (
            <Pressable
              accessibilityLabel={`${TASK_WEEKDAYS[cell.weekday - 1].short}${completed ? ' done' : measured ? ' log' : ''}`}
              accessibilityRole="button"
              accessibilityState={{ checked: completed, disabled: !interactive, expanded: isSelected }}
              disabled={!interactive}
              key={cell.weekday}
              onPress={() => {
                if (!cell.occurrenceId) return;
                if (measured) setSelectedWeekday((current) => (current === cell.weekday ? null : cell.weekday));
                else onToggleDay(cell.occurrenceId, !completed);
              }}
              style={{
                alignItems: 'center',
                backgroundColor: completed ? colors.accent.primary : isSelected ? colors.background.selectedRow : 'transparent',
                borderColor: border,
                borderRadius: RADIUS.round,
                borderWidth: 1.5,
                height: 34,
                justifyContent: 'center',
                opacity: cell.scheduled ? 1 : 0.5,
                width: 34,
              }}
            >
              <Typography
                variant="caption"
                style={{
                  color: completed ? colors.text.inverse : textColor,
                  textDecorationLine: completed ? 'line-through' : 'none',
                }}
              >
                {letter}
              </Typography>
            </Pressable>
          );
        })}
      </View>
      {selectedCell && selectedCell.occurrenceId ? (
        <View style={{ alignItems: 'center', flexDirection: 'row', gap: SPACE.md }}>
          <Typography variant="caption" style={{ color: colors.text.secondary }}>{TASK_WEEKDAYS[selectedCell.weekday - 1].short}</Typography>
          <View style={{ alignItems: 'center', flexDirection: 'row', gap: SPACE.md }}>
            <Pressable
              accessibilityLabel={`Log one fewer for ${TASK_WEEKDAYS[selectedCell.weekday - 1].short}`}
              disabled={readOnly || (selectedCell.quantity ?? 0) <= 0}
              onPress={() => onAdjustDay(selectedCell.occurrenceId!, -1)}
              style={{ padding: SPACE.md }}
            >
              <Ionicons color={colors.text.secondary} name="remove" size={18} />
            </Pressable>
            <Typography variant="emphasis-sm">
              {selectedCell.quantity ?? 0}{quantity?.target ? ` / ${quantity.target}` : ''}{quantity?.unit ? ` ${quantity.unit}` : ''}
            </Typography>
            <Pressable
              accessibilityLabel={`Log one more for ${TASK_WEEKDAYS[selectedCell.weekday - 1].short}`}
              disabled={readOnly}
              onPress={() => onAdjustDay(selectedCell.occurrenceId!, 1)}
              style={{ padding: SPACE.md }}
            >
              <Ionicons color={colors.text.accent} name="add" size={18} />
            </Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );
}

export function TasksPanel({
  goalId,
  goalStatus,
  milestones,
  deadlineDensity,
  full = false,
  onSeeAll,
}: {
  goalId: string;
  goalStatus: GoalStatus;
  milestones: readonly GoalMilestone[];
  /**
   * Cross-goal deadline density for the Task deadline picker's amber ramp. Passed
   * in from the goals feature (no cross-feature import) — TasksPanel just forwards
   * it to the DatePicker.
   */
  deadlineDensity?: DatePickerDensity;
  full?: boolean;
  onSeeAll?: () => void;
}) {
  const colors = useThemeColors();
  const { width } = useWindowDimensions();
  const compact = width < 560;
  const taskState = useGoalTasks(goalId);
  const [formVisible, setFormVisible] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);
  // The scope organizer (TM-4): one time-scope selector over the whole panel. Its
  // sections — Overdue (pinned) · In-scope · Upcoming (the next period, TM-5) ·
  // Later · Someday · Completed — are a pure bucketing of the unified To-Do +
  // Metric plan. Switching scope re-runs the bucketer in memory (no fetch).
  const [scope, setScope] = useState<PlanScope>('today');
  const readOnly = goalStatus !== 'active';

  // Unified projection + lookups so the original row components (which take the
  // real Task/occurrence) still render each PlanItem.
  const planItems = useMemo(() => buildPlanItems(taskState.tasks, scope), [taskState.tasks, scope]);
  const buckets = useMemo(() => bucketPlanItems(planItems, scope), [planItems, scope]);
  const taskById = useMemo(() => new Map(taskState.tasks.map((task) => [task.id, task])), [taskState.tasks]);
  const occurrenceById = useMemo(() => {
    const map = new Map<string, TaskOccurrence>();
    for (const task of taskState.tasks) for (const occurrence of task.occurrences) map.set(occurrence.id, occurrence);
    return map;
  }, [taskState.tasks]);

  const openEditForm = (task: Task) => { setEditing(task); setFormVisible(true); };
  // The one create write for the unified add row: repeating (weekdays chosen) →
  // a daily/weekly schedule with the date as an optional end; otherwise a
  // one-time To-Do whose due date defaults to today when left blank. Qty/units
  // promote either to a measured (quantity) Task.
  const addTodo = async (input: TodoDraft) => {
    const mode: TaskCompletionMode = input.quantity !== null || input.unit ? 'quantity' : 'binary';
    const targetQuantity = mode === 'quantity' ? input.quantity : null;
    const quantityUnit = mode === 'quantity' ? input.unit : null;
    if (input.weekdays.length > 0) {
      const schedule: TaskScheduleInput = {
        recurrenceKind: input.everyDay ? 'daily' : 'weekly',
        intervalCount: 1,
        weekdays: input.everyDay ? [] : input.weekdays,
        startDate: null,
        endDate: input.date,
        localTime: null,
      };
      await taskState.create({ goalId, title: input.title, completionMode: mode, targetQuantity, quantityUnit, dueDate: null, idempotencyKey: newTaskIdempotencyKey('create'), schedule });
      return;
    }
    const dueDate = input.date ?? dateInTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone);
    await taskState.create({ goalId, title: input.title, completionMode: mode, targetQuantity, quantityUnit, dueDate, idempotencyKey: newTaskIdempotencyKey('create'), schedule: null });
  };
  const updateTodo = (task: Task, occurrence: TaskOccurrence | null, patch: { title?: string; dueDate?: string | null; dueTime?: string | null }) =>
    void taskState.update(task.id, {
      title: patch.title ?? task.title,
      completionMode: 'binary',
      dueDate: patch.dueDate !== undefined ? patch.dueDate : task.dueDate,
      // Preserve the occurrence's current time on a rename/date-only change —
      // update_task_v1 rewrites scheduled_local_time from p_due_time every call.
      dueTime: patch.dueTime !== undefined
        ? patch.dueTime
        : (occurrence?.scheduledLocalTime ? occurrence.scheduledLocalTime.slice(0, 5) : null),
    });
  const deleteTodo = async (task: Task, occurrence: TaskOccurrence | null) => {
    // Checking a one-time To-Do off flips its Task to status 'complete', but
    // archive only accepts an active Task — so reopen its occurrence first (which
    // returns the Task to 'active'), then archive.
    if (occurrence && occurrence.status === 'completed') {
      const reopened = await taskState.complete(occurrence.id, false, newTaskIdempotencyKey('status'));
      if (!reopened) return;
    }
    await taskState.archive(task.id);
  };

  const scopeMeta = PLAN_SCOPES.find((option) => option.value === scope) ?? PLAN_SCOPES[0];
  const cap = full ? 50 : 6;

  // One unified leaf renderer: a To-Do keeps the strikethrough checklist row, a
  // Metric keeps the counter/check row. The organizer never branches on kind —
  // only this row does. `adjustable` is false for the Completed history collapse.
  const renderPlanRow = (item: PlanItem, showNextDate = false, adjustable = true) => {
    const task = taskById.get(item.taskId);
    if (!task) return null;
    if (item.weekdayCells) {
      return (
        <WeekAggregateRow
          cells={item.weekdayCells}
          key={`week:${item.taskId}`}
          onAdjustDay={(occurrenceId, delta) => void taskState.adjustQuantity(occurrenceId, delta, newTaskIdempotencyKey('quantity'))}
          onEdit={() => openEditForm(task)}
          onToggleDay={(occurrenceId, complete) => void taskState.complete(occurrenceId, complete, newTaskIdempotencyKey('status'))}
          progress={item.progress ?? { done: 0, target: 0 }}
          quantity={task.completionMode === 'quantity' ? { target: task.targetQuantity, unit: task.quantityUnit } : null}
          readOnly={readOnly}
          task={task}
        />
      );
    }
    const occurrence = item.occurrenceId ? occurrenceById.get(item.occurrenceId) ?? null : null;
    if (item.kind === 'todo') {
      return (
        <ToDoRow
          deadlineDensity={deadlineDensity}
          key={item.occurrenceId ?? item.taskId}
          occurrence={occurrence}
          onChangeSchedule={(date, time) => updateTodo(task, occurrence, { dueDate: date, dueTime: time })}
          onDelete={() => void deleteTodo(task, occurrence)}
          onRename={(title) => updateTodo(task, occurrence, { title })}
          onToggle={(complete) => { if (occurrence) void taskState.complete(occurrence.id, complete, newTaskIdempotencyKey('status')); }}
          readOnly={readOnly}
          task={task}
        />
      );
    }
    if (!occurrence) return null;
    return (
      <TaskRow
        key={occurrence.id}
        onAdjust={adjustable ? (delta) => void taskState.adjustQuantity(occurrence.id, delta, newTaskIdempotencyKey('quantity')) : () => {}}
        onArchive={() => void taskState.archive(task.id)}
        onComplete={(complete) => void taskState.complete(occurrence.id, complete, newTaskIdempotencyKey('status'))}
        onEdit={() => openEditForm(task)}
        occurrence={occurrence}
        readOnly={readOnly}
        showNextDate={showNextDate}
        task={task}
      />
    );
  };

  const activeCount = buckets.overdue.length + buckets.inScope.length + buckets.upcoming.length + buckets.later.length + buckets.someday.length;
  const hasVisibleWork = activeCount > 0 || buckets.completed.length > 0;
  const nearTermTodos = buckets.overdue.length + buckets.inScope.length + buckets.upcoming.length;

  return (
    <View style={{ padding: compact ? SPACE.xl : SPACE['3xl'] }}>
      <View style={{ alignItems: 'flex-start', flexDirection: 'row', gap: SPACE.md }}>
        <View style={{ flex: 1 }}>
          <Typography variant="section-eyebrow">Tasks</Typography>
          <Typography variant="title" style={{ marginTop: SPACE.xs }}>Your next meaningful actions</Typography>
        </View>
      </View>
      {readOnly ? <Typography variant="caption" style={{ marginTop: SPACE.md }}>This Goal is historical. Its Tasks remain available as read-only context.</Typography> : null}
      {taskState.error ? <Typography variant="caption" style={{ color: colors.feedback.danger.text, marginTop: SPACE.lg }}>{taskState.error}</Typography> : null}
      {taskState.isLoading ? <ActivityIndicator color={colors.accent.primary} style={{ marginVertical: SPACE['3xl'] }} /> : (
        <View style={{ marginTop: SPACE.xl }}>
          {/* Scope selector — one control over the whole plan (To-Dos + Metrics). */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm }}>
            {PLAN_SCOPES.map((option) => (
              <Choice key={option.value} active={scope === option.value} onPress={() => setScope(option.value)}>{option.label}</Choice>
            ))}
          </View>

          {/* One unified, always-open add row: a quick To-Do that can become a
              recurring and/or measured Task inline (repeat + units toggles). */}
          {!readOnly ? (
            <View style={{ marginTop: SPACE.lg }}>
              <ToDoAddRow deadlineDensity={deadlineDensity} onAdd={addTodo} />
            </View>
          ) : null}
          {Platform.OS !== 'web' && !readOnly && nearTermTodos > 0 ? (
            <Typography variant="caption" style={{ color: colors.text.muted, marginTop: SPACE.md }}>Tap a to-do to mark it done.</Typography>
          ) : null}

          {/* Overdue — pinned, always shown regardless of scope (must surface). */}
          {buckets.overdue.length ? (
            <View style={{ marginTop: SPACE.xl, marginBottom: SPACE.xl }}>
              <Typography variant="eyebrow" style={{ color: colors.feedback.danger.text }}>Overdue</Typography>
              {buckets.overdue.map((item) => renderPlanRow(item))}
            </View>
          ) : null}

          {/* In-scope — the plan for the chosen window. */}
          {buckets.inScope.length ? (
            <View style={{ marginTop: buckets.overdue.length ? 0 : SPACE.xl, marginBottom: SPACE.xl }}>
              <Typography variant="eyebrow">{scopeMeta.inScopeLabel}</Typography>
              {buckets.inScope.slice(0, cap).map((item) => renderPlanRow(item))}
            </View>
          ) : null}

          {/* Upcoming — the next period after the scope (TM-5). */}
          {buckets.upcoming.length ? (
            <View style={{ marginBottom: SPACE.xl }}>
              <Typography variant="eyebrow">{`Upcoming · ${scopeMeta.upcomingLabel}`}</Typography>
              {buckets.upcoming.slice(0, cap).map((item) => renderPlanRow(item, true))}
            </View>
          ) : null}

          {!hasVisibleWork ? (
            <View style={{ alignItems: 'center', paddingVertical: SPACE['4xl'] }}>
              <Ionicons color={colors.text.accent} name="checkmark-circle-outline" size={30} />
              <Typography variant="emphasis-sm" style={{ marginTop: SPACE.md }}>No Tasks here yet.</Typography>
              <Typography variant="caption" style={{ marginTop: SPACE.xs, textAlign: 'center' }}>Add one clear next action to get started.</Typography>
            </View>
          ) : null}

        </View>
      )}
      {buckets.completed.length ? (
        <View style={{ marginTop: SPACE.md }}>
          <Pressable onPress={() => setShowCompleted((value) => !value)} style={{ minHeight: 44, justifyContent: 'center' }}>
            <Typography variant="emphasis-sm" style={{ color: colors.text.accent }}>{showCompleted ? 'Hide completed' : `View completed (${buckets.completed.length})`}</Typography>
          </Pressable>
          {showCompleted ? buckets.completed.slice(0, full ? 50 : 2).map((item) => renderPlanRow(item, false, false)) : null}
        </View>
      ) : null}
      {!full && onSeeAll ? <Pressable onPress={onSeeAll} style={{ alignSelf: 'flex-end', justifyContent: 'center', minHeight: 44 }}><Typography variant="emphasis-sm" style={{ color: colors.text.accent }}>See all →</Typography></Pressable> : null}
      <TaskForm
        key={`${formVisible ? 'open' : 'closed'}:${editing?.id ?? 'new-task'}`}
        deadlineDensity={deadlineDensity}
        goalId={goalId}
        initialPreset="task"
        milestones={milestones}
        onArchive={taskState.archive}
        onClose={() => { setFormVisible(false); setEditing(null); }}
        onCreate={taskState.create}
        onReplaceSchedule={taskState.replaceSchedule}
        onUpdate={taskState.update}
        task={editing}
        visible={formVisible}
      />
    </View>
  );
}
