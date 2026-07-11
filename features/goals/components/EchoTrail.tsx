import React, { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LIGHT_THEME } from '@/constants/colors';
import { Typography } from '@/components/ui/Typography';

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
  if (brt === 'Bud') {
    return (
      <View className="bg-green-100 px-2 py-0.5 rounded-full">
        <Text className="text-xs font-inter-medium text-green-700">Bud</Text>
      </View>
    );
  }
  if (brt === 'Rose') {
    return (
      <View className="bg-amber-100 px-2 py-0.5 rounded-full">
        <Text className="text-xs font-inter-medium" style={{ color: '#F59E0B' }}>Rose</Text>
      </View>
    );
  }
  return (
    <View className="bg-red-100 px-2 py-0.5 rounded-full">
      <Text className="text-xs font-inter-medium text-red-700">Thorn</Text>
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
    <View className="bg-white rounded-xl p-4 mb-3 shadow-sm">
      {/* Top row: date + BRT badge */}
      <View className="flex-row items-center justify-between mb-2">
        <Typography variant="caption">{formattedDate}</Typography>
        {entry.brt ? <BrtBadge brt={entry.brt} /> : null}
      </View>

      {/* Content — view-only (no tap-through; see OUTSTANDING.md EntryActionMenu extraction) */}
      <Text numberOfLines={2} className="text-near-black text-sm leading-relaxed">
        {entry.content}
      </Text>

      {/* Unconfirmed suggestion banner */}
      {!entry.confirmed && (
        <View
          className="mt-3 rounded-lg border p-3"
          style={{ backgroundColor: LIGHT_THEME.feedback.pending.bg, borderColor: LIGHT_THEME.feedback.pending.border }}
        >
          <View className="flex-row items-center gap-1.5 mb-2">
            <Ionicons name="link-outline" size={12} color={LIGHT_THEME.feedback.pending.text} />
            <Text className="text-xs" style={{ color: LIGHT_THEME.feedback.pending.text }}>
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
