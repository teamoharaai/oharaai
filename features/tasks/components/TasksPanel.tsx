import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, TextInput, View, useWindowDimensions } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Typography } from '@/components/ui/Typography';
import { RADIUS, SPACE, TYPE } from '@/constants/design';
import type { GoalMilestone, GoalStatus } from '@/features/goals/types';
import { useThemeColors } from '@/store/uiStore';
import { useGoalTasks } from '../hooks/useGoalTasks';
import type { Task, TaskCadence, TaskCompletionMode, TaskScheduleInput } from '../types';
import { activeTaskSchedule, buildTaskSections, localDateTimeInputValue, newTaskIdempotencyKey, parseRetroactiveCompletionTime, scheduleLabel, shortDate, TASK_WEEKDAYS } from '../utils';

const CADENCE_CHIPS: { value: TaskCadence; label: string }[] = [
  { value: 'none', label: 'Once' },
  { value: 'daily', label: 'Daily' },
  { value: 'setdays', label: 'On set days' },
];

function TaskRow({
  task,
  occurrence,
  readOnly,
  onComplete,
  onAdjust,
  onEdit,
  showNextDate,
}: {
  task: Task;
  occurrence: Task['occurrences'][number];
  readOnly: boolean;
  onComplete: (completed: boolean) => void;
  onAdjust: (delta: number) => void;
  onEdit: () => void;
  showNextDate?: boolean;
}) {
  const colors = useThemeColors();
  const completed = occurrence.status === 'completed';
  const nextDate = showNextDate ? shortDate(occurrence.scheduledLocalDate) : '';
  const binary = task.completionMode === 'binary';
  const quantity = occurrence.actualQuantity ?? task.legacyCurrentValue ?? 0;
  const mutationDisabled = readOnly || task.status === 'archived';
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

function TaskForm({
  goalId,
  milestones,
  task,
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
  visible: boolean;
  onClose: () => void;
  onCreate: ReturnType<typeof useGoalTasks>['create'];
  onUpdate: ReturnType<typeof useGoalTasks>['update'];
  onReplaceSchedule: ReturnType<typeof useGoalTasks>['replaceSchedule'];
  onArchive: ReturnType<typeof useGoalTasks>['archive'];
}) {
  const colors = useThemeColors();
  const activeSchedule = task ? activeTaskSchedule(task) : null;
  // Map an existing schedule onto the cadence axis (TD-016): daily → Daily,
  // any weekly (former Weekly/Custom/biweekly) → On set days. A new Task with no
  // schedule is an ad-hoc Once/Completion.
  const initialCadence: TaskCadence = activeSchedule
    ? activeSchedule.recurrenceKind === 'daily' ? 'daily' : 'setdays'
    : 'none';
  // Preserve an existing `intervalCount` (e.g. a legacy every-2-weeks schedule)
  // even though the top-level chip is retired — the form no longer authors it,
  // but saving must not silently reset it (design 003 §6).
  const preservedIntervalCount = activeSchedule?.intervalCount ?? 1;
  const preservedDueDate = task?.dueDate ?? null;
  const [title, setTitle] = useState(task?.title ?? '');
  const [mode, setMode] = useState<TaskCompletionMode>(task?.completionMode ?? 'binary');
  const [target, setTarget] = useState(task?.targetQuantity?.toString() ?? '');
  const [unit, setUnit] = useState(task?.quantityUnit ?? '');
  const [recurrence, setRecurrence] = useState<TaskCadence>(initialCadence);
  const [weekdays, setWeekdays] = useState<number[]>(activeSchedule?.weekdays ?? [1]);
  const [startDate, setStartDate] = useState(activeSchedule?.startDate ?? '');
  const [endDate, setEndDate] = useState(activeSchedule?.endDate ?? '');
  const [localTime, setLocalTime] = useState(activeSchedule?.localTime?.slice(0, 5) ?? '');
  const [milestoneId, setMilestoneId] = useState(task?.milestoneId ?? '');
  // Milestone linking is a secondary concern — keep it collapsed unless the Task
  // already has one linked (then show it so the tie is visible on edit). Within
  // "More options" the milestone list is itself click-to-reveal, scoped to this
  // goal's milestones only.
  const [showMore, setShowMore] = useState(Boolean(task?.milestoneId));
  const [showMilestones, setShowMilestones] = useState(Boolean(task?.milestoneId));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const inputStyle = { ...TYPE.bodySmall, backgroundColor: colors.background.input, borderColor: colors.border.input, borderRadius: RADIUS.sm, borderWidth: 1, color: colors.text.primary, padding: SPACE.lg };

  async function save() {
    const parsedTarget = target ? Number(target) : null;
    if (!title.trim()) return setError('Give this Task a short name.');
    if (mode === 'quantity' && (!parsedTarget || parsedTarget <= 0 || !unit.trim())) return setError('Quantity Tasks need a positive target and unit.');
    if (recurrence === 'setdays' && weekdays.length === 0) return setError('Pick at least one day for this Task.');
    const schedule: TaskScheduleInput | null = recurrence === 'none' ? null : {
      recurrenceKind: recurrence === 'daily' ? 'daily' : 'weekly',
      intervalCount: recurrence === 'setdays' ? preservedIntervalCount : 1,
      weekdays: recurrence === 'setdays' ? weekdays : [],
      startDate: startDate || null,
      endDate: endDate || null,
      localTime: localTime || null,
    };
    setSaving(true);
    const input = {
      title: title.trim(), completionMode: mode, targetQuantity: mode === 'quantity' ? parsedTarget : null,
      quantityUnit: mode === 'quantity' ? unit.trim() : null, dueDate: schedule ? null : preservedDueDate,
      milestoneId: milestoneId || null,
    };
    let ok: boolean;
    if (task) {
      ok = await onUpdate(task.id, input);
      if (ok) {
        ok = await onReplaceSchedule(task.id, schedule, schedule ? null : preservedDueDate, newTaskIdempotencyKey('schedule'));
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

  return (
    <Modal visible={visible} onClose={onClose} closeDisabled={saving} contentStyle={{ maxHeight: '90%', maxWidth: 620, width: '94%' }}>
      <ScrollView contentContainerStyle={{ gap: SPACE.lg }} keyboardShouldPersistTaps="handled">
        <Typography variant="heading" style={{ fontSize: 24 }}>{task ? 'Edit Task' : 'Add Task'}</Typography>
        <TextInput accessibilityLabel="Task title" onChangeText={setTitle} placeholder="What do you want to do?" placeholderTextColor={colors.text.muted} style={inputStyle} value={title} />
        <Typography variant="field-label">Completion</Typography>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.md }}>
          <Choice active={mode === 'binary'} onPress={() => setMode('binary')}>Check off</Choice>
          <Choice active={mode === 'quantity'} onPress={() => setMode('quantity')}>Quantity</Choice>
        </View>
        {mode === 'quantity' ? (
          <View style={{ flexDirection: 'row', gap: SPACE.md }}>
            <TextInput accessibilityLabel="Target quantity" keyboardType="numeric" onChangeText={setTarget} placeholder="Quantity" placeholderTextColor={colors.text.muted} style={[inputStyle, { flex: 1 }]} value={target} />
            <TextInput accessibilityLabel="Quantity unit" onChangeText={setUnit} placeholder="Units" placeholderTextColor={colors.text.muted} style={[inputStyle, { flex: 1 }]} value={unit} />
          </View>
        ) : null}
        <Typography variant="field-label">Cadence</Typography>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.md }}>
          {CADENCE_CHIPS.map((choice) => (
            <Choice key={choice.value} active={recurrence === choice.value} onPress={() => setRecurrence(choice.value)}>
              {choice.label}
            </Choice>
          ))}
        </View>
        {recurrence === 'none' ? null : (
          <>
            {recurrence === 'setdays' ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm }}>
                {TASK_WEEKDAYS.map((day) => <Choice key={day.value} active={weekdays.includes(day.value)} onPress={() => setWeekdays((current) => current.includes(day.value) ? current.filter((value) => value !== day.value) : [...current, day.value])}>{day.short}</Choice>)}
              </View>
            ) : null}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.md }}>
              <TextInput accessibilityLabel="Recurrence start date" onChangeText={setStartDate} placeholder="Optional start · YYYY-MM-DD" placeholderTextColor={colors.text.muted} style={[inputStyle, { flex: 1, minWidth: 170 }]} value={startDate} />
              <TextInput accessibilityLabel="Scheduled time" onChangeText={setLocalTime} placeholder="Optional time · HH:MM" placeholderTextColor={colors.text.muted} style={[inputStyle, { flex: 1 }]} value={localTime} />
              <TextInput accessibilityLabel="Recurrence end date" onChangeText={setEndDate} placeholder="Optional end · YYYY-MM-DD" placeholderTextColor={colors.text.muted} style={[inputStyle, { flex: 1 }]} value={endDate} />
            </View>
          </>
        )}
        {milestones.length ? (
          <>
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
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ expanded: showMilestones }}
                onPress={() => setShowMilestones((value) => !value)}
                style={{ alignItems: 'center', flexDirection: 'row', gap: SPACE.xs, minHeight: 36 }}
              >
                <Ionicons color={colors.text.accent} name={showMilestones ? 'chevron-down' : 'chevron-forward'} size={14} />
                <Typography variant="caption" style={{ color: colors.text.accent }}>Link a milestone (optional)</Typography>
              </Pressable>
            ) : null}
            {showMore && showMilestones ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.md }}>
                <Choice active={!milestoneId} onPress={() => setMilestoneId('')}>None</Choice>
                {milestones.filter((item) => !item.completedAt).map((item) => <Choice key={item.id} active={milestoneId === item.id} onPress={() => setMilestoneId(item.id)}>{item.title}</Choice>)}
              </View>
            ) : null}
          </>
        ) : null}
        {error ? <Typography variant="caption" style={{ color: colors.feedback.danger.text }}>{error}</Typography> : null}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: SPACE.md }}>
          {task ? <Button disabled={saving} onPress={() => void archive()} size="compact" variant="secondary">Archive</Button> : <View />}
          <Button disabled={saving} onPress={() => void save()} size="compact">{saving ? 'Saving…' : task ? 'Save' : 'Add Task'}</Button>
        </View>
      </ScrollView>
    </Modal>
  );
}

