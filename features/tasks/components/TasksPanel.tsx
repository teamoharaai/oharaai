import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, TextInput, View, useWindowDimensions } from 'react-native';
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
import { activeTaskSchedule, buildTaskSections, newTaskIdempotencyKey, scheduleLabel, shortDate, TASK_WEEKDAYS } from '../utils';

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

function ImportedTaskDefinitionRow({ task, readOnly, onEdit }: { task: Task; readOnly: boolean; onEdit: () => void }) {
  const colors = useThemeColors();
  const baseline = task.legacyCurrentValue !== null
    ? `Imported baseline: ${task.legacyCurrentValue}${task.quantityUnit ? ` ${task.quantityUnit}` : ''}`
    : null;
  const cadence = task.legacyFrequency
    ? `${task.legacyFrequency[0].toUpperCase()}${task.legacyFrequency.slice(1)} timing needs confirmation`
    : 'Choose timing to continue this imported Task';
  return (
    <Pressable
      accessibilityLabel={`Review timing for ${task.title}`}
      accessibilityRole="button"
      disabled={readOnly}
      onPress={onEdit}
      style={{ borderBottomColor: colors.border.divider, borderBottomWidth: 1, paddingVertical: SPACE.lg }}
    >
      <Typography variant="emphasis-sm">{task.title}</Typography>
      <Typography variant="caption" style={{ marginTop: 2 }}>{cadence}{baseline ? ` · ${baseline}` : ''}</Typography>
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
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm }}>
              {TASK_WEEKDAYS.map((day) => (
                <Choice key={day.value} active={weekdays.includes(day.value)} onPress={() => toggleDay(day.value)}>
                  {day.short}
                </Choice>
              ))}
              <Choice active={everyDayActive} onPress={toggleEveryDay}>Every day</Choice>
            </View>
            <Typography variant="caption" style={{ color: colors.text.muted }}>
              No days = a one-time task. Pick one day to repeat weekly on it; pick several for that many times a week. Add a deadline below to set how long it runs.
            </Typography>
          </View>
        ) : null}

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

// A To-Do is a one-time check-off (a user, binary Task with no repeating
// schedule) — the lightweight checklist that replaced Reminders. Recurring Tasks
// and counters live in the lanes below; legacy imports keep their own path.
function isToDoTask(task: Task): boolean {
  return task.source === 'user'
    && task.completionMode === 'binary'
    && task.status !== 'archived'
    && !activeTaskSchedule(task);
}

/** The occurrence a To-Do row acts on: its open one, else its latest completed. */
function todoDisplayOccurrence(task: Task): TaskOccurrence | null {
  const open = task.occurrences.find((item) => item.status === 'pending' || item.status === 'missed');
  if (open) return open;
  const done = task.occurrences
    .filter((item) => item.status === 'completed')
    .sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''));
  return done[0] ?? task.occurrences[0] ?? null;
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
  const completed = occurrence?.status === 'completed';
  const meta = [task.dueDate ? shortDate(task.dueDate) : null, currentTime || null].filter(Boolean).join(' · ');
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
          accessibilityRole="checkbox"
          accessibilityState={{ checked: completed, disabled: readOnly || !occurrence }}
          disabled={readOnly || !occurrence}
          onPress={() => onToggle(!completed)}
          style={{
            alignItems: 'center',
            backgroundColor: completed ? colors.accent.primary : 'transparent',
            borderColor: completed ? colors.accent.primary : colors.border.input,
            borderRadius: RADIUS.round,
            borderWidth: 1.5,
            height: 24,
            justifyContent: 'center',
            width: 24,
          }}
        >
          {completed ? <Ionicons color={colors.text.inverse} name="checkmark" size={15} /> : null}
        </Pressable>
        <View style={{ flex: 1 }}>
          <Typography
            variant="emphasis-sm"
            style={{ color: completed ? colors.text.muted : colors.text.primary, textDecorationLine: completed ? 'line-through' : 'none' }}
          >
            {task.title}
          </Typography>
          {meta ? <Typography variant="caption" style={{ marginTop: 2 }}>{meta}</Typography> : null}
        </View>
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

