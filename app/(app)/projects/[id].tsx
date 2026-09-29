import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, TextInput, View, useWindowDimensions } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Badge } from '@/components/ui/Badge';
import { BrandIcon } from '@/components/ui/BrandIcon';
import { Button } from '@/components/ui/Button';
import { IntelligenceHeader } from '@/components/ui/IntelligenceHeader';
import { Modal } from '@/components/ui/Modal';
import { Typography } from '@/components/ui/Typography';
import { VaultIcon } from '@/components/ui/VaultIcon';
import { LAYOUT, RADIUS, SPACE } from '@/constants/design';
import { useThemeColors } from '@/store/uiStore';
import supabase from '@/lib/db/client';
import { goalWorkspaceHref as baseGoalWorkspaceHref } from '@/features/goals/navigation';
import { isSourceVaultItem, isStickyVaultItem } from '@/features/goals/vault-classification';
import type { VaultFilter } from '@/features/goals/components/GoalVault';
import { ProjectVaultWorkspace } from '@/features/projects/components/ProjectVaultWorkspace';
import { ManageProjectModal } from '@/features/projects/components/ManageProjectModal';
import { ProjectComments } from '@/features/projects/components/ProjectComments';
import { ProjectChat } from '@/features/projects/components/ProjectChat';
import { assignGoalsToProject, assignProjectTask, createProjectComment, deleteProjectComment, editProjectComment, fetchOwnedGoalsForProjects, fetchProjectWorkspace, setEntryProjectShare } from '@/features/projects/services/project-service';
import { buildProjectIntelligence } from '@/features/projects/intelligence';
import { useMomentumHomeSummary } from '@/features/momentum/hooks/useMomentumHomeSummary';
import type { GoalWithDetails } from '@/features/goals/types';
import type { ProjectWorkspace } from '@/features/projects/types';

function Surface({ accessibilityLabel, children, intelligence = false, title }: { accessibilityLabel?: string; children: ReactNode; intelligence?: boolean; title?: string }) {
  const colors = useThemeColors();
  return <View accessibilityLabel={accessibilityLabel} style={{ backgroundColor: intelligence ? colors.background.selectedRow : colors.background.card, borderColor: intelligence ? colors.border.accent : colors.border.warmSubtle, borderRadius: RADIUS.xl, borderWidth: 1, gap: SPACE.lg, padding: SPACE.xl }}>{title ? <View style={{ alignItems: 'center', flexDirection: 'row', gap: SPACE.sm }}>{intelligence ? <BrandIcon color={colors.accent.primary} name="echo" size={19} /> : null}<Typography variant="section-header" style={intelligence ? { color: colors.text.accent } : undefined}>{title}</Typography></View> : null}{children}</View>;
}

