import { View, Text, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Typography } from '@/components/ui/Typography';
import { LIGHT_THEME } from '@/constants/colors';
import type { Project } from '@/features/projects/types';

interface ProjectCardProps {
  project: Project;
}

export function ProjectCard({ project }: ProjectCardProps) {
  return (
    <Pressable
      onPress={() => router.push(`/(app)/projects/${project.id}` as never)}
      style={({ pressed }) => ({
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
        opacity: pressed ? 0.96 : 1,
      })}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
        {/* Teal status dot */}
        <View
          style={{
            width: 7,
            height: 7,
            borderRadius: 999,
            backgroundColor: LIGHT_THEME.accent.tealMid,
            marginRight: 10,
            marginTop: 6,
          }}
        />

        {/* Title + description stacked */}
        <View style={{ flex: 1 }}>
          <Typography variant="card-title" numberOfLines={1}>
            {project.title}
          </Typography>
          {project.description !== null && (
            <Typography
              variant="card-description"
              style={{ marginTop: 3 }}
              numberOfLines={2}
            >
              {project.description}
            </Typography>
          )}
        </View>

        {/* Chevron affordance (rotated to collapsed state) */}
        <Text
          style={{
            color: LIGHT_THEME.text.muted,
            fontSize: 18,
            lineHeight: 18,
            marginLeft: 8,
            marginTop: 2,
            transform: [{ rotate: '-90deg' }],
          }}
        >
          ›
        </Text>
      </View>
    </Pressable>
  );
}
