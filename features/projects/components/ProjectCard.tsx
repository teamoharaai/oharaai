import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Typography } from '@/components/ui/Typography';
import { Card } from '@/components/ui/Card';
import { BrandIcon } from '@/components/ui/BrandIcon';
import { ProjectGoalRow } from '@/features/goals/components/ProjectGoalRow';
import { useThemeColors } from '@/store/uiStore';
import { RADIUS, SPACE } from '@/constants/design';
import type { Project } from '@/features/projects/types';
import type { GoalWithDetails } from '@/features/goals/types';

interface ProjectCardProps {
  project: Project;
  /** Goals belonging to this project (pre-filtered by the dashboard from the goal store). */
  goals: GoalWithDetails[];
}

export function ProjectCard({ project, goals }: ProjectCardProps) {
  const colors = useThemeColors();
  const [expanded, setExpanded] = useState(false);
  const progress = goals.length
    ? Math.round(goals.reduce((total, goal) => total + goal.progress, 0) / goals.length)
    : 0;

  return (
    <Card
      elevation="none"
      padding="none"
      style={{
        borderColor: colors.border.warmSubtle,
        marginBottom: SPACE.md,
        paddingVertical: SPACE.xl,
        paddingHorizontal: SPACE.xl,
      }}
    >
      <View style={{ alignItems: 'center', flexDirection: 'row', gap: SPACE.lg }}>
        <View style={{
          alignItems: 'center',
          backgroundColor: colors.background.selectedRow,
          borderRadius: RADIUS.md,
          height: 48,
          justifyContent: 'center',
          width: 48,
        }}>
          <BrandIcon name="project" size={22} tintColor={colors.accent.primary} />
        </View>
        <Pressable
          onPress={() => router.push(`/(app)/projects/${project.id}` as never)}
          style={({ pressed }) => ({ flex: 1, minHeight: 44, opacity: pressed ? 0.64 : 1 })}
        >
          <Typography variant="card-title" numberOfLines={1}>
            {project.title}
          </Typography>
          {project.description !== null && (
            <Typography
              variant="card-description"
              style={{ fontSize: 14, lineHeight: 20, marginTop: 4 }}
              numberOfLines={2}
            >
              {project.description}
            </Typography>
          )}
          <Typography variant="caption" style={{ color: colors.text.secondary, marginTop: SPACE.sm }}>
            {goals.length} {goals.length === 1 ? 'goal' : 'goals'} connected
          </Typography>
        </Pressable>

        <Typography
          variant="label"
          style={{ color: colors.text.accent, minWidth: 40, textAlign: 'right' }}
        >
          {progress}%
        </Typography>

        {/* Chevron — taps toggle expand/collapse (collapsed by default) */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            expanded ? `Collapse ${project.title}` : `Expand ${project.title}`
          }
          hitSlop={10}
          onPress={() => setExpanded((prev) => !prev)}
          style={({ pressed }) => ({
            alignItems: 'center',
            borderRadius: RADIUS.round,
            height: 44,
            justifyContent: 'center',
            marginLeft: SPACE.md,
            opacity: pressed ? 0.5 : 1,
            width: 44,
          })}
        >
          <Text
            style={{
              color: colors.text.muted,
              fontFamily: 'Inter-Regular',
              fontSize: 18,
              lineHeight: 18,
              transform: [{ rotate: expanded ? '90deg' : '-90deg' }],
            }}
          >
            ›
          </Text>
        </Pressable>
      </View>

      {expanded && (
        <View style={{
          backgroundColor: colors.background.subtle,
          borderRadius: RADIUS.md,
          marginTop: SPACE.xl,
          padding: SPACE.lg,
        }}>
          {goals.length > 0 ? (
            <View style={{ gap: 8 }}>
              {goals.map((goal) => (
                <ProjectGoalRow key={goal.id} goal={goal} />
              ))}
            </View>
          ) : (
            <Typography variant="hint">No goals in this project yet.</Typography>
          )}
        </View>
      )}
    </Card>
  );
}
