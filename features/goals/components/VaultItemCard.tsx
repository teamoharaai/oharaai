import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, TextInput, Linking, Image } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { VaultItem } from '@/types/vault';
import { Typography } from '@/components/ui/Typography';
import { useThemeColors } from '@/store/uiStore';
import { formatSourceBytes, sourceDomain } from '@/features/sources/source-domain';
import { getSourceAccessUrl } from '@/features/sources/source-service';

// ─── Props ────────────────────────────────────────────────────────────────────

type VaultItemCardProps = {
  item: VaultItem;
  goalId: string;
  onUpdate: (itemId: string, updates: Partial<VaultItem>) => Promise<void>;
  onDelete: (itemId: string) => Promise<void>;
  canManageSource?: boolean;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(isoString: string): string {
  try {
    const d = new Date(isoString);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

function deriveTitle(item: VaultItem): { text: string; derived: boolean } {
  if (item.title) return { text: item.title, derived: false };
  if (item.content) {
    const words = item.content.trim().split(/\s+/).slice(0, 8).join(' ');
    return { text: words, derived: true };
  }
  return { text: 'Untitled', derived: true };
}

// ─── NoteCard ─────────────────────────────────────────────────────────────────

function NoteCard({ item, onUpdate }: VaultItemCardProps) {
  const colors = useThemeColors();
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(item.title ?? '');
  const [editContent, setEditContent] = useState(item.content ?? '');
  const [saving, setSaving] = useState(false);

  const { text: titleText, derived } = deriveTitle(item);

  function handleCardPress() {
    if (editing) return;
    setExpanded((prev) => !prev);
  }

  function startEdit() {
    setEditTitle(item.title ?? '');
    setEditContent(item.content ?? '');
    setEditing(true);
  }

  function cancelEdit() {
    setEditTitle(item.title ?? '');
    setEditContent(item.content ?? '');
    setEditing(false);
  }

  async function handleSave() {
    setSaving(true);
    try {
      await onUpdate(item.id, { title: editTitle || null, content: editContent });
    } finally {
      setSaving(false);
      setEditing(false);
    }
  }

  return (
    <Pressable
      className="bg-white rounded-xl p-4 mb-3 shadow-sm"
      onPress={handleCardPress}
      style={{ backgroundColor: colors.background.card, borderColor: colors.border.warm, borderWidth: 1 }}
    >
      {/* Title row */}
      <View className="flex-row items-start justify-between">
        <Typography
          variant="label"
          className={`flex-1 pr-2 ${derived ? 'italic text-gray-400' : ''}`}
          style={{
            ...(derived ? { fontFamily: 'Inter-Italic' } : undefined),
            color: derived ? colors.text.muted : colors.text.primary,
          }}
          numberOfLines={expanded ? undefined : 1}
        >
          {titleText}
        </Typography>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={colors.text.muted}
        />
      </View>

      {/* Collapsed preview */}
      {!expanded && item.content ? (
        <Typography variant="content" numberOfLines={2} className="mt-1" style={{ color: colors.text.secondary }}>
          {item.content}
        </Typography>
      ) : null}

      {/* Expanded: full content + edit controls */}
      {expanded && !editing && (
        <>
          {item.content ? (
            <Typography variant="content" className="mt-2">{item.content}</Typography>
          ) : null}
          <View className="items-end mt-3">
            <Pressable
              hitSlop={8}
              onPress={(e) => {
                e.stopPropagation?.();
                startEdit();
              }}
            >
              <Text className="text-xs font-inter-medium" style={{ color: colors.text.accent }}>Edit</Text>
            </Pressable>
          </View>
        </>
      )}

      {/* Edit mode */}
      {editing && (
        <Pressable onPress={(e) => e.stopPropagation?.()}>
          <TextInput
            className="mt-3 text-sm border border-gray-200 rounded-lg px-3 py-2 bg-stone-50"
            style={{ backgroundColor: colors.background.input, borderColor: colors.border.input, color: colors.text.primary }}
            placeholder="Title (optional)"
            placeholderTextColor={colors.text.muted}
            value={editTitle}
            onChangeText={setEditTitle}
            returnKeyType="next"
          />
          <TextInput
            className="mt-2 text-sm border border-gray-200 rounded-lg px-3 py-2 bg-stone-50 min-h-[80px]"
            style={{ backgroundColor: colors.background.input, borderColor: colors.border.input, color: colors.text.primary }}
            placeholder="Note content"
            placeholderTextColor={colors.text.muted}
            value={editContent}
            onChangeText={setEditContent}
            multiline
            textAlignVertical="top"
          />
          <View className="flex-row justify-end gap-3 mt-3">
            <Pressable
              hitSlop={8}
              onPress={cancelEdit}
              disabled={saving}
            >
              <Typography variant="content" style={{ color: colors.text.muted }}>Cancel</Typography>
            </Pressable>
            <Pressable
              hitSlop={8}
              onPress={handleSave}
              disabled={saving}
              className={saving ? 'opacity-50' : ''}
            >
              <Typography variant="label" style={{ color: colors.text.accent }}>
                {saving ? 'Saving...' : 'Save'}
              </Typography>
            </Pressable>
          </View>
        </Pressable>
      )}
    </Pressable>
  );
}

// ─── LinkCard ─────────────────────────────────────────────────────────────────

function LinkCard({ item }: VaultItemCardProps) {
  const colors = useThemeColors();
  const domain = (() => {
    try {
      return new URL(item.metadata?.url ?? '').hostname.replace(/^www\./, '');
    } catch {
      return item.metadata?.url ?? '';
    }
  })();

  const title = item.title ?? domain ?? item.metadata?.url ?? 'Saved link';
  const annotation = item.metadata?.annotation;

  async function handlePress() {
    const url = item.metadata?.url;
    if (!url) return;
    try {
      await Linking.openURL(url);
    } catch {}
  }

  return (
    <Pressable
      className="bg-white rounded-xl p-4 mb-3 shadow-sm overflow-hidden"
      style={{ backgroundColor: colors.background.card, borderColor: colors.border.warm, borderLeftColor: colors.accent.primary, borderLeftWidth: 4, borderWidth: 1 }}
      onPress={handlePress}
    >
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-2">
          <Typography variant="label" style={{ color: colors.text.primary }} numberOfLines={2}>
            {title}
          </Typography>
          {domain ? (
            <Typography variant="caption" className="mt-0.5" style={{ color: colors.text.muted }}>{domain}</Typography>
          ) : null}
          {annotation ? (
            <Typography variant="content" className="mt-1" style={{ color: colors.text.secondary }} numberOfLines={3}>
              {annotation}
            </Typography>
          ) : null}
        </View>
        <Ionicons name="open-outline" size={16} color={colors.text.muted} />
      </View>
    </Pressable>
  );
}

function SourceCard({ canManageSource = false, item, onDelete, onUpdate }: VaultItemCardProps) {
  const colors = useThemeColors();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(item.title ?? '');
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    let active = true;
    if (item.itemType !== 'image' || !item.metadata?.storagePath) return () => { active = false; };
    void getSourceAccessUrl(item.id).then((url) => { if (active) setPreviewUrl(url); }).catch(() => undefined);
    return () => { active = false; };
  }, [item.id, item.itemType, item.metadata?.storagePath]);

  async function open() {
    if (opening) return;
    setOpening(true); setError(null);
    try {
      const url = item.itemType === 'link' && item.metadata?.url
        ? item.metadata.url : previewUrl ?? await getSourceAccessUrl(item.id);
      await Linking.openURL(url);
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Source could not be opened.'); }
    finally { setOpening(false); }
  }

  async function rename() {
    if (!title.trim() || saving) return;
    setSaving(true); setError(null);
    try { await onUpdate(item.id, { title: title.trim() }); setEditing(false); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Source could not be renamed.'); }
    finally { setSaving(false); }
  }

  async function remove() {
    setSaving(true); setError(null);
    try { await onDelete(item.id); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Source could not be deleted.'); setSaving(false); }
  }

  const kind = item.itemType === 'link' ? 'Link' : item.itemType === 'image' ? 'Image' : (item.metadata?.fileType?.toUpperCase() || 'File');
  const detail = item.itemType === 'link'
    ? sourceDomain(item.metadata?.url)
    : [item.metadata?.mimeType, formatSourceBytes(item.metadata?.fileSize)].filter(Boolean).join(' · ');
  return <View style={{ backgroundColor: colors.background.card, borderColor: colors.border.warm, borderRadius: 14, borderWidth: 1, gap: 14, padding: 18 }}>
    {item.itemType === 'image' && previewUrl ? <Image accessibilityLabel={item.title || item.metadata?.fileName || 'Source image'} resizeMode="contain" source={{ uri: previewUrl }} style={{ backgroundColor: colors.background.subtle, borderRadius: 10, height: 260, width: '100%' }} /> : null}
    <View style={{ alignItems: 'flex-start', flexDirection: 'row', gap: 12 }}><Ionicons color={colors.text.accent} name={item.itemType === 'link' ? 'link-outline' : item.itemType === 'image' ? 'image-outline' : 'document-attach-outline'} size={24} /><View style={{ flex: 1, gap: 4 }}><Typography variant="eyebrow">{kind}</Typography>{editing ? <TextInput accessibilityLabel="Source title" autoFocus onChangeText={setTitle} style={{ backgroundColor: colors.background.input, borderColor: colors.border.input, borderRadius: 8, borderWidth: 1, color: colors.text.primary, minHeight: 42, paddingHorizontal: 12 }} value={title} /> : <Typography variant="title">{item.title || item.metadata?.fileName || 'Untitled Source'}</Typography>}{detail ? <Typography variant="caption">{detail}</Typography> : null}</View></View>
    {item.content || item.metadata?.annotation ? <Typography variant="body">{item.metadata?.annotation || item.content}</Typography> : null}
    {error ? <Typography accessibilityRole="alert" variant="caption" style={{ color: colors.feedback.danger.text }}>{error}</Typography> : null}
    {confirmDelete ? <View style={{ backgroundColor: colors.feedback.danger.bg, borderRadius: 10, gap: 10, padding: 12 }}><Typography variant="emphasis-sm">Delete this Source?</Typography><Typography variant="caption">The Source record and its uploaded file will be removed.</Typography><View style={{ flexDirection: 'row', gap: 16 }}><Pressable accessibilityRole="button" style={{ minHeight: 44, minWidth: 44, justifyContent: 'center' }} disabled={saving} onPress={() => setConfirmDelete(false)}><Typography variant="emphasis-sm">Cancel</Typography></Pressable><Pressable accessibilityRole="button" style={{ minHeight: 44, minWidth: 44, justifyContent: 'center' }} disabled={saving} onPress={() => void remove()}><Typography variant="emphasis-sm" style={{ color: colors.feedback.danger.text }}>{saving ? 'Deleting…' : 'Delete Source'}</Typography></Pressable></View></View> : <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 18 }}><Pressable accessibilityRole="button" style={{ minHeight: 44, minWidth: 44, justifyContent: 'center' }} disabled={opening} onPress={() => void open()}><Typography variant="emphasis-sm" style={{ color: colors.text.accent }}>{opening ? 'Opening…' : item.itemType === 'link' ? 'Open Link' : 'Open File'}</Typography></Pressable>{canManageSource ? editing ? <><Pressable accessibilityRole="button" style={{ minHeight: 44, minWidth: 44, justifyContent: 'center' }} disabled={saving} onPress={() => void rename()}><Typography variant="emphasis-sm" style={{ color: colors.text.accent }}>{saving ? 'Saving…' : 'Save name'}</Typography></Pressable><Pressable accessibilityRole="button" style={{ minHeight: 44, minWidth: 44, justifyContent: 'center' }} disabled={saving} onPress={() => { setEditing(false); setTitle(item.title ?? ''); }}><Typography variant="emphasis-sm">Cancel</Typography></Pressable></> : <><Pressable accessibilityRole="button" style={{ minHeight: 44, minWidth: 44, justifyContent: 'center' }} onPress={() => setEditing(true)}><Typography variant="emphasis-sm">Rename</Typography></Pressable><Pressable accessibilityRole="button" style={{ minHeight: 44, minWidth: 44, justifyContent: 'center' }} onPress={() => setConfirmDelete(true)}><Typography variant="emphasis-sm" style={{ color: colors.feedback.danger.text }}>Delete</Typography></Pressable></> : null}</View>}
  </View>;
}

// ─── InsightCard ──────────────────────────────────────────────────────────────

function InsightCard({ item, onUpdate, onDelete }: VaultItemCardProps) {
  const colors = useThemeColors();
  const [confirming, setConfirming] = useState(false);
  const [dismissing, setDismissing] = useState(false);

  const isConfirmed = item.metadata?.confirmed === true;

  async function handleConfirm() {
    if (confirming || dismissing) return;
    setConfirming(true);
    try {
      await onUpdate(item.id, {
        metadata: {
          ...(item.metadata ?? {}),
          confirmed: true,
        },
      });
    } finally {
      setConfirming(false);
    }
  }

  async function handleDismiss() {
    if (confirming || dismissing) return;
    setDismissing(true);
    try {
      await onDelete(item.id);
    } finally {
      setDismissing(false);
    }
  }

  return (
    <View
      className="rounded-xl border p-4 mb-3"
      style={{ backgroundColor: colors.feedback.pending.bg, borderColor: colors.feedback.pending.border }}
    >
      {/* Header */}
      <View className="flex-row items-center gap-2 mb-2">
        <Ionicons name="bulb-outline" size={14} color={colors.feedback.pending.text} />
        <Text
          className="text-xs font-inter-semibold uppercase tracking-widest"
          style={{ color: colors.feedback.pending.text }}
        >
          Ohara Insight
        </Text>
      </View>

      {/* Body */}
      {item.content ? (
        <Typography variant="content" className="mb-3">{item.content}</Typography>
      ) : null}

      {/* Actions */}
      {isConfirmed ? (
        <Text className="text-xs font-inter-medium" style={{ color: colors.text.accent }}>Confirmed ✓</Text>
      ) : (
        <View className="flex-row gap-3">
          <Pressable
            hitSlop={8}
            onPress={handleConfirm}
            disabled={confirming || dismissing}
            className={confirming ? 'opacity-50' : ''}
          >
            <Typography variant="label" style={{ color: colors.text.accent }}>
              {confirming ? 'Saving…' : 'Confirm'}
            </Typography>
          </Pressable>
          <Pressable
            hitSlop={8}
            onPress={handleDismiss}
            disabled={confirming || dismissing}
            className={dismissing ? 'opacity-50' : ''}
          >
            <Typography variant="content" style={{ color: colors.text.muted }}>
              {dismissing ? 'Removing…' : 'Dismiss'}
            </Typography>
          </Pressable>
        </View>
      )}
    </View>
  );
}

// ─── ActionUpdateCard ─────────────────────────────────────────────────────────

function ActionUpdateCard({ item }: VaultItemCardProps) {
  const colors = useThemeColors();
  const body = item.content ?? item.title ?? '';
  const dateLabel = formatDate(item.createdAt);

  return (
    <View className="rounded-xl p-4 mb-3 flex-row items-start" style={{ backgroundColor: colors.background.card, borderColor: colors.border.warm, borderWidth: 1 }}>
      {/* Green dot */}
      <View className="w-2 h-2 rounded-full mt-1.5 mr-3 shrink-0" style={{ backgroundColor: colors.accent.primary }} />

      {/* Text */}
      <Typography variant="content" className="flex-1">{body}</Typography>

      {/* Date */}
      {dateLabel ? (
        <Typography variant="caption" className="ml-2 mt-0.5 shrink-0" style={{ color: colors.text.muted }}>{dateLabel}</Typography>
      ) : null}
    </View>
  );
}

// ─── DocumentPlaceholderCard ──────────────────────────────────────────────────

function DocumentPlaceholderCard() {
  const colors = useThemeColors();

  return (
    <View className="border border-dashed rounded-xl p-4 mb-3 items-center flex-row gap-3" style={{ backgroundColor: colors.background.card, borderColor: colors.border.divider }}>
      <Ionicons name="document-outline" size={18} color={colors.text.muted} />
      <Typography variant="content" style={{ color: colors.text.muted }}>Document support coming soon</Typography>
    </View>
  );
}

// ─── FallbackCard ─────────────────────────────────────────────────────────────

function FallbackCard({ item }: { item: VaultItem }) {
  const colors = useThemeColors();
  const label = item.title ?? item.content ?? 'Unknown item';

  return (
    <View className="border rounded-xl p-4 mb-3 flex-row items-center gap-3" style={{ backgroundColor: colors.background.card, borderColor: colors.border.warm }}>
      <Ionicons name="help-circle-outline" size={18} color={colors.text.muted} />
      <Typography variant="content" className="flex-1" style={{ color: colors.text.muted }} numberOfLines={2}>
        {label}
      </Typography>
    </View>
  );
}

// ─── Top-level dispatcher ─────────────────────────────────────────────────────

export function VaultItemCard(props: VaultItemCardProps) {
  switch (props.item.itemType) {
    case 'note':
      return <NoteCard {...props} />;
    case 'link':
      return <SourceCard {...props} />;
    case 'insight':
      return <InsightCard {...props} />;
    case 'action_update':
      return <ActionUpdateCard {...props} />;
    case 'document':
    case 'image':
      return <SourceCard {...props} />;
    default:
      return <FallbackCard item={props.item} />;
  }
}
