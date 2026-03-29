import { View, Text, ScrollView, TouchableOpacity, useWindowDimensions, SafeAreaView } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { GOAL_THEMES } from '@/constants/themes';
import { useGoalDetail } from '@/features/goals/hooks/useGoalDetail';
import { useGoalStore } from '@/features/goals/store';
import { GoalDetailHeader } from '@/features/goals/components/GoalDetailHeader';
import { MeasurablesPanel } from '@/features/goals/components/MeasurablesPanel';
import { ActivityFeed } from '@/features/goals/components/ActivityFeed';
import { GoalMediaGallery } from '@/features/goals/components/GoalMediaGallery';

export default function GoalDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const goalId = Array.isArray(id) ? id[0] : (id ?? '');
  const { goal, activityEntries, isLoading } = useGoalDetail(goalId);
  const { updateMeasurableValue } = useGoalStore();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#0A0A0F', alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: '#8888A0' }}>Loading...</Text>
      </SafeAreaView>
    );
  }

  if (!goal) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#0A0A0F', alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: '#8888A0' }}>Goal not found</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16 }}>
          <Text style={{ color: '#6E5CE7' }}>← Go back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const theme = GOAL_THEMES[goal.colorTheme];

  const leftContent = (
    <>
      <GoalDetailHeader goal={goal} />
      <View style={{ paddingHorizontal: 24, paddingBottom: 16 }}>
        <MeasurablesPanel
          measurables={goal.measurables}
          accentColor={theme.accent}
          onLog={updateMeasurableValue}
        />
      </View>
    </>
  );

  const rightContent = (
    <View
      style={{
        backgroundColor: '#14141F',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#1E1E2E',
        margin: 16,
        overflow: 'hidden',
      }}
    >
      <ActivityFeed entries={activityEntries} />
      <GoalMediaGallery entries={activityEntries} />
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0A0A0F' }}>
      {/* Nav bar */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingVertical: 10,
          borderBottomWidth: 1,
          borderBottomColor: '#1E1E2E',
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            paddingVertical: 4,
            paddingRight: 12,
          }}
          activeOpacity={0.7}
        >
          <Text style={{ color: '#8888A0', fontSize: 18 }}>←</Text>
          <Text style={{ color: '#8888A0', fontSize: 14 }}>Goals</Text>
        </TouchableOpacity>
        <View
          style={{ width: 1, height: 16, backgroundColor: '#1E1E2E', marginRight: 12 }}
        />
        <Text style={{ color: '#FAFAFA', fontWeight: '600', fontSize: 15, flex: 1 }} numberOfLines={1}>
          {goal.title}
        </Text>
      </View>

      {/* Two-column on desktop, single-column on mobile */}
      {isDesktop ? (
        <View style={{ flex: 1, flexDirection: 'row' }}>
          <ScrollView style={{ flex: 3 }} contentContainerStyle={{ paddingBottom: 40 }}>
            {leftContent}
          </ScrollView>
          <View
            style={{ width: 1, backgroundColor: '#1E1E2E' }}
          />
          <ScrollView style={{ flex: 2 }} contentContainerStyle={{ paddingBottom: 40 }}>
            {rightContent}
          </ScrollView>
        </View>
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }}>
          {leftContent}
          {rightContent}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
