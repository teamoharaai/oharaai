import { useMemo, useState } from 'react';
import { Pressable, TextInput, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { Modal } from '@/components/ui/Modal';
import { Typography } from '@/components/ui/Typography';
import { RADIUS, SPACE } from '@/constants/design';
import { useThemeColors } from '@/store/uiStore';
import { VaultWorkspace, type VaultFilter } from '@/features/goals/components/GoalVault';
import { isStickyVaultItem } from '@/features/goals/vault-classification';
import type { ProjectWorkspace } from '../types';
import { useProjectVault } from '../hooks/useProjectVault';

export function ProjectVaultWorkspace({ addRequest, initialFilter, project }: { addRequest: number; initialFilter?: VaultFilter; project: ProjectWorkspace }) {
  const colors = useThemeColors();
  const { width } = useWindowDimensions();
  const compact = width < 720;
  const vault = useProjectVault(project.id, project.vaultItems);
  const [noteOpen, setNoteOpen] = useState(false);
  const [sourceOpen, setSourceOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [url, setUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sticky = useMemo(() => vault.items.filter(isStickyVaultItem), [vault.items]);

  function openStickyNote() {
    setTitle(''); setContent(''); setUrl(''); setError(null); setNoteOpen(true);
  }
  function openSource() {
    setTitle(''); setContent(''); setUrl(''); setError(null); setSourceOpen(true);
  }

  async function saveSticky() {
    if (!title.trim() || saving) return;
    setSaving(true); setError(null);
    try {
      await vault.addItem({ itemType: 'note', contentKind: 'sticky_note', title: title.trim(), content: content.trim() });
      setNoteOpen(false); setTitle(''); setContent('');
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Sticky Note could not be saved.'); }
    finally { setSaving(false); }
  }
  async function saveSource() {
    if (!url.trim() || saving) return;
    setSaving(true); setError(null);
    try {
      const normalized = /^https?:\/\//i.test(url.trim()) ? url.trim() : `https://${url.trim()}`;
      await vault.addItem({ itemType: 'link', title: title.trim() || normalized, metadata: { url: normalized, annotation: content.trim() || undefined } });
      setSourceOpen(false); setTitle(''); setContent(''); setUrl('');
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Source could not be saved.'); }
    finally { setSaving(false); }
  }

  const inputStyle = { backgroundColor: colors.background.input, borderColor: colors.border.input, borderRadius: RADIUS.md, borderWidth: 1, color: colors.text.primary, minHeight: 44, padding: 12 } as const;
  return <>
    <VaultWorkspace
      activityContent={<View>{project.activity.filter((item) => item.id.startsWith('vault-')).slice(0, 12).map((item) => <View key={item.id} style={{ borderBottomColor: colors.border.divider, borderBottomWidth: 1, gap: SPACE.xs, paddingVertical: SPACE.md }}><Typography variant="body-small">{item.label}</Typography><Typography variant="caption">{item.origin} · {new Date(item.occurredAt).toLocaleDateString()}</Typography></View>)}</View>}
      activityError={null}
      activityItems={[]}
      activityLoading={false}
      entries={project.entries}
      entriesError={project.partialErrors.includes('Echo content') ? 'Linked entries could not be loaded.' : null}
      onAddSource={openSource}
      onAddStickyNote={openStickyNote}
      externalAddRequest={addRequest}
      initialFilter={initialFilter}
      parent={{ id: project.id, title: project.title, type: 'project' }}
      privateNotes={<View style={{ flexDirection: compact ? 'column' : 'row', flexWrap: 'wrap', gap: SPACE.md }}>
        {sticky.length ? sticky.map((item) => {
          const origin = item.origins.length ? `From: ${item.origins.map((entry) => entry.goalTitle).join(', ')}` : 'Project note';
          return <Pressable key={item.id} accessibilityRole="button" onPress={() => item.origins[0] && router.push(`/(app)/goals/${item.origins[0].goalId}` as never)} style={({ pressed }) => ({ backgroundColor: colors.background.selectedRow, borderColor: colors.border.accent, borderRadius: RADIUS.lg, borderWidth: 1, flexBasis: compact ? undefined : 280, flexGrow: 1, gap: SPACE.sm, minWidth: compact ? 0 : 250, opacity: pressed ? 0.72 : 1, padding: SPACE.lg })}>
            <Typography variant="caption">Sticky Note · Private to you</Typography><Typography variant="emphasis-sm">{item.title || 'Untitled'}</Typography>{item.content ? <Typography variant="body-small" numberOfLines={3}>{item.content}</Typography> : null}<Typography variant="caption">{origin}</Typography>
          </Pressable>;
        }) : <Typography variant="body">No Sticky Notes yet.</Typography>}
      </View>}
      vaultData={vault}
      showAddButton={false}
    />
    <Modal visible={noteOpen} onClose={() => !saving && setNoteOpen(false)} showCloseButton={false} cancelText="Cancel" onCancel={() => setNoteOpen(false)} confirmText={saving ? 'Saving…' : 'Save Sticky Note'} onConfirm={() => void saveSticky()} confirmDisabled={!title.trim() || saving}>
      <View style={{ gap: SPACE.lg }}><Typography variant="title">Project Sticky Note</Typography><Typography variant="caption">Private to you and stored in this Project Vault.</Typography><TextInput accessibilityLabel="Sticky Note title" placeholder="Title" placeholderTextColor={colors.text.muted} value={title} onChangeText={setTitle} style={inputStyle} /><TextInput accessibilityLabel="Sticky Note content" multiline placeholder="Write a note…" placeholderTextColor={colors.text.muted} value={content} onChangeText={setContent} style={[inputStyle, { minHeight: 120, textAlignVertical: 'top' }]} />{error ? <Typography variant="caption" style={{ color: colors.feedback.danger.text }}>{error}</Typography> : null}</View>
    </Modal>
    <Modal visible={sourceOpen} onClose={() => !saving && setSourceOpen(false)} showCloseButton={false} cancelText="Cancel" onCancel={() => setSourceOpen(false)} confirmText={saving ? 'Saving…' : 'Add Source'} onConfirm={() => void saveSource()} confirmDisabled={!url.trim() || saving}>
      <View style={{ gap: SPACE.lg }}><Typography variant="title">Add Project Source</Typography><TextInput accessibilityLabel="Source URL" autoCapitalize="none" placeholder="https://…" placeholderTextColor={colors.text.muted} value={url} onChangeText={setUrl} style={inputStyle} /><TextInput accessibilityLabel="Source title" placeholder="Title (optional)" placeholderTextColor={colors.text.muted} value={title} onChangeText={setTitle} style={inputStyle} /><TextInput accessibilityLabel="Source annotation" multiline placeholder="Why this matters (optional)" placeholderTextColor={colors.text.muted} value={content} onChangeText={setContent} style={[inputStyle, { minHeight: 90, textAlignVertical: 'top' }]} />{error ? <Typography variant="caption" style={{ color: colors.feedback.danger.text }}>{error}</Typography> : null}</View>
    </Modal>
  </>;
}
