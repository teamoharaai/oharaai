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
import { isStickyVaultItem } from '@/features/goals/vault-classification';
import { ProjectVaultWorkspace } from '@/features/projects/components/ProjectVaultWorkspace';
import { assignGoalsToProject, detachGoalFromProject, fetchOwnedGoalsForProjects, fetchProjectWorkspace, updateProject } from '@/features/projects/services/project-service';
import type { GoalWithDetails } from '@/features/goals/types';
import type { ProjectStatus, ProjectWorkspace } from '@/features/projects/types';

function Surface({ children, title }: { children: ReactNode; title?: string }) {
  const colors = useThemeColors();
  return <View style={{ backgroundColor: colors.background.card, borderColor: colors.border.warmSubtle, borderRadius: RADIUS.xl, borderWidth: 1, gap: SPACE.lg, padding: SPACE.xl }}>{title ? <Typography variant="section-header">{title}</Typography> : null}{children}</View>;
}

export default function ProjectDetailScreen() {
  const colors = useThemeColors();
  const { width } = useWindowDimensions();
  const desktop = width >= 1120;
  const compact = width < 720;
  const params = useLocalSearchParams<{ id: string; view?: string }>();
  const projectId = Array.isArray(params.id) ? params.id[0] : params.id;
  const [project, setProject] = useState<ProjectWorkspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'overview' | 'vault'>(params.view === 'vault' ? 'vault' : 'overview');
  const [addRequest, setAddRequest] = useState(0);
  const [addGoalOpen, setAddGoalOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [manageTab, setManageTab] = useState<'details' | 'goals' | 'lifecycle'>('details');
  const [ownedGoals, setOwnedGoals] = useState<GoalWithDetails[]>([]);
  const [selectedGoalIds, setSelectedGoalIds] = useState<string[]>([]);
  const [confirmMove, setConfirmMove] = useState(false);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

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
  const sources = project?.vaultItems.filter((item) => !isStickyVaultItem(item)) ?? [];

  function switchMode(next: 'overview' | 'vault') { setMode(next); router.setParams({ view: next === 'vault' ? 'vault' : undefined }); }
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
  function openManage() { if (!project) return; setTitle(project.title); setDescription(project.description ?? ''); setManageTab('details'); setFormError(null); setManageOpen(true); }
  async function saveDetails() { if (!project || !title.trim()) return; setBusy(true); try { await updateProject(project.id, { title, description }); setManageOpen(false); await load(); } catch (caught) { setFormError(caught instanceof Error ? caught.message : 'Project could not be updated.'); } finally { setBusy(false); } }
  async function setStatus(status: ProjectStatus) { if (!project) return; setBusy(true); try { await updateProject(project.id, { status }); setManageOpen(false); await load(); } catch (caught) { setFormError(caught instanceof Error ? caught.message : 'Project status could not be updated.'); } finally { setBusy(false); } }
  async function detach(goalId: string) { if (!project) return; setBusy(true); try { await detachGoalFromProject(project.id, goalId); await load(); } catch (caught) { setFormError(caught instanceof Error ? caught.message : 'Goal could not be detached.'); } finally { setBusy(false); } }

  if (loading) return <View style={{ alignItems: 'center', flex: 1, justifyContent: 'center' }}><ActivityIndicator color={colors.accent.primary} /></View>;
  if (!project || error) return <View style={{ alignItems: 'center', flex: 1, gap: SPACE.lg, justifyContent: 'center' }}><Typography variant="body">{error ?? 'Project not found.'}</Typography><Button variant="secondary" onPress={() => router.push('/(app)/projects')}>Back to Projects</Button></View>;
  const lastActivity = project.activity[0]?.occurredAt ?? project.updated_at;

  return <>
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ alignSelf: 'center', gap: SPACE.xl, maxWidth: LAYOUT.contentMaxWidth, padding: compact ? SPACE.xl : LAYOUT.wideGutter, width: '100%' }}>
      <Pressable onPress={() => router.push('/(app)/projects')}><Typography variant="nav-back">Projects  ›  {project.title}</Typography></Pressable>
      <View style={{ alignItems: compact ? 'stretch' : 'center', flexDirection: compact ? 'column' : 'row', gap: SPACE.xl, justifyContent: 'space-between' }}>
        <View style={{ flex: 1, gap: SPACE.sm }}><View style={{ alignItems: 'center', flexDirection: 'row', gap: SPACE.md }}><View style={{ alignItems: 'center', backgroundColor: colors.background.selectedRow, borderRadius: RADIUS.lg, height: 54, justifyContent: 'center', width: 54 }}><Ionicons color={colors.accent.primary} name="folder-open-outline" size={27} /></View><View style={{ flex: 1 }}><Typography accessibilityRole="header" variant="heading">{project.title}</Typography><View style={{ flexDirection: 'row', gap: SPACE.sm, marginTop: SPACE.xs }}><Badge label={project.status} variant={project.status === 'active' ? 'active' : project.status === 'complete' ? 'complete' : 'archived'} /><Typography variant="caption">{activeGoals.length} active Goals · Updated {new Date(lastActivity).toLocaleDateString()}</Typography></View></View></View>{project.description ? <Typography variant="body">{project.description}</Typography> : null}</View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.md }}>{mode === 'vault' ? <><Button accessibilityLabel="Overview" leftIcon={<Ionicons color={colors.text.onAccent} name="arrow-back" size={17} />} onPress={() => switchMode('overview')}>Overview</Button><Button accessibilityLabel="Add to Vault" leftIcon={<Ionicons color={colors.text.onAccent} name="add" size={18} />} onPress={() => setAddRequest((value) => value + 1)}>Add to Vault</Button></> : <><Button accessibilityLabel="Vault" leftIcon={<VaultIcon color={colors.text.onAccent} size={18} />} onPress={() => switchMode('vault')}>Vault</Button><Button onPress={openManage}>Manage Project ▾</Button></>}</View>
      </View>

      {project.partialErrors.length ? <Surface><View style={{ alignItems: compact ? 'stretch' : 'center', flexDirection: compact ? 'column' : 'row', gap: SPACE.md, justifyContent: 'space-between' }}><Typography variant="body-small">Some Project content couldn’t load: {project.partialErrors.join(', ')}.</Typography><Button size="compact" variant="secondary" onPress={() => void load()}>Retry</Button></View></Surface> : null}

      {mode === 'vault' ? <ProjectVaultWorkspace addRequest={addRequest} project={project} /> : <View style={{ alignItems: 'flex-start', flexDirection: desktop ? 'row' : 'column', gap: SPACE.xl }}>
        <View style={{ gap: SPACE.xl, width: desktop ? 240 : '100%' }}>
          <Surface title="Goals"><Typography variant="body">{activeGoals.length} active · {historyGoals.length} historical</Typography><Button size="compact" onPress={() => void openGoalPicker()}>Add Goal</Button></Surface>
          <Surface title="Project Content"><Typography variant="body-small">{sticky.length} Sticky Notes</Typography><Typography variant="body-small">{notes.length} Notes</Typography><Typography variant="body-small">{reflections.length} Reflections</Typography><Typography variant="body-small">{sources.length} Sources</Typography></Surface>
        </View>
        <View style={{ flex: 1, gap: SPACE.xl, minWidth: 0, width: desktop ? undefined : '100%' }}>
          <Surface title="Current Goals">{activeGoals.length ? <View style={{ gap: SPACE.sm }}>{activeGoals.map((goal) => <ProjectGoalRow goal={goal} key={goal.id} />)}</View> : <View style={{ alignItems: 'center', gap: SPACE.md, paddingVertical: SPACE['3xl'] }}><Typography variant="body">No Goals yet. Add an existing Goal to begin.</Typography><Button onPress={() => void openGoalPicker()}>Add Goal</Button></View>}{historyGoals.length ? <View style={{ borderTopColor: colors.border.divider, borderTopWidth: 1, gap: SPACE.sm, paddingTop: SPACE.lg }}><Typography variant="eyebrow">Goal History</Typography>{historyGoals.map((goal) => <ProjectGoalRow goal={goal} key={goal.id} />)}</View> : null}</Surface>
          <Surface title="Recent Activity">{project.activity.length ? project.activity.slice(0, 10).map((item) => <View key={item.id} style={{ borderBottomColor: colors.border.divider, borderBottomWidth: 1, gap: SPACE.xs, paddingVertical: SPACE.md }}><Typography variant="body-small">{item.label}</Typography><Typography variant="caption">{item.origin ? `${item.origin} · ` : ''}{new Date(item.occurredAt).toLocaleDateString()}</Typography></View>) : <Typography variant="body">Meaningful Project activity will appear here.</Typography>}</Surface>
          <Surface title="Sticky Notes"><View style={{ flexDirection: compact ? 'column' : 'row', flexWrap: 'wrap', gap: SPACE.md }}>{sticky.slice(0, 3).map((item) => <View key={item.id} style={{ backgroundColor: colors.background.selectedRow, borderColor: colors.border.accent, borderRadius: RADIUS.lg, borderWidth: 1, flexBasis: 220, flexGrow: 1, gap: SPACE.sm, padding: SPACE.lg }}><Typography variant="emphasis-sm">{item.title || 'Untitled'}</Typography>{item.content ? <Typography variant="body-small" numberOfLines={3}>{item.content}</Typography> : null}<Typography variant="caption">Private to you</Typography><Typography variant="caption">{item.origins.length ? `From: ${item.origins.map((origin) => origin.goalTitle).join(', ')}` : 'Project note'}</Typography></View>)}{!sticky.length ? <Typography variant="body">No Sticky Notes yet.</Typography> : null}</View><Pressable onPress={() => switchMode('vault')}><Typography variant="emphasis-sm" style={{ color: colors.text.accent }}>View all →</Typography></Pressable></Surface>
        </View>
        <View style={{ gap: SPACE.xl, width: desktop ? 300 : '100%' }}>
          <Surface title="OHARA Intelligence"><Typography variant="body">Project insights will eventually use your Goals, Vault sources, and Reflections together.</Typography></Surface>
          <Surface title="Project Snapshot"><Typography variant="body-small">{activeGoals.length} Active Goals</Typography><Typography variant="body-small">{sticky.length} Sticky Notes</Typography><Typography variant="body-small">{notes.length} Notes</Typography><Typography variant="body-small">{reflections.length} Reflections</Typography><Typography variant="body-small">{sources.length} Sources</Typography><Typography variant="caption">Last activity {new Date(lastActivity).toLocaleDateString()}</Typography></Surface>
        </View>
      </View>}
    </ScrollView>

    <Modal visible={addGoalOpen} onClose={() => !busy && setAddGoalOpen(false)} showCloseButton={false} cancelText="Cancel" onCancel={() => setAddGoalOpen(false)} confirmText={confirmMove ? 'Confirm reassignment' : 'Add selected Goals'} onConfirm={() => void addGoals()} confirmDisabled={!selectedGoalIds.length || busy} contentStyle={{ maxWidth: 560, maxHeight: '90%' }}>
      <Typography variant="title" style={{ marginBottom: SPACE.sm }}>Add Goals</Typography><Typography variant="body" style={{ marginBottom: SPACE.lg }}>Choose owned Goals. Existing Project assignments are never changed silently.</Typography><ScrollView style={{ maxHeight: 340 }} contentContainerStyle={{ gap: SPACE.sm }}>{ownedGoals.map((goal) => { const selected = selectedGoalIds.includes(goal.id); return <Pressable key={goal.id} accessibilityRole="checkbox" accessibilityState={{ checked: selected }} onPress={() => { setSelectedGoalIds((current) => selected ? current.filter((id) => id !== goal.id) : [...current, goal.id]); setConfirmMove(false); setFormError(null); }} style={{ backgroundColor: selected ? colors.background.selectedRow : colors.background.subtle, borderColor: selected ? colors.border.accent : colors.border.divider, borderRadius: RADIUS.md, borderWidth: 1, padding: SPACE.lg }}><Typography variant="emphasis-sm">{goal.title}</Typography><Typography variant="caption">{goal.category}{goal.projectId && goal.projectId !== project.id ? ' · Currently in another Project' : ''}</Typography></Pressable>; })}</ScrollView>{formError ? <Typography variant="caption" style={{ color: confirmMove ? colors.feedback.pending.text : colors.feedback.danger.text, marginTop: SPACE.md }}>{formError}</Typography> : null}
    </Modal>

    <Modal visible={manageOpen} onClose={() => !busy && setManageOpen(false)} showCloseButton={false} contentStyle={{ maxWidth: 620, maxHeight: '90%', padding: 0 }}>
      <View style={{ padding: SPACE['3xl'], paddingBottom: 0 }}><Typography variant="heading">Manage Project</Typography><View accessibilityRole="tablist" style={{ borderBottomColor: colors.border.divider, borderBottomWidth: 1, flexDirection: 'row', marginTop: SPACE.xl }}>{(['details', 'goals', 'lifecycle'] as const).map((tab) => <Pressable key={tab} accessibilityRole="tab" accessibilityState={{ selected: manageTab === tab }} onPress={() => setManageTab(tab)} style={{ borderBottomColor: manageTab === tab ? colors.accent.primary : 'transparent', borderBottomWidth: 2, minHeight: 42, justifyContent: 'center', paddingHorizontal: SPACE.lg }}><Typography variant="emphasis-sm">{tab === 'details' ? 'Details' : tab === 'goals' ? 'Goals' : 'Lifecycle'}</Typography></Pressable>)}</View></View>
      <ScrollView contentContainerStyle={{ gap: SPACE.xl, padding: SPACE['3xl'] }}>{manageTab === 'details' ? <><TextInput accessibilityLabel="Project name" value={title} onChangeText={setTitle} style={{ backgroundColor: colors.background.input, borderColor: colors.border.input, borderRadius: RADIUS.md, borderWidth: 1, color: colors.text.primary, padding: 12 }} /><TextInput accessibilityLabel="Project description" multiline value={description} onChangeText={setDescription} style={{ backgroundColor: colors.background.input, borderColor: colors.border.input, borderRadius: RADIUS.md, borderWidth: 1, color: colors.text.primary, minHeight: 100, padding: 12, textAlignVertical: 'top' }} /><Button loading={busy} disabled={!title.trim()} onPress={() => void saveDetails()}>Save details</Button></> : manageTab === 'goals' ? <>{project.goals.map((goal) => <View key={goal.id} style={{ alignItems: 'center', borderBottomColor: colors.border.divider, borderBottomWidth: 1, flexDirection: 'row', gap: SPACE.md, paddingVertical: SPACE.md }}><View style={{ flex: 1 }}><Typography variant="emphasis-sm">{goal.title}</Typography><Typography variant="caption">{goal.category} · {goal.status}</Typography></View><Button size="compact" variant="secondary" disabled={busy} onPress={() => void detach(goal.id)}>Detach</Button></View>)}<Button onPress={() => { setManageOpen(false); void openGoalPicker(); }}>Add Goals</Button></> : <><Typography variant="body">Current status: {project.status}</Typography><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.md }}><Button disabled={busy || project.status === 'active'} onPress={() => void setStatus('active')}>Set active</Button><Button disabled={busy || project.status === 'complete'} onPress={() => void setStatus('complete')}>Complete</Button></View><View style={{ borderTopColor: colors.border.divider, borderTopWidth: 1, gap: SPACE.md, paddingTop: SPACE.xl }}><Typography variant="eyebrow">Archive</Typography><Typography variant="caption">Archiving preserves Goal associations and Project-owned content.</Typography><Button variant="danger" disabled={busy || project.status === 'archived'} onPress={() => void setStatus('archived')}>Archive Project</Button></View></>}{formError ? <Typography variant="caption" style={{ color: colors.feedback.danger.text }}>{formError}</Typography> : null}<View style={{ alignItems: 'flex-end', borderTopColor: colors.border.divider, borderTopWidth: 1, paddingTop: SPACE.lg }}><Button variant="secondary" disabled={busy} onPress={() => setManageOpen(false)}>Done</Button></View></ScrollView>
    </Modal>
  </>;
}
