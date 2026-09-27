import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Typography } from '@/components/ui/Typography';
import { RADIUS, SPACE } from '@/constants/design';
import supabase from '@/lib/db/client';
import { useThemeColors } from '@/store/uiStore';
import {
  createProjectChatMessage,
  deleteProjectChatMessage,
  editProjectChatMessage,
  fetchProjectChatMessages,
} from '../services/project-service';
import type { ProjectChatMessage, ProjectWorkspace } from '../types';

export function ProjectChat({ currentUserId, project }: { currentUserId: string | null; project: ProjectWorkspace }) {
  const colors = useThemeColors();
  const [messages, setMessages] = useState<ProjectChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [editing, setEditing] = useState<ProjectChatMessage | null>(null);
  const [deleting, setDeleting] = useState<ProjectChatMessage | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const canChat = project.collaboration.capabilities.includes('chat') && project.status !== 'archived';
  const hasCollaborators = project.collaboration.members.length > 1;
  const names = useMemo(() => new Map(project.collaboration.members.map((member) => [member.userId, member.displayName])), [project.collaboration.members]);

  const load = useCallback(async () => {
    if (!canChat) { setLoading(false); return; }
    try { setMessages(await fetchProjectChatMessages(project.id)); setError(null); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Project Chat could not load.'); }
    finally { setLoading(false); }
  }, [canChat, project.id]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (!canChat) return;
    const channel = supabase.channel(`project-chat:${project.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'project_chat_messages', filter: `project_id=eq.${project.id}` }, () => { void load(); })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [canChat, load, project.id]);

  async function send() {
    const body = draft.trim();
    if (!body || busy || !canChat || !hasCollaborators) return;
    setBusy(true); setError(null);
    try { await createProjectChatMessage(project.id, body); setDraft(''); await load(); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Message could not be sent.'); }
    finally { setBusy(false); }
  }

  async function saveEdit() {
    const body = draft.trim();
    if (!editing || !body || busy) return;
    setBusy(true); setError(null);
    try { await editProjectChatMessage(editing.id, body); setEditing(null); setDraft(''); await load(); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Message could not be updated.'); }
    finally { setBusy(false); }
  }

  async function remove() {
    if (!deleting || busy) return;
    setBusy(true); setError(null);
    try { await deleteProjectChatMessage(deleting.id); setDeleting(null); await load(); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Message could not be deleted.'); }
    finally { setBusy(false); }
  }

  const inputStyle = { backgroundColor: colors.background.input, borderColor: colors.border.input, borderRadius: RADIUS.md, borderWidth: 1, color: colors.text.primary, minHeight: 54, padding: 12, textAlignVertical: 'top' } as const;
  return <>
    <View accessibilityLabel="Project Chat card" style={{ backgroundColor: colors.background.card, borderColor: colors.border.warmSubtle, borderRadius: RADIUS.xl, borderWidth: 1, gap: SPACE.lg, padding: SPACE.xl }}>
      <View style={{ alignItems: 'center', flexDirection: 'row', gap: SPACE.sm }}><Ionicons color={colors.accent.primary} name="chatbubbles-outline" size={19} /><Typography variant="section-header">Project Chat</Typography></View>
      {!hasCollaborators ? <View style={{ gap: SPACE.xs }}><Typography variant="body-small">Project Chat becomes available when collaborators join.</Typography><Typography variant="caption">Task-specific conversation stays with each Task.</Typography></View> : null}
      {hasCollaborators && loading ? <Typography variant="caption">Loading conversation…</Typography> : null}
      {hasCollaborators && !loading ? <ScrollView nestedScrollEnabled style={{ maxHeight: 300 }} contentContainerStyle={{ gap: SPACE.md }}>
        {messages.map((message) => { const mine = message.authorId === currentUserId; const author = names.get(message.authorId) ?? 'Project member'; return <View key={message.id} style={{ alignSelf: mine ? 'flex-end' : 'stretch', backgroundColor: mine ? colors.background.selectedRow : colors.background.subtle, borderColor: mine ? colors.border.accent : colors.border.divider, borderRadius: RADIUS.lg, borderWidth: 1, gap: SPACE.xs, maxWidth: '92%', padding: SPACE.md }}><View style={{ alignItems: 'center', flexDirection: 'row', gap: SPACE.sm }}><Typography variant="emphasis-sm" numberOfLines={1} style={{ flex: 1 }}>{mine ? 'You' : author}</Typography>{mine ? <><Pressable accessibilityLabel="Edit chat message" accessibilityRole="button" hitSlop={8} onPress={() => { setEditing(message); setDraft(message.body); setError(null); }}><Ionicons color={colors.text.muted} name="pencil-outline" size={15} /></Pressable><Pressable accessibilityLabel="Delete chat message" accessibilityRole="button" hitSlop={8} onPress={() => setDeleting(message)}><Ionicons color={colors.feedback.danger.text} name="trash-outline" size={15} /></Pressable></> : null}</View><Typography variant="body-small">{message.body}</Typography><Typography variant="caption">{message.editedAt ? 'Edited · ' : ''}{new Date(message.createdAt).toLocaleString()}</Typography></View>; })}
        {!messages.length ? <Typography variant="body-small" style={{ color: colors.text.muted }}>Start the Project conversation.</Typography> : null}
      </ScrollView> : null}
      {hasCollaborators && canChat ? <View accessibilityLabel="Project Chatbox" style={{ backgroundColor: colors.background.subtle, borderColor: colors.border.divider, borderRadius: RADIUS.lg, borderWidth: 1, gap: SPACE.sm, padding: SPACE.sm }}><View style={{ alignItems: 'flex-end', flexDirection: 'row', gap: SPACE.sm }}><TextInput accessibilityLabel={editing ? 'Edit Project Chat message' : 'Project Chat message'} multiline maxLength={2000} placeholder={editing ? 'Edit message…' : 'Write a message…'} placeholderTextColor={colors.text.muted} value={draft} onChangeText={setDraft} style={[inputStyle, { flex: 1 }]} />{editing ? null : <Button size="compact" disabled={!draft.trim() || busy} loading={busy} onPress={() => void send()}>Send</Button>}</View>{editing ? <View style={{ flexDirection: 'row', gap: SPACE.sm }}><Button size="compact" disabled={!draft.trim() || busy} loading={busy} onPress={() => void saveEdit()}>Save</Button><Button size="compact" variant="secondary" disabled={busy} onPress={() => { setEditing(null); setDraft(''); }}>Cancel</Button></View> : null}</View> : null}
      {project.status === 'archived' ? <Typography variant="caption">Project Chat is read-only while this Project is archived.</Typography> : null}
      {error ? <Typography accessibilityRole="alert" variant="caption" style={{ color: colors.feedback.danger.text }}>{error}</Typography> : null}
    </View>
    <Modal visible={deleting !== null} onClose={() => !busy && setDeleting(null)} showCloseButton={false} cancelText="Cancel" onCancel={() => setDeleting(null)} confirmText={busy ? 'Deleting…' : 'Delete message'} confirmVariant="destructive" confirmDisabled={busy} onConfirm={() => void remove()}><View style={{ gap: SPACE.md }}><Typography variant="title">Delete message?</Typography><Typography variant="body-small">This removes the message from Project Chat for everyone.</Typography></View></Modal>
  </>;
}
