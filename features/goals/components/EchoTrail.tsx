import React, { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Typography } from '@/components/ui/Typography';
import { useThemeColors } from '@/store/uiStore';

// ─── Exported type ────────────────────────────────────────────────────────────

export type EchoTrailEntry = {
  linkId: string;
  echoEntryId: string;
  confirmed: boolean;
  createdAt: string;
  content: string;
  brt: 'Bud' | 'Rose' | 'Thorn' | null;
};

// ─── Props ────────────────────────────────────────────────────────────────────

type EchoTrailProps = {
  entries: EchoTrailEntry[];
  goalId: string;
  onConfirmLink: (linkId: string) => Promise<void>;
  onDismissLink: (linkId: string) => Promise<void>;
};

// ─── BrtBadge ─────────────────────────────────────────────────────────────────

type BrtBadgeProps = {
  brt: 'Bud' | 'Rose' | 'Thorn';
};

function BrtBadge({ brt }: BrtBadgeProps) {
  const colors = useThemeColors();
  if (brt === 'Bud') {
    return (
      <View className="px-2 py-0.5 rounded-full" style={{ backgroundColor: colors.background.selectedRow }}>
        <Text className="text-xs font-inter-medium" style={{ color: colors.brt.bud }}>Bud</Text>
      </View>
    );
  }
  if (brt === 'Rose') {
    return (
      <View className="px-2 py-0.5 rounded-full" style={{ backgroundColor: colors.feedback.pending.bg }}>
        <Text className="text-xs font-inter-medium" style={{ color: colors.brt.rose }}>Rose</Text>
      </View>
    );
  }
  return (
    <View className="px-2 py-0.5 rounded-full" style={{ backgroundColor: colors.feedback.danger.bg }}>
      <Text className="text-xs font-inter-medium" style={{ color: colors.brt.thorn }}>Thorn</Text>
    </View>
  );
}

// ─── EchoTrailCard ────────────────────────────────────────────────────────────

type EchoTrailCardProps = {
  entry: EchoTrailEntry;
  onConfirmLink: (linkId: string) => Promise<void>;
  onDismissLink: (linkId: string) => Promise<void>;
};

function EchoTrailCard({ entry, onConfirmLink, onDismissLink }: EchoTrailCardProps) {
  const colors = useThemeColors();
  const [confirming, setConfirming] = useState(false);
  const [dismissing, setDismissing] = useState(false);

  const formattedDate = new Date(entry.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  async function handleConfirm() {
    if (confirming || dismissing) return;
    setConfirming(true);
    try {
      await onConfirmLink(entry.linkId);
    } finally {
      setConfirming(false);
    }
  }

  async function handleDismiss() {
    if (confirming || dismissing) return;
    setDismissing(true);
    try {
      await onDismissLink(entry.linkId);
    } finally {
      setDismissing(false);
    }
  }

  return (
    <View className="rounded-xl p-4 mb-3 shadow-sm" style={{ backgroundColor: colors.background.card, borderColor: colors.border.warm, borderWidth: 1 }}>
      {/* Top row: date + BRT badge */}
      <View className="flex-row items-center justify-between mb-2">
        <Typography variant="caption">{formattedDate}</Typography>
        {entry.brt ? <BrtBadge brt={entry.brt} /> : null}
      </View>

      {/* Content — view-only (no tap-through; see OUTSTANDING.md EntryActionMenu extraction) */}
      <Text numberOfLines={2} className="text-sm leading-relaxed" style={{ color: colors.text.primary }}>
        {entry.content}
      </Text>

      {/* Unconfirmed suggestion banner */}
      {!entry.confirmed && (
        <View
          className="mt-3 rounded-lg border p-3"
          style={{ backgroundColor: colors.feedback.pending.bg, borderColor: colors.feedback.pending.border }}
        >
          <View className="flex-row items-center gap-1.5 mb-2">
            <Ionicons name="link-outline" size={12} color={colors.feedback.pending.text} />
            <Text className="text-xs" style={{ color: colors.feedback.pending.text }}>
              Ohara thinks this relates to your goal
            </Text>
          </View>
          <View className="flex-row gap-3">
            <Pressable
              hitSlop={8}
              onPress={handleConfirm}
              disabled={confirming || dismissing}
              className={confirming ? 'opacity-50' : ''}
            >
              <Text className="text-xs font-inter-medium text-green-800">
                {confirming ? 'Saving…' : 'Confirm'}
              </Text>
            </Pressable>
            <Pressable
              hitSlop={8}
              onPress={handleDismiss}
              disabled={confirming || dismissing}
              className={dismissing ? 'opacity-50' : ''}
            >
              <Typography variant="caption">
                {dismissing ? 'Removing…' : 'Dismiss'}
              </Typography>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

// ─── EchoTrail ────────────────────────────────────────────────────────────────

export function EchoTrail({ entries, goalId, onConfirmLink, onDismissLink }: EchoTrailProps) {
  void goalId;

  if (entries.length === 0) return null;

  return (
    <View>
      {entries.map((entry) => (
        <EchoTrailCard
          key={entry.linkId}
          entry={entry}
          onConfirmLink={onConfirmLink}
          onDismissLink={onDismissLink}
        />
      ))}
    </View>
  );
}
