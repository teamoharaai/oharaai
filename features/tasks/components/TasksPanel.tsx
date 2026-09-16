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
import type { Task, TaskCompletionMode, TaskScheduleInput } from '../types';
import { activeTaskSchedule, buildTaskSections, newTaskIdempotencyKey, scheduleLabel, shortDate, TASK_WEEKDAYS } from '../utils';

type RecurrenceChoice = 'none' | 'daily' | 'weekly' | 'biweekly' | 'custom';

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
  const initialRecurrence: RecurrenceChoice = activeSchedule
    ? activeSchedule.recurrenceKind === 'daily'
      ? 'daily'
      : activeSchedule.intervalCount === 2 ? 'biweekly' : activeSchedule.weekdays.length ? 'custom' : 'weekly'
    : 'none';
  const [title, setTitle] = useState(task?.title ?? '');
  const [mode, setMode] = useState<TaskCompletionMode>(task?.completionMode ?? 'binary');
  const [target, setTarget] = useState(task?.targetQuantity?.toString() ?? '');
  const [unit, setUnit] = useState(task?.quantityUnit ?? '');
  const [dueDate, setDueDate] = useState(task?.dueDate ?? '');
  const [recurrence, setRecurrence] = useState<RecurrenceChoice>(initialRecurrence);
  const [weekdays, setWeekdays] = useState<number[]>(activeSchedule?.weekdays ?? [1]);
  const [startDate, setStartDate] = useState(activeSchedule?.startDate ?? '');
  const [endDate, setEndDate] = useState(activeSchedule?.endDate ?? '');
  const [localTime, setLocalTime] = useState(activeSchedule?.localTime?.slice(0, 5) ?? '');
  const [milestoneId, setMilestoneId] = useState(task?.milestoneId ?? '');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const inputStyle = { ...TYPE.bodySmall, backgroundColor: colors.background.input, borderColor: colors.border.input, borderRadius: RADIUS.sm, borderWidth: 1, color: colors.text.primary, padding: SPACE.lg };

  async function save() {
    const parsedTarget = target ? Number(target) : null;
    if (!title.trim()) return setError('Give this Task a short name.');
    if (mode === 'quantity' && (!parsedTarget || parsedTarget <= 0 || !unit.trim())) return setError('Quantity Tasks need a positive target and unit.');
    const schedule: TaskScheduleInput | null = recurrence === 'none' ? null : {
      recurrenceKind: recurrence === 'daily' ? 'daily' : 'weekly',
      intervalCount: recurrence === 'biweekly' ? 2 : 1,
      weekdays: recurrence === 'daily' ? [] : weekdays,
      startDate: startDate || null,
      endDate: endDate || null,
      localTime: localTime || null,
    };
    setSaving(true);
    const input = {
      title: title.trim(), completionMode: mode, targetQuantity: mode === 'quantity' ? parsedTarget : null,
      quantityUnit: mode === 'quantity' ? unit.trim() : null, dueDate: schedule ? null : dueDate || null,
      milestoneId: milestoneId || null,
    };
    let ok: boolean;
    if (task) {
      ok = await onUpdate(task.id, input);
      if (ok) {
        ok = await onReplaceSchedule(task.id, schedule, schedule ? null : dueDate || null, newTaskIdempotencyKey('schedule'));
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
            <TextInput accessibilityLabel="Target quantity" keyboardType="numeric" onChangeText={setTarget} placeholder="20" placeholderTextColor={colors.text.muted} style={[inputStyle, { flex: 1 }]} value={target} />
            <TextInput accessibilityLabel="Quantity unit" onChangeText={setUnit} placeholder="pages" placeholderTextColor={colors.text.muted} style={[inputStyle, { flex: 1 }]} value={unit} />
          </View>
        ) : null}
        <Typography variant="field-label">When</Typography>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.md }}>
          {(['none','daily','weekly','biweekly','custom'] as const).map((choice) => (
            <Choice key={choice} active={recurrence === choice} onPress={() => setRecurrence(choice)}>
              {choice === 'none' ? 'One time' : choice === 'biweekly' ? 'Every 2 weeks' : choice[0].toUpperCase()+choice.slice(1)}
            </Choice>
          ))}
        </View>
        {recurrence === 'none' ? (
          <TextInput accessibilityLabel="Due date" onChangeText={setDueDate} placeholder="Optional due date · YYYY-MM-DD" placeholderTextColor={colors.text.muted} style={inputStyle} value={dueDate} />
        ) : (
          <>
            {recurrence !== 'daily' ? (
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
            <Typography variant="field-label">Linked milestone (optional)</Typography>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.md }}>
              <Choice active={!milestoneId} onPress={() => setMilestoneId('')}>None</Choice>
              {milestones.filter((item) => !item.completedAt).map((item) => <Choice key={item.id} active={milestoneId === item.id} onPress={() => setMilestoneId(item.id)}>{item.title}</Choice>)}
            </View>
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
  const [completedAt, setCompletedAt] = useState(new Date().toISOString().slice(0, 16));
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
    const instant = new Date(completedAt);
    if (Number.isNaN(instant.getTime()) || instant.getTime() > Date.now() + 300_000) return setError('Choose a valid completion time.');
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
          <TextInput accessibilityLabel="Quantity target" keyboardType="numeric" onChangeText={setTarget} placeholder="Target" placeholderTextColor={colors.text.muted} style={[inputStyle,{ flex: 1 }]} value={target} />
          <TextInput accessibilityLabel="Quantity unit" onChangeText={setUnit} placeholder="Unit" placeholderTextColor={colors.text.muted} style={[inputStyle,{ flex: 1 }]} value={unit} />
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
  const visibleSections = [
    { definitions: [] as Task[], label: 'Today', rows: sections.today, showNextDate: false },
    { definitions: [] as Task[], label: 'Upcoming', rows: sections.upcoming.slice(0, full ? 30 : 4), showNextDate: true },
    { definitions: importedNeedsTiming.slice(0, full ? 30 : 4), label: 'Anytime', rows: sections.anytime.slice(0, full ? 30 : 4), showNextDate: false },
  ].filter((section) => section.rows.length || section.definitions.length);

  return (
    <View style={{ padding: compact ? SPACE.xl : SPACE['3xl'] }}>
      <View style={{ alignItems: 'center', flexDirection: 'row', gap: SPACE.lg, justifyContent: 'space-between' }}>
        <View style={{ flex: 1 }}>
          <Typography variant="section-eyebrow">Tasks</Typography>
          <Typography variant="title" style={{ marginTop: SPACE.xs }}>Your next meaningful actions</Typography>
        </View>
        {!readOnly ? <View style={{ alignItems: 'flex-end', gap: SPACE.xs }}>
          <Button onPress={() => { setEditing(null); setFormVisible(true); }} size="compact">+ Add Task</Button>
          <Pressable onPress={() => setLogVisible(true)} style={{ minHeight: 36, justifyContent: 'center' }}>
            <Typography variant="caption" style={{ color: colors.text.accent }}>Log completed</Typography>
          </Pressable>
        </View> : null}
      </View>
      {readOnly ? <Typography variant="caption" style={{ marginTop: SPACE.md }}>This Goal is historical. Its Tasks remain available as read-only context.</Typography> : null}
      {taskState.error ? <Typography variant="caption" style={{ color: colors.feedback.danger.text, marginTop: SPACE.lg }}>{taskState.error}</Typography> : null}
      {taskState.isLoading ? <ActivityIndicator color={colors.accent.primary} style={{ marginVertical: SPACE['3xl'] }} /> : visibleSections.length ? (
        <View style={{ marginTop: SPACE.xl }}>
          {visibleSections.map((section) => (
            <View key={section.label} style={{ marginBottom: SPACE.xl }}>
              <Typography variant="eyebrow">{section.label}</Typography>
              {section.rows.map(({ task, occurrence }) => (
                <TaskRow
                  key={occurrence.id}
                  onAdjust={(delta) => void taskState.adjustQuantity(occurrence.id, delta, newTaskIdempotencyKey('quantity'))}
                  onComplete={(complete) => void taskState.complete(occurrence.id, complete, newTaskIdempotencyKey('status'))}
                  onEdit={() => { setEditing(task); setFormVisible(true); }}
                  occurrence={occurrence}
                  readOnly={readOnly}
                  showNextDate={section.showNextDate}
                  task={task}
                />
              ))}
              {section.definitions.map((task) => (
                <ImportedTaskDefinitionRow
                  key={`definition:${task.id}`}
                  onEdit={() => { setEditing(task); setFormVisible(true); }}
                  readOnly={readOnly}
                  task={task}
                />
              ))}
            </View>
          ))}
        </View>
      ) : (
        <View style={{ alignItems: 'center', paddingVertical: SPACE['4xl'] }}>
          <Ionicons color={colors.text.accent} name="checkmark-circle-outline" size={30} />
          <Typography variant="emphasis-sm" style={{ marginTop: SPACE.md }}>No Tasks here yet.</Typography>
          <Typography variant="caption" style={{ marginTop: SPACE.xs, textAlign: 'center' }}>Add one clear next action, with or without a deadline.</Typography>
        </View>
      )}
      {sections.completed.length ? (
        <View style={{ marginTop: SPACE.md }}>
          <Pressable onPress={() => setShowCompleted((value) => !value)} style={{ minHeight: 44, justifyContent: 'center' }}>
            <Typography variant="emphasis-sm" style={{ color: colors.text.accent }}>{showCompleted ? 'Hide completed' : `View completed (${sections.completed.length})`}</Typography>
          </Pressable>
          {showCompleted ? sections.completed.slice(0, full ? 50 : 2).map(({ task, occurrence }) => (
            <TaskRow key={occurrence.id} onAdjust={() => {}} onComplete={(complete) => void taskState.complete(occurrence.id, complete, newTaskIdempotencyKey('status'))} onEdit={() => { setEditing(task); setFormVisible(true); }} occurrence={occurrence} readOnly={readOnly} task={task} />
          )) : null}
        </View>
      ) : null}
      {!full && onSeeAll ? <Pressable onPress={onSeeAll} style={{ alignSelf: 'flex-end', justifyContent: 'center', minHeight: 44 }}><Typography variant="emphasis-sm" style={{ color: colors.text.accent }}>See all →</Typography></Pressable> : null}
      <TaskForm
        key={editing?.id ?? 'new-task'}
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
