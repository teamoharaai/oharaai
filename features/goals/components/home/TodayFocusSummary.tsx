import { Pressable, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { BrandIcon } from '@/components/ui/BrandIcon';
import { Card } from '@/components/ui/Card';
import type { TodayCarouselGoal } from '@/components/ui/TodayCarousel';
import { Typography } from '@/components/ui/Typography';
import { RADIUS, SPACE } from '@/constants/design';
import { getCategoryAccentTheme } from '@/constants/themes';
import { useThemeColors, useUIStore } from '@/store/uiStore';
import { goalWorkspaceHref } from '../../navigation';
import type { WeeklyTaskCountsByGoal } from '../../services/weekly-task-count-service';

/**
 * Progress rule shared with Circles: completed top-level milestones / total.
 * Sub-milestones roll up into their parent achievement, so they don't count.
 * (The legacy goals.progress column only flips to 100 on completion.)
 */
function milestoneProgressLabel(goal: TodayCarouselGoal): string {
  const milestones = (goal.milestones ?? []).filter((milestone) => milestone.parentId === null);
  if (milestones.length === 0) return 'No milestones';
  const done = milestones.filter((milestone) => milestone.completedAt !== null).length;
  return `${done}/${milestones.length}`;
}

function formatCategoryLabel(category: string): string {
  return category.charAt(0).toUpperCase() + category.slice(1);
}

/**
 * This week's Task count for a goal (CD-003): "done/target" of the goal's
 * materialized Task occurrences in the current owner-tz week. Returns null when
 * the goal has no occurrences this week (graceful degradation — the count is
 * omitted, never shown as a wrong number).
 */
function weeklyTaskLabel(
  goalId: string,
  weeklyTaskCounts: WeeklyTaskCountsByGoal,
): string | null {
  const count = weeklyTaskCounts[goalId];
  if (!count || count.target === 0) return null;
  return `${count.done}/${count.target}`;
}

export function TodayFocusSummary({
  goals,
  weeklyTaskCounts,
}: {
  goals: TodayCarouselGoal[];
  weeklyTaskCounts: WeeklyTaskCountsByGoal;
}) {
  const colors = useThemeColors();
  const darkMode = useUIStore((state) => state.themeMode === 'dark');
  const { width } = useWindowDimensions();
  const stackedMetadata = width < 1440;
  const visibleGoals = goals.slice(0, 3);

  return (
    <Card
      elevation="md"
      padding="spacious"
      style={{ borderWidth: 0, flex: 1, minHeight: 286, overflow: 'hidden' }}
    >
      <View
        style={{
          alignItems: 'center',
          flexDirection: 'row',
          justifyContent: 'space-between',
          marginBottom: SPACE['3xl'],
        }}
      >
        <View style={{ alignItems: 'center', flexDirection: 'row', gap: SPACE.lg }}>
          <BrandIcon name="today" size={22} tintColor={colors.accent.primary} />
          <Typography variant="eyebrow" style={{ color: colors.text.primary, fontSize: 12 }}>
            Today&apos;s Focus
          </Typography>
        </View>
        <View
          style={{
            backgroundColor: colors.background.selectedRow,
            borderRadius: RADIUS.round,
            minHeight: 32,
            justifyContent: 'center',
            paddingHorizontal: SPACE.lg,
          }}
        >
          <Typography variant="caption" style={{ color: colors.text.accent }}>
            {visibleGoals.length} {visibleGoals.length === 1 ? 'priority' : 'priorities'}
          </Typography>
        </View>
      </View>

      {visibleGoals.length ? (
        <View style={{ gap: SPACE['3xl'] }}>
          {visibleGoals.map((goal) => {
            const categoryTheme = getCategoryAccentTheme(goal.category);
            return (
              <Pressable
              key={goal.id}
              accessibilityHint="Opens this goal"
              accessibilityLabel={`Open ${goal.title}`}
              accessibilityRole="button"
              onPress={() => router.push(goalWorkspaceHref(goal.id) as never)}
              style={({ pressed }) => ({
                alignItems: 'center',
                backgroundColor: pressed ? colors.background.selectedRow : 'transparent',
                borderRadius: RADIUS.sm,
                flexDirection: 'row',
                minHeight: stackedMetadata ? 54 : 44,
                paddingHorizontal: 0,
              })}
            >
              <View
                style={{
                  backgroundColor: colors.accent.primary,
                  borderRadius: RADIUS.round,
                  height: 10,
                  marginRight: SPACE.xl,
                  width: 10,
                }}
              />
              <View
                style={{
                  alignItems: stackedMetadata ? 'flex-start' : 'center',
                  flex: 1,
                  flexDirection: stackedMetadata ? 'column' : 'row',
                  minWidth: 0,
                }}
              >
                <Typography
                  ellipsizeMode="tail"
                  numberOfLines={1}
                  variant="control"
                  style={{ flexShrink: 1 }}
                >
                  {goal.title}
                </Typography>
                <View
                  style={{
                    backgroundColor: darkMode ? colors.background.input : categoryTheme.tint,
                    borderRadius: RADIUS.round,
                    marginLeft: stackedMetadata ? 0 : SPACE.lg,
                    marginTop: stackedMetadata ? SPACE.xs : 0,
                    maxWidth: 126,
                    paddingHorizontal: SPACE.lg,
                    paddingVertical: SPACE.xs,
                  }}
                >
                  <Typography
                    ellipsizeMode="tail"
                    numberOfLines={1}
                    variant="caption"
                    style={{ color: darkMode ? categoryTheme.color : categoryTheme.mid, fontSize: 12 }}
                  >
                    {goal.projectTitle ?? formatCategoryLabel(goal.category)}
                  </Typography>
                </View>
              </View>
              <View style={{ alignItems: 'flex-end', gap: SPACE.xs, marginLeft: SPACE.lg, minWidth: 52 }}>
                <View
                  accessibilityLabel={`Milestones: ${milestoneProgressLabel(goal)}`}
                  style={{ alignItems: 'center', flexDirection: 'row', gap: SPACE.xs }}
                >
                  <Ionicons color={colors.text.accent} name="flag-outline" size={13} />
                  <Typography variant="caption" style={{ color: colors.text.accent }}>
                    {milestoneProgressLabel(goal)}
                  </Typography>
                </View>
                {(() => {
                  const label = weeklyTaskLabel(goal.id, weeklyTaskCounts);
                  if (!label) return null;
                  return (
                    <View
                      accessibilityLabel={`This week's tasks: ${label.replace('/', ' of ')}`}
                      style={{ alignItems: 'center', flexDirection: 'row', gap: SPACE.xs }}
                    >
                      <Ionicons color={colors.text.secondary} name="calendar-outline" size={12} />
                      <Typography variant="caption" style={{ color: colors.text.secondary, fontSize: 11 }}>
                        {label}
                      </Typography>
                    </View>
                  );
                })()}
              </View>
              <View
                style={{
                  alignItems: 'center',
                  backgroundColor: colors.background.subtle,
                  borderRadius: RADIUS.round,
                  height: 32,
                  justifyContent: 'center',
                  marginLeft: SPACE.xl,
                  width: 32,
                }}
              >
                <Ionicons color={colors.text.accent} name="chevron-forward" size={17} />
              </View>
              </Pressable>
            );
          })}
        </View>
      ) : (
        <View style={{ flex: 1, justifyContent: 'center', paddingVertical: SPACE['2xl'] }}>
          <Typography variant="meta" style={{ color: colors.text.muted }}>
            No active goals yet.
          </Typography>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/goals/create')}
            style={({ pressed }) => ({ alignSelf: 'flex-start', marginTop: 10, opacity: pressed ? 0.6 : 1 })}
          >
            <Typography variant="emphasis-sm" style={{ color: colors.text.accent }}>
              Create a goal
            </Typography>
          </Pressable>
        </View>
      )}
    </Card>
  );
}
