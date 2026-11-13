import { useEffect, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Typography } from '@/components/ui/Typography';
import { RADIUS, SPACE } from '@/constants/design';
import { useThemeColors } from '@/store/uiStore';
import type { VaultItem } from '@/types/vault';
import { formatSourceBytes, normalizeSourceUrl, sourceDomain, type SourceAsset } from '../source-domain';
import { createSourceRecord, pickSourceDocument, pickSourceImage, uploadSourceAsset } from '../source-service';

type SourceComposerProps = {
  canShare?: boolean;
  context: { kind: 'goal' | 'project'; id: string } | { kind: 'personal' };
  onClose: () => void;
  onCreated: (item: VaultItem) => void;
  visible: boolean;
};

type Mode = 'choose' | 'asset' | 'link';

export function SourceComposer({ canShare = false, context, onClose, onCreated, visible }: SourceComposerProps) {
  const colors = useThemeColors();
  const [mode, setMode] = useState<Mode>('choose');
  const [asset, setAsset] = useState<SourceAsset | null>(null);
  const [title, setTitle] = useState('');
  const [annotation, setAnnotation] = useState('');
  const [url, setUrl] = useState('');
  const [visibility, setVisibility] = useState<'private' | 'vault_members'>('private');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setMode('choose'); setAsset(null); setTitle(''); setAnnotation(''); setUrl('');
    setVisibility('private'); setSaving(false); setError(null);
  }, [visible]);

  const inputStyle = {
    backgroundColor: colors.background.input,
    borderColor: colors.border.input,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    color: colors.text.primary,
    minHeight: 44,
    paddingHorizontal: SPACE.lg,
    paddingVertical: SPACE.md,
  } as const;

  async function choose(kind: 'file' | 'image') {
    setError(null);
    try {
      const selected = kind === 'file' ? await pickSourceDocument() : await pickSourceImage();
      if (!selected) return;
      setAsset(selected); setTitle(selected.fileName.replace(/\.[^.]+$/, '')); setMode('asset');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'That Source could not be selected.');
    }
  }

  async function save() {
    if (saving) return;
    setSaving(true); setError(null);
    try {
      const sharedVisibility = canShare ? visibility : 'private';
      const item = mode === 'link'
        ? await createSourceRecord(context, {
            itemType: 'link',
            title: title.trim() || sourceDomain(normalizeSourceUrl(url)) || 'Saved link',
            annotation: annotation.trim() || undefined,
            visibility: sharedVisibility,
            metadata: { annotation: annotation.trim() || undefined, provider: 'link', url: normalizeSourceUrl(url) },
          })
        : asset
          ? await uploadSourceAsset(context, asset, {
              annotation: annotation.trim() || undefined,
              title: title.trim() || asset.fileName,
              visibility: sharedVisibility,
            })
          : null;
      if (!item) return;
      onCreated(item); onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Source could not be saved.');
    } finally {
      setSaving(false);
    }
  }

  const chooser = [
    { key: 'file', icon: 'document-attach-outline' as const, title: 'File', detail: 'Choose a document or file', action: () => void choose('file') },
    { key: 'image', icon: 'image-outline' as const, title: 'Photo or Image', detail: 'Choose from Photos', action: () => void choose('image') },
    { key: 'link', icon: 'link-outline' as const, title: 'Link', detail: 'Add a web address', action: () => { setMode('link'); setError(null); } },
  ];

  return <Modal visible={visible} onClose={() => !saving && onClose()} contentStyle={{ maxWidth: 560 }}>
    <View style={{ gap: SPACE.xl }}>
      <View style={{ gap: SPACE.xs }}><Typography variant="title">Add Source</Typography><Typography variant="body-small">Reference material stays separate from your Notes and Reflections.</Typography></View>
      {mode === 'choose' ? <View style={{ gap: SPACE.sm }}>{chooser.map((option) => <Pressable accessibilityLabel={`Add Source: ${option.title}`} accessibilityRole="button" key={option.key} onPress={option.action} style={({ pressed }) => ({ alignItems: 'center', backgroundColor: pressed ? colors.background.selectedRow : colors.background.subtle, borderColor: colors.border.divider, borderRadius: RADIUS.md, borderWidth: 1, flexDirection: 'row', gap: SPACE.lg, minHeight: 68, padding: SPACE.lg })}><View style={{ alignItems: 'center', backgroundColor: colors.background.selectedRow, borderRadius: RADIUS.round, height: 38, justifyContent: 'center', width: 38 }}><Ionicons color={colors.text.accent} name={option.icon} size={20} /></View><View style={{ flex: 1 }}><Typography variant="emphasis-sm">{option.title}</Typography><Typography variant="caption">{option.detail}</Typography></View><Ionicons color={colors.text.muted} name="chevron-forward" size={17} /></Pressable>)}</View> : null}

      {mode === 'asset' && asset ? <View style={{ gap: SPACE.lg }}>
        <View style={{ alignItems: 'center', backgroundColor: colors.background.subtle, borderColor: colors.border.divider, borderRadius: RADIUS.md, borderWidth: 1, flexDirection: 'row', gap: SPACE.md, padding: SPACE.lg }}><Ionicons color={colors.text.accent} name={asset.sourceType === 'image' ? 'image-outline' : 'document-outline'} size={24} /><View style={{ flex: 1 }}><Typography numberOfLines={1} variant="emphasis-sm">{asset.fileName}</Typography><Typography variant="caption">{asset.mimeType}{asset.fileSize ? ` · ${formatSourceBytes(asset.fileSize)}` : ''}</Typography></View></View>
        <TextInput accessibilityLabel="Source title" placeholder="Title" placeholderTextColor={colors.text.muted} style={inputStyle} value={title} onChangeText={setTitle} />
        <TextInput accessibilityLabel="Source annotation" multiline placeholder="Why this matters (optional)" placeholderTextColor={colors.text.muted} style={[inputStyle, { minHeight: 88, textAlignVertical: 'top' }]} value={annotation} onChangeText={setAnnotation} />
      </View> : null}

      {mode === 'link' ? <View style={{ gap: SPACE.md }}><TextInput accessibilityLabel="Source URL" autoCapitalize="none" keyboardType="url" placeholder="https://…" placeholderTextColor={colors.text.muted} style={inputStyle} value={url} onChangeText={setUrl} /><TextInput accessibilityLabel="Source title" placeholder="Title (optional)" placeholderTextColor={colors.text.muted} style={inputStyle} value={title} onChangeText={setTitle} /><TextInput accessibilityLabel="Source annotation" multiline placeholder="Why this matters (optional)" placeholderTextColor={colors.text.muted} style={[inputStyle, { minHeight: 88, textAlignVertical: 'top' }]} value={annotation} onChangeText={setAnnotation} /></View> : null}

      {mode !== 'choose' && canShare ? <View style={{ gap: SPACE.sm }}><Typography variant="eyebrow">VISIBILITY</Typography><View style={{ flexDirection: 'row', gap: SPACE.sm }}><Button size="compact" variant={visibility === 'private' ? 'primary' : 'secondary'} onPress={() => setVisibility('private')}>Private</Button><Button size="compact" variant={visibility === 'vault_members' ? 'primary' : 'secondary'} onPress={() => setVisibility('vault_members')}>Share with Project</Button></View></View> : null}
      {error ? <Typography accessibilityRole="alert" variant="caption" style={{ color: colors.feedback.danger.text }}>{error}</Typography> : null}
      {mode !== 'choose' ? <View style={{ flexDirection: 'row', gap: SPACE.sm, justifyContent: 'flex-end' }}><Button disabled={saving} onPress={() => { setMode('choose'); setAsset(null); setError(null); }} variant="secondary">Back</Button><Button disabled={saving || (mode === 'link' ? !url.trim() : !asset)} onPress={() => void save()}>{saving ? 'Adding…' : 'Add Source'}</Button></View> : null}
    </View>
  </Modal>;
}
