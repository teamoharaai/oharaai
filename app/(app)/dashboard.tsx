import { useState } from 'react';
import { View, Text, ScrollView, useWindowDimensions, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native';
import { router } from 'expo-router';
import { useGoals } from '@/features/goals/hooks/useGoals';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { GoalGrid } from '@/features/goals/components/GoalGrid';
import { EmptyStateCard } from '@/components/ui/EmptyStateCard';

// Derive time-of-day salutation
function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

// Derive short date label e.g. "Tuesday, April 1"
function getDateLabel(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

// Derive display name from email: "ariel@..." → "Ariel"
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
    <View className="gap-4">
      {cards.map((card) => (
        <View
          key={card}
          className="animate-pulse rounded-xl border border-dark-border bg-dark-card px-5 py-5"
        >
          <View className="mb-4 h-4 w-24 rounded-full bg-dark-border" />
          <View className="mb-3 h-8 w-3/4 rounded-lg bg-dark-border" />
          <View className="mb-6 h-3 w-2/3 rounded-full bg-dark-border" />
          <View className="h-2 w-full rounded-full bg-dark-border" />
        </View>
      ))}
    </View>
  );
}

function EmptyState() {
  return (
    <View className="py-16">
      <EmptyStateCard
        title="You haven't set any goals yet."
        description="Create your first goal to start tracking what matters most."
        actionLabel="Create your first goal"
        onActionPress={() => router.push('/goals/create')}
      />
    </View>
  );
}

export default function DashboardScreen() {
  const { goals, isLoading } = useGoals();
  const { user } = useAuth();

  // Change 3: Ohara presence state — wired to intelligence layer in Phase 2
  // TODO: wire to intelligence layer in Phase 2
  const [oharaMessage, _setOharaMessage] = useState<string | null>(null);

  const newestId =
    goals.length > 0
      ? [...goals].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())[0]?.id
      : undefined;

  // Change 4: derive display name from session email
  const displayName = displayNameFromEmail(user?.email);
  const greeting = displayName ? `${getGreeting()}, ${displayName}.` : `${getGreeting()}.`;

  return (
    <SafeAreaView className="flex-1 bg-dark-bg">
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 pb-10 pt-4"
      >
        {/* Change 1a: Greeting header */}
        <View className="mb-5">
          <Text className="text-xl font-medium text-white">{greeting}</Text>
          <Text className="text-sm text-[#555566]">{getDateLabel()}</Text>
        </View>

        {/* Change 1b: Ohara presence card — only renders when oharaMessage is non-null */}
        {oharaMessage !== null && (
          <View className="mb-5 flex-row items-start gap-3 rounded-xl border border-[#1E3028] bg-[#0F1A12] px-4 py-3">
            <View
              className="mt-1 rounded-full bg-[#6FDFB8]"
              style={{ width: 6, height: 6 }}
            />
            <Text className="flex-1 text-sm leading-relaxed text-[#6FDFB8]">{oharaMessage}</Text>
          </View>
        )}

        {/* Change 1c: Goals section header with inline new-goal action */}
        <View className="mb-4 flex-row items-center justify-between">
          <Text className="text-sm font-medium text-[#888899]">Goals</Text>
          <Pressable onPress={() => router.push('/goals/create')}>
            <Text className="text-sm text-[#6FDFB8]">+</Text>
          </Pressable>
        </View>

        {/* Change 1d: GoalGrid (unchanged component) */}
        {isLoading ? (
          <DashboardLoadingState />
        ) : goals.length === 0 ? (
          <EmptyState />
        ) : (
          <GoalGrid goals={goals} newestId={newestId} />
        )}

        {/* Change 1e: Starlog ambient line — pinned below GoalGrid */}
        <Pressable
          className="mt-auto border-t border-[#1A1A2A] py-3"
          onPress={() => router.push('/(app)/starlog')}
        >
          <Text className="text-sm text-[#6FDFB8]">• What's on your mind today?</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
