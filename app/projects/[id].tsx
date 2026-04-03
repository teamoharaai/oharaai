import { View, Text, ScrollView, Pressable, ActivityIndicator, SafeAreaView } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { fetchProjectWithGoals } from '@/features/projects/services/project-service';
import { GoalCard } from '@/features/goals/components/GoalCard';
import type { ProjectWithGoals, ProjectStatus } from '@/features/goals/types';

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

export default function ProjectDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [project, setProject] = useState<ProjectWithGoals | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    fetchProjectWithGoals(id).then((data) => {
      setProject(data);
      setIsLoading(false);
    });
  }, [id]);

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F5F1EA', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#3D5247" />
      </SafeAreaView>
    );
  }

  if (!project) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F5F1EA' }}>
        <View style={{ padding: 20 }}>
          <Pressable onPress={() => router.back()} style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 15, color: '#4A7C5F' }}>← Back</Text>
          </Pressable>
          <Text style={{ fontSize: 17, color: '#6B7B6E' }}>Project not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const statusCfg = STATUS_CONFIG[project.status] ?? STATUS_CONFIG.active;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F5F1EA' }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40, paddingTop: 16 }}
      >
        <View style={{ width: '100%', maxWidth: 760, alignSelf: 'center' }}>
          {/* Back nav */}
          <Pressable onPress={() => router.back()} style={{ marginBottom: 20 }}>
            <Text style={{ fontSize: 15, color: '#4A7C5F' }}>← Back</Text>
          </Pressable>

          {/* Project hero */}
          <View
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 16,
              borderLeftWidth: 4,
              borderLeftColor: '#3D5247',
              padding: 20,
              marginBottom: 28,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.06,
              shadowRadius: 12,
              elevation: 2,
            }}
          >
            <Text
              style={{
                fontSize: 11,
                fontWeight: '500',
                color: '#6B7B6E',
                letterSpacing: 1.5,
                textTransform: 'uppercase',
                marginBottom: 12,
              }}
            >
              Long-term ambition
            </Text>

            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: project.description ? 14 : 0 }}>
              <Text style={{ fontSize: 28, fontWeight: '600', color: '#1A1F1C', flex: 1, lineHeight: 34 }}>
                {project.title}
              </Text>
              <View style={{ backgroundColor: statusCfg.bg, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}>
                <Text style={{ fontSize: 11, fontWeight: '500', color: statusCfg.text }}>{statusCfg.label}</Text>
              </View>
            </View>

            {project.description && (
              <Text style={{ fontSize: 15, color: '#6B7B6E', lineHeight: 22 }}>
                {project.description}
              </Text>
            )}
          </View>

          {/* Goals section */}
          <View style={{ marginBottom: 28 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: '500',
                  color: '#6B7B6E',
                  letterSpacing: 1.5,
                  textTransform: 'uppercase',
                }}
              >
                Goals
              </Text>
              <Pressable
                onPress={() => router.push({ pathname: '/goals/create', params: { projectId: project.id } })}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontSize: 20, color: '#4A7C5F', lineHeight: 24 }}>+</Text>
              </Pressable>
            </View>

            {project.goals.length === 0 ? (
              <View
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: 16,
                  paddingHorizontal: 20,
                  paddingVertical: 28,
                  alignItems: 'center',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.04,
                  shadowRadius: 10,
                  elevation: 1,
                }}
              >
                <Text style={{ fontSize: 15, color: '#6B7B6E', marginBottom: 16, textAlign: 'center' }}>
                  No goals linked to this project yet.
                </Text>
                <Pressable
                  onPress={() => router.push({ pathname: '/goals/create', params: { projectId: project.id } })}
                  style={{
                    backgroundColor: '#3D5247',
                    borderRadius: 12,
                    paddingHorizontal: 20,
                    paddingVertical: 12,
                  }}
                >
                  <Text style={{ fontSize: 15, fontWeight: '600', color: '#E8EDE9' }}>Add a goal</Text>
                </Pressable>
              </View>
            ) : (
              <View style={{ gap: 12 }}>
                {project.goals.map((goal) => (
                  <GoalCard key={goal.id} goal={goal} />
                ))}
              </View>
            )}
          </View>

          {/* Phase 2: Activity feed — project-level updates and milestone history */}
          <View
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 16,
              padding: 20,
              marginBottom: 28,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.04,
              shadowRadius: 10,
              elevation: 1,
            }}
          >
            <Text
              style={{
                fontSize: 11,
                fontWeight: '500',
                color: '#6B7B6E',
                letterSpacing: 1.5,
                textTransform: 'uppercase',
                marginBottom: 12,
              }}
            >
              Activity
            </Text>
            <Text style={{ fontSize: 15, color: '#6B7B6E', lineHeight: 22 }}>
              Goal updates and milestone changes will appear here.
            </Text>
          </View>

          {/* Delete project action */}
          <View style={{ alignItems: 'flex-start' }}>
            <Pressable
              disabled
              style={{
                borderRadius: 12,
                borderWidth: 1,
                borderColor: 'rgba(192,72,58,0.22)',
                backgroundColor: '#FFFFFF',
                paddingHorizontal: 16,
                paddingVertical: 12,
                opacity: 0.6,
              }}
            >
              <Text style={{ fontSize: 14, fontWeight: '500', color: '#C0483A' }}>
                Delete project
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
