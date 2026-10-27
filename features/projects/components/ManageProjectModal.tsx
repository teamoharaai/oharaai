import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Typography } from '@/components/ui/Typography';
import { RADIUS, SPACE } from '@/constants/design';
import { useThemeColors } from '@/store/uiStore';
import { fetchInviteableFriends } from '@/features/circles/services/circles-service';
import type { CirclesAuthor } from '@/lib/db/circles-core';
import type { ProjectMode, ProjectRole, ProjectWorkspace } from '../types';
import { GUIDE_RELATIONSHIP_LABELS, PROJECT_MEMBER_LIMIT } from '../types';
import {
  assignGoalLead,
  assignProjectMilestone,
  createProjectMilestone,
  createProjectTask,
  deleteProject,
  detachGoalFromProject,
  inviteProjectMember,
  leaveProject,
  removeProjectMember,
  revokeProjectInvitation,
  setProjectMemberRole,
  setProjectMode,
  updateProject,
  updateProjectDetails,
} from '../services/project-service';

type Tab = 'details' | 'goals' | 'members' | 'access' | 'status';

export function ManageProjectModal({ initialTab = 'details', onClose, onOpenGoalPicker, onReload, project, visible }: {
  initialTab?: Tab;
  onClose: () => void;
  onOpenGoalPicker: () => void;
  onReload: () => Promise<void>;
  project: ProjectWorkspace;
  visible: boolean;
}) {
  const colors = useThemeColors();
  const capabilities = useMemo(() => new Set(project.collaboration.capabilities), [project.collaboration.capabilities]);
  const isOwner = project.collaboration.role === 'owner';
  const [tab, setTab] = useState<Tab>('details');
  const [title, setTitle] = useState(project.title);
  const [description, setDescription] = useState(project.description ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [friends, setFriends] = useState<CirclesAuthor[]>([]);
  const [relationship, setRelationship] = useState('Fitness Coach');
  const [inviteRole, setInviteRole] = useState<'member' | 'admin'>('member');
  const [managedMemberId, setManagedMemberId] = useState<string | null>(null);
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [detachGoalId, setDetachGoalId] = useState<string | null>(null);
  const [leadMenuGoalId, setLeadMenuGoalId] = useState<string | null>(null);
  const [responsibleMenuMilestoneId, setResponsibleMenuMilestoneId] = useState<string | null>(null);
  const [newItemGoalId, setNewItemGoalId] = useState<string | null>(null);
  const [draftKind, setDraftKind] = useState<'task' | 'milestone' | null>(null);
  const [draftGoal, setDraftGoal] = useState('');
  const [draftTitle, setDraftTitle] = useState('');
  const [draftDue, setDraftDue] = useState('');
  const [draftAssignee, setDraftAssignee] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setTitle(project.title); setDescription(project.description ?? ''); setError(null); setManagedMemberId(null); setLeaveConfirmOpen(false); setDeleteConfirmOpen(false); setDetachGoalId(null); setLeadMenuGoalId(null); setResponsibleMenuMilestoneId(null); setNewItemGoalId(null);
    setTab(capabilities.has('manage_project') || initialTab === 'goals' || initialTab === 'members' ? initialTab : 'goals');
    if (capabilities.has('invite_members')) void fetchInviteableFriends().then(setFriends).catch(() => setFriends([]));
  }, [capabilities, initialTab, project.description, project.title, visible]);

  async function run(action: () => Promise<unknown>, close = false) {
    if (busy) return;
    setBusy(true); setError(null);
    try { await action(); await onReload(); if (close) onClose(); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Project could not be updated.'); }
    finally { setBusy(false); }
  }

  const pending = project.collaboration.invitations.filter((invitation) => invitation.status === 'pending');
  const participantSlots = project.collaboration.members.length + pending.length;
  const existingIds = new Set([...project.collaboration.members.map((member) => member.userId), ...pending.map((invite) => invite.invitedUserId)]);
  const inviteable = friends.filter((friend) => !existingIds.has(friend.id));
  const inputStyle = { backgroundColor: colors.background.input, borderColor: colors.border.input, borderRadius: RADIUS.md, borderWidth: 1, color: colors.text.primary, minHeight: 44, padding: 12 } as const;
  const memberName = (userId: string | null | undefined) => project.collaboration.members.find((member) => member.userId === userId)?.displayName ?? 'Unassigned';

  async function invite(friend: CirclesAuthor) {
    const role: Exclude<ProjectRole, 'owner'> = project.mode === 'guide' ? 'guide' : inviteRole;
    await run(() => inviteProjectMember(project.id, friend.id, role, role === 'guide' ? relationship : undefined));
  }

  function openDraft(kind: 'task' | 'milestone', goalId: string) {
    setDraftKind(kind); setDraftGoal(goalId); setDraftTitle(''); setDraftDue(''); setDraftAssignee(null); setError(null);
  }

  async function saveDraft() {
    if (!draftKind || !draftTitle.trim()) return;
    await run(async () => {
      if (draftKind === 'task') await createProjectTask(draftGoal, draftTitle, draftDue || null, draftAssignee);
      else await createProjectMilestone(draftGoal, draftTitle, draftDue || null, draftAssignee);
      setDraftKind(null);
    });
  }

  async function leaveCurrentProject() {
    if (busy || isOwner) return;
    setBusy(true); setError(null);
    try {
      await leaveProject(project.id);
      setLeaveConfirmOpen(false);
      onClose();
      router.replace('/(app)/projects');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Project could not be left.');
      setLeaveConfirmOpen(false);
    } finally {
      setBusy(false);
    }
  }

  async function deleteCurrentProject() {
    if (busy || !isOwner) return;
    setBusy(true); setError(null);
    try {
      await deleteProject(project.id);
      setDeleteConfirmOpen(false);
      onClose();
      router.replace('/(app)/projects');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Project could not be deleted.');
      setDeleteConfirmOpen(false);
    } finally {
      setBusy(false);
    }
  }

  const tabs = (['details', 'goals', 'members', 'access', 'status'] as Tab[]).filter((item) => {
    if (item === 'details') return capabilities.has('manage_project');
    if (item === 'members') return true;
    if (item === 'access' || item === 'status') return isOwner;
    return true;
  });

  return <>
    <Modal visible={visible} onClose={() => !busy && onClose()} contentStyle={{ maxWidth: 760, maxHeight: '92%', padding: 0 }}>
      <View style={{ padding: SPACE['3xl'], paddingBottom: 0, paddingRight: 64 }}><Typography variant="heading">Manage Project</Typography><Typography variant="caption" style={{ marginTop: SPACE.xs }}>Project details, Goals, people, and lifecycle.</Typography><ScrollView horizontal showsHorizontalScrollIndicator={false} accessibilityRole="tablist" contentContainerStyle={{ borderBottomColor: colors.border.divider, borderBottomWidth: 1, marginTop: SPACE.xl }}>{tabs.map((item) => <Pressable key={item} accessibilityRole="tab" accessibilityState={{ selected: tab === item }} onPress={() => setTab(item)} style={{ borderBottomColor: tab === item ? colors.accent.primary : 'transparent', borderBottomWidth: 2, minHeight: 44, justifyContent: 'center', paddingHorizontal: SPACE.lg }}><Typography variant="emphasis-sm">{item === 'details' ? 'Overview' : item === 'access' ? 'Access' : item === 'status' ? 'Settings' : item[0].toUpperCase() + item.slice(1)}</Typography></Pressable>)}</ScrollView></View>
      <ScrollView contentContainerStyle={{ gap: SPACE.xl, padding: SPACE['3xl'] }}>
        {tab === 'details' ? <><TextInput accessibilityLabel="Project name" value={title} onChangeText={setTitle} style={inputStyle} /><TextInput accessibilityLabel="Project description" multiline value={description} onChangeText={setDescription} style={[inputStyle, { minHeight: 100, textAlignVertical: 'top' }]} /><Button loading={busy} disabled={!title.trim()} onPress={() => void run(() => updateProjectDetails(project.id, title, description), true)}>Save details</Button></> : null}

        {tab === 'goals' ? <>
          <View style={{ gap: SPACE.lg }}>
            {project.goals.map((goal) => {
              const leadMenuOpen = leadMenuGoalId === goal.id;
              return <View key={goal.id} style={{ backgroundColor: colors.background.subtle, borderColor: colors.border.divider, borderRadius: RADIUS.lg, borderWidth: 1, gap: SPACE.lg, padding: SPACE.lg }}>
                <View style={{ alignItems: 'flex-start', flexDirection: 'row', gap: SPACE.md }}>
                  <View style={{ flex: 1 }}>
                    <Typography variant="emphasis-sm">{goal.title}</Typography>
                    <Typography variant="caption" style={{ marginTop: SPACE.xs }}>{goal.category} · {goal.status}</Typography>
                  </View>
                  {isOwner ? <Pressable accessibilityLabel={`Remove ${goal.title} from Project`} accessibilityRole="button" disabled={busy} onPress={() => setDetachGoalId(goal.id)} style={{ alignItems: 'center', borderRadius: RADIUS.round, height: 44, justifyContent: 'center', width: 44 }}>
                    <Ionicons color={colors.feedback.danger.text} name="close" size={18} />
                  </Pressable> : null}
                </View>

                <View style={{ gap: SPACE.sm }}>
                  <View style={{ alignItems: 'center', flexDirection: 'row', gap: SPACE.md, justifyContent: 'space-between' }}>
                    <Typography variant="micro-label">GOAL LEAD</Typography>
                    {capabilities.has('assign_goal_lead') ? <Pressable accessibilityLabel={`Change Goal Lead for ${goal.title}`} accessibilityRole="button" onPress={() => setLeadMenuGoalId(leadMenuOpen ? null : goal.id)} style={{ alignItems: 'center', backgroundColor: colors.background.input, borderColor: colors.border.input, borderRadius: RADIUS.md, borderWidth: 1, flexDirection: 'row', gap: SPACE.sm, minHeight: 44, paddingHorizontal: SPACE.md }}>
                      <Typography variant="body-small">{memberName(goal.projectLeadId)}</Typography>
                      <Ionicons color={colors.text.secondary} name={leadMenuOpen ? 'chevron-up' : 'chevron-down'} size={16} />
                    </Pressable> : <Typography variant="body-small">{memberName(goal.projectLeadId)}</Typography>}
                  </View>
                  {leadMenuOpen ? <View accessibilityLabel={`Goal Lead options for ${goal.title}`} style={{ backgroundColor: colors.background.card, borderColor: colors.border.divider, borderRadius: RADIUS.md, borderWidth: 1, overflow: 'hidden' }}>
                    {project.collaboration.members.map((member, index) => <Pressable key={member.userId} accessibilityRole="menuitem" onPress={() => { setLeadMenuGoalId(null); void run(() => assignGoalLead(goal.id, member.userId)); }} style={{ alignItems: 'center', borderBottomColor: colors.border.divider, borderBottomWidth: index === project.collaboration.members.length - 1 ? 0 : 1, flexDirection: 'row', gap: SPACE.md, minHeight: 44, paddingHorizontal: SPACE.md }}>
                      <Typography variant="body-small" style={{ flex: 1 }}>{member.displayName}</Typography>
                      {goal.projectLeadId === member.userId ? <Ionicons color={colors.text.accent} name="checkmark" size={17} /> : null}
                    </Pressable>)}
                  </View> : null}
                </View>

                {goal.milestones.length ? <View style={{ borderTopColor: colors.border.divider, borderTopWidth: 1, gap: SPACE.sm, paddingTop: SPACE.md }}>
                  <Typography variant="micro-label">MILESTONES</Typography>
                  {goal.milestones.slice(0, 4).map((milestone) => {
                    const responsibleMenuOpen = responsibleMenuMilestoneId === milestone.id;
                    return <View key={milestone.id} style={{ gap: SPACE.xs }}>
                      <View style={{ alignItems: 'center', flexDirection: 'row', gap: SPACE.md }}>
                        <View style={{ flex: 1 }}><Typography variant="body-small">{milestone.title}</Typography>{milestone.dueDate ? <Typography variant="caption">{milestone.dueDate.toLocaleDateString()}</Typography> : null}</View>
                        {capabilities.has('assign_milestone') ? <Pressable accessibilityLabel={`Change responsible person for ${milestone.title}`} accessibilityRole="button" onPress={() => setResponsibleMenuMilestoneId(responsibleMenuOpen ? null : milestone.id)} style={{ alignItems: 'center', flexDirection: 'row', gap: SPACE.xs, minHeight: 44, paddingHorizontal: SPACE.sm }}>
                          <Typography variant="caption">{memberName(milestone.responsibleUserId)}</Typography>
                          <Ionicons color={colors.text.secondary} name={responsibleMenuOpen ? 'chevron-up' : 'chevron-down'} size={14} />
                        </Pressable> : <Typography variant="caption">{memberName(milestone.responsibleUserId)}</Typography>}
                      </View>
                      {responsibleMenuOpen ? <View style={{ backgroundColor: colors.background.card, borderColor: colors.border.divider, borderRadius: RADIUS.md, borderWidth: 1, overflow: 'hidden' }}>{project.collaboration.members.map((member, index) => <Pressable key={member.userId} accessibilityRole="menuitem" onPress={() => { setResponsibleMenuMilestoneId(null); void run(() => assignProjectMilestone(milestone.id, member.userId)); }} style={{ alignItems: 'center', borderBottomColor: colors.border.divider, borderBottomWidth: index === project.collaboration.members.length - 1 ? 0 : 1, flexDirection: 'row', minHeight: 44, paddingHorizontal: SPACE.md }}><Typography variant="body-small" style={{ flex: 1 }}>{member.displayName}</Typography>{milestone.responsibleUserId === member.userId ? <Ionicons color={colors.text.accent} name="checkmark" size={17} /> : null}</Pressable>)}</View> : null}
                    </View>;
                  })}
                </View> : null}

                {capabilities.has('create_task') || capabilities.has('create_milestone') ? <View style={{ alignItems: 'center', flexDirection: 'row', justifyContent: 'flex-end' }}>
                  <Button accessibilityLabel="New" leftIcon={<Ionicons color={colors.text.onAccent} name="add" size={16} />} size="compact" onPress={() => setNewItemGoalId(goal.id)}>New</Button>
                </View> : null}
              </View>;
            })}
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.md }}>
            {isOwner ? <Button variant="outline" onPress={() => { onClose(); onOpenGoalPicker(); }}>Link existing Goal</Button> : null}
            {capabilities.has('create_goal') ? <Button onPress={() => { onClose(); router.push({ pathname: '/goals/create', params: { projectId: project.id } } as never); }}>Create new Goal</Button> : null}
          </View>
        </> : null}

        {tab === 'members' ? <>
          <View style={{ alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' }}><Typography variant="body">{project.mode === 'guide' ? 'OHARA Guide' : project.mode[0].toUpperCase() + project.mode.slice(1)}</Typography><Typography variant="emphasis-sm">{project.collaboration.members.length} / {PROJECT_MEMBER_LIMIT}</Typography></View>
          {project.collaboration.members.map((member) => <View key={member.userId} style={{ borderBottomColor: colors.border.divider, borderBottomWidth: 1, gap: SPACE.md, paddingBottom: SPACE.md }}>
            <View style={{ alignItems: 'center', flexDirection: 'row', gap: SPACE.md }}><View style={{ alignItems: 'center', backgroundColor: colors.background.selectedRow, borderRadius: RADIUS.round, height: 38, justifyContent: 'center', width: 38 }}><Typography variant="emphasis-sm">{member.displayName.slice(0, 2).toUpperCase()}</Typography></View><View style={{ flex: 1 }}><Typography variant="emphasis-sm">{member.displayName}</Typography><Typography variant="caption">{member.role === 'owner' && project.mode === 'guide' ? 'Client · Owner' : member.relationshipLabel || member.role[0].toUpperCase() + member.role.slice(1)}</Typography></View>{capabilities.has('manage_members') && member.role !== 'owner' ? <Button size="compact" variant="secondary" onPress={() => setManagedMemberId(managedMemberId === member.userId ? null : member.userId)}>Manage</Button> : null}</View>
            {managedMemberId === member.userId ? <View style={{ gap: SPACE.sm, paddingLeft: 50 }}>{project.mode === 'team' ? <><Typography variant="micro-label">ROLE</Typography><View style={{ flexDirection: 'row', gap: SPACE.sm }}><Button size="compact" variant={member.role === 'member' ? 'primary' : 'secondary'} onPress={() => void run(() => setProjectMemberRole(project.id, member.userId, 'member'))}>Member</Button><Button size="compact" variant={member.role === 'admin' ? 'primary' : 'secondary'} onPress={() => void run(() => setProjectMemberRole(project.id, member.userId, 'admin'))}>Admin</Button></View></> : <><Typography variant="micro-label">GUIDE TYPE</Typography><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.xs }}>{GUIDE_RELATIONSHIP_LABELS.map((label) => <Button key={label} size="compact" variant={member.relationshipLabel === label ? 'primary' : 'secondary'} onPress={() => void run(() => setProjectMemberRole(project.id, member.userId, 'guide', label))}>{label}</Button>)}</View></>}<Button size="compact" variant="danger" onPress={() => void run(() => removeProjectMember(project.id, member.userId))}>Remove from Project</Button></View> : null}
          </View>)}
          {pending.map((invitation) => <View key={invitation.id} style={{ alignItems: 'center', flexDirection: 'row', gap: SPACE.md }}><View style={{ flex: 1 }}><Typography variant="body-small">Pending invitation</Typography><Typography variant="caption">{invitation.invitedEmail || invitation.invitedUserId} · {invitation.relationshipLabel || invitation.role}</Typography></View>{capabilities.has('invite_members') ? <Button size="compact" variant="secondary" onPress={() => void run(() => revokeProjectInvitation(invitation.id))}>Revoke</Button> : null}</View>)}
          {capabilities.has('invite_members') && project.mode !== 'personal' ? <View style={{ gap: SPACE.md }}><Typography variant="eyebrow">{project.mode === 'guide' ? 'Invite Guide' : 'Invite to Project'}</Typography>{project.mode === 'team' ? <><Typography variant="micro-label">ROLE</Typography><View style={{ flexDirection: 'row', gap: SPACE.sm }}><Button size="compact" variant={inviteRole === 'member' ? 'primary' : 'secondary'} onPress={() => setInviteRole('member')}>Member</Button>{capabilities.has('manage_members') ? <Button size="compact" variant={inviteRole === 'admin' ? 'primary' : 'secondary'} onPress={() => setInviteRole('admin')}>Admin</Button> : null}</View></> : <><Typography variant="micro-label">GUIDE TYPE</Typography><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.xs }}>{GUIDE_RELATIONSHIP_LABELS.map((label) => <Button key={label} size="compact" variant={relationship === label ? 'primary' : 'secondary'} onPress={() => setRelationship(label)}>{label}</Button>)}</View></>}{participantSlots >= PROJECT_MEMBER_LIMIT ? <Typography variant="caption">Participant limit reached. This Project supports {PROJECT_MEMBER_LIMIT} people including pending invitations.</Typography> : inviteable.length ? inviteable.map((friend) => <View key={friend.id} style={{ alignItems: 'center', flexDirection: 'row', gap: SPACE.md }}><View style={{ flex: 1 }}><Typography variant="emphasis-sm">{friend.displayName || friend.username}</Typography><Typography variant="caption">@{friend.username}</Typography></View><Button size="compact" disabled={busy || participantSlots >= PROJECT_MEMBER_LIMIT} onPress={() => void invite(friend)}>Invite</Button></View>) : <Typography variant="caption">Accepted Circles friends who are not already members will appear here.</Typography>}</View> : null}
          {isOwner ? <Typography variant="caption">Ownership transfer is deferred while canonical Goals remain bound to their personal owner. No Goal or private content will be transferred implicitly.</Typography> : <View style={{ borderTopColor: colors.border.divider, borderTopWidth: 1, gap: SPACE.md, paddingTop: SPACE.xl }}><Typography variant="eyebrow">LEAVE PROJECT</Typography><Typography variant="caption">You’ll lose access to shared Project content. Items you created remain with the Project, and assignments to you are cleared.</Typography><Button variant="danger" disabled={busy} onPress={() => setLeaveConfirmOpen(true)}>Leave Project</Button></View>}
        </> : null}

        {tab === 'access' ? <><Typography variant="body">Choose one collaboration preset. All modes use the same membership and capability architecture.</Typography>{([['personal', 'Personal', 'Just me. Remove members and pending invitations first.'], ['team', 'Team', 'Work toward shared outcomes together.'], ['guide', 'OHARA Guide', 'Work with someone helping guide your progress.']] as const).map(([value, label, detail]) => <Pressable key={value} accessibilityRole="radio" accessibilityState={{ checked: project.mode === value }} onPress={() => void run(() => setProjectMode(project.id, value as ProjectMode))} style={{ backgroundColor: project.mode === value ? colors.background.selectedRow : colors.background.subtle, borderColor: project.mode === value ? colors.border.accent : colors.border.divider, borderRadius: RADIUS.lg, borderWidth: 1, gap: SPACE.xs, padding: SPACE.lg }}><Typography variant="emphasis-sm">{label}</Typography><Typography variant="caption">{detail}</Typography></Pressable>)}</> : null}

        {tab === 'status' ? <><Typography variant="eyebrow">PROJECT STATUS</Typography><Typography variant="body">Current status: {project.status}</Typography><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.md }}><Button disabled={busy || project.status === 'active'} onPress={() => void run(() => updateProject(project.id, { status: 'active' }), true)}>Set active</Button><Button disabled={busy || project.status === 'complete'} onPress={() => void run(() => updateProject(project.id, { status: 'complete' }), true)}>Complete</Button></View><View style={{ borderTopColor: colors.border.divider, borderTopWidth: 1, gap: SPACE.md, paddingTop: SPACE.xl }}><Typography variant="eyebrow">ARCHIVE</Typography><Typography variant="caption">Archiving preserves memberships, Goal associations, and Project content while disabling collaborative actions.</Typography><Button variant="secondary" disabled={busy || project.status === 'archived'} onPress={() => void run(() => updateProject(project.id, { status: 'archived' }), true)}>Archive Project</Button></View>{isOwner ? <View style={{ borderTopColor: colors.border.divider, borderTopWidth: 1, gap: SPACE.md, paddingTop: SPACE.xl }}><Typography variant="eyebrow" style={{ color: colors.feedback.danger.text }}>DANGER ZONE</Typography><Typography variant="caption">Deleting removes the Project workspace and collaboration records. Goals, Notes, and Reflections remain with their owners and are unlinked.</Typography><Button variant="danger" disabled={busy} onPress={() => setDeleteConfirmOpen(true)}>Delete Project</Button></View> : null}</> : null}

        {error ? <Typography variant="caption" accessibilityRole="alert" style={{ color: colors.feedback.danger.text }}>{error}</Typography> : null}
      </ScrollView>
    </Modal>

    <Modal visible={newItemGoalId !== null} onClose={() => setNewItemGoalId(null)} showCloseButton={false} cancelText="Cancel" onCancel={() => setNewItemGoalId(null)}>
      <View style={{ gap: SPACE.lg }}>
        <Typography variant="title">Add to Goal</Typography>
        <Typography variant="caption">Choose what to add to {project.goals.find((goal) => goal.id === newItemGoalId)?.title ?? 'this Goal'}.</Typography>
        <View style={{ gap: SPACE.sm }}>
          {capabilities.has('create_task') ? <Button onPress={() => { const goalId = newItemGoalId; setNewItemGoalId(null); if (goalId) openDraft('task', goalId); }}>New Task</Button> : null}
          {capabilities.has('create_milestone') ? <Button variant="secondary" onPress={() => { const goalId = newItemGoalId; setNewItemGoalId(null); if (goalId) openDraft('milestone', goalId); }}>New Milestone</Button> : null}
        </View>
      </View>
    </Modal>

    <Modal visible={detachGoalId !== null} onClose={() => !busy && setDetachGoalId(null)} showCloseButton={false} closeDisabled={busy} cancelText="Cancel" onCancel={() => setDetachGoalId(null)} cancelDisabled={busy} confirmText={busy ? 'Removing…' : 'Remove Goal'} onConfirm={() => { const goalId = detachGoalId; if (!goalId) return; void run(() => detachGoalFromProject(project.id, goalId)).then(() => setDetachGoalId(null)); }} confirmDisabled={busy} confirmVariant="destructive">
      <View style={{ gap: SPACE.md }}>
        <Typography variant="title">Remove Goal?</Typography>
        <Typography variant="body">“{project.goals.find((goal) => goal.id === detachGoalId)?.title ?? 'This Goal'}” will be unlinked from this Project. The Goal and its work will not be deleted.</Typography>
      </View>
    </Modal>

    <Modal visible={draftKind !== null} onClose={() => !busy && setDraftKind(null)} showCloseButton={false} cancelText="Cancel" onCancel={() => setDraftKind(null)} confirmText={busy ? 'Saving…' : `Add ${draftKind === 'task' ? 'Task' : 'Milestone'}`} onConfirm={() => void saveDraft()} confirmDisabled={!draftTitle.trim() || busy}>
      <View style={{ gap: SPACE.lg }}><Typography variant="title">Add {draftKind === 'task' ? 'Task' : 'Milestone'}</Typography><Typography variant="caption">This remains a canonical Goal {draftKind === 'task' ? 'Task' : 'Milestone'}.</Typography><Typography variant="caption">Goal · {project.goals.find((goal) => goal.id === draftGoal)?.title ?? 'Selected Goal'}</Typography><TextInput accessibilityLabel={`${draftKind} title`} value={draftTitle} onChangeText={setDraftTitle} placeholder="Title" placeholderTextColor={colors.text.muted} style={inputStyle} /><TextInput accessibilityLabel="Due date" value={draftDue} onChangeText={setDraftDue} placeholder="YYYY-MM-DD (optional)" placeholderTextColor={colors.text.muted} style={inputStyle} /><Typography variant="caption">{draftKind === 'task' ? 'Assigned to' : 'Responsible'}</Typography><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm }}>{project.collaboration.members.map((member) => <Button key={member.userId} size="compact" variant={draftAssignee === member.userId ? 'primary' : 'secondary'} onPress={() => setDraftAssignee(member.userId)}>{member.displayName}</Button>)}</View></View>
    </Modal>

    <Modal visible={leaveConfirmOpen} onClose={() => !busy && setLeaveConfirmOpen(false)} showCloseButton={false} closeDisabled={busy} cancelText="Cancel" onCancel={() => setLeaveConfirmOpen(false)} cancelDisabled={busy} confirmText={busy ? 'Leaving…' : 'Leave Project'} onConfirm={() => void leaveCurrentProject()} confirmDisabled={busy} confirmVariant="destructive">
      <View style={{ gap: SPACE.md }}><Typography variant="title">Leave {project.title}?</Typography><Typography variant="body">You’ll lose access to its shared Goals, Notes, Reflections, and Project history. The owner’s content and your existing contributions will not be deleted.</Typography></View>
    </Modal>

    <Modal visible={deleteConfirmOpen} onClose={() => !busy && setDeleteConfirmOpen(false)} showCloseButton={false} closeDisabled={busy} cancelText="Cancel" onCancel={() => setDeleteConfirmOpen(false)} cancelDisabled={busy} confirmText={busy ? 'Deleting…' : 'Delete Project'} onConfirm={() => void deleteCurrentProject()} confirmDisabled={busy} confirmVariant="destructive">
      <View style={{ gap: SPACE.md }}><Typography accessibilityRole="header" variant="title">Delete Project?</Typography><Typography variant="body">This permanently removes “{project.title}” and its Project workspace. Goals, Notes, and Reflections remain with their owners and are unlinked.</Typography><Typography variant="caption">This cannot be undone.</Typography></View>
    </Modal>

  </>;
}
