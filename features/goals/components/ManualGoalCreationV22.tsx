import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { AppNavigation } from '@/components/layout/AppNavigation';
import { Button } from '@/components/ui/Button';
import { DatePicker } from '@/components/ui/DatePicker';
import { Modal } from '@/components/ui/Modal';
import { Typography } from '@/components/ui/Typography';
import { useThemeColors } from '@/store/uiStore';
import { PRODUCT_CATEGORIES, type ProductCategory } from '@/lib/goals/product-categories';
import { getGoalCreationTemplate } from '@/lib/goals/templates';
import { CATEGORY_ACCENT_THEME } from '@/constants/themes';
import { ToDoAddRow, type TodoDraft } from '@/features/tasks/components/TasksPanel';
import { createTask } from '@/features/tasks/services/task-service';
import { dateInTimeZone, newTaskIdempotencyKey } from '@/features/tasks/utils';
import { useProjectStore } from '@/features/projects/store';
import { authedFetch } from '@/lib/api/client';
import supabase from '@/lib/db/client';
import { MilestoneEditor } from './MilestonesPanel';
import { GoalVisibilityControl } from './GoalVisibilityControl';
import { saveGoalVisibility, type GoalVisibilityChoice } from '../services/goal-visibility-service';
import { createMilestone, fetchGoalById } from '../services/goal-service';
import { useGoalStore } from '../store';
import { goalWorkspaceHref } from '../navigation';
import { planSuggestions } from '../plan-suggestions';
import type { GoalMilestoneInput } from '../types';

function deadlineIn(days: number) { const date = new Date(); date.setDate(date.getDate() + days); return dateInTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone, date); }

