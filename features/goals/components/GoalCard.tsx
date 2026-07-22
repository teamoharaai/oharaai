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
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Badge } from '@/components/ui/Badge';
import { BrandIcon } from '@/components/ui/BrandIcon';
import { Typography } from '@/components/ui/Typography';
import { getCategoryAccentTheme } from '@/constants/themes';
import { useThemeColors, useUIStore } from '@/store/uiStore';
import { useGoalStore } from '../store';
import type { GoalStatus, GoalWithDetails } from '../types';

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

function statusVariant(status: GoalStatus): 'active' | 'complete' | 'paused' | 'archived' | 'draft' {
  if (status === 'active') return 'active';
  if (status === 'draft') return 'draft';
  if (status === 'complete') return 'complete';
  if (status === 'stagnant') return 'paused';
  return 'archived';
}

function activityLabel(goal: GoalWithDetails): string | null {
  const parts = [
    goal.vaultItemCount > 0
      ? `${goal.vaultItemCount} item${goal.vaultItemCount === 1 ? '' : 's'}`
      : null,
    goal.echoLinkCount > 0
      ? `${goal.echoLinkCount} reflection${goal.echoLinkCount === 1 ? '' : 's'}`
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
        onPress={() =>
          router.push({ pathname: '/(app)/goals/[id]' as never, params: { id: goal.id } })
        }
        style={({ pressed }) => ({
          backgroundColor: colors.background.card,
          borderColor: colors.border.warm,
          borderRadius: 18,
          borderWidth: 1,
          minHeight: 176,
          opacity: pressed ? 0.82 : 1,
          overflow: 'hidden',
          shadowColor: colors.text.primary,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: themeMode === 'dark' ? 0 : 0.06,
          shadowRadius: 18,
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
              <View style={{ alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                <View
                  style={{
                    alignItems: 'center',
                    alignSelf: 'flex-start',
                    backgroundColor: themeMode === 'dark' ? colors.background.input : accent.tint,
                    borderRadius: 999,
                    flexDirection: 'row',
                    gap: 6,
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                  }}
                >
                  <View style={{ backgroundColor: accent.color, borderRadius: 3, height: 6, width: 6 }} />
                  <Typography
                    variant="badge-text"
                    style={{ color: themeMode === 'dark' ? colors.text.primary : accent.mid }}
                  >
                    {formatLabel(goal.category)}
                  </Typography>
                </View>
                <Badge label={formatLabel(goal.status)} variant={statusVariant(goal.status)} />
                {isNewest ? <Badge label="New" variant="new" /> : null}
                {goal.visibility === 'private' ? <Badge label="Private" variant="complete" /> : null}
              </View>
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

          <View style={{ alignItems: 'flex-start', flexDirection: 'row', gap: 10 }}>
            <View
              style={{
                alignItems: 'center',
                backgroundColor: themeMode === 'dark' ? colors.background.input : accent.tint,
                borderRadius: 10,
                height: 38,
                justifyContent: 'center',
                marginTop: 1,
                width: 38,
              }}
            >
              <BrandIcon name="goal-mark" size={19} tintColor={accent.color} />
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
                  fontFamily: 'Inter-SemiBold',
                  fontSize: 20,
                  letterSpacing: -0.2,
                  lineHeight: 25,
                  marginTop: projectTitle ? 2 : 0,
                }}
              >
                {goal.title}
              </Typography>
            </View>
          </View>

          <View
            style={{
              borderTopColor: colors.border.warmSubtle,
              borderTopWidth: 1,
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: 16,
              marginTop: 15,
              paddingTop: 14,
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
                borderTopColor: colors.border.warmSubtle,
                borderTopWidth: 1,
                color: colors.text.secondary,
                fontFamily: 'Inter-Regular',
                fontSize: 13.5,
                fontStyle: 'italic',
                lineHeight: 21,
                marginTop: 14,
                paddingTop: 13,
              }}
            >
              “{goal.description}”
            </Typography>
          ) : null}

          <View
            style={{
              alignItems: 'center',
              flexDirection: 'row',
              justifyContent: 'space-between',
              marginTop: goal.description ? 12 : 14,
            }}
          >
            <Typography ellipsizeMode="tail" numberOfLines={1} variant="caption" style={{ flex: 1 }}>
              {supportingLabel ?? activity ?? 'Open goal details'}
            </Typography>
            <Ionicons color={accent.color} name="arrow-forward" size={18} />
          </View>
        </View>
      </Pressable>

      {menuOpen ? (
        <View
          style={{
            backgroundColor: colors.background.card,
            borderColor: colors.border.warm,
            borderRadius: 10,
            borderWidth: 1,
            elevation: 5,
            minWidth: 144,
            position: 'absolute',
            right: 14,
            shadowColor: colors.text.primary,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: themeMode === 'dark' ? 0 : 0.1,
            shadowRadius: 12,
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