export default function ProjectDetailScreen() {
  const colors = useThemeColors();
  const { width } = useWindowDimensions();
  const desktop = width >= 1120;
  const compact = width < 720;
  const params = useLocalSearchParams<{ id: string; view?: string; vaultFilter?: VaultFilter }>();
  const projectId = Array.isArray(params.id) ? params.id[0] : params.id;
  const goalWorkspaceHref = (goalId: string, status?: Parameters<typeof baseGoalWorkspaceHref>[1]) => (
    baseGoalWorkspaceHref(goalId, status, { projectId })
  );
  const [project, setProject] = useState<ProjectWorkspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'overview' | 'vault'>(params.view === 'vault' ? 'vault' : 'overview');
  const [addRequest, setAddRequest] = useState(0);
  const [addGoalOpen, setAddGoalOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [manageInitialTab, setManageInitialTab] = useState<'details' | 'goals' | 'members' | 'access' | 'status'>('details');
  const [activityOpen, setActivityOpen] = useState(false);
  const [ownedGoals, setOwnedGoals] = useState<GoalWithDetails[]>([]);
  const [selectedGoalIds, setSelectedGoalIds] = useState<string[]>([]);
  const [confirmMove, setConfirmMove] = useState(false);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [taskFilter, setTaskFilter] = useState<'mine' | 'everyone' | 'upcoming'>('everyone');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [expandedCommentTaskId, setExpandedCommentTaskId] = useState<string | null>(null);
  const [commentTask, setCommentTask] = useState<{ id: string; title: string } | null>(null);
  const [commentBody, setCommentBody] = useState('');
  const [assignmentTaskId, setAssignmentTaskId] = useState<string | null>(null);
  const [assignmentBusy, setAssignmentBusy] = useState(false);
  const [assignmentError, setAssignmentError] = useState<string | null>(null);
  const momentum = useMomentumHomeSummary();

  async function load(showPageLoading = false) {
    if (!projectId) return;
    if (showPageLoading) { setLoading(true); setError(null); }
    try {
      const data = await fetchProjectWorkspace(projectId);
      if (data) setProject(data);
      else if (showPageLoading || !project) setError('Project not found.');
    }
    catch (caught) {
      if (showPageLoading || !project) setError(caught instanceof Error ? caught.message : 'Project could not load.');
    }
    finally { if (showPageLoading) setLoading(false); }
  }
  useEffect(() => { void load(true); }, [projectId]);
  useEffect(() => { void supabase.auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id ?? null)); }, []);
  useEffect(() => { if (params.view === 'vault') setMode('vault'); }, [params.view]);
  const activeGoals = useMemo(() => project?.goals.filter((goal) => goal.status === 'active') ?? [], [project]);
  const historyGoals = useMemo(() => project?.goals.filter((goal) => goal.status !== 'active') ?? [], [project]);
  const sticky = useMemo(() => project?.vaultItems.filter(isStickyVaultItem) ?? [], [project]);
  const notes = project?.entries.filter((entry) => entry.entryType === 'note') ?? [];
  const reflections = project?.entries.filter((entry) => entry.entryType === 'reflection') ?? [];
  const sources = project?.vaultItems.filter(isSourceVaultItem) ?? [];
  const momentumByGoal = useMemo(() => {
    const summaries = new Map<string, NonNullable<ProjectWorkspace['goalMomentum']>[number]>();
    for (const item of [...(momentum.summary?.goals ?? []), ...(project?.goalMomentum ?? [])]) {
      const current = summaries.get(item.goalId);
      if (!current || current.displayedValue == null || item.displayedValue != null) summaries.set(item.goalId, item);
    }
    return summaries;
  }, [momentum.summary, project?.goalMomentum]);

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
  function openManage(initialTab: typeof manageInitialTab = 'details') { if (!project) return; setFormError(null); setManageInitialTab(initialTab); setManageOpen(true); }

  if (loading) return <View style={{ alignItems: 'center', flex: 1, justifyContent: 'center' }}><ActivityIndicator color={colors.accent.primary} /></View>;
  if (!project || error) return <View style={{ alignItems: 'center', flex: 1, gap: SPACE.lg, justifyContent: 'center' }}><Typography variant="body">{error ?? 'Project not found.'}</Typography><Button variant="secondary" onPress={() => router.push('/(app)/projects')}>Back to Projects</Button></View>;
  const lastActivity = project.activity[0]?.occurredAt ?? project.updated_at;
  const capabilities = new Set(project.collaboration.capabilities);
  const memberName = new Map(project.collaboration.members.map((member) => [member.userId, member.displayName]));
  const insight = buildProjectIntelligence({
    projectId: project.id,
    mode: project.mode,
    goals: activeGoals.map((goal) => { const summary = momentumByGoal.get(goal.id); return { id: goal.id, title: goal.title, momentum: summary?.displayedValue ?? null, weeklyDelta: summary?.weeklyChange ?? null }; }),
    tasks: project.taskPreviews,
    milestones: activeGoals.flatMap((goal) => goal.milestones.map((milestone) => ({ id: milestone.id, title: milestone.title, dueDate: milestone.dueDate, completedAt: milestone.completedAt }))),
    activity: project.activity,
    authorizedReflectionCount: reflections.length,
    authorizedNoteCount: notes.length,
    authorizedSourceCount: sources.length,
    latestActivityAt: project.activity[0]?.occurredAt ?? null,
  });
  const visibleTasks = project.taskPreviews.filter((task) => taskFilter === 'everyone' || (taskFilter === 'mine' ? task.assignedTo === currentUserId : task.timing === 'upcoming'));
  const upcomingMilestones = activeGoals
    .flatMap((goal) => goal.milestones
      .filter((milestone) => !milestone.completedAt)
      .map((milestone) => ({ goal, milestone })))
    .sort((left, right) => {
      if (!left.milestone.dueDate) return 1;
      if (!right.milestone.dueDate) return -1;
      return left.milestone.dueDate.getTime() - right.milestone.dueDate.getTime();
    })
    .slice(0, 3);
  const actionLink = (label: string, onPress: () => void) => <Pressable accessibilityRole="button" onPress={onPress} style={{ alignSelf: 'flex-start', justifyContent: 'center', minHeight: 44 }}><Typography variant="emphasis-sm" style={{ color: colors.text.accent }}>{label} →</Typography></Pressable>;
  const projectHeader = <Surface accessibilityLabel="Project header">
    <View style={{ gap: SPACE.sm }}><View style={{ alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm }}><Typography accessibilityRole="header" variant="heading">{project.title}</Typography>{project.mode !== 'personal' ? <Badge label={project.mode === 'guide' ? 'Guide' : 'Team'} variant="active" /> : null}</View>{project.description ? <Typography variant="body">{project.description}</Typography> : null}<Typography variant="caption">{activeGoals.length} active {activeGoals.length === 1 ? 'Goal' : 'Goals'} · Updated {new Date(lastActivity).toLocaleDateString()}</Typography>{project.mode !== 'personal' ? <><Typography variant="eyebrow">{project.mode === 'guide' ? 'GUIDE' : 'TEAM'} · {project.collaboration.members.length} {project.mode === 'guide' ? 'PEOPLE' : project.collaboration.members.length === 1 ? 'MEMBER' : 'MEMBERS'}</Typography><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm }}>{project.collaboration.members.map((member) => <View key={member.userId} accessibilityLabel={`${member.displayName}, ${member.role === 'owner' && project.mode === 'guide' ? 'Client and Owner' : member.relationshipLabel || member.role}`} style={{ alignItems: 'center', backgroundColor: colors.background.selectedRow, borderColor: colors.border.accent, borderRadius: RADIUS.round, borderWidth: 1, height: 36, justifyContent: 'center', width: 36 }}><Typography variant="caption">{member.displayName.slice(0, 2).toUpperCase()}</Typography></View>)}</View>{project.mode === 'guide' ? <Typography variant="caption">{project.collaboration.members.map((member) => `${member.displayName} · ${member.role === 'owner' ? 'Client' : member.relationshipLabel || 'Guide'}`).join('   ·   ')}</Typography> : null}</> : null}</View>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.md }}>{project.mode !== 'personal' ? <Button variant="secondary" onPress={() => openManage('members')}>Members</Button> : null}<Button accessibilityLabel="Vault" leftIcon={<VaultIcon color={colors.text.onAccent} size={18} />} onPress={() => switchMode('vault')}>Vault</Button><Button onPress={() => openManage()}>Manage Project ▾</Button></View>
  </Surface>;
  const currentGoalsCard = <Surface accessibilityLabel="Current Goals card" title="Current Goals">
    {activeGoals.length ? <View style={{ gap: SPACE.md }}>{activeGoals.slice(0, 3).map((goal) => {
      const attentionCount = project.taskPreviews.filter((task) => task.goalId === goal.id && (task.timing === 'overdue' || task.timing === 'today')).length;
      const leadName = memberName.get(goal.projectLeadId ?? '') ?? 'Unassigned';
      const targetDate = goal.deadline?.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) ?? 'No target date';
      return <View key={goal.id} style={{ backgroundColor: colors.background.subtle, borderColor: colors.border.divider, borderRadius: RADIUS.lg, borderWidth: 1, overflow: 'hidden' }}>
        <Pressable accessibilityHint="Opens this Goal" accessibilityLabel={`Open ${goal.title}`} accessibilityRole="button" onPress={() => router.push(goalWorkspaceHref(goal.id, 'active') as never)} style={({ pressed }) => ({ alignItems: 'center', flexDirection: 'row', gap: SPACE.md, minHeight: 68, opacity: pressed ? 0.72 : 1, paddingHorizontal: SPACE.lg, paddingVertical: 10 })}>
          <View style={{ alignItems: 'center', backgroundColor: colors.background.selectedRow, borderRadius: RADIUS.md, height: 38, justifyContent: 'center', width: 38 }}><Ionicons color={colors.accent.primary} name="flag-outline" size={19} /></View>
          <View style={{ flex: 1, gap: SPACE.xs, minWidth: 0 }}><Typography variant="emphasis-sm" numberOfLines={1}>{goal.title}</Typography><Typography variant="caption" numberOfLines={1}>{targetDate}</Typography></View>
          {attentionCount ? <View accessibilityLabel={`${attentionCount} ${attentionCount === 1 ? 'Task needs' : 'Tasks need'} attention`} style={{ alignItems: 'center', backgroundColor: colors.background.selectedRow, borderColor: colors.border.accent, borderRadius: RADIUS.round, borderWidth: 1, height: 26, justifyContent: 'center', minWidth: 26, paddingHorizontal: SPACE.xs }}><Typography variant="micro-label" style={{ color: colors.text.accent }}>{attentionCount}</Typography></View> : null}
          <Ionicons color={colors.text.muted} name="chevron-forward" size={16} />
        </Pressable>
        <View style={{ alignItems: 'center', flexDirection: 'row', gap: SPACE.sm, justifyContent: 'space-between', minHeight: 36, paddingBottom: SPACE.md, paddingHorizontal: SPACE.lg }}>
          <Typography variant="caption" numberOfLines={1} style={{ flex: 1 }}>Lead: {leadName}</Typography>
          {capabilities.has('assign_goal_lead') ? <Pressable accessibilityLabel={`${goal.projectLeadId ? 'Manage' : 'Assign'} Goal Lead for ${goal.title}`} accessibilityRole="button" onPress={() => openManage('goals')} style={({ pressed }) => ({ opacity: pressed ? 0.65 : 1, paddingVertical: SPACE.sm })}><Typography variant="caption" style={{ color: colors.text.accent }}>{goal.projectLeadId ? 'Manage →' : 'Assign →'}</Typography></Pressable> : null}
        </View>
      </View>;
    })}</View> : <Typography variant="body">No active Goals yet.</Typography>}
    <View style={{ alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.lg, justifyContent: 'space-between' }}>{project.collaboration.role === 'owner' ? actionLink('+ Add existing Goal', () => void openGoalPicker()) : null}{capabilities.has('create_goal') ? actionLink('+ New Goal', () => router.push({ pathname: '/goals/create', params: { projectId: project.id } } as never)) : null}{historyGoals.length ? actionLink('View history', () => openManage()) : null}</View>
  </Surface>;
  const projectChatCard = <ProjectChat currentUserId={currentUserId} project={project} />;
  const entryCard = (kind: 'note' | 'reflection') => {
    const items = kind === 'note' ? notes : reflections;
    const label = kind === 'note' ? 'Notes' : 'Reflections';
    return <Surface accessibilityLabel={`${label} card`} title={label}>
      <Typography variant="caption">{items.length} authorized {items.length === 1 ? kind : label.toLowerCase()}</Typography>
      {items.slice(0, 2).map((entry) => <View key={entry.id} style={{ borderBottomColor: colors.border.divider, borderBottomWidth: 1, gap: SPACE.sm, paddingBottom: SPACE.md }}>
        <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: kind === 'note' ? '/(app)/notes/[id]' : '/(app)/reflections/[id]', params: { id: entry.id, projectId: project.id } } as never)}>
          <Typography variant="emphasis-sm" numberOfLines={1}>{entry.title || (kind === 'note' ? 'Untitled Note' : 'Reflection')}</Typography>
          {entry.plainText?.trim() ? <Typography variant="caption" numberOfLines={2} style={{ color: colors.text.muted, marginTop: SPACE.xs }}>{entry.plainText.trim()}</Typography> : null}
        </Pressable>
        <View style={{ alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm, justifyContent: 'space-between' }}>
          <Typography variant="caption">{entry.projectShareScope === 'guide' ? 'Shared with Guide' : entry.projectShareScope === 'project' ? 'Shared with Project' : 'Private to me'}</Typography>
          {capabilities.has('add_shared_content') && entry.userId === currentUserId && entry.project?.id === project.id ? <Pressable accessibilityRole="button" disabled={busy} onPress={() => void (async () => { setBusy(true); try { await setEntryProjectShare(entry.id, entry.projectShareScope === 'private' || !entry.projectShareScope ? (project.mode === 'guide' ? 'guide' : 'project') : 'private'); await load(); } finally { setBusy(false); } })()} style={({ pressed }) => ({ opacity: busy ? 0.5 : pressed ? 0.65 : 1, paddingVertical: SPACE.sm })}><Typography variant="caption" style={{ color: colors.text.accent }}>{entry.projectShareScope === 'private' || !entry.projectShareScope ? `Share with ${project.mode === 'guide' ? 'Guide' : 'Project'}` : 'Make private'}</Typography></Pressable> : null}
        </View>
      </View>)}
      {!items.length ? <Typography variant="body-small">No authorized {label.toLowerCase()} yet.</Typography> : null}
      <View style={{ alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.md, justifyContent: 'space-between' }}>
        {capabilities.has('add_shared_content') ? <Button size="compact" variant="secondary" onPress={() => router.push({ pathname: kind === 'note' ? '/(app)/notes' : '/(app)/reflections', params: { create: kind, projectId: project.id } } as never)}>+ New {kind === 'note' ? 'Note' : 'Reflection'}</Button> : null}
        {actionLink(kind === 'note' ? 'Open Notes' : 'View Reflections', () => router.push({ pathname: kind === 'note' ? '/(app)/notes' : '/(app)/reflections', params: { projectId: project.id } } as never))}
      </View>
    </Surface>;
  };
  const intelligenceCard = <Surface accessibilityLabel="Echo Project Insight card" intelligence><IntelligenceHeader insightType="Project Insight" /><Typography variant="ai-italic" style={{ color: colors.text.primary, fontSize: 17, lineHeight: 26 }}>“{insight.primary}”</Typography>{insight.secondary ? <Typography variant="body-small" style={{ color: colors.text.secondary, lineHeight: 21 }}>{insight.secondary}</Typography> : null}</Surface>;
  const milestonesCard = <Surface accessibilityLabel="Upcoming Milestones card" title="Upcoming Milestones">{upcomingMilestones.length ? upcomingMilestones.map(({ goal, milestone }) => <Pressable accessibilityRole="button" key={milestone.id} onPress={() => router.push(goalWorkspaceHref(goal.id, 'active') as never)} style={({ pressed }) => ({ borderBottomColor: colors.border.divider, borderBottomWidth: 1, gap: SPACE.sm, opacity: pressed ? 0.72 : 1, paddingBottom: SPACE.lg })}><Typography variant="emphasis-sm" numberOfLines={1}>{milestone.title}</Typography><View style={{ alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm }}><Typography variant="caption" numberOfLines={1} style={{ flex: 1 }}>{goal.title}</Typography><Typography variant="caption">{milestone.dueDate ? `Due ${milestone.dueDate.toLocaleDateString()}` : 'No deadline'}</Typography></View><Typography variant="caption">Responsible: {milestone.responsibleUserId ? memberName.get(milestone.responsibleUserId) ?? 'Assigned member' : 'Unassigned'}</Typography></Pressable>) : <Typography variant="body-small">No upcoming Milestones yet.</Typography>}{activeGoals.length ? actionLink('View all', () => router.push(goalWorkspaceHref(activeGoals[0].id, 'active') as never)) : null}</Surface>;
  const tasksCard = <Surface accessibilityLabel="Project Tasks card" title="Project Tasks">
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm }}>{(['mine', 'everyone', 'upcoming'] as const).map((filter) => <Button key={filter} size="compact" variant={taskFilter === filter ? 'primary' : 'secondary'} onPress={() => setTaskFilter(filter)}>{filter[0].toUpperCase() + filter.slice(1)}</Button>)}</View>
    {visibleTasks.length ? visibleTasks.slice(0, 5).map((task) => {
      const taskComments = project.comments.filter((comment) => comment.targetType === 'task' && comment.targetId === task.id);
      const commentsExpanded = expandedCommentTaskId === task.id;
      const assignmentExpanded = assignmentTaskId === task.id;
      const assigneeName = task.assignedTo ? memberName.get(task.assignedTo) ?? 'Assigned member' : 'Unassigned';
      return <View key={task.id} style={{ borderBottomColor: colors.border.divider, borderBottomWidth: 1, gap: SPACE.md, paddingBottom: SPACE.lg }}>
        <Pressable accessibilityRole="button" onPress={() => router.push(goalWorkspaceHref(task.goalId, 'active') as never)} style={({ pressed }) => ({ gap: SPACE.sm, opacity: pressed ? 0.7 : 1 })}>
          <View style={{ alignItems: 'center', flexDirection: 'row', gap: SPACE.sm }}><Ionicons color={task.timing === 'overdue' ? colors.feedback.danger.text : colors.accent.primary} name="ellipse-outline" size={16} /><Typography variant="emphasis-sm" numberOfLines={1} style={{ flex: 1 }}>{task.title}</Typography><Typography variant="caption">{task.timing === 'anytime' ? 'Anytime' : task.timing[0].toUpperCase() + task.timing.slice(1)}</Typography></View>
          <Typography variant="caption">From: {task.goalTitle}</Typography>
        </Pressable>
        <View style={{ alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.md, justifyContent: 'space-between' }}>
          {capabilities.has('assign_task') ? <Pressable accessibilityLabel={`Change assignee for ${task.title}. Currently ${assigneeName}`} accessibilityRole="button" accessibilityState={{ expanded: assignmentExpanded }} disabled={assignmentBusy} onPress={() => { setAssignmentError(null); setAssignmentTaskId((current) => current === task.id ? null : task.id); }} style={({ pressed }) => ({ alignItems: 'center', backgroundColor: colors.background.subtle, borderColor: assignmentExpanded ? colors.border.accent : colors.border.divider, borderRadius: RADIUS.round, borderWidth: 1, flexDirection: 'row', gap: SPACE.xs, minHeight: 34, opacity: assignmentBusy ? 0.5 : pressed ? 0.7 : 1, paddingHorizontal: SPACE.md })}><Typography variant="caption" style={{ color: assignmentExpanded ? colors.text.accent : colors.text.secondary }}>{task.assignedTo ? `Assigned to: ${assigneeName}` : 'Assign: Unassigned'}</Typography><Ionicons color={assignmentExpanded ? colors.text.accent : colors.text.muted} name={assignmentExpanded ? 'chevron-up' : 'chevron-down'} size={14} /></Pressable> : <Typography variant="body-small" style={{ color: colors.text.secondary }}>Assigned to: {assigneeName}</Typography>}
          {capabilities.has('comment') ? <Pressable accessibilityLabel={`${commentsExpanded ? 'Hide' : 'Show'} comments for ${task.title}`} accessibilityRole="button" accessibilityState={{ expanded: commentsExpanded }} onPress={() => setExpandedCommentTaskId((current) => current === task.id ? null : task.id)} style={({ pressed }) => ({ alignItems: 'center', borderLeftColor: colors.border.divider, borderLeftWidth: 1, flexDirection: 'row', gap: SPACE.xs, minHeight: 32, opacity: pressed ? 0.65 : 1, paddingLeft: SPACE.md, paddingVertical: SPACE.xs })}><Typography variant="emphasis-sm" style={{ color: colors.text.accent }}>{taskComments.length ? `${taskComments.length} ${taskComments.length === 1 ? 'Comment' : 'Comments'}` : 'Comments'}</Typography><Ionicons color={colors.text.accent} name={commentsExpanded ? 'chevron-up' : 'chevron-down'} size={15} /></Pressable> : null}
        </View>
        {assignmentExpanded ? <View accessibilityLabel={`Assignee options for ${task.title}`} style={{ backgroundColor: colors.background.subtle, borderColor: colors.border.divider, borderRadius: RADIUS.md, borderWidth: 1, gap: SPACE.xs, padding: SPACE.sm }}>
          {[{ userId: null, displayName: 'Unassigned' }, ...project.collaboration.members].map((member) => { const selected = task.assignedTo === member.userId; return <Pressable key={member.userId ?? 'unassigned'} accessibilityRole="menuitem" accessibilityState={{ selected }} disabled={assignmentBusy} onPress={() => void (async () => { const previousAssignee = task.assignedTo; setAssignmentBusy(true); setAssignmentError(null); setAssignmentTaskId(null); setProject((current) => current ? { ...current, taskPreviews: current.taskPreviews.map((item) => item.id === task.id ? { ...item, assignedTo: member.userId } : item) } : current); try { await assignProjectTask(task.id, member.userId); await load(); } catch (caught) { setProject((current) => current ? { ...current, taskPreviews: current.taskPreviews.map((item) => item.id === task.id ? { ...item, assignedTo: previousAssignee } : item) } : current); setAssignmentTaskId(task.id); setAssignmentError(caught instanceof Error ? caught.message : 'Assignee could not be updated.'); } finally { setAssignmentBusy(false); } })()} style={({ pressed }) => ({ alignItems: 'center', backgroundColor: selected ? colors.background.selectedRow : 'transparent', borderRadius: RADIUS.sm, flexDirection: 'row', gap: SPACE.sm, minHeight: 38, opacity: pressed ? 0.7 : 1, paddingHorizontal: SPACE.md })}><Ionicons color={selected ? colors.accent.primary : colors.text.muted} name={selected ? 'checkmark-circle' : 'ellipse-outline'} size={16} /><Typography variant="body-small" style={selected ? { color: colors.text.accent } : undefined}>{member.displayName}</Typography></Pressable>; })}
          {assignmentError ? <Typography accessibilityRole="alert" variant="caption" style={{ color: colors.feedback.danger.text }}>{assignmentError}</Typography> : null}
        </View> : null}
        {commentsExpanded ? <View accessibilityLabel={`Comments for ${task.title}`} style={{ backgroundColor: colors.background.subtle, borderRadius: RADIUS.md, gap: SPACE.md, padding: SPACE.lg }}>
          {taskComments.length ? <ProjectComments comments={taskComments} currentUserId={currentUserId} members={project.collaboration.members} onEdit={async (commentId, body) => { await editProjectComment(commentId, body); await load(); }} onDelete={async (commentId) => { await deleteProjectComment(commentId); await load(); }} /> : <Typography variant="body-small" style={{ color: colors.text.muted }}>No comments yet.</Typography>}
          <Pressable accessibilityRole="button" onPress={() => { setCommentTask({ id: task.id, title: task.title }); setCommentBody(''); }} style={({ pressed }) => ({ alignSelf: 'flex-start', opacity: pressed ? 0.65 : 1, paddingVertical: SPACE.xs })}><Typography variant="emphasis-sm" style={{ color: colors.text.accent }}>+ Add comment</Typography></Pressable>
        </View> : null}
      </View>;
    }) : <Typography variant="body-small">No Tasks match this view.</Typography>}
    {project.taskPreviews.length ? actionLink('Open Goal Tasks', () => router.push(goalWorkspaceHref(project.taskPreviews[0].goalId, 'active') as never)) : null}
  </Surface>;
  const snapshotRow = (label: string, value: string | number, filter?: VaultFilter) => <Pressable accessibilityRole={filter ? 'button' : undefined} onPress={filter ? () => switchMode('vault', filter) : undefined} style={{ alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', minHeight: 34 }}><Typography variant="body-small">{label}</Typography><Typography variant="emphasis-sm" style={{ color: colors.text.accent }}>{value}</Typography></Pressable>;
  const snapshotCard = <Surface accessibilityLabel="Project Snapshot card" title="Project Snapshot">{snapshotRow('Active Goals', activeGoals.length)}{snapshotRow('Sticky Notes', sticky.length, 'sticky')}{snapshotRow('Notes', notes.length, 'notes')}{snapshotRow('Reflections', reflections.length, 'reflections')}{snapshotRow('Sources', sources.length, 'sources')}<Typography variant="caption">Last activity {new Date(lastActivity).toLocaleDateString()}</Typography></Surface>;
  const momentumCard = <Surface accessibilityLabel="Momentum Snapshot card" title="Momentum Snapshot">{activeGoals.slice(0, 5).map((goal) => { const summary = momentumByGoal.get(goal.id); const available = summary?.displayedValue !== null && summary?.displayedValue !== undefined; const delta = summary?.weeklyChange ?? 0; const stable = Math.abs(delta) < 1; const direction = stable ? '→' : delta > 0 ? '↗' : '↘'; return <Pressable accessibilityRole="button" key={goal.id} onPress={() => router.push(goalWorkspaceHref(goal.id, 'active') as never)} style={({ pressed }) => ({ borderBottomColor: colors.border.divider, borderBottomWidth: 1, gap: SPACE.sm, opacity: pressed ? 0.7 : 1, paddingBottom: SPACE.lg })}><Typography variant="emphasis-sm" numberOfLines={1}>{goal.title}</Typography><View style={{ alignItems: 'center', flexDirection: 'row', gap: SPACE.md, justifyContent: 'space-between' }}><Typography variant="title" style={{ color: available ? colors.text.accent : colors.text.secondary }}>{available ? `${summary!.displayedValue} / 100` : momentum.isLoading ? 'Loading…' : 'Unavailable'}</Typography>{available ? <Typography variant="caption" style={{ color: stable ? colors.text.muted : delta > 0 ? colors.text.accent : colors.feedback.danger.text }}>{stable ? '→ no change' : `${direction} ${delta > 0 ? '+' : ''}${Math.round(delta * 10) / 10} this week`}</Typography> : null}</View></Pressable>; })}{!activeGoals.length ? <Typography variant="body-small">Active Goal Momentum will appear here.</Typography> : null}{actionLink('View Momentum', () => router.push('/(app)/momentum'))}</Surface>;
  const activityCard = <Surface accessibilityLabel="Recent Activity card" title="Recent Activity">{project.activity.slice(0, 4).map((item) => { const isComment = item.label.toLowerCase().startsWith('commented on'); const targetLabel = item.targetType ? `${item.targetType[0].toUpperCase()}${item.targetType.slice(1)}` : item.label.replace(/^Commented on\s*/i, '') || 'Item'; return <View key={item.id} style={{ borderBottomColor: colors.border.divider, borderBottomWidth: 1, gap: SPACE.xs, paddingBottom: SPACE.md }}><View style={{ alignItems: 'center', flexDirection: 'row', gap: SPACE.sm, justifyContent: 'space-between' }}><Typography variant="body-small" numberOfLines={1} style={{ flex: 1 }}>{isComment ? `${item.actorName ?? 'Someone'} commented on ${targetLabel}` : `${item.actorName ? `${item.actorName} · ` : ''}${item.label}`}</Typography><Typography variant="caption">{new Date(item.occurredAt).toLocaleDateString()}</Typography></View>{item.origin ? <Typography variant="caption" numberOfLines={1}>{isComment ? `on: ${item.origin}` : item.origin}</Typography> : null}</View>; })}{!project.activity.length ? <Typography variant="body-small">Meaningful Project activity will appear here.</Typography> : null}{project.activity.length ? actionLink('View all', () => setActivityOpen(true)) : null}</Surface>;

  return <>
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ alignSelf: 'center', gap: SPACE.xl, maxWidth: 1520, padding: compact ? SPACE.xl : LAYOUT.wideGutter, width: '100%' }}>
      <Pressable onPress={() => router.push('/(app)/projects')} style={{ alignItems: 'center', alignSelf: 'flex-start', flexDirection: 'row', gap: SPACE.sm, minHeight: 40 }}><Ionicons color={colors.text.accent} name="folder-outline" size={18} /><Typography variant="nav-back">Projects  ›  {project.title}</Typography></Pressable>

      {project.partialErrors.length ? <Surface><View style={{ alignItems: compact ? 'stretch' : 'center', flexDirection: compact ? 'column' : 'row', gap: SPACE.md, justifyContent: 'space-between' }}><Typography variant="body-small">Some Project content couldn’t load: {project.partialErrors.join(', ')}.</Typography><Button size="compact" variant="secondary" onPress={() => void load()}>Retry</Button></View></Surface> : null}

      {mode === 'vault' ? <><View style={{ alignItems: compact ? 'stretch' : 'center', flexDirection: compact ? 'column' : 'row', gap: SPACE.xl, justifyContent: 'space-between' }}><View style={{ flex: 1, gap: SPACE.xs }}><Typography accessibilityRole="header" variant="heading">{project.title}</Typography><View style={{ alignItems: 'center', flexDirection: 'row', gap: SPACE.sm }}><Badge label={project.status} variant={project.status === 'active' ? 'active' : project.status === 'complete' ? 'complete' : 'archived'} /><Typography variant="caption">Project Vault · authorized content only</Typography></View></View><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.md }}><Button accessibilityLabel="Overview" leftIcon={<Ionicons color={colors.text.onAccent} name="arrow-back" size={17} />} onPress={() => switchMode('overview')}>Overview</Button>{capabilities.has('add_shared_content') && project.status !== 'archived' ? <Button accessibilityLabel="Add to Vault" leftIcon={<Ionicons color={colors.text.onAccent} name="add" size={18} />} onPress={() => setAddRequest((value) => value + 1)}>Add to Vault</Button> : null}</View></View><ProjectVaultWorkspace addRequest={addRequest} initialFilter={params.vaultFilter} project={project} /></> : desktop ? <View style={{ alignItems: 'flex-start', flexDirection: 'row', gap: SPACE.xl }}>
        <View style={{ flexBasis: '24%', gap: SPACE.xl, minWidth: 260 }}>{currentGoalsCard}{projectChatCard}{entryCard('note')}{entryCard('reflection')}</View>
        <View style={{ flex: 1, gap: SPACE.xl, minWidth: 420 }}>{projectHeader}{milestonesCard}{tasksCard}</View>
        <View style={{ flexBasis: '28%', gap: SPACE.xl, minWidth: 300 }}>{snapshotCard}{intelligenceCard}{momentumCard}{activityCard}</View>
      </View> : <View style={{ gap: SPACE.xl }}>{projectHeader}{currentGoalsCard}{projectChatCard}{milestonesCard}{tasksCard}{entryCard('note')}{entryCard('reflection')}{snapshotCard}{intelligenceCard}{momentumCard}{activityCard}</View>}
    </ScrollView>

    <Modal visible={activityOpen} onClose={() => setActivityOpen(false)} showCloseButton contentStyle={{ maxWidth: 720, maxHeight: '85%' }}><View style={{ gap: SPACE.lg }}><Typography variant="heading">Project Activity</Typography><ScrollView contentContainerStyle={{ gap: SPACE.md }}>{project.activity.map((item) => <View key={item.id} style={{ borderBottomColor: colors.border.divider, borderBottomWidth: 1, gap: SPACE.xs, paddingBottom: SPACE.md }}><Typography variant="body-small">{item.actorName ? `${item.actorName} · ` : ''}{item.label}</Typography><Typography variant="caption">{item.origin ? `${item.origin} · ` : ''}{new Date(item.occurredAt).toLocaleString()}</Typography></View>)}</ScrollView></View></Modal>

    <Modal visible={addGoalOpen} onClose={() => !busy && setAddGoalOpen(false)} showCloseButton={false} cancelText="Cancel" onCancel={() => setAddGoalOpen(false)} confirmText={confirmMove ? 'Confirm reassignment' : 'Add selected Goals'} onConfirm={() => void addGoals()} confirmDisabled={!selectedGoalIds.length || busy} contentStyle={{ maxWidth: 560, maxHeight: '90%' }}>
      <Typography variant="title" style={{ marginBottom: SPACE.sm }}>Add Goals</Typography><Typography variant="body" style={{ marginBottom: SPACE.lg }}>Choose owned Goals. Existing Project assignments are never changed silently.</Typography><ScrollView style={{ maxHeight: 340 }} contentContainerStyle={{ gap: SPACE.sm }}>{ownedGoals.map((goal) => { const selected = selectedGoalIds.includes(goal.id); return <Pressable key={goal.id} accessibilityRole="checkbox" accessibilityState={{ checked: selected }} onPress={() => { setSelectedGoalIds((current) => selected ? current.filter((id) => id !== goal.id) : [...current, goal.id]); setConfirmMove(false); setFormError(null); }} style={{ backgroundColor: selected ? colors.background.selectedRow : colors.background.subtle, borderColor: selected ? colors.border.accent : colors.border.divider, borderRadius: RADIUS.md, borderWidth: 1, padding: SPACE.lg }}><Typography variant="emphasis-sm">{goal.title}</Typography><Typography variant="caption">{goal.category}{goal.projectId && goal.projectId !== project.id ? ' · Currently in another Project' : ''}</Typography></Pressable>; })}</ScrollView>{formError ? <Typography variant="caption" style={{ color: confirmMove ? colors.feedback.pending.text : colors.feedback.danger.text, marginTop: SPACE.md }}>{formError}</Typography> : null}
    </Modal>

    <ManageProjectModal initialTab={manageInitialTab} visible={manageOpen} project={project} onClose={() => setManageOpen(false)} onReload={load} onOpenGoalPicker={() => void openGoalPicker()} />

    <Modal visible={commentTask !== null} onClose={() => setCommentTask(null)} showCloseButton={false} cancelText="Cancel" onCancel={() => setCommentTask(null)} confirmText={busy ? 'Posting…' : 'Post comment'} confirmDisabled={!commentBody.trim() || busy} onConfirm={() => void (async () => { if (!commentTask) return; setBusy(true); try { await createProjectComment(project.id, 'task', commentTask.id, commentBody); setCommentTask(null); setCommentBody(''); await load(); } finally { setBusy(false); } })()}><View style={{ gap: SPACE.lg }}><Typography variant="title">Comment on {commentTask?.title}</Typography><Typography variant="caption">This comment stays in the Project context.</Typography><TextInput accessibilityLabel="Task comment" multiline value={commentBody} onChangeText={setCommentBody} placeholder="Add context…" placeholderTextColor={colors.text.muted} style={{ backgroundColor: colors.background.input, borderColor: colors.border.input, borderRadius: RADIUS.md, borderWidth: 1, color: colors.text.primary, minHeight: 120, padding: 12, textAlignVertical: 'top' }} /></View></Modal>
  </>;
}