function LogCompletedForm({
  goalId,
  visible,
  onClose,
  onLog,
}: {
  goalId: string;
  visible: boolean;
  onClose: () => void;
  onLog: ReturnType<typeof useGoalTasks>['logCompleted'];
}) {
  const colors = useThemeColors();
  const [title, setTitle] = useState('');
  const [mode, setMode] = useState<TaskCompletionMode>('binary');
  const [target, setTarget] = useState('');
  const [actual, setActual] = useState('');
  const [unit, setUnit] = useState('');
  const [completedAt, setCompletedAt] = useState(() => localDateTimeInputValue());
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const inputStyle = { ...TYPE.bodySmall, backgroundColor: colors.background.input, borderColor: colors.border.input, borderRadius: RADIUS.sm, borderWidth: 1, color: colors.text.primary, padding: SPACE.lg };
  async function save() {
    if (!title.trim()) return setError('Describe what you completed.');
    const targetQuantity = target ? Number(target) : null;
    const actualQuantity = actual ? Number(actual) : null;
    if (mode === 'quantity' && (!targetQuantity || targetQuantity <= 0 || actualQuantity === null || actualQuantity < 0 || !unit.trim())) {
      return setError('Quantity entries need a positive target, unit, and completed amount.');
    }
    const instant = parseRetroactiveCompletionTime(completedAt);
    if (!instant) return setError('Choose a valid completion time.');
    setSaving(true);
    const ok = await onLog({
      goalId,
      title: title.trim(),
      completionMode: mode,
      targetQuantity: mode === 'quantity' ? targetQuantity : null,
      quantityUnit: mode === 'quantity' ? unit.trim() : null,
      actualQuantity: mode === 'quantity' ? actualQuantity : null,
      completedAt: instant.toISOString(),
      idempotencyKey: newTaskIdempotencyKey('retroactive'),
    });
    setSaving(false);
    if (ok) onClose();
  }
  return (
    <Modal visible={visible} onClose={onClose} closeDisabled={saving} contentStyle={{ maxWidth: 560, width: '94%' }}>
      <View style={{ gap: SPACE.lg }}>
        <Typography variant="heading" style={{ fontSize: 24 }}>Log completed Task</Typography>
        <Typography variant="body">Record something meaningful you already did.</Typography>
        <TextInput accessibilityLabel="Completed Task title" onChangeText={setTitle} placeholder="What did you complete?" placeholderTextColor={colors.text.muted} style={inputStyle} value={title} />
        <View style={{ flexDirection: 'row', gap: SPACE.md }}>
          <Choice active={mode === 'binary'} onPress={() => setMode('binary')}>Check off</Choice>
          <Choice active={mode === 'quantity'} onPress={() => setMode('quantity')}>Quantity</Choice>
        </View>
        {mode === 'quantity' ? <View style={{ flexDirection: 'row', gap: SPACE.md }}>
          <TextInput accessibilityLabel="Completed amount" keyboardType="numeric" onChangeText={setActual} placeholder="Done" placeholderTextColor={colors.text.muted} style={[inputStyle,{ flex: 1 }]} value={actual} />
          <TextInput accessibilityLabel="Quantity target" keyboardType="numeric" onChangeText={setTarget} placeholder="Quantity" placeholderTextColor={colors.text.muted} style={[inputStyle,{ flex: 1 }]} value={target} />
          <TextInput accessibilityLabel="Quantity unit" onChangeText={setUnit} placeholder="Units" placeholderTextColor={colors.text.muted} style={[inputStyle,{ flex: 1 }]} value={unit} />
        </View> : null}
        <TextInput accessibilityLabel="Completion date and time" onChangeText={setCompletedAt} placeholder="YYYY-MM-DDTHH:MM" placeholderTextColor={colors.text.muted} style={inputStyle} value={completedAt} />
        {error ? <Typography variant="caption" style={{ color: colors.feedback.danger.text }}>{error}</Typography> : null}
        <Button disabled={saving} onPress={() => void save()}>{saving ? 'Saving…' : 'Log completed Task'}</Button>
      </View>
    </Modal>
  );
}

