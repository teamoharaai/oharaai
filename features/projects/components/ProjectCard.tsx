import { View, Text, Pressable } from 'react-native';
import { router } from 'expo-router';
import type { Project } from '@/features/goals/types';

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
      onPress={() => router.push(`/projects/${project.id}`)}
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
        <Text
          style={{ flex: 1, fontSize: 16, fontWeight: '600', color: '#1A1F1C' }}
          numberOfLines={1}
        >
          {project.title}
        </Text>
      </View>

      <Text style={{ marginTop: 6, fontSize: 12, color: '#9CA89E' }}>
        Last active {lastActive}
      </Text>

      {project.description !== null && (
        <Text
          style={{ marginTop: 6, fontSize: 13, color: '#6B7B6E' }}
          numberOfLines={2}
        >
          {project.description}
        </Text>
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