export function ManualGoalCreationV22({ initialProjectId, onAI }: { initialProjectId: string | null; onAI: () => void }) {
  const colors = useThemeColors();
  const projects = useProjectStore((s) => s.projects);
  const loadProjects = useProjectStore((s) => s.loadProjects);
  const upsert = useGoalStore((s) => s.upsertGoal);
  const [step, setStep] = useState(0);
  const [title, setTitle] = useState('');
  const [showTitleIdea, setShowTitleIdea] = useState(false);
  const [category, setCategory] = useState<ProductCategory>('Health & Fitness');
  const [reason, setReason] = useState('');
  const [deadline, setDeadline] = useState(deadlineIn(90));
  const [rhythm, setRhythm] = useState(4);
  const [projectId, setProjectId] = useState<string | null>(initialProjectId);
  const [tasks, setTasks] = useState<(TodoDraft & { key: string })[]>([]);
  const [milestones, setMilestones] = useState<GoalMilestoneInput[]>([]);
  const [editor, setEditor] = useState<'task' | 'milestone' | null>(null);
  const [seed, setSeed] = useState('');
  const [suggestions, setSuggestions] = useState<'tasks' | 'milestones' | null>(null);
  const [visibility, setVisibility] = useState<GoalVisibilityChoice>('private');
  const [audience, setAudience] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const saved = useRef<{ id: string | null; tasks: number; milestones: number }>({ id: null, tasks: 0, milestones: 0 });
  useEffect(() => { void loadProjects(); }, [loadProjects]);
  const inputStyle = { color: colors.text.primary, borderWidth: 1, borderColor: colors.border.input, borderRadius: 12, padding: 14, fontSize: 17 };
  function openEditor(kind: 'task' | 'milestone', initial = '') { setSeed(initial); setEditor(kind); setSuggestions(null); }
  async function submit() {
    if (busy) return;
    setBusy(true); setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Please sign in again.');
      if (!saved.current.id) {
        const response = await authedFetch('/api/goals', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
          title: title.trim(), category, description: reason.trim() || null, deadline,
          target_frequency: { period: 'week', times: rhythm }, project_id: projectId,
          visibility: 'private', milestones: [], trackers: [],
        }) });
        const payload = await response.json();
        if (!response.ok || !payload.ok || !payload.data?.goalId) throw new Error(payload.error?.message || 'Could not create Goal.');
        saved.current.id = payload.data.goalId;
      }
      const id = saved.current.id!;
      while (saved.current.milestones < milestones.length) {
        if (!await createMilestone(id, user.id, milestones[saved.current.milestones])) throw new Error('Goal saved, but a Milestone could not be saved. Retry to continue.');
        saved.current.milestones++;
      }
      while (saved.current.tasks < tasks.length) {
        const task = tasks[saved.current.tasks];
        const recurring = task.weekdays.length > 0;
        await createTask({ goalId: id, title: task.title, idempotencyKey: task.key,
          completionMode: task.quantity !== null || task.unit ? 'quantity' : 'binary', targetQuantity: task.quantity, quantityUnit: task.unit,
          dueDate: recurring ? null : task.date ?? dateInTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone),
          schedule: recurring ? { recurrenceKind: task.everyDay ? 'daily' : 'weekly', intervalCount: 1, weekdays: task.everyDay ? [] : task.weekdays, startDate: null, endDate: task.date, localTime: null } : null,
        });
        saved.current.tasks++;
      }
      await saveGoalVisibility(id, visibility, audience);
      const goal = await fetchGoalById(id); if (goal) upsert(goal);
      setDone(id);
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not save Goal.'); }
    finally { setBusy(false); }
  }
  const valid = step === 0 ? Boolean(title.trim()) : step === 1 ? Boolean(deadline && deadline >= deadlineIn(1)) : step === 3 ? visibility !== 'circle' || audience.length > 0 : true;
  return <View style={{ flex: 1, backgroundColor: colors.background.page }}>
    <View style={{ flexShrink: 0 }}><AppNavigation /></View>
    <ScrollView contentContainerStyle={{ padding: 24, alignItems: 'center' }}>
      <View style={{ width: '100%', maxWidth: 760, gap: 24 }}>
        {done ? <>
          <Typography variant="heading">Goal created</Typography><Typography variant="body">Your Goal is ready.</Typography>
          <Button onPress={() => router.replace(goalWorkspaceHref(done) as never)}>View Goal</Button>
          <Button variant="secondary" onPress={() => { saved.current = { id: null, tasks: 0, milestones: 0 }; setDone(null); setStep(0); setTitle(''); setReason(''); setTasks([]); setMilestones([]); setVisibility('private'); setAudience([]); setCategory('Health & Fitness'); setDeadline(deadlineIn(90)); setRhythm(4); setProjectId(initialProjectId); setError(null); }}>Create another</Button>
        </> : <>
          <Typography variant="heading" accessibilityRole="header">New Goal</Typography>
          <Button variant="secondary" disabled={busy || Boolean(saved.current.id)} onPress={onAI}>Chat with Echo instead</Button>
          <View accessibilityLabel="Creation progress" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 20 }}>
            {['Goal', 'Details', 'Plan', 'Review'].map((label, index) => <Typography key={label} variant={step === index ? 'emphasis-sm' : 'caption'} style={{ color: step === index ? colors.text.accent : colors.text.secondary }}>{index + 1}. {label}</Typography>)}
          </View>
          {step === 0 ? <>
            <Typography variant="heading">What do you want to work toward?</Typography>
            <TextInput accessibilityLabel="Goal title" placeholder="Give your Goal a title" placeholderTextColor={colors.text.muted} value={title} onChangeText={setTitle} maxLength={200} style={inputStyle} />
            <Button variant="secondary" onPress={() => setShowTitleIdea(true)}>View title idea</Button>
            {showTitleIdea ? <View style={{ gap: 10 }}>
              <Typography variant="emphasis-sm">OHARA suggestion</Typography>
              <Typography variant="caption">A category example—not a personalized AI rewrite. Use it only if it fits your intention.</Typography>
              <Typography variant="body">{getGoalCreationTemplate(category).suggestion}</Typography>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <Button onPress={() => { setTitle(getGoalCreationTemplate(category).suggestion); setShowTitleIdea(false); }}>Use this</Button>
                <Button variant="secondary" onPress={() => setShowTitleIdea(false)}>Keep mine</Button>
              </View>
            </View> : null}
            <Typography variant="body">Where does this Goal fit?</Typography>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
              {PRODUCT_CATEGORIES.map((item) => <Pressable key={item} accessibilityRole="radio" accessibilityState={{ checked: category === item }} aria-checked={category === item} onPress={() => setCategory(item)}
                style={{ width: '47%', flexGrow: 1, minHeight: 80, justifyContent: 'center', padding: 16, borderRadius: 14, borderWidth: category === item ? 2 : 1, borderColor: category === item ? CATEGORY_ACCENT_THEME[item].color : colors.border.divider, backgroundColor: colors.background.card }}>
                <Typography variant="emphasis-sm">{item}</Typography>
              </Pressable>)}
            </View>
          </> : null}
          {step === 1 ? <>
            <Typography variant="body">Why does this matter to you? (optional)</Typography>
            <TextInput accessibilityLabel="Why this Goal matters" multiline value={reason} onChangeText={setReason} maxLength={280} style={inputStyle} />
            <Typography variant="body">Target date</Typography>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{[30,60,90].map((days) => <Button key={days} variant="secondary" onPress={() => setDeadline(deadlineIn(days))}>{days} days</Button>)}</View>
            <DatePicker accessibilityLabel="Custom target date" value={deadline} onChange={setDeadline} />
            <Typography variant="body">Expected rhythm · {rhythm} days per week</Typography>
            <Typography variant="caption">Your Goal-level expectation still informs Momentum. Task schedules are configured separately.</Typography>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>{[1,2,3,4,5,6,7].map((days) => <Button key={days} size="compact" variant={rhythm === days ? 'primary' : 'secondary'} onPress={() => setRhythm(days)}>{days}</Button>)}</View>
            <Typography variant="body">Project (optional)</Typography>
            <Button variant="secondary" onPress={() => setProjectId(null)}>{projectId ? 'No Project' : '✓ No Project'}</Button>
            {projects.filter((p) => p.status !== 'archived').map((p) => <Button key={p.id} variant="secondary" onPress={() => setProjectId(p.id)}>{projectId === p.id ? '✓ ' : ''}{p.title}</Button>)}
          </> : null}
          {step === 2 ? <>
            <Typography variant="heading">Plan · optional</Typography>
            <Typography variant="body">Start with what is useful. You can refine your plan in the Goal workspace.</Typography>
            <Typography variant="heading">Milestones</Typography>
            {!milestones.length ? <Typography variant="body">No milestones yet.</Typography> : milestones.map((m,i) => <View key={i}><Typography variant="body">{m.title}</Typography><Button variant="secondary" onPress={() => setMilestones(milestones.filter((_,index) => index !== i))}>Remove</Button></View>)}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}><Button onPress={() => openEditor('milestone')}>+ Add Milestone</Button><Button variant="secondary" onPress={() => setSuggestions('milestones')}>✦ View Suggestions</Button></View>
            <Typography variant="heading">Tasks</Typography>
            {!tasks.length ? <Typography variant="body">No Tasks yet.</Typography> : tasks.map((t,i) => <View key={t.key}><Typography variant="body">{t.title}</Typography><Button variant="secondary" onPress={() => setTasks(tasks.filter((_,index) => index !== i))}>Remove</Button></View>)}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}><Button onPress={() => openEditor('task')}>+ Add Task</Button><Button variant="secondary" onPress={() => setSuggestions('tasks')}>✦ View Suggestions</Button></View>
            <Button variant="secondary" onPress={() => { setTasks([]); setMilestones([]); setStep(3); }}>Skip for now</Button>
          </> : null}
          {step === 3 ? <>
            <Typography variant="heading">Review your Goal</Typography>
            <Typography variant="caption">{category}</Typography><Typography variant="heading">{title}</Typography>
            <Typography variant="body">Target: {deadline} · {tasks.length} Tasks · {milestones.length} Milestones</Typography>
            {reason ? <Typography variant="body">{reason}</Typography> : null}
            {projectId ? <Typography variant="body">Project: {projects.find((p) => p.id === projectId)?.title}</Typography> : null}
            <GoalVisibilityControl value={visibility} audience={audience} onChange={setVisibility} onAudienceChange={setAudience} />
          </> : null}
          {error ? <Typography variant="body" accessibilityRole="alert">{error}</Typography> : null}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 16 }}>
            <Button variant="secondary" disabled={busy || Boolean(saved.current.id)} onPress={() => step ? setStep(step - 1) : router.back()}>← Back</Button>
            <Button disabled={busy || !valid} onPress={() => step < 3 ? setStep(step + 1) : void submit()}>{busy ? 'Saving…' : step === 3 ? saved.current.id ? 'Retry remaining setup' : 'Create Goal' : 'Continue →'}</Button>
          </View>
        </>}
      </View>
    </ScrollView>
    <Modal visible={editor !== null} onClose={() => setEditor(null)} contentStyle={{ maxWidth: 680, maxHeight: '90%' }}>
      <ScrollView>{editor === 'task' ? <ToDoAddRow key={`task-${seed}`} initialTitle={seed} autoFocus onClose={() => setEditor(null)} onAdd={async (draft) => { setTasks([...tasks, { ...draft, key: newTaskIdempotencyKey('manual') }]); setEditor(null); }} /> : editor === 'milestone' ?
        <MilestoneEditor key={`milestone-${seed}`} initialTitle={seed} submitLabel="Add Milestone" showTargetCount onCancel={() => setEditor(null)} onSubmit={async (draft) => { setMilestones([...milestones, draft]); setEditor(null); }} /> : null}</ScrollView>
    </Modal>
    <Modal visible={suggestions !== null} onClose={() => setSuggestions(null)} contentStyle={{ maxWidth: 620 }}>
      <View style={{ gap: 16 }}><Typography variant="heading">Suggested {suggestions}</Typography>
        <Typography variant="caption">Nothing is added until you choose and save it.</Typography>
        {suggestions ? planSuggestions(title, category, deadline, reason)[suggestions].map((suggestion) => <View key={suggestion} style={{ gap: 8 }}><Typography variant="body">{suggestion}</Typography><Button variant="secondary" onPress={() => openEditor(suggestions === 'tasks' ? 'task' : 'milestone', suggestion)}>+ Add</Button></View>) : null}
      </View>
    </Modal>
  </View>;
}