export function TasksPanel({
  goalId,
  goalStatus,
  milestones,
  full = false,
  onSeeAll,
}: {
  goalId: string;
  goalStatus: GoalStatus;
  milestones: readonly GoalMilestone[];
  full?: boolean;
  onSeeAll?: () => void;
}) {
  const colors = useThemeColors();
  const { width } = useWindowDimensions();
  const compact = width < 560;
  const taskState = useGoalTasks(goalId);
  const [formVisible, setFormVisible] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [logVisible, setLogVisible] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const sections = useMemo(() => buildTaskSections(taskState.tasks), [taskState.tasks]);
  const importedNeedsTiming = useMemo(() => taskState.tasks.filter((task) => (
    task.status === 'active'
    && task.source === 'legacy_tracker'
    && !activeTaskSchedule(task)
    && !task.occurrences.some((occurrence) => occurrence.status === 'pending' || occurrence.status === 'missed')
  )), [taskState.tasks]);
  const readOnly = goalStatus !== 'active';
  const openBlankForm = () => { setEditing(null); setFormVisible(true); };
  const openEditForm = (task: Task) => { setEditing(task); setFormVisible(true); };
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
      <View style={{ alignItems: 'center', flexDirection: 'row', gap: SPACE.lg, justifyContent: 'space-between' }}>
        <View style={{ flex: 1 }}>
          <Typography variant="section-eyebrow">Tasks</Typography>
          <Typography variant="title" style={{ marginTop: SPACE.xs }}>Your next meaningful actions</Typography>
        </View>
        {!readOnly ? (
          <Button onPress={openBlankForm} size="compact">+ Add Task</Button>
        ) : null}
      </View>
      {readOnly ? <Typography variant="caption" style={{ marginTop: SPACE.md }}>This Goal is historical. Its Tasks remain available as read-only context.</Typography> : null}
      {taskState.error ? <Typography variant="caption" style={{ color: colors.feedback.danger.text, marginTop: SPACE.lg }}>{taskState.error}</Typography> : null}
      {taskState.isLoading ? <ActivityIndicator color={colors.accent.primary} style={{ marginVertical: SPACE['3xl'] }} /> : (
        <View style={{ marginTop: SPACE.xl }}>
          {laneSections.map((section) => (
            <View key={section.label} style={{ marginBottom: SPACE.xl }}>
              <Typography variant="eyebrow">{section.label}</Typography>
              {section.rows.map(({ task, occurrence }) => (
                <TaskRow
                  key={occurrence.id}
                  onAdjust={(delta) => void taskState.adjustQuantity(occurrence.id, delta, newTaskIdempotencyKey('quantity'))}
                  onComplete={(complete) => void taskState.complete(occurrence.id, complete, newTaskIdempotencyKey('status'))}
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
              <View style={{ alignItems: 'center', flexDirection: 'row', gap: SPACE.md, justifyContent: 'space-between' }}>
                <Typography variant="eyebrow">Completions</Typography>
                {!readOnly ? (
                  <Pressable onPress={() => setLogVisible(true)} style={{ minHeight: 36, justifyContent: 'center' }}>
                    <Typography variant="caption" style={{ color: colors.text.accent }}>+ Log completed</Typography>
                  </Pressable>
                ) : null}
              </View>
              {completionRows.map(({ task, occurrence }) => (
                <TaskRow
                  key={occurrence.id}
                  onAdjust={(delta) => void taskState.adjustQuantity(occurrence.id, delta, newTaskIdempotencyKey('quantity'))}
                  onComplete={(complete) => void taskState.complete(occurrence.id, complete, newTaskIdempotencyKey('status'))}
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
            <TaskRow key={occurrence.id} onAdjust={() => {}} onComplete={(complete) => void taskState.complete(occurrence.id, complete, newTaskIdempotencyKey('status'))} onEdit={() => openEditForm(task)} occurrence={occurrence} readOnly={readOnly} task={task} />
          )) : null}
        </View>
      ) : null}
      {!full && onSeeAll ? <Pressable onPress={onSeeAll} style={{ alignSelf: 'flex-end', justifyContent: 'center', minHeight: 44 }}><Typography variant="emphasis-sm" style={{ color: colors.text.accent }}>See all →</Typography></Pressable> : null}
      <TaskForm
        key={`${formVisible ? 'open' : 'closed'}:${editing?.id ?? 'new-task'}`}
        goalId={goalId}
        milestones={milestones}
        onArchive={taskState.archive}
        onClose={() => { setFormVisible(false); setEditing(null); }}
        onCreate={taskState.create}
        onReplaceSchedule={taskState.replaceSchedule}
        onUpdate={taskState.update}
        task={editing}
        visible={formVisible}
      />
      <LogCompletedForm
        key={logVisible ? 'log-open' : 'log-closed'}
        goalId={goalId}
        onClose={() => setLogVisible(false)}
        onLog={taskState.logCompleted}
        visible={logVisible}
      />
    </View>
  );
}
