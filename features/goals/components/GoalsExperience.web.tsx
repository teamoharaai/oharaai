import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, TextInput, View } from 'react-native';
import { Link, router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { AuthenticatedPageShell } from '@/components/layout/AuthenticatedPageShell';
import { useWorkspaceDimensions } from '@/components/layout/WorkspaceContext';
import { Typography } from '@/components/ui/Typography';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { BrandIcon } from '@/components/ui/BrandIcon';
import { SPACE, RADIUS } from '@/constants/design';
import { getCategoryAccentTheme } from '@/constants/themes';
import { useThemeColors } from '@/store/uiStore';
import { useAuthStore } from '@/features/auth/store';
import { useProjectStore } from '@/features/projects/store';
import { useGoals } from '../hooks/useGoals';
import { useGoalDetail } from '../hooks/useGoalDetail';
import { useActivity } from '../hooks/useActivity';
import { useGoalStore } from '../store';
import { fetchGoalById } from '../services/goal-service';
import { getGoalWorkspaceSelection, goalWorkspaceHref } from '../navigation';
import { getGoalCategoryLabel, getGoalStatusLabel, getNextGoalMilestone } from '../goals-workspace';
import type { GoalWithDetails } from '../types';
import { ContextRail, SelectedGoalWorkspace, type WorkspaceTab } from './GoalsWorkspace';
import { SharedGoalsPreview } from './SharedGoalsPreview';
import { readContextVaultEntries } from '@/features/entries/services/context-vault';
import supabase from '@/lib/db/client';
import type { EntryRecord } from '@/features/entries/types';

type Params = { goal?: string | string[]; selected?: string | string[]; status?: string | string[]; view?: string | string[]; projectId?: string | string[]; taskId?: string | string[] };
const first = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;
const filters = [['active', 'Active'], ['complete', 'Completed'], ['historical', 'Historical'], ['stagnant', 'Paused'], ['expired', 'Expired'], ['archived', 'Archived'], ['all', 'All']] as const;
const dateLabel = (date: Date | null) => date ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'No deadline';

function Loading({ label }: { label: string }) {
  const colors = useThemeColors();
  return <Card><View accessibilityLiveRegion="polite" style={{ alignItems: 'center', gap: SPACE.lg, padding: SPACE['3xl'] }}><ActivityIndicator color={colors.text.accent} /><Typography variant="body">{label}</Typography></View></Card>;
}

function Failure({ message, retry }: { message: string; retry: () => void }) {
  return <Card><View accessibilityRole="alert" style={{ gap: SPACE.lg }}><Typography variant="title">Goals couldn’t load</Typography><Typography variant="body">{message}</Typography><Button variant="secondary" onPress={retry}>Retry</Button></View></Card>;
}

function GoalsLibrary({ params }: { params: Params }) {
  const colors = useThemeColors();
  const { width } = useWorkspaceDimensions();
  const { goals, isLoading, error, retry } = useGoals({ status: 'all' });
  const projects = useProjectStore((state) => state.projects);
  const loadProjects = useProjectStore((state) => state.loadProjects);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [scope, setScope] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const requested = first(params.status) ?? 'active';
  const status = requested === 'paused' ? 'stagnant' : requested === 'completed' ? 'complete' : requested;
  useEffect(() => { void loadProjects(); }, [loadProjects]);
  const categories = useMemo(() => [...new Set(goals.map((goal) => goal.category))], [goals]);
  const visible = goals.filter((goal) => (status === 'all' || (status === 'historical' ? ['complete', 'expired', 'archived'].includes(goal.status) : goal.status === status))
    && (!category || goal.category === category)
    && (scope === 'all' || (scope === 'personal' ? !goal.projectId : Boolean(goal.projectId)))
    && `${goal.title} ${goal.description ?? ''} ${getGoalCategoryLabel(goal.category)} ${projects.find((p) => p.id === goal.projectId)?.title ?? ''}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  const filtered = Boolean(query.trim() || category || scope !== 'all');
  return <View style={{ gap: SPACE.xl }} testID="goals-library-v2">
    <View style={{ flexDirection: width < 600 ? 'column' : 'row', alignItems: width < 600 ? 'stretch' : 'center', justifyContent: 'space-between', gap: SPACE.lg }}>
      <View style={{ gap: SPACE.sm }}><Typography accessibilityRole="header" variant="heading">Goals</Typography><Typography variant="body">Make room for what matters.</Typography></View>
      <Button onPress={() => router.push('/goals/create')}>New Goal</Button>
    </View>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.md }}>
      <TextInput accessibilityLabel="Search Goals" placeholder="Search Goals…" placeholderTextColor={colors.text.muted} value={query} onChangeText={setQuery} style={{ flex: 1, minWidth: 160, minHeight: 44, color: colors.text.primary, backgroundColor: colors.background.input, borderColor: colors.border.input, borderWidth: 1, borderRadius: RADIUS.md, paddingHorizontal: SPACE.lg }} />
      <Button accessibilityState={{ expanded: showFilters }} variant="secondary" onPress={() => setShowFilters(!showFilters)}>Filters</Button>
    </View>
    <View accessibilityLabel="Goal lifecycle filters" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm }}>
      {filters.map(([value, label]) => <Button aria-pressed={status === value} key={value} variant={status === value ? 'primary' : 'secondary'} onPress={() => router.setParams({ status: value })}>{label}</Button>)}
    </View>
    {showFilters ? <Card><View style={{ gap: SPACE.lg }}>
      <Typography variant="eyebrow">CONTEXT</Typography>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm }}>{[['all', 'All contexts'], ['personal', 'Personal'], ['project', 'Project Goals']].map(([value, label]) => <Button key={value} variant={scope === value ? 'primary' : 'secondary'} aria-pressed={scope === value} onPress={() => setScope(value)}>{label}</Button>)}</View>
      <Typography variant="eyebrow">CATEGORY</Typography>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm }}><Button variant={!category ? 'primary' : 'secondary'} aria-pressed={!category} onPress={() => setCategory(null)}>All categories</Button>{categories.map((value) => <Button key={value} variant={category === value ? 'primary' : 'secondary'} aria-pressed={category === value} onPress={() => setCategory(value)}>{getGoalCategoryLabel(value)}</Button>)}</View>
    </View></Card> : null}
    {isLoading ? <Loading label="Loading your Goals…" /> : error ? <Failure message={error} retry={retry} /> : visible.length ? <View style={{ gap: SPACE.md }}>
      <Typography variant="caption">{visible.length} {visible.length === 1 ? 'Goal' : 'Goals'} · Your library</Typography>
      {visible.map((goal) => <GoalLibraryRow key={goal.id} goal={goal} projectTitle={projects.find((project) => project.id === goal.projectId)?.title} />)}
    </View> : <Card><View style={{ alignItems: 'center', gap: SPACE.lg, paddingVertical: SPACE['3xl'] }}>
      <BrandIcon name="goals" size={32} color={colors.text.accent} />
      <Typography variant="title">{filtered ? 'No matching Goals' : !goals.length ? 'No Goals created yet' : status === 'active' ? 'No active Goals' : 'No Goals in this view'}</Typography>
      <Typography variant="body" style={{ textAlign: 'center' }}>{filtered ? 'Try another search or clear your filters.' : 'Create a meaningful outcome, or revisit your Goals in another lifecycle view.'}</Typography>
      {filtered ? <Button variant="secondary" onPress={() => { setQuery(''); setCategory(null); setScope('all'); }}>Clear filters</Button> : <Button onPress={() => router.push('/goals/create')}>New Goal</Button>}
    </View></Card>}
    <Card><SharedGoalsPreview /></Card>
  </View>;
}

function GoalLibraryRow({ goal, projectTitle }: { goal: GoalWithDetails; projectTitle?: string }) {
  const colors = useThemeColors();
  const viewerId = useAuthStore((state) => state.session?.user.id);
  const next = getNextGoalMilestone(goal.milestones);
  const milestones = goal.milestones.filter((item) => !item.parentId);
  return <Link href={goalWorkspaceHref(goal.id) as never} asChild><Pressable accessibilityRole="link" accessibilityLabel={`Open Goal ${goal.title}`} style={{ backgroundColor: colors.background.card, borderColor: colors.border.divider, borderWidth: 1, borderRadius: RADIUS.xl, borderLeftWidth: 4, borderLeftColor: getCategoryAccentTheme(goal.category).color, padding: SPACE.xl, gap: SPACE.md }}>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: SPACE.sm }}><Typography variant="title" style={{ flexShrink: 1 }}>{goal.title}</Typography><Typography variant="caption">{getGoalStatusLabel(goal.status)}</Typography></View>
    <Typography variant="caption">{getGoalCategoryLabel(goal.category)} · {goal.projectId ? projectTitle ?? 'Project Goal' : 'Personal'} · {goal.userId === viewerId ? 'Owned by you' : 'Shared Goal'}</Typography>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.xl }}><Typography variant="body-small">{milestones.length ? `${milestones.filter((item) => item.completedAt).length} of ${milestones.length} milestones reached` : 'No milestones yet'}</Typography><Typography variant="caption">{dateLabel(goal.deadline)}</Typography></View>
    {goal.status === 'active' && next ? <Typography variant="caption">Next milestone · {next.title}</Typography> : null}
  </Pressable></Link>;
}

function GoalDetail({ id, params }: { id: string; params: Params }) {
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);
  const userId = useAuthStore((state) => state.session?.user.id);
  // Resolve exactly the requested Goal (including shared/historical deep links)
  // before mounting mutation hooks. Never fall back to another library item.
  useEffect(() => {
    let active = true;
    setState('loading');
    if (!userId) return;
    void fetchGoalById(id).then((goal) => {
      if (!active) return;
      if (!goal) { setState('error'); return; }
      useGoalStore.getState().upsertGoal(goal);
      setState('ready');
    }).catch(() => { if (active) setState('error'); });
    return () => { active = false; };
  }, [id, userId, attempt]);
  return state === 'loading' ? <Loading label="Opening Goal…" /> : state === 'error' ? <View style={{ gap: SPACE.lg }}><Failure message="This Goal is unavailable, or you no longer have access. Your other Goals are still available." retry={() => setAttempt((value) => value + 1)} /><Button variant="secondary" onPress={() => router.push('/(app)/goals')}>Back to Goals</Button></View> : <LoadedGoal id={id} params={params} />;
}

function LoadedGoal({ id, params }: { id: string; params: Params }) {
  const detail = useGoalDetail(id);
  const goal = detail.goal;
  const activity = useActivity(id);
  const loadProjects = useProjectStore((state) => state.loadProjects);
  const [entries, setEntries] = useState<EntryRecord[]>([]);
  const [entriesState, setEntriesState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [retry, setRetry] = useState(0);
  const requested = first(params.view);
  const tab: WorkspaceTab = requested === 'tasks' || requested === 'milestones' || requested === 'vault' ? requested : first(params.taskId) ? 'tasks' : 'overview';
  const contentRef = useRef<View>(null);
  useEffect(() => { void loadProjects(); }, [loadProjects]);
  useFocusEffect(useCallback(() => {
    (contentRef.current as unknown as HTMLElement)?.focus?.({ preventScroll: true });
  }, [tab]));
  useEffect(() => {
    if (tab !== 'vault') return;
    let active = true;
    setEntriesState('loading');
    void readContextVaultEntries(supabase, { type: 'goal', id }).then((result) => {
      if (!active) return;
      setEntries(result.entries);
      setEntriesState(result.incomplete ? 'error' : 'ready');
    }).catch(() => { if (active) setEntriesState('error'); });
    return () => { active = false; };
  }, [id, tab, retry]);
  if (!goal) return <Failure message="This Goal is no longer available." retry={() => router.replace('/(app)/goals')} />;
  const changeTab = (view: WorkspaceTab) => router.push({ pathname: '/(app)/goals', params: { goal: id, view, ...(first(params.projectId) ? { projectId: first(params.projectId) } : {}), ...(view === 'tasks' && first(params.taskId) ? { taskId: first(params.taskId) } : {}) } } as never);
  return <View ref={contentRef} tabIndex={-1} testID="goal-detail-v2" style={{ gap: SPACE.xl }}>
    <SelectedGoalWorkspace redesigned goal={goal} goalDetail={detail} tab={tab} onWorkspaceChange={changeTab} sourceProjectId={first(params.projectId)} focusedTaskId={first(params.taskId)}
      activityItems={activity.items} activityLoading={activity.loading} activityError={activity.error} entries={entries}
      entriesLoading={entriesState === 'idle' || entriesState === 'loading'} onRetryEntries={() => setRetry((value) => value + 1)}
      entriesError={entriesState === 'error' ? 'Linked Notes and Reflections could not load.' : null}
      overviewAside={<ContextRail compact goal={goal} items={activity.items} activityLoading={activity.loading} activityError={activity.error} />} />
  </View>;
}

export function GoalsExperience() {
  const params = useLocalSearchParams<Params>();
  const id = getGoalWorkspaceSelection(params);
  return <AuthenticatedPageShell><View style={{ maxWidth: 1160, width: '100%', alignSelf: 'center', gap: SPACE.xl }}>{id ? <GoalDetail key={id} id={id} params={params} /> : <GoalsLibrary params={params} />}</View></AuthenticatedPageShell>;
}
