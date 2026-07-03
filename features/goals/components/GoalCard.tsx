import { useState } from 'react';
import { View, Pressable, Alert, StyleSheet, Text, Platform } from 'react-native';
import { router } from 'expo-router';
import { GOAL_THEMES } from '@/constants/themes';
import { Badge } from '@/components/ui/Badge';
import { Typography } from '@/components/ui/Typography';
import { useGoalStore } from '../store';
import type { GoalWithMeasurables } from '../types';

interface GoalCardProps {
  goal: GoalWithMeasurables;
  isNewest?: boolean;
}

function daysUntil(date: Date): number {
  return Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

export function GoalCard({ goal, isNewest }: GoalCardProps) {
  const theme = GOAL_THEMES[goal.colorTheme];
  const days = goal.deadline ? daysUntil(goal.deadline) : null;
  const deleteGoal = useGoalStore((state) => state.deleteGoal);
  const [menuOpen, setMenuOpen] = useState(false);
  const visibilityLabel =
    goal.visibility === 'public'
      ? 'Public'
      : goal.visibility === 'circle'
        ? 'Circle'
        : null;

  const handleDelete = async () => {
    const confirmed = Platform.OS === 'web'
      ? window.confirm('Delete goal? This cannot be undone.')
      : await new Promise<boolean>((resolve) =>
          Alert.alert(
            'Delete goal',
            'This cannot be undone.',
            [
              {
                text: 'Cancel',
                style: 'cancel',
                onPress: () => resolve(false),
              },
              {
                text: 'Delete',
                style: 'destructive',
                onPress: () => resolve(true),
              },
            ],
          )
        );

    if (!confirmed) return;

    try {
      await deleteGoal(goal.id);
      if (router.canGoBack()) {
        router.back();
      }
    } catch {
      Alert.alert('Could not delete goal', 'Please try again.');
    }
  };

  return (
    <View style={{ position: 'relative' }}>
      {menuOpen && (
        <Pressable
          style={StyleSheet.absoluteFillObject}
          onPress={() => setMenuOpen(false)}
        />
      )}
      <Pressable
        onPress={() =>
          router.push({ pathname: '/(app)/goals/[id]' as never, params: { id: goal.id } })
        }
        style={({ pressed }) => ({
          backgroundColor: '#FFFFFF',
          borderRadius: 12,
          borderLeftWidth: 3,
          borderLeftColor: theme.accent + '99',
          padding: 16,
          opacity: pressed ? 0.85 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.06,
          shadowRadius: 12,
          elevation: 2,
        })}
      >
        {/* Top row: category + active badge */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
          <Badge label={goal.category} variant="category" />
          {isNewest && <Badge label="Active" variant="active" />}
          {visibilityLabel && <Badge label={visibilityLabel} variant="new" />}
        </View>

        {/* Title */}
        <Typography
          variant="title"
          numberOfLines={2}
          style={{ marginBottom: 12 }}
        >
          {goal.title}
        </Typography>

        {/* Progress bar */}
        <View style={{ height: 3, backgroundColor: '#EAE7E0', borderRadius: 2, marginBottom: 12 }}>
          <View
            style={{
              width: `${goal.progress}%`,
              height: 3,
              backgroundColor: theme.accent,
              borderRadius: 2,
            }}
          />
        </View>

        {/* Activity line — fixed-height wrapper prevents layout shift when signals are absent */}
        <View style={{ minHeight: 20, justifyContent: 'center', marginTop: 4, marginBottom: 4 }}>
          {(goal.vaultItemCount > 0 || goal.echoLinkCount > 0) && (
            <Text style={{ fontSize: 12, color: '#6B7B6E' }}>
              {[
                goal.vaultItemCount > 0 ? `${goal.vaultItemCount} item${goal.vaultItemCount !== 1 ? 's' : ''}` : null,
                goal.echoLinkCount > 0 ? `${goal.echoLinkCount} reflection${goal.echoLinkCount !== 1 ? 's' : ''}` : null,
              ]
                .filter(Boolean)
                .join(' · ')}
            </Text>
          )}
        </View>

        {/* Footer row */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="caption">{goal.progress}% complete</Typography>
          {days !== null && (
            <Typography
              variant="caption"
              style={{ color: days > 0 ? (days > 14 ? '#6B7B6E' : '#C0483A') : '#C0483A' }}
            >
              {days > 0 ? `${days}d left` : 'Overdue'}
            </Typography>
          )}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {/* BRT micro-dots */}
            {goal.latestBrtTags && goal.latestBrtTags.length > 0 && (
              <View style={{ flexDirection: 'row', alignSelf: 'flex-end', gap: 3 }}>
                {goal.latestBrtTags.map((tag, i) => (
                  <View
                    key={i}
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: 3,
                      backgroundColor:
                        tag === 'bud' ? '#4A7C5F' :
                        tag === 'rose' ? '#F59E0B' :
                        '#EF4444',
                    }}
                  />
                ))}
              </View>
            )}
            <View onStartShouldSetResponder={() => true}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Open options for ${goal.title}`}
                hitSlop={8}
                onPress={() => setMenuOpen(true)}
              >
                <Typography variant="caption" style={{ fontSize: 18, lineHeight: 20, color: '#9CAF9F' }}>⋯</Typography>
              </Pressable>
            </View>
          </View>
        </View>
      </Pressable>

      {menuOpen && (
        <View
          style={{
            position: 'absolute',
            top: 32,
            right: 0,
            backgroundColor: '#FFFFFF',
            borderRadius: 8,
            borderWidth: 0.5,
            borderColor: '#EAE7E0',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.08,
            shadowRadius: 8,
            elevation: 4,
            zIndex: 999,
            minWidth: 140,
          }}
        >
          <Pressable
            onPress={async () => {
              setMenuOpen(false);
              await handleDelete();
            }}
            style={{ paddingHorizontal: 16, paddingVertical: 12 }}
          >
            <Text style={{ color: '#C0483A', fontSize: 14 }}>
              Delete goal
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}
