import { useMemo, useState } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, TextInput, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Typography } from '@/components/ui/Typography';
import { RADIUS, SPACE } from '@/constants/design';
import { useThemeColors } from '@/store/uiStore';
import type { ProjectComment, ProjectMember } from '../types';

export function ProjectComments({ comments, currentUserId, members, onDelete, onEdit }: {
  comments: ProjectComment[];
  currentUserId: string | null;
  members: ProjectMember[];
  onDelete: (commentId: string) => Promise<void>;
  onEdit: (commentId: string, body: string) => Promise<void>;
}) {
  const colors = useThemeColors();
  const names = useMemo(() => new Map(members.map((member) => [member.userId, member.displayName])), [members]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!comments.length) return null;

  async function saveEdit() {
    if (!editingId || !draft.trim() || busy) return;
    setBusy(true); setError(null);
    try { await onEdit(editingId, draft); setEditingId(null); setDraft(''); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Comment could not be updated.'); }
    finally { setBusy(false); }
  }

  async function confirmDelete() {
    if (!deleteId || busy) return;
    setBusy(true); setError(null);
    try { await onDelete(deleteId); setDeleteId(null); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Comment could not be deleted.'); }
    finally { setBusy(false); }
  }

  return <>
    <View style={{ gap: SPACE.md }}>
      <Typography variant="eyebrow">Comments</Typography>
      {comments.map((comment) => {
        const author = names.get(comment.authorId) ?? 'Member';
        const isAuthor = currentUserId === comment.authorId;
        const isEditing = editingId === comment.id;
        return <View key={comment.id} style={{ borderTopColor: colors.border.divider, borderTopWidth: 1, gap: SPACE.sm, paddingTop: SPACE.md }}>
          <View style={{ alignItems: 'center', flexDirection: 'row', gap: SPACE.sm }}>
            <View style={{ alignItems: 'center', backgroundColor: colors.background.selectedRow, borderRadius: RADIUS.round, height: 28, justifyContent: 'center', width: 28 }}><Typography variant="caption">{author.slice(0, 2).toUpperCase()}</Typography></View>
            <View style={{ flex: 1 }}><Typography variant="emphasis-sm">{author}</Typography><Typography variant="caption">{comment.editedAt ? 'Edited · ' : ''}{new Date(comment.createdAt).toLocaleString()}</Typography></View>
            {isAuthor && !isEditing ? <View style={{ flexDirection: 'row', gap: SPACE.xs }}>
              <Pressable accessibilityLabel={`Edit comment by ${author}`} accessibilityRole="button" hitSlop={8} onPress={() => { setEditingId(comment.id); setDraft(comment.body); setError(null); }} style={{ alignItems: 'center', justifyContent: 'center', minHeight: 36, minWidth: 36 }}><Ionicons color={colors.text.muted} name="pencil-outline" size={17} /></Pressable>
              <Pressable accessibilityLabel={`Delete comment by ${author}`} accessibilityRole="button" hitSlop={8} onPress={() => { setDeleteId(comment.id); setError(null); }} style={{ alignItems: 'center', justifyContent: 'center', minHeight: 36, minWidth: 36 }}><Ionicons color={colors.feedback.danger.text} name="trash-outline" size={17} /></Pressable>
            </View> : null}
          </View>
          {isEditing ? <View style={{ gap: SPACE.sm }}>
            <TextInput accessibilityLabel="Edit comment" autoFocus multiline value={draft} onChangeText={setDraft} style={{ backgroundColor: colors.background.input, borderColor: colors.border.input, borderRadius: RADIUS.md, borderWidth: 1, color: colors.text.primary, minHeight: 82, padding: 12, textAlignVertical: 'top' }} />
            <View style={{ flexDirection: 'row', gap: SPACE.sm }}><Button size="compact" disabled={!draft.trim() || busy} onPress={() => void saveEdit()}>{busy ? 'Saving…' : 'Save'}</Button><Button size="compact" variant="secondary" disabled={busy} onPress={() => { setEditingId(null); setDraft(''); setError(null); }}>Cancel</Button></View>
          </View> : <Typography variant="body-small">{comment.body}</Typography>}
        </View>;
      })}
      {error ? <Typography accessibilityRole="alert" variant="caption" style={{ color: colors.feedback.danger.text }}>{error}</Typography> : null}
    </View>
    <Modal visible={deleteId !== null} onClose={() => !busy && setDeleteId(null)} showCloseButton={false} cancelText="Cancel" onCancel={() => setDeleteId(null)} confirmText={busy ? 'Deleting…' : 'Delete'} confirmVariant="destructive" confirmDisabled={busy} onConfirm={() => void confirmDelete()}>
      <View style={{ gap: SPACE.md }}><Typography variant="title">Delete comment?</Typography><Typography variant="body">This can’t be undone.</Typography></View>
    </Modal>
  </>;
}
