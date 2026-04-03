import { View, Text, ScrollView, useWindowDimensions, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { useGoals } from '@/features/goals/hooks/useGoals';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { GoalGrid } from '@/features/goals/components/GoalGrid';
import { EmptyStateCard } from '@/components/ui/EmptyStateCard';
import { useProjectStore } from '@/features/projects/store';
import { ProjectCard } from '@/features/projects/components/ProjectCard';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function getDateLabel(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

function displayNameFromEmail(email: string | undefined): string | null {
  if (!email) return null;
  const local = email.split('@')[0];
  if (!local) return null;
  return local.charAt(0).toUpperCase() + local.slice(1);
}

function DashboardLoadingState() {
  const { width } = useWindowDimensions();
  const cards = width >= 640 ? [0, 1] : [0];

  return (
    <View style={{ gap: 16 }}>
      {cards.map((card) => (
        <View
          key={card}
          style={{
            borderRadius: 12,
            backgroundColor: '#FFFFFF',
            paddingHorizontal: 20,
            paddingVertical: 20,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.06,
            shadowRadius: 12,
            elevation: 2,
          }}
        >
          <View style={{ marginBottom: 16, height: 14, width: 96, borderRadius: 999, backgroundColor: '#EAE7E0' }} />
          <View style={{ marginBottom: 12, height: 28, borderRadius: 8, backgroundColor: '#EAE7E0', width: '75%' }} />
          <View style={{ marginBottom: 24, height: 12, borderRadius: 999, backgroundColor: '#EAE7E0', width: '66%' }} />
          <View style={{ height: 8, borderRadius: 999, backgroundColor: '#EAE7E0' }} />
        </View>
      ))}
    </View>
  );
}

function EmptyState() {
  return (
    <View style={{ paddingVertical: 64 }}>
      <EmptyStateCard
        title="You haven't set any goals yet."
        description="Create your first goal to start tracking what matters most."
        actionLabel="Create your first goal"
        onActionPress={() => router.push('/goals/create')}
      />
    </View>
  );
}

const SECTION_LABEL_STYLE = {
  fontSize: 11,
  fontWeight: '500' as const,
  color: '#6B7B6E',
  letterSpacing: 1.5,
  textTransform: 'uppercase' as const,
};

export default function DashboardScreen() {
  const { goals, isLoading: goalsLoading } = useGoals();
  const { projects, isLoading: projectsLoading, loadProjects } = useProjectStore();
  const { user } = useAuth();

  useEffect(() => {
    loadProjects();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isLoading = goalsLoading || projectsLoading;

  const newestId =
    goals.length > 0
      ? [...goals].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())[0]?.id
      : undefined;

  const standaloneGoals = goals.filter((g) => g.projectId === null);
  const hasProjects = projects.length > 0;

  const displayName = displayNameFromEmail(user?.email);
  const greeting = displayName ? `${getGreeting()}, ${displayName}.` : `${getGreeting()}.`;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F5F1EA' }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40, paddingTop: 16 }}
      >
        {/* Greeting header */}
        <View style={{ marginBottom: 20 }}>
          <Text style={{ fontSize: 22, fontWeight: '500', color: '#1A1F1C' }}>{greeting}</Text>
          <Text style={{ fontSize: 13, color: '#6B7B6E', marginTop: 2 }}>{getDateLabel()}</Text>
        </View>

        {isLoading ? (
          <DashboardLoadingState />
        ) : (
          <>
            {/* Projects section */}
            {hasProjects && (
              <View style={{ marginBottom: 24 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <Text style={SECTION_LABEL_STYLE}>Projects</Text>
                  <Pressable onPress={() => router.push('/projects/create')}>
                    <Text style={{ fontSize: 20, color: '#4A7C5F', lineHeight: 24 }}>+</Text>
                  </Pressable>
                </View>
                {projects.map((project) => (
                  <ProjectCard key={project.id} project={project} />
                ))}
              </View>
            )}

            {/* Goals section — shown when there are standalone goals, or when there are no projects (new user empty state) */}
            {(standaloneGoals.length > 0 || projects.length === 0) && (
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <Text style={SECTION_LABEL_STYLE}>Goals</Text>
                  <Pressable onPress={() => router.push('/goals/create')}>
                    <Text style={{ fontSize: 20, color: '#4A7C5F', lineHeight: 24 }}>+</Text>
                  </Pressable>
                </View>
                {standaloneGoals.length > 0 ? (
                  <GoalGrid goals={standaloneGoals} newestId={newestId} />
                ) : (
                  <EmptyState />
                )}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
