import { View, Text, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Typography } from '@/components/ui/Typography';
import type { Project } from '@/features/projects/types';

interface ProjectCardProps {
  project: Project;
}

export function ProjectCard({ project }: ProjectCardProps) {
  const lastActive = new Date(project.updated_at).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
  const statusDotColor = project.status === 'active' ? '#3D5247' : '#9CA89E';

  return (
    <Pressable
      onPress={() => router.push(`/(app)/projects/${project.id}` as never)}
      style={({ pressed }) => ({
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        marginBottom: 12,
        padding: 16,
        shadowColor: '#000',
        shadowOpacity: pressed ? 0.06 : 0.04,
        shadowRadius: 8,
        elevation: 1,
        opacity: pressed ? 0.95 : 1,
      })}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View
          style={{
            width: 8,
            height: 8,
            borderRadius: 999,
            backgroundColor: statusDotColor,
            marginRight: 10,
          }}
        />
        <Typography
          variant="title"
          style={{ flex: 1 }}
          numberOfLines={1}
        >
          {project.title}
        </Typography>
      </View>

      <Typography variant="caption" style={{ marginTop: 6 }}>
        Last active {lastActive}
      </Typography>

      {project.description !== null && (
        <Typography
          variant="meta"
          style={{ marginTop: 6, color: '#6B7B6E' }}
          numberOfLines={2}
        >
          {project.description}
        </Typography>
      )}

      <View
        style={{
          marginTop: 12,
          height: 3,
          borderRadius: 2,
          backgroundColor: '#EDE8E0',
        }}
      />
    </Pressable>
  );
}
