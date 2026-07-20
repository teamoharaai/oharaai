import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Typography } from '@/components/ui/Typography';
import { GoalRingGrid } from '@/features/goals/components/GoalRingGrid';
import { useThemeColors } from '@/store/uiStore';
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
              color: colors.text.muted,
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
              backgroundColor: colors.border.warm,
              marginBottom: 16,
            }}
          />
          <GoalRingGrid goals={goals} emptyMessage="No goals in this project yet." />
        </View>
      )}
    </View>
  );
}
