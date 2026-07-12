import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Typography } from '@/components/ui/Typography';
import { GoalRingCard } from '@/features/goals/components/GoalRingCard';
import { getGoalRingProgress } from '@/features/goals/utils/ringProgress';
import { GOAL_THEMES, CATEGORY_THEME_MAP } from '@/constants/themes';
import { LIGHT_THEME } from '@/constants/colors';
import { ProjectTitleRow } from './ProjectTitleRow';
import type { Project } from '@/features/projects/types';
import type { GoalWithMeasurables } from '@/features/goals/types';

interface ProjectCardProps {
  project: Project;
  /** Goals belonging to this project (pre-filtered by the dashboard from the goal store). */
  goals: GoalWithMeasurables[];
}

function resolveDueDate(deadline: Date | null): {
  label?: string;
  color: string;
} {
  if (!deadline) return { color: LIGHT_THEME.text.secondary };

  const label = deadline.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
  const days = Math.ceil((deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  let color: string;
  if (days < 0) {
    color = LIGHT_THEME.feedback.danger; // overdue
  } else if (days <= 14) {
    color = LIGHT_THEME.text.secondary; // soon — #8A8172 (replaces retired #6B7B6E)
  } else {
    color = LIGHT_THEME.text.muted; // normal — #A79E8E (replaces retired #9CAF9F)
  }

  return { label, color };
}

function resolveActivityLabel(goal: GoalWithMeasurables): string | undefined {
  const parts = [
    goal.vaultItemCount > 0
      ? `${goal.vaultItemCount} item${goal.vaultItemCount !== 1 ? 's' : ''}`
      : null,
    goal.echoLinkCount > 0
      ? `${goal.echoLinkCount} reflection${goal.echoLinkCount !== 1 ? 's' : ''}`
      : null,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(' · ') : undefined;
}

export function ProjectCard({ project, goals }: ProjectCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <View
      style={{
        backgroundColor: LIGHT_THEME.background.card,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: LIGHT_THEME.border.warm,
        marginBottom: 12,
        paddingVertical: 18,
        paddingHorizontal: 20,
        shadowColor: 'rgb(30,25,15)',
        shadowOpacity: 0.04,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 2 },
        elevation: 1,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
        {/* Title + description — taps navigate to the project */}
        <Pressable
          onPress={() => router.push(`/(app)/projects/${project.id}` as never)}
          style={({ pressed }) => ({ flex: 1, opacity: pressed ? 0.6 : 1 })}
        >
          <ProjectTitleRow title={project.title} numberOfLines={1} />
          {project.description !== null && (
            <Typography
              variant="card-description"
              style={{ marginTop: 3 }}
              numberOfLines={2}
            >
              {project.description}
            </Typography>
          )}
        </Pressable>

        {/* Chevron — taps toggle expand/collapse (collapsed by default) */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            expanded ? `Collapse ${project.title}` : `Expand ${project.title}`
          }
          hitSlop={10}
          onPress={() => setExpanded((prev) => !prev)}
          style={{ marginLeft: 8, marginTop: 2 }}
        >
          <Text
            style={{
              color: LIGHT_THEME.text.muted,
              fontSize: 18,
              lineHeight: 18,
              transform: [{ rotate: expanded ? '90deg' : '-90deg' }],
            }}
          >
            ›
          </Text>
        </Pressable>
      </View>

      {/* Expanded: warm divider + 2-column grid of goal ring cards */}
      {expanded && (
        <View style={{ marginTop: 16 }}>
          <View
            style={{
              height: 1,
              backgroundColor: LIGHT_THEME.border.warm,
              marginBottom: 16,
            }}
          />
          {goals.length === 0 ? (
            <Typography variant="hint">No goals in this project yet.</Typography>
          ) : (
            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: 14,
              }}
            >
              {goals.map((goal) => {
                const theme = CATEGORY_THEME_MAP[goal.category] ?? goal.colorTheme;
                const { label: dueDateLabel, color: dueDateColor } =
                  resolveDueDate(goal.deadline);
                return (
                  <View
                    key={goal.id}
                    style={{ flexBasis: '47%', flexGrow: 1, minWidth: 0 }}
                  >
                    <GoalRingCard
                      title={goal.title}
                      category={goal.category}
                      progress={getGoalRingProgress(goal)}
                      accentColor={GOAL_THEMES[theme].accent}
                      activityLabel={resolveActivityLabel(goal)}
                      dueDateLabel={dueDateLabel}
                      dueDateColor={dueDateColor}
                      onPress={() =>
                        router.push({
                          pathname: '/(app)/goals/[id]' as never,
                          params: { id: goal.id },
                        })
                      }
                    />
                  </View>
                );
              })}
            </View>
          )}
        </View>
      )}
    </View>
  );
}
