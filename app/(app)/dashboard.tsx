import { View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native';
import { useGoals } from '@/features/goals/hooks/useGoals';
import { GoalGrid } from '@/features/goals/components/GoalGrid';
import { NewGoalButton } from '@/features/goals/components/NewGoalButton';

function EmptyState() {
  return (
    <View style={{ alignItems: 'center', paddingVertical: 80, gap: 14 }}>
      <Text style={{ fontSize: 52, color: '#8888A0' }}>◎</Text>
      <Text style={{ color: '#FAFAFA', fontSize: 18, fontWeight: '600' }}>No goals yet</Text>
      <Text style={{ color: '#8888A0', textAlign: 'center', fontSize: 14, paddingHorizontal: 32 }}>
        Set your first goal and start tracking what matters to you.
      </Text>
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
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0A0A0F' }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 20, paddingTop: 16, paddingBottom: 40 }}
      >
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 24,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Text style={{ color: '#FAFAFA', fontSize: 24, fontWeight: '800' }}>Your Goals</Text>
            {activeGoals.length > 0 && (
              <View
                style={{
                  backgroundColor: '#14141F',
                  borderRadius: 12,
                  paddingHorizontal: 10,
                  paddingVertical: 3,
                  borderWidth: 1,
                  borderColor: '#1E1E2E',
                }}
              >
                <Text style={{ color: '#8888A0', fontSize: 12 }}>
                  {activeGoals.length} active
                </Text>
              </View>
            )}
          </View>
          <NewGoalButton />
        </View>

        {/* Content */}
        {isLoading ? (
          <View style={{ alignItems: 'center', paddingVertical: 60 }}>
            <Text style={{ color: '#8888A0' }}>Loading...</Text>
          </View>
        ) : goals.length === 0 ? (
          <EmptyState />
        ) : (
          <GoalGrid goals={goals} newestId={newestId} />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
