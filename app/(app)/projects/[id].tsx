import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, TextInput, View, useWindowDimensions } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Typography } from '@/components/ui/Typography';
import { VaultIcon } from '@/components/ui/VaultIcon';
import { LAYOUT, RADIUS, SPACE } from '@/constants/design';
import { useThemeColors } from '@/store/uiStore';
import supabase from '@/lib/db/client';
import { ProjectGoalRow } from '@/features/goals/components/ProjectGoalRow';
import { isSourceVaultItem, isStickyVaultItem } from '@/features/goals/vault-classification';
import type { VaultFilter } from '@/features/goals/components/GoalVault';
import { ProjectVaultWorkspace } from '@/features/projects/components/ProjectVaultWorkspace';
import { assignGoalsToProject, detachGoalFromProject, fetchOwnedGoalsForProjects, fetchProjectWorkspace, updateProject } from '@/features/projects/services/project-service';
import { useMomentumHomeSummary } from '@/features/momentum/hooks/useMomentumHomeSummary';
import type { GoalWithDetails } from '@/features/goals/types';
import type { ProjectStatus, ProjectWorkspace } from '@/features/projects/types';

function Surface({ children, intelligence = false, title }: { children: ReactNode; intelligence?: boolean; title?: string }) {
  const colors = useThemeColors();
  return <View style={{ backgroundColor: intelligence ? colors.background.selectedRow : colors.background.card, borderColor: intelligence ? colors.border.accent : colors.border.warmSubtle, borderRadius: RADIUS.xl, borderWidth: 1, gap: SPACE.lg, padding: SPACE.xl }}>{title ? <View style={{ alignItems: 'center', flexDirection: 'row', gap: SPACE.sm }}>{intelligence ? <Ionicons color={colors.accent.primary} name="sparkles-outline" size={19} /> : null}<Typography variant="section-header" style={intelligence ? { color: colors.text.accent } : undefined}>{title}</Typography></View> : null}{children}</View>;
}

