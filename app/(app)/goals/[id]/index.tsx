import { useCallback, useEffect, useState } from 'react';
import { View, ScrollView, Pressable, useWindowDimensions, SafeAreaView } from 'react-native';
import { useFocusEffect, useLocalSearchParams, router } from 'expo-router';
import { GOAL_THEMES } from '@/constants/themes';
import { Typography } from '@/components/ui/Typography';
import { useGoalDetail } from '@/features/goals/hooks/useGoalDetail';
import { GoalDetailHeader } from '@/features/goals/components/GoalDetailHeader';
import { MeasurablesPanel } from '@/features/goals/components/MeasurablesPanel';
import { ActivityFeed } from '@/features/goals/components/ActivityFeed';
import { useActivity } from '@/features/goals/hooks/useActivity';
import { getVaultItemCount, } from '@/lib/db/vaults';
import { getProjectTitle } from '@/lib/db/goals';

function GoalDetailLoadingState() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8F4EC' }}>
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
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8F4EC' }}>
      <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
        <Pressable onPress={() => router.back()}>
          <Typography variant="nav-back">← Goals</Typography>
        </Pressable>
      </View>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
        <Typography variant="body" style={{ fontSize: 17, textAlign: 'center', marginBottom: 16 }}>
          This goal couldn't be found.
        </Typography>
        <Pressable onPress={() => router.back()}>
          <Typography variant="nav-back">← Go back</Typography>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const SUMMARY_CARD_STYLE = {
  backgroundColor: '#FFFFFF',
  borderRadius: 16,
  padding: 16,
  marginBottom: 12,
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  justifyContent: 'space-between' as const,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.05,
  shadowRadius: 12,
  elevation: 1,
};

export default function GoalDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const goalId = Array.isArray(id) ? id[0] : (id ?? '');
  const [vaultItemCount, setVaultItemCount] = useState(0);
  const [projectTitle, setProjectTitle] = useState<string | null>(null);
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

  // Fetch vault item count on focus
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

  // Fetch project title whenever the goal's projectId is known
  useEffect(() => {
    if (!goal?.projectId) {
      setProjectTitle(null);
      return;
    }
    let active = true;
    getProjectTitle(goal.projectId)
      .then((t) => { if (active) setProjectTitle(t); })
      .catch(() => { if (active) setProjectTitle(null); });
    return () => { active = false; };
  }, [goal?.projectId]);

  if (isLoading) return <GoalDetailLoadingState />;
  if (!goal) return <GoalNotFound />;

  const theme = GOAL_THEMES[goal.colorTheme];

  const mainWorkspace = (
    <>
      <GoalDetailHeader goal={goal} />

      {/* Parent project row */}
      {goal.projectId && projectTitle ? (
        <Pressable
          onPress={() =>
            router.push({ pathname: '/(app)/projects/[id]' as never, params: { id: goal.projectId! } })
          }
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            marginBottom: 10,
            paddingHorizontal: 2,
          }}
        >
          <Typography variant="label">
            Part of: {projectTitle}
          </Typography>
          <Typography variant="caption" style={{ fontSize: 14 }}>›</Typography>
        </Pressable>
      ) : null}

      {/* Phase 3: Space badge — spaceId is not yet on GoalWithMeasurables */}

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

      {/* Vault Summary Card */}
      <Pressable
        onPress={() => router.push(`/(app)/goals/${goalId}/vault` as never)}
        style={SUMMARY_CARD_STYLE}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Typography variant="meta" style={{ fontSize: 20, color: '#1E3226' }}>◫</Typography>
          <View>
            <Typography variant="emphasis-sm" style={{ color: '#211F1A' }}>
              Vault
            </Typography>
            <Typography variant="caption">
              {vaultItemCount === 0
                ? 'No items yet'
                : `${vaultItemCount} item${vaultItemCount !== 1 ? 's' : ''}`}
            </Typography>
          </View>
        </View>
        <Typography variant="caption" style={{ fontSize: 18 }}>›</Typography>
      </Pressable>

      {/* Echo Summary Card */}
      <Pressable
        onPress={() =>
          router.push(`/(app)/echo?goalId=${goalId}` as never)
        }
        style={SUMMARY_CARD_STYLE}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Typography variant="meta" style={{ fontSize: 20, color: '#1E3226' }}>✦</Typography>
          <View>
            <Typography variant="emphasis-sm" style={{ color: '#211F1A' }}>
              Reflections
            </Typography>
            <Typography variant="caption">
              Tap to journal about this goal
            </Typography>
          </View>
        </View>
        <Typography variant="caption" style={{ fontSize: 18 }}>›</Typography>
      </Pressable>

      <ActivityFeed items={items} loading={activityLoading} error={activityError} />

      {/* deferred: AffiliateTeaser */}
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
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8F4EC' }}>
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
          <Typography variant="nav-back">← Goals</Typography>
        </Pressable>
        <Typography variant="nav-back" style={{ color: '#A79E8E', marginHorizontal: 8 }}>|</Typography>
        <Typography variant="nav-title" style={{ flex: 1 }} numberOfLines={1}>
          {goal.title}
        </Typography>
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
