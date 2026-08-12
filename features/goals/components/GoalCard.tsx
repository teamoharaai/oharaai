import { useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { BrandIcon } from '@/components/ui/BrandIcon';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { Typography } from '@/components/ui/Typography';
import { getCategoryAccentTheme } from '@/constants/themes';
import { elevationStyle, RADIUS } from '@/constants/design';
import { useThemeColors, useUIStore } from '@/store/uiStore';
import { useGoalStore } from '../store';
import { goalWorkspaceHref } from '../navigation';
import type { GoalWithDetails } from '../types';

interface GoalCardProps {
  goal: GoalWithDetails;
  isNewest?: boolean;
  eyebrow?: string;
  projectTitle?: string;
  supportingLabel?: string;
  showMenu?: boolean;
  style?: StyleProp<ViewStyle>;
}

function formatLabel(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatDate(date: Date | null): string {
  if (!date) return 'No deadline';
  return date.toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatTimeRemaining(date: Date | null): string | null {
  if (!date) return null;
  const days = Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (days < 0) return `${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} overdue`;
  if (days === 0) return 'Due today';
  return `${days} day${days === 1 ? '' : 's'} left`;
}

function formatCommitment(goal: GoalWithDetails): string {
  const frequency = goal.targetFrequency;
  if (!frequency) return 'Not set';

  if (frequency.period === 'week') {
    return `${frequency.times} day${frequency.times === 1 ? '' : 's'} / week`;
  }

  return `${frequency.times} time${frequency.times === 1 ? '' : 's'} / ${frequency.period}`;
}

function activityLabel(goal: GoalWithDetails): string | null {
  const parts = [
    goal.vaultItemCount > 0
      ? `${goal.vaultItemCount} item${goal.vaultItemCount === 1 ? '' : 's'}`
      : null,
    goal.echoLinkCount > 0
      ? `${goal.echoLinkCount} ${goal.echoLinkCount === 1 ? 'entry' : 'entries'}`
      : null,
  ].filter(Boolean);

  return parts.length ? parts.join(' · ') : null;
}

function MetaItem({ label, value, detail }: { label: string; value: string; detail?: string | null }) {
  const colors = useThemeColors();
  return (
    <View style={{ flexGrow: 1, minWidth: 112 }}>
      <Typography variant="eyebrow" style={{ fontSize: 9.5, marginBottom: 3 }}>
        {label}
      </Typography>
      <Typography
        variant="meta"
        style={{ color: colors.text.primary, fontFamily: 'Inter-SemiBold', fontSize: 12.5 }}
      >
        {value}
      </Typography>
      {detail ? (
        <Typography
          variant="caption"
          style={{
            color: detail.includes('overdue') ? colors.feedback.danger.text : colors.text.secondary,
            marginTop: 1,
          }}
        >
          {detail}
        </Typography>
      ) : null}
    </View>
  );
}

export function GoalCard({
  goal,
  isNewest = false,
  eyebrow,
  projectTitle,
  supportingLabel,
  showMenu = true,
  style,
}: GoalCardProps) {
  const colors = useThemeColors();
  const themeMode = useUIStore((state) => state.themeMode);
  const accent = getCategoryAccentTheme(goal.category);
  const deleteGoal = useGoalStore((state) => state.deleteGoal);
  const [menuOpen, setMenuOpen] = useState(false);
  const remaining = formatTimeRemaining(goal.deadline);
  const activity = activityLabel(goal);

  async function deleteConfirmedGoal() {
    try {
      await deleteGoal(goal.id);
    } catch {
      Alert.alert('Could not delete goal', 'Please try again.');
    }
  }

  function handleDelete() {
    if (Platform.OS === 'web') {
      if (window.confirm('Delete goal? This cannot be undone.')) {
        void deleteConfirmedGoal();
      }
      return;
    }

    Alert.alert('Delete goal?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => void deleteConfirmedGoal() },
    ]);
  }

  return (
    <View style={[{ position: 'relative' }, style]}>
      {menuOpen ? (
        <Pressable
          accessibilityLabel="Close goal actions"
          onPress={() => setMenuOpen(false)}
          style={[StyleSheet.absoluteFillObject, { zIndex: 2 }]}
        />
      ) : null}

      <Pressable
        accessibilityHint="Opens this goal"
        accessibilityLabel={`Open ${goal.title}`}
        accessibilityRole="button"
        onPress={() => router.push(goalWorkspaceHref(goal.id) as never)}
        style={({ pressed }) => ({
          ...elevationStyle('sm', colors, themeMode === 'dark'),
          backgroundColor: colors.background.card,
          borderColor: colors.border.warmSubtle,
          borderRadius: RADIUS.lg,
          borderWidth: 1,
          minHeight: 176,
          opacity: pressed ? 0.82 : 1,
          overflow: 'hidden',
          transform: [{ scale: pressed ? 0.99 : 1 }],
        })}
      >
        <View
          style={{
            backgroundColor: accent.color,
            bottom: 0,
            left: 0,
            position: 'absolute',
            top: 0,
            width: 4,
          }}
        />

        <View style={{ paddingBottom: 17, paddingLeft: 21, paddingRight: 18, paddingTop: 17 }}>
          <View
            style={{
              alignItems: 'flex-start',
              flexDirection: 'row',
              justifyContent: 'space-between',
              marginBottom: 12,
            }}
          >
            <View style={{ flex: 1, minWidth: 0 }}>
              {eyebrow ? (
                <Typography variant="eyebrow" style={{ color: accent.mid, marginBottom: 7 }}>
                  {eyebrow}
                </Typography>
              ) : null}
              <Typography variant="caption" style={{ color: accent.mid }}>
                {formatLabel(goal.category)}
                {goal.status !== 'active' ? ` · ${formatLabel(goal.status)}` : ''}
                {isNewest ? ' · New' : ''}
                {goal.visibility === 'private' ? ' · Private' : ''}
              </Typography>
            </View>

            {showMenu ? (
              <View onStartShouldSetResponder={() => true} style={{ marginLeft: 10, zIndex: 5 }}>
                <Pressable
                  accessibilityLabel={`Open options for ${goal.title}`}
                  accessibilityRole="button"
                  hitSlop={10}
                  onPress={() => setMenuOpen((open) => !open)}
                  style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
                >
                  <Ionicons color={colors.text.muted} name="ellipsis-horizontal" size={20} />
                </Pressable>
              </View>
            ) : null}
          </View>

          <View style={{ alignItems: 'center', flexDirection: 'row', gap: 14 }}>
            <View
              style={{
                alignItems: 'center',
                backgroundColor: themeMode === 'dark' ? colors.background.input : accent.tint,
                borderRadius: RADIUS.md,
                height: 48,
                justifyContent: 'center',
                marginTop: 1,
                width: 48,
              }}
            >
              <BrandIcon name="goal-mark" size={22} tintColor={accent.color} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              {projectTitle ? (
                <Typography ellipsizeMode="tail" numberOfLines={1} variant="caption">
                  {projectTitle}
                </Typography>
              ) : null}
              <Typography
                ellipsizeMode="tail"
                numberOfLines={2}
                variant="title"
                style={{
                  fontFamily: 'Inter-Medium',
                  fontSize: 20,
                  letterSpacing: -0.2,
                  lineHeight: 25,
                  marginTop: projectTitle ? 2 : 0,
                }}
              >
                {goal.title}
              </Typography>
            </View>
            <ProgressRing progress={goal.progress} size={56} strokeWidth={4} color={accent.color} variant="warm" />
          </View>

          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: 16,
              marginTop: 15,
              paddingTop: 4,
            }}
          >
            <MetaItem detail={remaining} label="Target" value={formatDate(goal.deadline)} />
            <MetaItem label="Commitment" value={formatCommitment(goal)} />
          </View>

          {goal.description ? (
            <Typography
              ellipsizeMode="tail"
              numberOfLines={2}
              variant="body"
              style={{
                color: colors.text.secondary,
                fontFamily: 'Inter-Regular',
                fontSize: 15,
                lineHeight: 22,
                marginTop: 14,
              }}
            >
              {goal.description}
            </Typography>
          ) : null}

          <View
            style={{
              alignItems: 'flex-start',
              backgroundColor: colors.background.subtle,
              borderRadius: RADIUS.md,
              flexDirection: 'column',
              justifyContent: 'space-between',
              marginTop: goal.description ? 12 : 14,
              padding: 12,
              gap: 4,
            }}
          >
            <Typography variant="eyebrow" style={{ color: colors.text.accent }}>Next step</Typography>
            <View style={{ alignItems: 'center', flexDirection: 'row', width: '100%' }}>
              <Typography ellipsizeMode="tail" numberOfLines={1} variant="label" style={{ flex: 1 }}>
                {supportingLabel
                  ?? goal.milestones.find((milestone) => !milestone.completedAt)?.title
                  ?? goal.trackers[0]?.title
                  ?? activity
                  ?? 'Open goal details'}
              </Typography>
              <Typography variant="caption" style={{ marginLeft: 12 }}>{formatDate(goal.deadline)}</Typography>
              <Ionicons color={accent.color} name="arrow-forward" size={18} style={{ marginLeft: 8 }} />
            </View>
          </View>
        </View>
      </Pressable>

      {menuOpen ? (
        <View
          style={{
            backgroundColor: colors.background.card,
            borderColor: colors.border.warm,
            borderRadius: RADIUS.md,
            borderWidth: 1,
            ...elevationStyle('md', colors, themeMode === 'dark'),
            minWidth: 144,
            position: 'absolute',
            right: 14,
            top: 46,
            zIndex: 10,
          }}
        >
          <Pressable
            disabled={goal.has_successor}
            onPress={() => {
              setMenuOpen(false);
              handleDelete();
            }}
            style={({ pressed }) => ({
              opacity: goal.has_successor ? 0.45 : pressed ? 0.6 : 1,
              paddingHorizontal: 16,
              paddingVertical: 12,
            })}
          >
            <Typography variant="body" style={{ color: colors.feedback.danger.text, fontSize: 14 }}>
              Delete goal
            </Typography>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}
