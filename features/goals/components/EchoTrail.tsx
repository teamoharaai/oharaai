import React, { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

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
        <Text className="text-xs font-medium text-green-700">Bud</Text>
      </View>
    );
  }
  if (brt === 'Rose') {
    return (
      <View className="bg-amber-100 px-2 py-0.5 rounded-full">
        <Text className="text-xs font-medium text-amber-700">Rose</Text>
      </View>
    );
  }
  return (
    <View className="bg-red-100 px-2 py-0.5 rounded-full">
      <Text className="text-xs font-medium text-red-700">Thorn</Text>
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
        <Text className="text-xs text-gray-400">{formattedDate}</Text>
        {entry.brt ? <BrtBadge brt={entry.brt} /> : null}
      </View>

      {/* Content — tappable to navigate to echo entry */}
      <Pressable onPress={() => router.push(`/echo/${entry.echoEntryId}` as never)}>
        <Text numberOfLines={2} className="text-[#1A1A1A] text-sm leading-relaxed">
          {entry.content}
        </Text>
      </Pressable>

      {/* Unconfirmed suggestion banner */}
      {!entry.confirmed && (
        <View className="mt-3 bg-amber-50 border border-amber-200 rounded-lg p-3">
          <View className="flex-row items-center gap-1.5 mb-2">
            <Ionicons name="link-outline" size={12} color="#B45309" />
            <Text className="text-xs text-amber-700">
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
              <Text className="text-xs font-medium text-green-800">
                {confirming ? 'Saving…' : 'Confirm'}
              </Text>
            </Pressable>
            <Pressable
              hitSlop={8}
              onPress={handleDismiss}
              disabled={confirming || dismissing}
              className={dismissing ? 'opacity-50' : ''}
            >
              <Text className="text-xs text-gray-400">
                {dismissing ? 'Removing…' : 'Dismiss'}
              </Text>
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
