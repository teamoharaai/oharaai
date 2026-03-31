import { View, Text, ScrollView, TouchableOpacity, useWindowDimensions, SafeAreaView } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { GOAL_THEMES } from '@/constants/themes';
import { useGoalDetail } from '@/features/goals/hooks/useGoalDetail';
import { GoalDetailHeader } from '@/features/goals/components/GoalDetailHeader';
import { MeasurablesPanel } from '@/features/goals/components/MeasurablesPanel';
import { GoalStarlogEntriesPanel } from '@/features/goals/components/GoalStarlogEntriesPanel';
import { ActivityFeed } from '@/features/goals/components/ActivityFeed';
import { GoalMediaGallery } from '@/features/goals/components/GoalMediaGallery';

function GoalDetailLoadingState() {
  return (
    <SafeAreaView className="flex-1 bg-dark-bg px-4 pt-4">
      <View className="mb-4 h-10 w-28 animate-pulse rounded-full bg-dark-card" />
      <View className="animate-pulse rounded-xl border border-dark-border bg-dark-card p-6">
        <View className="mb-4 flex-row gap-2">
          <View className="h-6 w-20 rounded-full bg-dark-border" />
          <View className="h-6 w-16 rounded-full bg-dark-border" />
        </View>
        <View className="mb-4 h-9 w-3/4 rounded-lg bg-dark-border" />
        <View className="mb-2 h-4 w-full rounded-full bg-dark-border" />
        <View className="mb-8 h-4 w-5/6 rounded-full bg-dark-border" />
        <View className="flex-row items-center justify-between">
          <View className="h-16 w-36 rounded-xl bg-dark-border" />
          <View className="h-20 w-20 rounded-full bg-dark-border" />
        </View>
      </View>
    </SafeAreaView>
  );
}

export default function GoalDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const goalId = Array.isArray(id) ? id[0] : (id ?? '');
  const {
    goal,
    activityEntries,
    starlogEntries,
    isLoading,
    isStarlogLoading,
    onSaveMeasurable,
    onDeleteMeasurable,
    onAddMeasurable,
    measurableError,
    clearMeasurableError,
  } = useGoalDetail(goalId);
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;

  if (isLoading) {
    return <GoalDetailLoadingState />;
  }

  if (!goal) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-dark-bg">
        <Text className="text-muted">Goal not found</Text>
        <TouchableOpacity className="mt-4" onPress={() => router.back()}>
          <Text className="text-sm text-indigo-400">← Go back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const theme = GOAL_THEMES[goal.colorTheme];

  const leftContent = (
    <>
      <GoalDetailHeader goal={goal} />
      <View className="px-6 pb-4">
        <MeasurablesPanel
          measurables={goal.measurables}
          accentColor={theme.accent}
          onSave={onSaveMeasurable}
          onDelete={onDeleteMeasurable}
          onAdd={onAddMeasurable}
          error={measurableError}
          onDismissError={clearMeasurableError}
        />
        <GoalStarlogEntriesPanel
          entries={starlogEntries}
          isLoading={isStarlogLoading}
        />
      </View>
    </>
  );

  const rightContent = (
    <View className="m-4 overflow-hidden rounded-xl border border-dark-border bg-dark-card">
      <ActivityFeed entries={activityEntries} />
      <GoalMediaGallery entries={activityEntries} />
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-dark-bg">
      <View className="flex-row items-center border-b border-dark-border px-4 py-2.5">
        <TouchableOpacity
          onPress={() => router.back()}
          className="flex-row items-center gap-1.5 py-1 pr-3"
          activeOpacity={0.7}
        >
          <Text className="text-lg text-muted">←</Text>
          <Text className="text-sm text-muted">Goals</Text>
        </TouchableOpacity>
        <View className="mr-3 h-4 w-px bg-dark-border" />
        <Text className="flex-1 text-[15px] font-semibold text-white" numberOfLines={1}>
          {goal.title}
        </Text>
      </View>

      {isDesktop ? (
        <View className="flex-1 flex-row">
          <ScrollView className="flex-[3]" contentContainerClassName="pb-10">
            {leftContent}
          </ScrollView>
          <View className="w-px bg-dark-border" />
          <ScrollView className="flex-[2]" contentContainerClassName="pb-10">
            {rightContent}
          </ScrollView>
        </View>
      ) : (
        <ScrollView className="flex-1" contentContainerClassName="pb-10">
          {leftContent}
          {rightContent}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
