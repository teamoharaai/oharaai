import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Typography } from '@/components/ui/Typography';
import { RADIUS, SPACE } from '@/constants/design';
import { useThemeColors } from '@/store/uiStore';
import { fetchInviteableFriends } from '@/features/circles/services/circles-service';
import type { CirclesAuthor } from '@/lib/db/circles-core';
import type { ProjectMode, ProjectRole, ProjectWorkspace } from '../types';
import { PROJECT_MEMBER_LIMIT } from '../types';
import {
  assignGoalLead,
  assignProjectMilestone,
  createProjectComment,
  createProjectMilestone,
  createProjectTask,
  detachGoalFromProject,
  inviteProjectMember,
  removeProjectMember,
  revokeProjectInvitation,
  setProjectMemberRole,
  setProjectMode,
  updateProject,
  updateProjectDetails,
} from '../services/project-service';

type Tab = 'details' | 'goals' | 'members' | 'access' | 'status';

export function ManageProjectModal({ onClose, onOpenGoalPicker, onReload, project, visible }: {
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
  const [draftKind, setDraftKind] = useState<'task' | 'milestone' | null>(null);
  const [draftGoal, setDraftGoal] = useState('');
  const [draftTitle, setDraftTitle] = useState('');
  const [draftDue, setDraftDue] = useState('');
  const [draftAssignee, setDraftAssignee] = useState<string | null>(null);
  const [commentTarget, setCommentTarget] = useState<{ type: 'goal' | 'milestone'; id: string; title: string } | null>(null);
  const [comment, setComment] = useState('');

  useEffect(() => {
    if (!visible) return;
    setTitle(project.title); setDescription(project.description ?? ''); setError(null);
    if (!capabilities.has('manage_project')) setTab('goals');
    if (capabilities.has('invite_members')) void fetchInviteableFriends().then(setFriends).catch(() => setFriends([]));
  }, [capabilities, project.description, project.title, visible]);

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

  async function invite(friend: CirclesAuthor) {
    const role: Exclude<ProjectRole, 'owner'> = project.mode === 'guide' ? 'guide' : 'member';
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

  async function saveComment() {
    if (!commentTarget || !comment.trim()) return;
    await run(async () => { await createProjectComment(project.id, commentTarget.type, commentTarget.id, comment); setCommentTarget(null); setComment(''); });
  }

  const tabs = (['details', 'goals', 'members', 'access', 'status'] as Tab[]).filter((item) => {
    if (item === 'details') return capabilities.has('manage_project');
    if (item === 'members') return true;
    if (item === 'access' || item === 'status') return isOwner;
    return true;
  });

  return <>
    <Modal visible={visible} onClose={() => !busy && onClose()} showCloseButton={false} contentStyle={{ maxWidth: 760, maxHeight: '92%', padding: 0 }}>
      <View style={{ padding: SPACE['3xl'], paddingBottom: 0 }}><Typography variant="heading">Manage Project</Typography><ScrollView horizontal showsHorizontalScrollIndicator={false} accessibilityRole="tablist" contentContainerStyle={{ borderBottomColor: colors.border.divider, borderBottomWidth: 1, marginTop: SPACE.xl }}>{tabs.map((item) => <Pressable key={item} accessibilityRole="tab" accessibilityState={{ selected: tab === item }} onPress={() => setTab(item)} style={{ borderBottomColor: tab === item ? colors.accent.primary : 'transparent', borderBottomWidth: 2, minHeight: 42, justifyContent: 'center', paddingHorizontal: SPACE.lg }}><Typography variant="emphasis-sm">{item === 'access' ? 'Access / Mode' : item[0].toUpperCase() + item.slice(1)}</Typography></Pressable>)}</ScrollView></View>
      <ScrollView contentContainerStyle={{ gap: SPACE.xl, padding: SPACE['3xl'] }}>
        {tab === 'details' ? <><TextInput accessibilityLabel="Project name" value={title} onChangeText={setTitle} style={inputStyle} /><TextInput accessibilityLabel="Project description" multiline value={description} onChangeText={setDescription} style={[inputStyle, { minHeight: 100, textAlignVertical: 'top' }]} /><Button loading={busy} disabled={!title.trim()} onPress={() => void run(() => updateProjectDetails(project.id, title, description), true)}>Save details</Button></> : null}

        {tab === 'goals' ? <>{project.goals.map((goal) => <View key={goal.id} style={{ borderBottomColor: colors.border.divider, borderBottomWidth: 1, gap: SPACE.md, paddingBottom: SPACE.lg }}><View><Typography variant="emphasis-sm">{goal.title}</Typography><Typography variant="caption">{goal.category} · {goal.status}</Typography></View><Typography variant="caption">Goal Lead</Typography><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm }}>{capabilities.has('assign_goal_lead') ? project.collaboration.members.map((member) => <Button key={member.userId} size="compact" variant={goal.projectLeadId === member.userId ? 'primary' : 'secondary'} onPress={() => void run(() => assignGoalLead(goal.id, member.userId))}>{member.displayName}</Button>) : <Typography variant="body-small">{project.collaboration.members.find((member) => member.userId === goal.projectLeadId)?.displayName ?? 'Unassigned'}</Typography>}</View><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm }}>{capabilities.has('create_task') ? <Button size="compact" variant="secondary" onPress={() => openDraft('task', goal.id)}>+ Task</Button> : null}{capabilities.has('create_milestone') ? <Button size="compact" variant="secondary" onPress={() => openDraft('milestone', goal.id)}>+ Milestone</Button> : null}{capabilities.has('comment') ? <Button size="compact" variant="secondary" onPress={() => setCommentTarget({ type: 'goal', id: goal.id, title: goal.title })}>Comment</Button> : null}{isOwner ? <Button size="compact" variant="secondary" disabled={busy} onPress={() => void run(() => detachGoalFromProject(project.id, goal.id))}>Detach</Button> : null}</View>{goal.milestones.slice(0, 4).map((milestone) => <View key={milestone.id} style={{ gap: SPACE.xs, paddingLeft: SPACE.md }}><Typography variant="body-small">{milestone.title}{milestone.dueDate ? ` · ${milestone.dueDate.toLocaleDateString()}` : ''}</Typography><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.xs }}>{capabilities.has('assign_milestone') ? project.collaboration.members.map((member) => <Button key={member.userId} size="compact" variant={milestone.responsibleUserId === member.userId ? 'primary' : 'secondary'} onPress={() => void run(() => assignProjectMilestone(milestone.id, member.userId))}>{member.displayName}</Button>) : null}{capabilities.has('comment') ? <Button size="compact" variant="secondary" onPress={() => setCommentTarget({ type: 'milestone', id: milestone.id, title: milestone.title })}>Comment</Button> : null}</View></View>)}</View>)}<View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.md }}>{isOwner ? <Button onPress={() => { onClose(); onOpenGoalPicker(); }}>Add existing Goal</Button> : null}{capabilities.has('create_goal') ? <Button variant="secondary" onPress={() => { onClose(); router.push({ pathname: '/goals/create', params: { projectId: project.id } } as never); }}>+ New Goal</Button> : null}</View></> : null}

        {tab === 'members' ? <><Typography variant="body">{project.mode === 'guide' ? 'OHARA Guide' : project.mode[0].toUpperCase() + project.mode.slice(1)} · {project.collaboration.members.length}/{PROJECT_MEMBER_LIMIT} people</Typography>{project.collaboration.members.map((member) => <View key={member.userId} style={{ alignItems: 'center', borderBottomColor: colors.border.divider, borderBottomWidth: 1, flexDirection: 'row', gap: SPACE.md, paddingBottom: SPACE.md }}><View style={{ alignItems: 'center', backgroundColor: colors.background.selectedRow, borderRadius: RADIUS.round, height: 38, justifyContent: 'center', width: 38 }}><Typography variant="emphasis-sm">{member.displayName.slice(0, 2).toUpperCase()}</Typography></View><View style={{ flex: 1 }}><Typography variant="emphasis-sm">{member.displayName}</Typography><Typography variant="caption">{member.role === 'owner' && project.mode === 'guide' ? 'Client · Owner' : member.relationshipLabel || member.role}</Typography></View>{capabilities.has('manage_members') && member.role !== 'owner' ? <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.xs }}>{project.mode === 'team' ? <><Button size="compact" variant={member.role === 'member' ? 'primary' : 'secondary'} onPress={() => void run(() => setProjectMemberRole(project.id, member.userId, 'member'))}>Member</Button><Button size="compact" variant={member.role === 'admin' ? 'primary' : 'secondary'} onPress={() => void run(() => setProjectMemberRole(project.id, member.userId, 'admin'))}>Admin</Button></> : null}<Button size="compact" variant="danger" onPress={() => void run(() => removeProjectMember(project.id, member.userId))}>Remove</Button></View> : null}</View>)}{pending.map((invitation) => <View key={invitation.id} style={{ alignItems: 'center', flexDirection: 'row', gap: SPACE.md }}><View style={{ flex: 1 }}><Typography variant="body-small">Pending invitation</Typography><Typography variant="caption">{invitation.invitedEmail || invitation.invitedUserId} · {invitation.relationshipLabel || invitation.role}</Typography></View>{capabilities.has('invite_members') ? <Button size="compact" variant="secondary" onPress={() => void run(() => revokeProjectInvitation(invitation.id))}>Revoke</Button> : null}</View>)}{capabilities.has('invite_members') && project.mode !== 'personal' ? <View style={{ gap: SPACE.md }}><Typography variant="eyebrow">Invite person</Typography>{project.mode === 'guide' ? <TextInput accessibilityLabel="Guide relationship" value={relationship} onChangeText={setRelationship} placeholder="Fitness Coach, Tutor, Advisor…" placeholderTextColor={colors.text.muted} style={inputStyle} /> : null}{participantSlots >= PROJECT_MEMBER_LIMIT ? <Typography variant="caption">This Project has reached the launch limit of {PROJECT_MEMBER_LIMIT} people, including pending invitations.</Typography> : inviteable.length ? inviteable.map((friend) => <View key={friend.id} style={{ alignItems: 'center', flexDirection: 'row', gap: SPACE.md }}><View style={{ flex: 1 }}><Typography variant="emphasis-sm">{friend.displayName || friend.username}</Typography><Typography variant="caption">@{friend.username}</Typography></View><Button size="compact" disabled={busy || participantSlots >= PROJECT_MEMBER_LIMIT} onPress={() => void invite(friend)}>Invite</Button></View>) : <Typography variant="caption">Accepted Circles friends who are not already members will appear here.</Typography>}</View> : null}{isOwner ? <Typography variant="caption">Ownership transfer is deferred while canonical Goals remain bound to their personal owner. No Goal or private content will be transferred implicitly.</Typography> : null}</> : null}

        {tab === 'access' ? <><Typography variant="body">Choose one collaboration preset. All modes use the same membership and capability architecture.</Typography>{([['personal', 'Personal', 'Just me. Remove members and pending invitations first.'], ['team', 'Team', 'Work toward shared outcomes together.'], ['guide', 'OHARA Guide', 'Work with someone helping guide your progress.']] as const).map(([value, label, detail]) => <Pressable key={value} accessibilityRole="radio" accessibilityState={{ checked: project.mode === value }} onPress={() => void run(() => setProjectMode(project.id, value as ProjectMode))} style={{ backgroundColor: project.mode === value ? colors.background.selectedRow : colors.background.subtle, borderColor: project.mode === value ? colors.border.accent : colors.border.divider, borderRadius: RADIUS.lg, borderWidth: 1, gap: SPACE.xs, padding: SPACE.lg }}><Typography variant="emphasis-sm">{label}</Typography><Typography variant="caption">{detail}</Typography></Pressable>)}</> : null}

        {tab === 'status' ? <><Typography variant="body">Current status: {project.status}</Typography><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.md }}><Button disabled={busy || project.status === 'active'} onPress={() => void run(() => updateProject(project.id, { status: 'active' }), true)}>Set active</Button><Button disabled={busy || project.status === 'complete'} onPress={() => void run(() => updateProject(project.id, { status: 'complete' }), true)}>Complete</Button></View><View style={{ borderTopColor: colors.border.divider, borderTopWidth: 1, gap: SPACE.md, paddingTop: SPACE.xl }}><Typography variant="eyebrow">Archive</Typography><Typography variant="caption">Archiving preserves memberships, Goal associations, and Project content while disabling collaborative actions.</Typography><Button variant="danger" disabled={busy || project.status === 'archived'} onPress={() => void run(() => updateProject(project.id, { status: 'archived' }), true)}>Archive Project</Button></View></> : null}

        {error ? <Typography variant="caption" accessibilityRole="alert" style={{ color: colors.feedback.danger.text }}>{error}</Typography> : null}<View style={{ alignItems: 'flex-end', borderTopColor: colors.border.divider, borderTopWidth: 1, paddingTop: SPACE.lg }}><Button variant="secondary" disabled={busy} onPress={onClose}>Done</Button></View>
      </ScrollView>
    </Modal>

    <Modal visible={draftKind !== null} onClose={() => !busy && setDraftKind(null)} showCloseButton={false} cancelText="Cancel" onCancel={() => setDraftKind(null)} confirmText={busy ? 'Saving…' : `Add ${draftKind === 'task' ? 'Task' : 'Milestone'}`} onConfirm={() => void saveDraft()} confirmDisabled={!draftTitle.trim() || busy}>
      <View style={{ gap: SPACE.lg }}><Typography variant="title">Add {draftKind === 'task' ? 'Task' : 'Milestone'}</Typography><Typography variant="caption">This remains a canonical Goal {draftKind === 'task' ? 'Task' : 'Milestone'}.</Typography><TextInput accessibilityLabel={`${draftKind} title`} value={draftTitle} onChangeText={setDraftTitle} placeholder="Title" placeholderTextColor={colors.text.muted} style={inputStyle} /><TextInput accessibilityLabel="Due date" value={draftDue} onChangeText={setDraftDue} placeholder="YYYY-MM-DD (optional)" placeholderTextColor={colors.text.muted} style={inputStyle} /><Typography variant="caption">Responsible person</Typography><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm }}>{project.collaboration.members.map((member) => <Button key={member.userId} size="compact" variant={draftAssignee === member.userId ? 'primary' : 'secondary'} onPress={() => setDraftAssignee(member.userId)}>{member.displayName}</Button>)}</View></View>
    </Modal>

    <Modal visible={commentTarget !== null} onClose={() => !busy && setCommentTarget(null)} showCloseButton={false} cancelText="Cancel" onCancel={() => setCommentTarget(null)} confirmText={busy ? 'Posting…' : 'Post comment'} onConfirm={() => void saveComment()} confirmDisabled={!comment.trim() || busy}>
      <View style={{ gap: SPACE.lg }}><Typography variant="title">Comment on {commentTarget?.title}</Typography><Typography variant="caption">Project-scoped context, not chat.</Typography><TextInput accessibilityLabel="Comment" multiline value={comment} onChangeText={setComment} placeholder="Add context…" placeholderTextColor={colors.text.muted} style={[inputStyle, { minHeight: 120, textAlignVertical: 'top' }]} /></View>
    </Modal>
  </>;
}
