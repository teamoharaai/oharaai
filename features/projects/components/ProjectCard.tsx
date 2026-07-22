import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Typography } from '@/components/ui/Typography';
import { ProjectGoalRow } from '@/features/goals/components/ProjectGoalRow';
import { useThemeColors, useUIStore } from '@/store/uiStore';
import { ProjectTitleRow } from './ProjectTitleRow';
import type { Project } from '@/features/projects/types';
import type { GoalWithDetails } from '@/features/goals/types';

interface ProjectCardProps {
  project: Project;
  /** Goals belonging to this project (pre-filtered by the dashboard from the goal store). */
  goals: GoalWithDetails[];
}

export function ProjectCard({ project, goals }: ProjectCardProps) {
  const colors = useThemeColors();
  const themeMode = useUIStore((state) => state.themeMode);
  const [expanded, setExpanded] = useState(false);

  return (
    <View
      style={{
        backgroundColor: colors.background.card,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.border.warm,
        marginBottom: 12,
        paddingVertical: 18,
        paddingHorizontal: 20,
        shadowColor: colors.text.primary,
        shadowOpacity: themeMode === 'dark' ? 0 : 0.04,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 2 },
        elevation: themeMode === 'dark' ? 0 : 1,
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

      {/* Expanded: warm divider + linear project-goal entries */}
      {expanded && (
        <View style={{ marginTop: 16 }}>
          <View
            style={{
              height: 1,
              backgroundColor: colors.border.warm,
              marginBottom: 16,
            }}
          />
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
    </View>
  );
}
