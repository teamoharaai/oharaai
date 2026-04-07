import { useCallback, useState } from 'react';
import { View, Text, ScrollView, Pressable, useWindowDimensions, SafeAreaView } from 'react-native';
import { useFocusEffect, useLocalSearchParams, router } from 'expo-router';
import { GOAL_THEMES } from '@/constants/themes';
import { useGoalDetail } from '@/features/goals/hooks/useGoalDetail';
import { GoalDetailHeader } from '@/features/goals/components/GoalDetailHeader';
import { MeasurablesPanel } from '@/features/goals/components/MeasurablesPanel';
import { ActivityFeed } from '@/features/goals/components/ActivityFeed';
import { AffiliateTeaser } from '@/components/AffiliateTeaser';
import { useActivity } from '@/features/goals/hooks/useActivity';
import { NextActionSection } from '@/features/actions/components/NextActionSection';
import { getVaultItemCount } from '@/lib/db/vaults';

function GoalDetailLoadingState() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F5F1EA' }}>
      <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 }}>
        <View style={{ height: 14, width: 72, borderRadius: 999, backgroundColor: '#EAE7E0' }} />
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}>
        {/* Hero skeleton */}
        <View
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 16,
            borderLeftWidth: 4,
            borderLeftColor: '#EAE7E0',
            padding: 20,
            marginBottom: 12,
          }}
        >
          <View style={{ flexDirection: 'row', gap: 6, marginBottom: 14 }}>
            <View style={{ height: 22, width: 64, borderRadius: 6, backgroundColor: '#EAE7E0' }} />
            <View style={{ height: 22, width: 52, borderRadius: 6, backgroundColor: '#EAE7E0' }} />
          </View>
          <View style={{ height: 28, width: '78%', borderRadius: 8, backgroundColor: '#EAE7E0', marginBottom: 10 }} />
          <View style={{ height: 14, borderRadius: 999, backgroundColor: '#EAE7E0', marginBottom: 6 }} />
          <View style={{ height: 14, width: '66%', borderRadius: 999, backgroundColor: '#EAE7E0', marginBottom: 20 }} />
          <View style={{ height: 1, backgroundColor: '#EAE7E0', marginBottom: 16 }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ height: 48, width: 120, borderRadius: 8, backgroundColor: '#EAE7E0' }} />
            <View style={{ height: 72, width: 72, borderRadius: 36, backgroundColor: '#EAE7E0' }} />
          </View>
        </View>
        {/* Section skeletons */}
        {[0, 1].map((i) => (
          <View
            key={i}
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 16,
              padding: 20,
              marginBottom: 12,
            }}
          >
            <View style={{ height: 10, width: 80, borderRadius: 999, backgroundColor: '#EAE7E0', marginBottom: 14 }} />
            <View style={{ height: 14, borderRadius: 999, backgroundColor: '#EAE7E0', marginBottom: 8 }} />
            <View style={{ height: 14, width: '75%', borderRadius: 999, backgroundColor: '#EAE7E0' }} />
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function GoalNotFound() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F5F1EA' }}>
      <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
        <Pressable onPress={() => router.back()}>
          <Text style={{ fontSize: 15, color: '#4A7C5F' }}>← Goals</Text>
        </Pressable>
      </View>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
        <Text style={{ fontSize: 17, color: '#6B7B6E', textAlign: 'center', marginBottom: 16 }}>
          This goal couldn't be found.
        </Text>
        <Pressable onPress={() => router.back()}>
          <Text style={{ fontSize: 15, color: '#4A7C5F' }}>← Go back</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

export default function GoalDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const goalId = Array.isArray(id) ? id[0] : (id ?? '');
  const [vaultItemCount, setVaultItemCount] = useState(0);
  const {
    goal,
    isLoading,
    onSaveMeasurable,
    onDeleteMeasurable,
    onAddMeasurable,
    onCompleteMeasurable,
    completedIds,
    measurableError,
    clearMeasurableError,
  } = useGoalDetail(goalId);
  const { items, loading: activityLoading, error: activityError } = useActivity(goalId);
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;

  useFocusEffect(
    useCallback(() => {
      if (!goalId) {
        setVaultItemCount(0);
        return;
      }

      let active = true;

      async function loadVaultItemCount() {
        try {
          const count = await getVaultItemCount(goalId);
          if (active) {
            setVaultItemCount(count);
          }
        } catch {
          if (active) {
            setVaultItemCount(0);
          }
        }
      }

      loadVaultItemCount();

      return () => {
        active = false;
      };
    }, [goalId]),
  );

  if (isLoading) return <GoalDetailLoadingState />;
  if (!goal) return <GoalNotFound />;

  const theme = GOAL_THEMES[goal.colorTheme];
  const hasEchoEntry = items.some((item) => item.kind === 'echo_entry');

  const mainWorkspace = (
    <>
      <GoalDetailHeader goal={goal} />
      <NextActionSection goalId={goalId} />
      <MeasurablesPanel
        measurables={goal.measurables}
        accentColor={theme.accent}
        onSave={onSaveMeasurable}
        onDelete={onDeleteMeasurable}
        onAdd={onAddMeasurable}
        onComplete={onCompleteMeasurable}
        completedIds={completedIds}
        vaultItemCount={vaultItemCount}
        error={measurableError}
        onDismissError={clearMeasurableError}
      />
      <ActivityFeed items={items} loading={activityLoading} error={activityError} />
      {goal.progress > 0 && hasEchoEntry ? <AffiliateTeaser /> : null}
    </>
  );

  const contextRail = (
    <>
      {/* Phase 2: Activity feed — requires activity service */}
      {/* Phase 2: AI Insight slot */}
      {/* Phase 2: Community Context slot */}
    </>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F5F1EA' }}>
      {/* Nav bar */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 20,
          paddingTop: 16,
          paddingBottom: 12,
        }}
      >
        <Pressable onPress={() => router.back()}>
          <Text style={{ fontFamily: 'Inter', fontSize: 15, color: '#4A7C5F' }}>← Goals</Text>
        </Pressable>
        <Text style={{ fontFamily: 'Inter', fontSize: 15, color: '#9CAF9F', marginHorizontal: 8 }}>|</Text>
        <Text
          style={{ fontFamily: 'Inter', fontSize: 15, fontWeight: '500', color: '#1A1F1C', flex: 1 }}
          numberOfLines={1}
        >
          {goal.title}
        </Text>
      </View>

      {isDesktop ? (
        /* Desktop: main workspace (flex-2) + context rail (flex-1) */
        <View style={{ flex: 1, flexDirection: 'row', paddingHorizontal: 20, gap: 16 }}>
          <ScrollView
            style={{ flex: 2 }}
            contentContainerStyle={{ paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
          >
            {mainWorkspace}
          </ScrollView>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
          >
            {contextRail}
          </ScrollView>
        </View>
      ) : (
        /* Mobile: single column */
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          {mainWorkspace}
          {contextRail}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