export default function ProjectDetailScreen() {
  const colors = useThemeColors();
  const { width } = useWindowDimensions();
  const desktop = width >= 1120;
  const compact = width < 720;
  const params = useLocalSearchParams<{ id: string; view?: string; vaultFilter?: VaultFilter }>();
  const projectId = Array.isArray(params.id) ? params.id[0] : params.id;
  const [project, setProject] = useState<ProjectWorkspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'overview' | 'vault'>(params.view === 'vault' ? 'vault' : 'overview');
  const [addRequest, setAddRequest] = useState(0);
  const [addGoalOpen, setAddGoalOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const [manageTab, setManageTab] = useState<'details' | 'goals' | 'lifecycle'>('details');
  const [ownedGoals, setOwnedGoals] = useState<GoalWithDetails[]>([]);
  const [selectedGoalIds, setSelectedGoalIds] = useState<string[]>([]);
  const [confirmMove, setConfirmMove] = useState(false);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const momentum = useMomentumHomeSummary();

  async function load() {
    if (!projectId) return;
    setLoading(true); setError(null);
    try { const data = await fetchProjectWorkspace(projectId); setProject(data); if (!data) setError('Project not found.'); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Project could not load.'); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, [projectId]);
  useEffect(() => { if (params.view === 'vault') setMode('vault'); }, [params.view]);
  const activeGoals = useMemo(() => project?.goals.filter((goal) => goal.status === 'active') ?? [], [project]);
  const historyGoals = useMemo(() => project?.goals.filter((goal) => goal.status !== 'active') ?? [], [project]);
  const sticky = useMemo(() => project?.vaultItems.filter(isStickyVaultItem) ?? [], [project]);
  const notes = project?.entries.filter((entry) => entry.entryType === 'note') ?? [];
  const reflections = project?.entries.filter((entry) => entry.entryType === 'reflection') ?? [];
  const sources = project?.vaultItems.filter(isSourceVaultItem) ?? [];
  const momentumByGoal = useMemo(() => new Map((momentum.summary?.goals ?? []).map((item) => [item.goalId, item])), [momentum.summary]);

  function switchMode(next: 'overview' | 'vault', vaultFilter: VaultFilter = 'all') { setMode(next); router.setParams({ view: next === 'vault' ? 'vault' : undefined, vaultFilter: next === 'vault' && vaultFilter !== 'all' ? vaultFilter : undefined }); }
  async function openGoalPicker() {
    setFormError(null); setConfirmMove(false); setSelectedGoalIds([]); setAddGoalOpen(true);
    try { const { data: { user } } = await supabase.auth.getUser(); if (user) setOwnedGoals(await fetchOwnedGoalsForProjects(user.id)); }
    catch { setFormError('Goals could not be loaded.'); }
  }
  async function addGoals() {
    if (!project || !selectedGoalIds.length || busy) return;
    const hasConflict = ownedGoals.some((goal) => selectedGoalIds.includes(goal.id) && goal.projectId && goal.projectId !== project.id);
    if (hasConflict && !confirmMove) { setConfirmMove(true); setFormError('Selected Goals already belong to another Project. Continue to explicitly reassign them.'); return; }
    setBusy(true); setFormError(null);
    try { await assignGoalsToProject(project.id, selectedGoalIds, confirmMove); setAddGoalOpen(false); await load(); }
    catch (caught) { setFormError(caught instanceof Error ? caught.message : 'Goals could not be added.'); }
    finally { setBusy(false); }
  }
  function openManage(tab: 'details' | 'goals' | 'lifecycle' = 'details') { if (!project) return; setTitle(project.title); setDescription(project.description ?? ''); setManageTab(tab); setFormError(null); setManageOpen(true); }
  async function saveDetails() { if (!project || !title.trim()) return; setBusy(true); try { await updateProject(project.id, { title, description }); setManageOpen(false); await load(); } catch (caught) { setFormError(caught instanceof Error ? caught.message : 'Project could not be updated.'); } finally { setBusy(false); } }
  async function setStatus(status: ProjectStatus) { if (!project) return; setBusy(true); try { await updateProject(project.id, { status }); setManageOpen(false); await load(); } catch (caught) { setFormError(caught instanceof Error ? caught.message : 'Project status could not be updated.'); } finally { setBusy(false); } }
  async function detach(goalId: string) { if (!project) return; setBusy(true); try { await detachGoalFromProject(project.id, goalId); await load(); } catch (caught) { setFormError(caught instanceof Error ? caught.message : 'Goal could not be detached.'); } finally { setBusy(false); } }

  if (loading) return <View style={{ alignItems: 'center', flex: 1, justifyContent: 'center' }}><ActivityIndicator color={colors.accent.primary} /></View>;
  if (!project || error) return <View style={{ alignItems: 'center', flex: 1, gap: SPACE.lg, justifyContent: 'center' }}><Typography variant="body">{error ?? 'Project not found.'}</Typography><Button variant="secondary" onPress={() => router.push('/(app)/projects')}>Back to Projects</Button></View>;
  const lastActivity = project.activity[0]?.occurredAt ?? project.updated_at;
  const actionLink = (label: string, onPress: () => void) => <Pressable accessibilityRole="button" onPress={onPress} style={{ alignSelf: 'flex-start', justifyContent: 'center', minHeight: 44 }}><Typography variant="emphasis-sm" style={{ color: colors.text.accent }}>{label} →</Typography></Pressable>;
  const projectHeader = <Surface>
    <View style={{ gap: SPACE.sm }}><Typography accessibilityRole="header" variant="heading">{project.title}</Typography>{project.description ? <Typography variant="body">{project.description}</Typography> : null}<Typography variant="caption">{activeGoals.length} active {activeGoals.length === 1 ? 'Goal' : 'Goals'} · Updated {new Date(lastActivity).toLocaleDateString()}</Typography></View>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.md }}><Button accessibilityLabel="Vault" leftIcon={<VaultIcon color={colors.text.onAccent} size={18} />} onPress={() => switchMode('vault')}>Vault</Button><Button onPress={() => openManage()}>Manage Project ▾</Button></View>
  </Surface>;
  const currentGoalsCard = <Surface title="Current Goals">
    {activeGoals.length ? <View style={{ gap: SPACE.sm }}>{activeGoals.slice(0, 3).map((goal) => <ProjectGoalRow goal={goal} key={goal.id} />)}</View> : <Typography variant="body">No active Goals yet.</Typography>}
    <View style={{ alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.lg, justifyContent: 'space-between' }}>{actionLink('+ Add Goal', () => void openGoalPicker())}{historyGoals.length ? actionLink('View history', () => openManage('goals')) : null}</View>
  </Surface>;
  const entryCard = (kind: 'note' | 'reflection') => {
    const items = kind === 'note' ? notes : reflections;
    const label = kind === 'note' ? 'Notes' : 'Reflections';
    return <Surface title={label}><Typography variant="caption">{items.length} linked {items.length === 1 ? kind : `${label.toLowerCase()}`}</Typography>{items.slice(0, 2).map((entry) => <Pressable accessibilityRole="button" key={entry.id} onPress={() => router.push({ pathname: '/(app)/entries/[id]' as never, params: { id: entry.id } })} style={({ pressed }) => ({ borderBottomColor: colors.border.divider, borderBottomWidth: 1, gap: SPACE.xs, opacity: pressed ? 0.7 : 1, paddingBottom: SPACE.md })}><Typography variant="emphasis-sm" numberOfLines={1}>{entry.title || 'Untitled'}</Typography>{entry.plainText ? <Typography variant="caption" numberOfLines={2}>{entry.plainText}</Typography> : null}<Typography variant="caption">{entry.goals.length ? `From: ${entry.goals.filter((goal) => goal.projectId === project.id).map((goal) => goal.title).join(', ') || project.title}` : project.title}</Typography></Pressable>)}{!items.length ? <Typography variant="body-small">No linked {label.toLowerCase()} yet.</Typography> : null}{actionLink(kind === 'note' ? 'Open Notes' : 'View reflections', () => switchMode('vault', kind === 'note' ? 'notes' : 'reflections'))}</Surface>;
  };
  const intelligenceCard = <Surface intelligence title="OHARA Intelligence"><Typography variant="body">Project insights will eventually use your Goals, Vault sources, and Reflections together.</Typography></Surface>;
  const tasksCard = <Surface title="Project Tasks">{project.taskPreviews.length ? project.taskPreviews.slice(0, 5).map((task) => <Pressable accessibilityRole="button" key={task.id} onPress={() => router.push(`/(app)/goals/${task.goalId}` as never)} style={({ pressed }) => ({ borderBottomColor: colors.border.divider, borderBottomWidth: 1, gap: SPACE.xs, opacity: pressed ? 0.7 : 1, paddingBottom: SPACE.md })}><View style={{ alignItems: 'center', flexDirection: 'row', gap: SPACE.sm }}><Ionicons color={task.timing === 'overdue' ? colors.feedback.danger.text : colors.accent.primary} name="ellipse-outline" size={16} /><Typography variant="emphasis-sm" numberOfLines={1} style={{ flex: 1 }}>{task.title}</Typography><Typography variant="caption">{task.timing === 'anytime' ? 'Anytime' : task.timing[0].toUpperCase() + task.timing.slice(1)}</Typography></View><Typography variant="caption">From: {task.goalTitle}</Typography></Pressable>) : <Typography variant="body-small">No active Goal Tasks need attention.</Typography>}{project.taskPreviews.length ? actionLink('View all', () => router.push(`/(app)/goals/${project.taskPreviews[0].goalId}` as never)) : null}</Surface>;
  const snapshotRow = (label: string, value: string | number, filter?: VaultFilter) => <Pressable accessibilityRole={filter ? 'button' : undefined} onPress={filter ? () => switchMode('vault', filter) : undefined} style={{ alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', minHeight: 34 }}><Typography variant="body-small">{label}</Typography><Typography variant="emphasis-sm" style={filter ? { color: colors.text.accent } : undefined}>{value}</Typography></Pressable>;
  const snapshotCard = <Surface title="Project Snapshot">{snapshotRow('Active Goals', activeGoals.length)}{snapshotRow('Sticky Notes', sticky.length, 'sticky')}{snapshotRow('Notes', notes.length, 'notes')}{snapshotRow('Reflections', reflections.length, 'reflections')}{snapshotRow('Sources', sources.length, 'sources')}<Typography variant="caption">Last activity {new Date(lastActivity).toLocaleDateString()}</Typography></Surface>;
  const momentumCard = <Surface title="Momentum Snapshot">{activeGoals.slice(0, 5).map((goal) => { const summary = momentumByGoal.get(goal.id); const delta = summary?.weeklyChange; const stable = delta !== undefined && Math.abs(delta) < 1; const direction = stable ? '→' : (delta ?? 0) > 0 ? '↗' : '↘'; return <Pressable accessibilityRole="button" key={goal.id} onPress={() => router.push(`/(app)/goals/${goal.id}` as never)} style={({ pressed }) => ({ borderBottomColor: colors.border.divider, borderBottomWidth: 1, gap: SPACE.xs, opacity: pressed ? 0.7 : 1, paddingBottom: SPACE.md })}><Typography variant="emphasis-sm" numberOfLines={1}>{goal.title}</Typography><View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Typography variant="body-small">{summary ? `${summary.displayedValue} / 100` : momentum.isLoading ? 'Loading…' : 'Unavailable'}</Typography>{summary ? <Typography variant="caption" style={{ color: stable ? colors.text.muted : (delta ?? 0) > 0 ? colors.text.accent : colors.feedback.danger.text }}>{direction} {stable ? 'stable' : `${(delta ?? 0) > 0 ? '+' : ''}${Math.round((delta ?? 0) * 10) / 10} this week`}</Typography> : null}</View></Pressable>; })}{!activeGoals.length ? <Typography variant="body-small">Active Goal Momentum will appear here.</Typography> : null}{actionLink('View Momentum', () => router.push('/(app)/momentum'))}</Surface>;
  const activityCard = <Surface title="Recent Activity">{project.activity.slice(0, 5).map((item) => <View key={item.id} style={{ borderBottomColor: colors.border.divider, borderBottomWidth: 1, gap: SPACE.xs, paddingBottom: SPACE.md }}><Typography variant="body-small" numberOfLines={1}>{item.label}</Typography><Typography variant="caption">{item.origin ? `${item.origin} · ` : ''}{new Date(item.occurredAt).toLocaleDateString()}</Typography></View>)}{!project.activity.length ? <Typography variant="body-small">Meaningful Project activity will appear here.</Typography> : null}{project.activity.length ? actionLink('View all', () => setActivityOpen(true)) : null}</Surface>;

  return <>
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ alignSelf: 'center', gap: SPACE.xl, maxWidth: 1520, padding: compact ? SPACE.xl : LAYOUT.wideGutter, width: '100%' }}>
      <Pressable onPress={() => router.push('/(app)/projects')} style={{ alignItems: 'center', alignSelf: 'flex-start', flexDirection: 'row', gap: SPACE.sm, minHeight: 40 }}><Ionicons color={colors.text.accent} name="folder-outline" size={18} /><Typography variant="nav-back">Projects  ›  {project.title}</Typography></Pressable>

      {project.partialErrors.length ? <Surface><View style={{ alignItems: compact ? 'stretch' : 'center', flexDirection: compact ? 'column' : 'row', gap: SPACE.md, justifyContent: 'space-between' }}><Typography variant="body-small">Some Project content couldn’t load: {project.partialErrors.join(', ')}.</Typography><Button size="compact" variant="secondary" onPress={() => void load()}>Retry</Button></View></Surface> : null}

      {mode === 'vault' ? <><View style={{ alignItems: compact ? 'stretch' : 'center', flexDirection: compact ? 'column' : 'row', gap: SPACE.xl, justifyContent: 'space-between' }}><View style={{ flex: 1, gap: SPACE.xs }}><Typography accessibilityRole="header" variant="heading">{project.title}</Typography><View style={{ alignItems: 'center', flexDirection: 'row', gap: SPACE.sm }}><Badge label={project.status} variant={project.status === 'active' ? 'active' : project.status === 'complete' ? 'complete' : 'archived'} /><Typography variant="caption">Project Vault</Typography></View></View><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.md }}><Button accessibilityLabel="Overview" leftIcon={<Ionicons color={colors.text.onAccent} name="arrow-back" size={17} />} onPress={() => switchMode('overview')}>Overview</Button><Button accessibilityLabel="Add to Vault" leftIcon={<Ionicons color={colors.text.onAccent} name="add" size={18} />} onPress={() => setAddRequest((value) => value + 1)}>Add to Vault</Button></View></View><ProjectVaultWorkspace addRequest={addRequest} initialFilter={params.vaultFilter} project={project} /></> : desktop ? <View style={{ alignItems: 'flex-start', flexDirection: 'row', gap: SPACE.xl }}>
        <View style={{ flexBasis: '24%', gap: SPACE.xl, minWidth: 260 }}>{currentGoalsCard}{entryCard('note')}{entryCard('reflection')}</View>
        <View style={{ flex: 1, gap: SPACE.xl, minWidth: 420 }}>{projectHeader}{intelligenceCard}{tasksCard}</View>
        <View style={{ flexBasis: '28%', gap: SPACE.xl, minWidth: 300 }}>{snapshotCard}{momentumCard}{activityCard}</View>
      </View> : <View style={{ gap: SPACE.xl }}>{projectHeader}{currentGoalsCard}{intelligenceCard}{tasksCard}{snapshotCard}{momentumCard}{entryCard('note')}{entryCard('reflection')}{activityCard}</View>}
    </ScrollView>

    <Modal visible={activityOpen} onClose={() => setActivityOpen(false)} showCloseButton contentStyle={{ maxWidth: 720, maxHeight: '85%' }}><View style={{ gap: SPACE.lg }}><Typography variant="heading">Project Activity</Typography><ScrollView contentContainerStyle={{ gap: SPACE.md }}>{project.activity.map((item) => <View key={item.id} style={{ borderBottomColor: colors.border.divider, borderBottomWidth: 1, gap: SPACE.xs, paddingBottom: SPACE.md }}><Typography variant="body-small">{item.label}</Typography><Typography variant="caption">{item.origin ? `${item.origin} · ` : ''}{new Date(item.occurredAt).toLocaleString()}</Typography></View>)}</ScrollView></View></Modal>

    <Modal visible={addGoalOpen} onClose={() => !busy && setAddGoalOpen(false)} showCloseButton={false} cancelText="Cancel" onCancel={() => setAddGoalOpen(false)} confirmText={confirmMove ? 'Confirm reassignment' : 'Add selected Goals'} onConfirm={() => void addGoals()} confirmDisabled={!selectedGoalIds.length || busy} contentStyle={{ maxWidth: 560, maxHeight: '90%' }}>
      <Typography variant="title" style={{ marginBottom: SPACE.sm }}>Add Goals</Typography><Typography variant="body" style={{ marginBottom: SPACE.lg }}>Choose owned Goals. Existing Project assignments are never changed silently.</Typography><ScrollView style={{ maxHeight: 340 }} contentContainerStyle={{ gap: SPACE.sm }}>{ownedGoals.map((goal) => { const selected = selectedGoalIds.includes(goal.id); return <Pressable key={goal.id} accessibilityRole="checkbox" accessibilityState={{ checked: selected }} onPress={() => { setSelectedGoalIds((current) => selected ? current.filter((id) => id !== goal.id) : [...current, goal.id]); setConfirmMove(false); setFormError(null); }} style={{ backgroundColor: selected ? colors.background.selectedRow : colors.background.subtle, borderColor: selected ? colors.border.accent : colors.border.divider, borderRadius: RADIUS.md, borderWidth: 1, padding: SPACE.lg }}><Typography variant="emphasis-sm">{goal.title}</Typography><Typography variant="caption">{goal.category}{goal.projectId && goal.projectId !== project.id ? ' · Currently in another Project' : ''}</Typography></Pressable>; })}</ScrollView>{formError ? <Typography variant="caption" style={{ color: confirmMove ? colors.feedback.pending.text : colors.feedback.danger.text, marginTop: SPACE.md }}>{formError}</Typography> : null}
    </Modal>

    <Modal visible={manageOpen} onClose={() => !busy && setManageOpen(false)} showCloseButton={false} contentStyle={{ maxWidth: 620, maxHeight: '90%', padding: 0 }}>
      <View style={{ padding: SPACE['3xl'], paddingBottom: 0 }}><Typography variant="heading">Manage Project</Typography><View accessibilityRole="tablist" style={{ borderBottomColor: colors.border.divider, borderBottomWidth: 1, flexDirection: 'row', marginTop: SPACE.xl }}>{(['details', 'goals', 'lifecycle'] as const).map((tab) => <Pressable key={tab} accessibilityRole="tab" accessibilityState={{ selected: manageTab === tab }} onPress={() => setManageTab(tab)} style={{ borderBottomColor: manageTab === tab ? colors.accent.primary : 'transparent', borderBottomWidth: 2, minHeight: 42, justifyContent: 'center', paddingHorizontal: SPACE.lg }}><Typography variant="emphasis-sm">{tab === 'details' ? 'Details' : tab === 'goals' ? 'Goals' : 'Lifecycle'}</Typography></Pressable>)}</View></View>
      <ScrollView contentContainerStyle={{ gap: SPACE.xl, padding: SPACE['3xl'] }}>{manageTab === 'details' ? <><TextInput accessibilityLabel="Project name" value={title} onChangeText={setTitle} style={{ backgroundColor: colors.background.input, borderColor: colors.border.input, borderRadius: RADIUS.md, borderWidth: 1, color: colors.text.primary, padding: 12 }} /><TextInput accessibilityLabel="Project description" multiline value={description} onChangeText={setDescription} style={{ backgroundColor: colors.background.input, borderColor: colors.border.input, borderRadius: RADIUS.md, borderWidth: 1, color: colors.text.primary, minHeight: 100, padding: 12, textAlignVertical: 'top' }} /><Button loading={busy} disabled={!title.trim()} onPress={() => void saveDetails()}>Save details</Button></> : manageTab === 'goals' ? <>{project.goals.map((goal) => <View key={goal.id} style={{ alignItems: 'center', borderBottomColor: colors.border.divider, borderBottomWidth: 1, flexDirection: 'row', gap: SPACE.md, paddingVertical: SPACE.md }}><View style={{ flex: 1 }}><Typography variant="emphasis-sm">{goal.title}</Typography><Typography variant="caption">{goal.category} · {goal.status}</Typography></View><Button size="compact" variant="secondary" disabled={busy} onPress={() => void detach(goal.id)}>Detach</Button></View>)}<Button onPress={() => { setManageOpen(false); void openGoalPicker(); }}>Add Goals</Button></> : <><Typography variant="body">Current status: {project.status}</Typography><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.md }}><Button disabled={busy || project.status === 'active'} onPress={() => void setStatus('active')}>Set active</Button><Button disabled={busy || project.status === 'complete'} onPress={() => void setStatus('complete')}>Complete</Button></View><View style={{ borderTopColor: colors.border.divider, borderTopWidth: 1, gap: SPACE.md, paddingTop: SPACE.xl }}><Typography variant="eyebrow">Archive</Typography><Typography variant="caption">Archiving preserves Goal associations and Project-owned content.</Typography><Button variant="danger" disabled={busy || project.status === 'archived'} onPress={() => void setStatus('archived')}>Archive Project</Button></View></>}{formError ? <Typography variant="caption" style={{ color: colors.feedback.danger.text }}>{formError}</Typography> : null}<View style={{ alignItems: 'flex-end', borderTopColor: colors.border.divider, borderTopWidth: 1, paddingTop: SPACE.lg }}><Button variant="secondary" disabled={busy} onPress={() => setManageOpen(false)}>Done</Button></View></ScrollView>
    </Modal>
  </>;
}
