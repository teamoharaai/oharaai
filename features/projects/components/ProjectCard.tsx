import { View, Text, Pressable } from 'react-native';
import { router } from 'expo-router';
import type { Project, ProjectStatus } from '@/features/goals/types';

interface ProjectCardProps {
  project: Project;
}

type StatusConfig = {
  bg: string;
  text: string;
  label: string;
};

const STATUS_CONFIG: Record<ProjectStatus, StatusConfig> = {
  active:   { bg: '#E8F5EF', text: '#4A7C5F', label: 'Active' },
  complete: { bg: '#F0EDE6', text: '#6B7B6E', label: 'Complete' },
  archived: { bg: '#F5F1EA', text: '#9CAF9F', label: 'Archived' },
};

export function ProjectCard({ project }: ProjectCardProps) {
  const statusCfg = STATUS_CONFIG[project.status] ?? STATUS_CONFIG.active;

  return (
    <Pressable
      onPress={() => router.push(`/projects/${project.id}`)}
      style={({ pressed }) => ({
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        marginHorizontal: 0,
        marginBottom: 12,
        paddingHorizontal: 20,
        paddingVertical: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: pressed ? 0.08 : 0.05,
        shadowRadius: 16,
        elevation: 2,
        borderLeftWidth: 4,
        borderLeftColor: '#3D5247',
        opacity: pressed ? 0.95 : 1,
      })}
    >
      {/* Row 1: title + status badge */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: project.description ? 8 : 6 }}>
        <Text
          style={{ fontSize: 17, fontWeight: '600', color: '#1A1F1C', flex: 1, marginRight: 12 }}
          numberOfLines={1}
        >
          {project.title}
        </Text>
        <View style={{ backgroundColor: statusCfg.bg, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 }}>
          <Text style={{ fontSize: 11, fontWeight: '500', color: statusCfg.text }}>{statusCfg.label}</Text>
        </View>
      </View>

      {/* Row 2: description (optional) */}
      {project.description !== null && (
        <Text
          style={{ fontSize: 14, color: '#6B7B6E', lineHeight: 20, marginBottom: 8 }}
          numberOfLines={2}
        >
          {project.description}
        </Text>
      )}

      {/* Row 3: static type label */}
      <Text style={{ fontSize: 12, color: '#9CAF9F' }}>Long-term goal</Text>
    </Pressable>
  );
}
