import { useState } from 'react';
import { router } from 'expo-router';
import { ScrollView, View, type LayoutChangeEvent } from 'react-native';
import { EmptyStateCard } from './EmptyStateCard';
import { TodayGoalCard, type TodayGoal } from './TodayGoalCard';

export type TodayCarouselGoal = TodayGoal & { projectTitle?: string };

interface TodayCarouselProps {
  goals: TodayCarouselGoal[];
}

export function TodayCarousel({ goals }: TodayCarouselProps) {
  const [availableWidth, setAvailableWidth] = useState(0);

  if (goals.length === 0) {
    return (
      <EmptyStateCard
        title="No active goals yet."
        description="Create a goal to give today a clear focus."
        actionLabel="Create a goal"
        onActionPress={() => router.push('/goals/create')}
      />
    );
  }

  function handleLayout(event: LayoutChangeEvent) {
    setAvailableWidth(event.nativeEvent.layout.width);
  }

  const cardWidth = availableWidth > 0 ? Math.min(420, availableWidth) : 320;

  return (
    <View onLayout={handleLayout}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 12 }}
      >
        {goals.map(({ projectTitle, ...goal }) => (
          <View key={goal.id} style={{ width: cardWidth }}>
            <TodayGoalCard goal={goal} projectTitle={projectTitle} />
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