/** Ghost row at the bottom of the To-Do list to add a new one-time check-off. */
function ToDoAddRow({ onAdd }: { onAdd: (title: string) => Promise<void> }) {
  const colors = useThemeColors();
  const [draft, setDraft] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const submit = async () => {
    const title = draft.trim();
    if (!title || submitting) return;
    setSubmitting(true);
    try {
      await onAdd(title);
      setDraft('');
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <View style={{ alignItems: 'center', flexDirection: 'row', gap: SPACE.md, paddingVertical: SPACE.sm }}>
      <TextInput
        accessibilityLabel="Add a to-do"
        blurOnSubmit={false}
        onChangeText={setDraft}
        onSubmitEditing={() => void submit()}
        placeholder="＋ Add a to-do…"
        placeholderTextColor={colors.text.muted}
        returnKeyType="done"
        style={{ ...TYPE.bodySmall, color: colors.text.primary, flex: 1, paddingVertical: SPACE.sm }}
        value={draft}
      />
      {submitting ? (
        <ActivityIndicator color={colors.accent.primary} size="small" />
      ) : draft.trim() ? (
        <Pressable accessibilityLabel="Save to-do" onPress={() => void submit()} style={{ minHeight: 36, justifyContent: 'center', paddingHorizontal: SPACE.sm }}>
          <Typography variant="emphasis-sm" style={{ color: colors.text.accent }}>Add</Typography>
        </Pressable>
      ) : null}
    </View>
  );
}

/** Inline "Add Task" composer: title + optional count/units, the weekday strip,
 *  and a single deadline. Recurs on the chosen day(s) until the deadline week. */
function InlineTaskComposer({
  goalId,
  deadlineDensity,
  onCreate,
}: {
  goalId: string;
  deadlineDensity?: DatePickerDensity;
  onCreate: ReturnType<typeof useGoalTasks>['create'];
}) {
  const colors = useThemeColors();
  const [title, setTitle] = useState('');
  const [qty, setQty] = useState('');
  const [unit, setUnit] = useState('');
  const [weekdays, setWeekdays] = useState<number[]>([]);
  const [deadline, setDeadline] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Collapsed by default so it stays visually separate from the always-open
  // To-Do list — a bare "＋ Add a task" pill that reveals the full fields on tap.
  const [expanded, setExpanded] = useState(false);
  const inputStyle = { ...TYPE.bodySmall, backgroundColor: colors.background.input, borderColor: colors.border.input, borderRadius: RADIUS.sm, borderWidth: 1, color: colors.text.primary, padding: SPACE.md };
  const collapse = () => {
    setTitle('');
    setQty('');
    setUnit('');
    setWeekdays([]);
    setDeadline('');
    setError(null);
    setExpanded(false);
  };
  const everyDay = weekdays.length === TASK_WEEKDAYS.length;
  const toggleDay = (value: number) =>
    setWeekdays((current) => (current.includes(value) ? current.filter((day) => day !== value) : [...current, value]));

  async function submit() {
    if (!title.trim() || saving) return;
    const parsedTarget = qty.trim() ? Number(qty) : null;
    if (parsedTarget !== null && (!Number.isFinite(parsedTarget) || parsedTarget <= 0)) {
      return setError('A count must be a positive number.');
    }
    const mode: TaskCompletionMode = qty.trim() !== '' || unit.trim() !== '' ? 'quantity' : 'binary';
    const isRecurring = weekdays.length > 0;
    const deadlineValue = deadline.trim() ? deadline.trim() : null;
    const schedule: TaskScheduleInput | null = isRecurring
      ? {
          recurrenceKind: everyDay ? 'daily' : 'weekly',
          intervalCount: 1,
          weekdays: everyDay ? [] : weekdays,
          startDate: null,
          endDate: deadlineValue,
          localTime: null,
        }
      : null;
    setSaving(true);
    const ok = await onCreate({
      goalId,
      title: title.trim(),
      completionMode: mode,
      targetQuantity: mode === 'quantity' ? parsedTarget : null,
      quantityUnit: mode === 'quantity' ? (unit.trim() || null) : null,
      dueDate: isRecurring ? null : deadlineValue,
      idempotencyKey: newTaskIdempotencyKey('create'),
      schedule,
    });
    setSaving(false);
    if (ok) collapse();
  }

  if (!expanded) {
    return (
      <Pressable
        accessibilityLabel="Add a task"
        accessibilityRole="button"
        onPress={() => setExpanded(true)}
        style={({ pressed }) => ({
          alignSelf: 'flex-start',
          borderColor: colors.border.divider,
          borderRadius: RADIUS.md,
          borderStyle: 'dashed',
          borderWidth: 1,
          marginBottom: SPACE.xl,
          opacity: pressed ? 0.7 : 1,
          paddingHorizontal: SPACE.lg,
          paddingVertical: SPACE.md,
        })}
      >
        <Typography variant="emphasis-sm" style={{ color: colors.text.accent }}>＋ Add a task</Typography>
      </Pressable>
    );
  }

  return (
    <View
      style={{
        borderColor: colors.border.divider,
        borderRadius: RADIUS.md,
        borderStyle: 'dashed',
        borderWidth: 1,
        gap: SPACE.md,
        marginBottom: SPACE.xl,
        padding: SPACE.lg,
      }}
    >
      <View style={{ alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.md }}>
        <TextInput accessibilityLabel="Add a task" autoFocus onChangeText={setTitle} onSubmitEditing={() => void submit()} placeholder="＋ Add a task…" placeholderTextColor={colors.text.muted} style={[inputStyle, { flexBasis: 180, flexGrow: 3 }]} value={title} />
        <TextInput accessibilityLabel="Count" keyboardType="numeric" onChangeText={setQty} placeholder="Quantity" placeholderTextColor={colors.text.muted} style={[inputStyle, { flexBasis: 84, flexGrow: 1 }]} value={qty} />
        <TextInput accessibilityLabel="Units" onChangeText={setUnit} placeholder="Units" placeholderTextColor={colors.text.muted} style={[inputStyle, { flexBasis: 84, flexGrow: 1 }]} value={unit} />
      </View>
      <View style={{ alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.md, justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm }}>
          {TASK_WEEKDAYS.map((day) => (
            <Choice key={day.value} active={weekdays.includes(day.value)} onPress={() => toggleDay(day.value)}>{day.short}</Choice>
          ))}
          <Choice active={everyDay} onPress={() => setWeekdays(everyDay ? [] : TASK_WEEKDAYS.map((day) => day.value))}>Every day</Choice>
        </View>
        <View style={{ alignItems: 'center', flexDirection: 'row', gap: SPACE.md }}>
          <DatePicker accessibilityLabel="Deadline" allowClear compact density={deadlineDensity} onChange={setDeadline} placeholder="Deadline" value={deadline} />
          <Pressable accessibilityLabel="Cancel adding a task" onPress={collapse} style={{ justifyContent: 'center', minHeight: 36, paddingHorizontal: SPACE.sm }}>
            <Typography variant="caption" style={{ color: colors.text.secondary }}>Cancel</Typography>
          </Pressable>
          {title.trim() ? (
            <Button disabled={saving} onPress={() => void submit()} size="compact">{saving ? 'Adding…' : 'Add'}</Button>
          ) : null}
        </View>
      </View>
      {error ? <Typography variant="caption" style={{ color: colors.feedback.danger.text }}>{error}</Typography> : null}
      <Typography variant="caption" style={{ color: colors.text.muted }}>
        No days = a one-time to-do above. Pick day(s) to repeat weekly until the deadline; add a count + units to track a number.
      </Typography>
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
  // To-Dos (one-time check-offs) render as their own checklist; recurring Tasks
  // and counters go through the lanes. Partition before building sections so a
  // completed To-Do never also shows in the lanes' "completed" collapse.
  const todoTasks = useMemo(
    () => taskState.tasks.filter(isToDoTask).sort((a, b) => a.sortOrder - b.sortOrder || a.createdAt.localeCompare(b.createdAt)),
    [taskState.tasks],
  );
  const laneTasks = useMemo(() => taskState.tasks.filter((task) => !isToDoTask(task)), [taskState.tasks]);
  const sections = useMemo(() => buildTaskSections(laneTasks), [laneTasks]);
  const importedNeedsTiming = useMemo(() => laneTasks.filter((task) => (
    task.status === 'active'
    && task.source === 'legacy_tracker'
    && !activeTaskSchedule(task)
    && !task.occurrences.some((occurrence) => occurrence.status === 'pending' || occurrence.status === 'missed')
  )), [laneTasks]);
  const readOnly = goalStatus !== 'active';
  const openEditForm = (task: Task) => { setEditing(task); setFormVisible(true); };
  const addTodo = async (title: string) => {
    await taskState.create({ goalId, title, completionMode: 'binary', idempotencyKey: newTaskIdempotencyKey('create'), schedule: null });
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
  // Today / Upcoming lanes (empty lanes are hidden). Daily Tasks never reach
  // Upcoming (TD-021, enforced in buildTaskSections).
  const laneSections = [
    { label: 'Today', rows: sections.today, showNextDate: false },
    { label: 'Upcoming', rows: sections.upcoming.slice(0, full ? 30 : 4), showNextDate: true },
  ].filter((section) => section.rows.length);
  // Completions = the single ad-hoc, day-anchored lane (TD-020). Its backlog tail
  // is the no-schedule (Once) occurrences; imported legacy definitions awaiting
  // timing live here too. Retroactive logging (log_completed_task_v1) is folded
  // into this lane as one entry point, not a separate top-level action.
  const completionRows = sections.anytime.slice(0, full ? 30 : 4);
  const completionDefs = importedNeedsTiming.slice(0, full ? 30 : 4);
  const showCompletionsLane = !readOnly || completionRows.length > 0 || completionDefs.length > 0;
  const hasVisibleWork = laneSections.length > 0 || completionRows.length > 0 || completionDefs.length > 0;

  return (
    <View style={{ padding: compact ? SPACE.xl : SPACE['3xl'] }}>
      <View style={{ flex: 1 }}>
        <Typography variant="section-eyebrow">Tasks</Typography>
        <Typography variant="title" style={{ marginTop: SPACE.xs }}>Your next meaningful actions</Typography>
      </View>
      {readOnly ? <Typography variant="caption" style={{ marginTop: SPACE.md }}>This Goal is historical. Its Tasks remain available as read-only context.</Typography> : null}
      {taskState.error ? <Typography variant="caption" style={{ color: colors.feedback.danger.text, marginTop: SPACE.lg }}>{taskState.error}</Typography> : null}
      {taskState.isLoading ? <ActivityIndicator color={colors.accent.primary} style={{ marginVertical: SPACE['3xl'] }} /> : (
        <View style={{ marginTop: SPACE.xl }}>
          {todoTasks.length > 0 || !readOnly ? (
            <View style={{ marginBottom: SPACE.xl }}>
              <Typography variant="eyebrow">To-Do</Typography>
              {todoTasks.map((task) => {
                const occurrence = todoDisplayOccurrence(task);
                return (
                  <ToDoRow
                    deadlineDensity={deadlineDensity}
                    key={task.id}
                    occurrence={occurrence}
                    onChangeSchedule={(date, time) => updateTodo(task, occurrence, { dueDate: date, dueTime: time })}
                    onDelete={() => void deleteTodo(task, occurrence)}
                    onRename={(title) => updateTodo(task, occurrence, { title })}
                    onToggle={(complete) => { if (occurrence) void taskState.complete(occurrence.id, complete, newTaskIdempotencyKey('status')); }}
                    readOnly={readOnly}
                    task={task}
                  />
                );
              })}
              {!readOnly ? <ToDoAddRow onAdd={addTodo} /> : null}
            </View>
          ) : null}
          {!readOnly ? (
            <InlineTaskComposer deadlineDensity={deadlineDensity} goalId={goalId} onCreate={taskState.create} />
          ) : null}
          {laneSections.map((section) => (
            <View key={section.label} style={{ marginBottom: SPACE.xl }}>
              <Typography variant="eyebrow">{section.label}</Typography>
              {section.rows.map(({ task, occurrence }) => (
                <TaskRow
                  key={occurrence.id}
                  onAdjust={(delta) => void taskState.adjustQuantity(occurrence.id, delta, newTaskIdempotencyKey('quantity'))}
                  onComplete={(complete) => void taskState.complete(occurrence.id, complete, newTaskIdempotencyKey('status'))}
                  onArchive={() => void taskState.archive(task.id)}
                  onEdit={() => openEditForm(task)}
                  occurrence={occurrence}
                  readOnly={readOnly}
                  showNextDate={section.showNextDate}
                  task={task}
                />
              ))}
            </View>
          ))}
          {!hasVisibleWork ? (
            <View style={{ alignItems: 'center', paddingVertical: SPACE['4xl'] }}>
              <Ionicons color={colors.text.accent} name="checkmark-circle-outline" size={30} />
              <Typography variant="emphasis-sm" style={{ marginTop: SPACE.md }}>No Tasks here yet.</Typography>
              <Typography variant="caption" style={{ marginTop: SPACE.xs, textAlign: 'center' }}>Add one clear next action to get started.</Typography>
            </View>
          ) : null}
          {showCompletionsLane ? (
            <View style={{ marginBottom: SPACE.xl }}>
              <Typography variant="eyebrow">Completions</Typography>
              {completionRows.map(({ task, occurrence }) => (
                <TaskRow
                  key={occurrence.id}
                  onAdjust={(delta) => void taskState.adjustQuantity(occurrence.id, delta, newTaskIdempotencyKey('quantity'))}
                  onComplete={(complete) => void taskState.complete(occurrence.id, complete, newTaskIdempotencyKey('status'))}
                  onArchive={() => void taskState.archive(task.id)}
                  onEdit={() => openEditForm(task)}
                  occurrence={occurrence}
                  readOnly={readOnly}
                  showNextDate={false}
                  task={task}
                />
              ))}
              {completionDefs.map((task) => (
                <ImportedTaskDefinitionRow
                  key={`definition:${task.id}`}
                  onEdit={() => openEditForm(task)}
                  readOnly={readOnly}
                  task={task}
                />
              ))}
            </View>
          ) : null}
        </View>
      )}
      {sections.completed.length ? (
        <View style={{ marginTop: SPACE.md }}>
          <Pressable onPress={() => setShowCompleted((value) => !value)} style={{ minHeight: 44, justifyContent: 'center' }}>
            <Typography variant="emphasis-sm" style={{ color: colors.text.accent }}>{showCompleted ? 'Hide completed' : `View completed (${sections.completed.length})`}</Typography>
          </Pressable>
          {showCompleted ? sections.completed.slice(0, full ? 50 : 2).map(({ task, occurrence }) => (
            <TaskRow key={occurrence.id} onAdjust={() => {}} onArchive={() => void taskState.archive(task.id)} onComplete={(complete) => void taskState.complete(occurrence.id, complete, newTaskIdempotencyKey('status'))} onEdit={() => openEditForm(task)} occurrence={occurrence} readOnly={readOnly} task={task} />
          )) : null}
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
