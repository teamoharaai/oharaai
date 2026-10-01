import { useState } from 'react';
import { TextInput, View } from 'react-native';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Typography } from '@/components/ui/Typography';
import { RADIUS, SPACE } from '@/constants/design';
import { useThemeColors } from '@/store/uiStore';
import { VaultWorkspace, type VaultFilter } from '@/features/goals/components/GoalVault';
import type { ProjectWorkspace } from '../types';
import { useProjectVault } from '../hooks/useProjectVault';

export function ProjectVaultWorkspace({ addRequest, initialFilter, project }: { addRequest: number; initialFilter?: VaultFilter; project: ProjectWorkspace }) {
  const colors = useThemeColors();
  const vault = useProjectVault(project.id, project.vaultItems);
  const [sourceOpen, setSourceOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [url, setUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [visibility, setVisibility] = useState<'private' | 'vault_members'>(project.collaboration.role === 'owner' ? 'private' : 'vault_members');
  const [error, setError] = useState<string | null>(null);
  function openSource() {
    setTitle(''); setContent(''); setUrl(''); setError(null); setVisibility(project.collaboration.role === 'owner' ? 'private' : 'vault_members'); setSourceOpen(true);
  }

  async function saveSource() {
    if (!url.trim() || saving) return;
    setSaving(true); setError(null);
    try {
      const normalized = /^https?:\/\//i.test(url.trim()) ? url.trim() : `https://${url.trim()}`;
      await vault.addItem({ itemType: 'link', title: title.trim() || normalized, metadata: { url: normalized, annotation: content.trim() || undefined }, visibility });
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
      externalAddRequest={addRequest}
      initialFilter={initialFilter}
      parent={{ id: project.id, title: project.title, type: 'project' }}
      vaultData={vault}
      showAddButton={false}
    />
    <Modal visible={sourceOpen} onClose={() => !saving && setSourceOpen(false)} showCloseButton={false} cancelText="Cancel" onCancel={() => setSourceOpen(false)} confirmText={saving ? 'Saving…' : 'Add Source'} onConfirm={() => void saveSource()} confirmDisabled={!url.trim() || saving}>
      <View style={{ gap: SPACE.lg }}><Typography variant="title">Add Project Source</Typography><Typography variant="caption">{project.collaboration.role === 'owner' ? 'Sources are private unless you explicitly share them.' : 'This Source will be shared with the Project.'}</Typography>{project.collaboration.role === 'owner' ? <View style={{ flexDirection: 'row', gap: SPACE.sm }}><Button size="compact" variant={visibility === 'private' ? 'primary' : 'secondary'} onPress={() => setVisibility('private')}>Private</Button><Button size="compact" variant={visibility === 'vault_members' ? 'primary' : 'secondary'} onPress={() => setVisibility('vault_members')}>Share with Project</Button></View> : null}<TextInput accessibilityLabel="Source URL" autoCapitalize="none" placeholder="https://…" placeholderTextColor={colors.text.muted} value={url} onChangeText={setUrl} style={inputStyle} /><TextInput accessibilityLabel="Source title" placeholder="Title (optional)" placeholderTextColor={colors.text.muted} value={title} onChangeText={setTitle} style={inputStyle} /><TextInput accessibilityLabel="Source annotation" multiline placeholder="Why this matters (optional)" placeholderTextColor={colors.text.muted} value={content} onChangeText={setContent} style={[inputStyle, { minHeight: 90, textAlignVertical: 'top' }]} />{error ? <Typography variant="caption" style={{ color: colors.feedback.danger.text }}>{error}</Typography> : null}</View>
    </Modal>
  </>;
}
