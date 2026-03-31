import { View, Text, ScrollView, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native';
import { router } from 'expo-router';
import { useGoals } from '@/features/goals/hooks/useGoals';
import { GoalGrid } from '@/features/goals/components/GoalGrid';
import { NewGoalButton } from '@/features/goals/components/NewGoalButton';
import { EmptyStateCard } from '@/components/ui/EmptyStateCard';

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

  const activeGoals = goals.filter((g) => g.status === 'active');
  const newestId =
    goals.length > 0
      ? [...goals].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())[0]?.id
      : undefined;

  return (
    <SafeAreaView className="flex-1 bg-dark-bg">
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 pb-10 pt-4"
      >
        <View className="mb-6 flex-row items-center justify-between">
          <View className="flex-row items-center gap-2.5">
            <Text className="text-2xl font-extrabold text-ink">Your Goals</Text>
            {activeGoals.length > 0 && (
              <View className="rounded-xl border border-dark-border bg-dark-card px-2.5 py-1">
                <Text className="text-xs text-ink-dim">{activeGoals.length} active</Text>
              </View>
            )}
          </View>
          <NewGoalButton />
        </View>

        {isLoading ? (
          <DashboardLoadingState />
        ) : goals.length === 0 ? (
          <EmptyState />
        ) : (
          <GoalGrid goals={goals} newestId={newestId} />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
