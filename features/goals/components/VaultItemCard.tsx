import React, { useState } from 'react';
import { View, Text, Pressable, TextInput, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { VaultItem } from '@/types/vault';
import { STATUS, LIGHT_THEME } from '@/constants/colors';
import { Typography } from '@/components/ui/Typography';

// ─── Props ────────────────────────────────────────────────────────────────────

type VaultItemCardProps = {
  item: VaultItem;
  goalId: string;
  onUpdate: (itemId: string, updates: Partial<VaultItem>) => Promise<void>;
  onDelete: (itemId: string) => Promise<void>;
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
    >
      {/* Title row */}
      <View className="flex-row items-start justify-between">
        <Typography
          variant="label"
          className={`flex-1 pr-2 ${derived ? 'italic text-gray-400' : ''}`}
          style={{
            ...(derived ? { fontFamily: 'Inter-Italic' } : undefined),
            ...(derived ? undefined : { color: LIGHT_THEME.text.primary }),
          }}
          numberOfLines={expanded ? undefined : 1}
        >
          {titleText}
        </Typography>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={16}
          color="#9CA3AF"
        />
      </View>

      {/* Collapsed preview */}
      {!expanded && item.content ? (
        <Typography variant="content" numberOfLines={2} className="mt-1" style={{ color: LIGHT_THEME.text.secondary }}>
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
              <Text className="text-xs font-medium" style={{ color: LIGHT_THEME.text.accent }}>Edit</Text>
            </Pressable>
          </View>
        </>
      )}

      {/* Edit mode */}
      {editing && (
        <Pressable onPress={(e) => e.stopPropagation?.()}>
          <TextInput
            className="mt-3 text-sm border border-gray-200 rounded-lg px-3 py-2 bg-stone-50"
            style={{ color: LIGHT_THEME.text.primary }}
            placeholder="Title (optional)"
            placeholderTextColor="#9CA3AF"
            value={editTitle}
            onChangeText={setEditTitle}
            returnKeyType="next"
          />
          <TextInput
            className="mt-2 text-sm border border-gray-200 rounded-lg px-3 py-2 bg-stone-50 min-h-[80px]"
            style={{ color: LIGHT_THEME.text.primary }}
            placeholder="Note content"
            placeholderTextColor="#9CA3AF"
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
              <Typography variant="content" style={{ color: LIGHT_THEME.text.muted }}>Cancel</Typography>
            </Pressable>
            <Pressable
              hitSlop={8}
              onPress={handleSave}
              disabled={saving}
              className={saving ? 'opacity-50' : ''}
            >
              <Typography variant="label" style={{ color: LIGHT_THEME.text.accent }}>
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
      style={{ borderLeftWidth: 4, borderLeftColor: '#1E3226' }}
      onPress={handlePress}
    >
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-2">
          <Typography variant="label" style={{ color: LIGHT_THEME.text.primary }} numberOfLines={2}>
            {title}
          </Typography>
          {domain ? (
            <Typography variant="caption" className="mt-0.5" style={{ color: '#9CA3AF' }}>{domain}</Typography>
          ) : null}
          {annotation ? (
            <Typography variant="content" className="mt-1" style={{ color: LIGHT_THEME.text.secondary }} numberOfLines={3}>
              {annotation}
            </Typography>
          ) : null}
        </View>
        <Ionicons name="open-outline" size={16} color="#9CA3AF" />
      </View>
    </Pressable>
  );
}

// ─── InsightCard ──────────────────────────────────────────────────────────────

function InsightCard({ item, onUpdate, onDelete }: VaultItemCardProps) {
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
      style={{ backgroundColor: STATUS.pending.bg, borderColor: STATUS.pending.border }}
    >
      {/* Header */}
      <View className="flex-row items-center gap-2 mb-2">
        <Ionicons name="bulb-outline" size={14} color={STATUS.pending.text} />
        <Text
          className="text-xs font-semibold uppercase tracking-widest"
          style={{ color: STATUS.pending.text }}
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
        <Text className="text-xs font-medium" style={{ color: LIGHT_THEME.text.accent }}>Confirmed ✓</Text>
      ) : (
        <View className="flex-row gap-3">
          <Pressable
            hitSlop={8}
            onPress={handleConfirm}
            disabled={confirming || dismissing}
            className={confirming ? 'opacity-50' : ''}
          >
            <Typography variant="label" style={{ color: LIGHT_THEME.text.accent }}>
              {confirming ? 'Saving…' : 'Confirm'}
            </Typography>
          </Pressable>
          <Pressable
            hitSlop={8}
            onPress={handleDismiss}
            disabled={confirming || dismissing}
            className={dismissing ? 'opacity-50' : ''}
          >
            <Typography variant="content" style={{ color: '#9CA3AF' }}>
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
  const body = item.content ?? item.title ?? '';
  const dateLabel = formatDate(item.createdAt);

  return (
    <View className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-3 flex-row items-start">
      {/* Green dot */}
      <View className="w-2 h-2 rounded-full bg-green-600 mt-1.5 mr-3 shrink-0" />

      {/* Text */}
      <Typography variant="content" className="flex-1">{body}</Typography>

      {/* Date */}
      {dateLabel ? (
        <Typography variant="caption" className="ml-2 mt-0.5 shrink-0" style={{ color: '#9CA3AF' }}>{dateLabel}</Typography>
      ) : null}
    </View>
  );
}

// ─── DocumentPlaceholderCard ──────────────────────────────────────────────────

function DocumentPlaceholderCard() {
  return (
    <View className="bg-gray-50 border border-dashed border-gray-300 rounded-xl p-4 mb-3 items-center flex-row gap-3">
      <Ionicons name="document-outline" size={18} color="#9CA3AF" />
      <Typography variant="content" style={{ color: '#9CA3AF' }}>Document support coming soon</Typography>
    </View>
  );
}

// ─── FallbackCard ─────────────────────────────────────────────────────────────

function FallbackCard({ item }: { item: VaultItem }) {
  const label = item.title ?? item.content ?? 'Unknown item';

  return (
    <View className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-3 flex-row items-center gap-3">
      <Ionicons name="help-circle-outline" size={18} color="#9CA3AF" />
      <Typography variant="content" className="flex-1" style={{ color: LIGHT_THEME.text.muted }} numberOfLines={2}>
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
      return <LinkCard {...props} />;
    case 'insight':
      return <InsightCard {...props} />;
    case 'action_update':
      return <ActionUpdateCard {...props} />;
    case 'document':
      return <DocumentPlaceholderCard />;
    default:
      return <FallbackCard item={props.item} />;
  }
}
