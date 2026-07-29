import { useCallback, useRef, useState } from 'react';
import { View, ScrollView, Pressable, useWindowDimensions, SafeAreaView } from 'react-native';
import { useFocusEffect, useLocalSearchParams, router } from 'expo-router';
import { Typography } from '@/components/ui/Typography';
import { AppHeader } from '@/components/layout/AppHeader';
import { useGoalDetail } from '@/features/goals/hooks/useGoalDetail';
import { GoalDetailHeader } from '@/features/goals/components/GoalDetailHeader';
import { GoalProjectPickerModal } from '@/features/goals/components/GoalProjectPickerModal';
import { GoalTitleRow } from '@/features/goals/components/GoalTitleRow';
import { CountdownTimer } from '@/features/goals/components/CountdownTimer';
import { MilestonesPanel } from '@/features/goals/components/MilestonesPanel';
import { TrackersPanel } from '@/features/goals/components/TrackersPanel';
import { IntelligencePanel } from '@/features/goals/components/IntelligencePanel';
import { AnalyticsPanel } from '@/features/goals/components/AnalyticsPanel';
import { RecommendedPanel } from '@/features/goals/components/RecommendedPanel';
import { WhatYouBuiltPanel } from '@/features/goals/components/WhatYouBuiltPanel';
import { SuccessorReflectionPanel } from '@/features/goals/components/SuccessorReflectionPanel';
import { ActivityFeed } from '@/features/goals/components/ActivityFeed';
import { useActivity } from '@/features/goals/hooks/useActivity';
import { getVaultItemCount, } from '@/lib/db/vaults';
import { getGoalRingProgress } from '@/features/goals/utils/ringProgress';
import { useProjectStore } from '@/features/projects/store';
import { useThemeColors } from '@/store/uiStore';

function GoalDetailLoadingState() {
  const colors = useThemeColors();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background.page }}>
      <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 }}>
        <View style={{ height: 14, width: 72, borderRadius: 999, backgroundColor: colors.background.subtle }} />
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}>
        {/* Hero skeleton */}
        <View
          style={{
            backgroundColor: colors.background.card,
            borderRadius: 16,
            borderLeftWidth: 4,
            borderLeftColor: colors.border.divider,
            padding: 20,
            marginBottom: 12,
          }}
        >
          <View style={{ flexDirection: 'row', gap: 6, marginBottom: 14 }}>
            <View style={{ height: 22, width: 64, borderRadius: 6, backgroundColor: colors.background.subtle }} />
            <View style={{ height: 22, width: 52, borderRadius: 6, backgroundColor: colors.background.subtle }} />
          </View>
          <View style={{ height: 28, width: '78%', borderRadius: 8, backgroundColor: colors.background.subtle, marginBottom: 10 }} />
          <View style={{ height: 14, borderRadius: 999, backgroundColor: colors.background.subtle, marginBottom: 6 }} />
          <View style={{ height: 14, width: '66%', borderRadius: 999, backgroundColor: colors.background.subtle, marginBottom: 20 }} />
          <View style={{ height: 1, backgroundColor: colors.border.divider, marginBottom: 16 }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ height: 48, width: 120, borderRadius: 8, backgroundColor: colors.background.subtle }} />
            <View style={{ height: 72, width: 72, borderRadius: 36, backgroundColor: colors.background.subtle }} />
          </View>
        </View>
        {/* Section skeletons */}
        {[0, 1].map((i) => (
          <View
            key={i}
            style={{
              backgroundColor: colors.background.card,
              borderRadius: 16,
              padding: 20,
              marginBottom: 12,
            }}
          >
            <View style={{ height: 10, width: 80, borderRadius: 999, backgroundColor: colors.background.subtle, marginBottom: 14 }} />
            <View style={{ height: 14, borderRadius: 999, backgroundColor: colors.background.subtle, marginBottom: 8 }} />
            <View style={{ height: 14, width: '75%', borderRadius: 999, backgroundColor: colors.background.subtle }} />
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function GoalNotFound() {
  const colors = useThemeColors();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background.page }}>
      <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
        <Pressable onPress={() => router.back()}>
          <Typography variant="nav-back">← Journey</Typography>
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

const HEADER_ACTION_STYLE = {
  borderRadius: 14,
  borderWidth: 1,
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  gap: 10,
  minWidth: 132,
  paddingHorizontal: 14,
  paddingVertical: 9,
};

export default function GoalDetailScreen() {
  const colors = useThemeColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const goalId = Array.isArray(id) ? id[0] : (id ?? '');
  const [vaultItemCount, setVaultItemCount] = useState(0);
  const [isProjectPickerVisible, setIsProjectPickerVisible] = useState(false);
  const [isSavingProject, setIsSavingProject] = useState(false);
  const [projectMoveError, setProjectMoveError] = useState<string | null>(null);
  const projects = useProjectStore((state) => state.projects);
  const projectsLoading = useProjectStore((state) => state.isLoading);
  const loadProjects = useProjectStore((state) => state.loadProjects);
  const {
    goal,
    isLoading,
    onSaveTracker,
    onDeleteTracker,
    onAddTracker,
    onCompleteTracker,
    onSaveMilestone,
    onDeleteMilestone,
    onAddMilestone,
    onCompleteMilestone,
    onUpdateDeadline,
    onUpdateProject,
    onUpdateDescription,
    onCompleteGoal,
    onArchiveGoal,
    completedTrackerIds,
    completingMilestoneIds,
    trackerError,
    milestoneError,
    goalError,
    clearTrackerError,
    clearMilestoneError,
    clearGoalError,
  } = useGoalDetail(goalId);
  const { items, loading: activityLoading, error: activityError } = useActivity(goalId);
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const mainScrollRef = useRef<ScrollView | null>(null);
  const [recommendedOffset, setRecommendedOffset] = useState(0);

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

  const openProjectPicker = () => {
    if (goal?.has_successor) return;
    setProjectMoveError(null);
    setIsProjectPickerVisible(true);
    void loadProjects();
  };

  const handleSaveProject = async (projectId: string | null) => {
    setIsSavingProject(true);
    setProjectMoveError(null);
    const saved = await onUpdateProject(projectId);
    setIsSavingProject(false);

    if (!saved) {
      setProjectMoveError('Could not move this goal. Please try again.');
      return;
    }

    setIsProjectPickerVisible(false);
  };

  if (isLoading) return <GoalDetailLoadingState />;
  if (!goal) return <GoalNotFound />;

  const isSuperseded = goal.has_successor === true;
  const isMomentum = !isSuperseded && goal.previous_goal_id != null;
  const successorGoalId = goal.successor?.id ?? null;
  const successorReflection = goal.successor?.reflection?.trim() ?? '';
  const deadlineProgress = getGoalRingProgress(goal);
  const ended = deadlineProgress !== null && deadlineProgress >= 100;
  const completed = goal.status === 'complete';
  const archived = goal.status === 'archived';
  const mutationsDisabled = ended || completed;

  const mainWorkspace = (
    <>
      <GoalDetailHeader
        goal={goal}
        isMomentum={isMomentum}
        isSuperseded={isSuperseded}
        successorGoalId={successorGoalId}
        deadlineProgress={deadlineProgress}
        ended={ended}
        onArchive={onArchiveGoal}
        onComplete={onCompleteGoal}
        onOpenProjectPicker={openProjectPicker}
        onUpdateDescription={onUpdateDescription}
      />

      <CountdownTimer
        createdAt={goal.createdAt}
        deadline={goal.deadline}
        disabled={isSuperseded || archived || completed}
        onUpdateDeadline={onUpdateDeadline}
      />

      {goalError ? (
        <View
          style={{
            alignItems: 'center',
            backgroundColor: colors.feedback.danger.bg,
            borderColor: colors.feedback.danger.border,
            borderRadius: 10,
            borderWidth: 1,
            flexDirection: 'row',
            gap: 12,
            justifyContent: 'space-between',
            marginBottom: 16,
            paddingHorizontal: 14,
            paddingVertical: 10,
          }}
        >
          <Typography variant="hint" style={{ color: colors.feedback.danger.text, flex: 1 }}>
            {goalError}
          </Typography>
          <Pressable onPress={clearGoalError}>
            <Typography variant="emphasis-sm" style={{ color: colors.feedback.danger.text, fontSize: 12 }}>
              Dismiss
            </Typography>
          </Pressable>
        </View>
      ) : null}

      {isSuperseded && successorGoalId && (
        <Pressable
          onPress={() => router.push(`/(app)/goals/${successorGoalId}` as never)}
          style={{
            alignItems: 'center',
            backgroundColor: colors.background.selectedRow,
            borderColor: colors.border.accent,
            borderRadius: 12,
            borderWidth: 1,
            marginBottom: 12,
            paddingHorizontal: 16,
            paddingVertical: 13,
          }}
        >
          <Typography variant="emphasis-sm" style={{ color: colors.text.accent }}>
            Continued in the next phase →
          </Typography>
        </Pressable>
      )}

      <View style={{ marginBottom: 16 }}>
        <MilestonesPanel
          milestones={goal.milestones}
          hasSuccessor={goal.has_successor}
          ended={mutationsDisabled}
          archived={archived}
          completingIds={completingMilestoneIds}
          onSave={onSaveMilestone}
          onDelete={onDeleteMilestone}
          onAdd={onAddMilestone}
          onComplete={onCompleteMilestone}
          error={milestoneError}
          onDismissError={clearMilestoneError}
        />
      </View>

      <View style={{ marginBottom: 16 }}>
        <TrackersPanel
          trackers={goal.trackers}
          hasSuccessor={goal.has_successor}
          ended={mutationsDisabled}
          archived={archived}
          accentColor={colors.accent.primary}
          progressColor={isSuperseded ? colors.text.muted : undefined}
          onSave={onSaveTracker}
          onDelete={onDeleteTracker}
          onAdd={onAddTracker}
          onLogComplete={onCompleteTracker}
          completedIds={completedTrackerIds}
          error={trackerError}
          onDismissError={clearTrackerError}
        />
      </View>

      {isMomentum && (
        <WhatYouBuiltPanel
          previousGoalId={goal.previous_goal_id!}
          summary={goal.prior_phase_summary}
          trackers={goal.trackers}
          reflection={goal.reflection}
          reflectedAt={goal.reflected_at}
        />
      )}

      {isSuperseded && successorReflection && (
        <SuccessorReflectionPanel
          reflection={successorReflection}
          reflectedAt={goal.successor?.reflectedAt ?? null}
        />
      )}

      <View style={{ marginBottom: 16 }}>
        <IntelligencePanel
          goalCategory={goal.category}
          goalId={goal.id}
          onSeeWhatHelps={() => {
            mainScrollRef.current?.scrollTo({ animated: true, y: Math.max(0, recommendedOffset - 20) });
          }}
          state="stub"
        />
      </View>

      <View style={{ marginBottom: 16 }}>
        <AnalyticsPanel source={{ state: 'stub' }} />
      </View>

      <View
        onLayout={(event) => setRecommendedOffset(event.nativeEvent.layout.y)}
        style={{ marginBottom: 16 }}
      >
        <RecommendedPanel />
      </View>

      {!isDesktop && (
        <>
          {/* Mobile keeps goal context in the single-column reading flow. */}
          <Pressable
            onPress={() => router.push(`/(app)/goals/${goalId}/vault` as never)}
            style={[SUMMARY_CARD_STYLE, { backgroundColor: colors.background.card }]}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Typography variant="meta" style={{ fontSize: 20, color: colors.text.accent }}>◫</Typography>
              <View>
                <Typography variant="emphasis-sm" style={{ color: colors.text.primary }}>
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

          <Pressable
            onPress={() => router.push(`/(app)/echo?goalId=${goalId}` as never)}
            style={[SUMMARY_CARD_STYLE, { backgroundColor: colors.background.card }]}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Typography variant="meta" style={{ fontSize: 20, color: colors.text.accent }}>✦</Typography>
              <View>
                <Typography variant="emphasis-sm" style={{ color: colors.text.primary }}>
                  Entries
                </Typography>
                <Typography variant="caption">
                  Add an entry about this goal
                </Typography>
              </View>
            </View>
            <Typography variant="caption" style={{ fontSize: 18 }}>›</Typography>
          </Pressable>

          <ActivityFeed items={items} loading={activityLoading} error={activityError} />
        </>
      )}
    </>
  );

  const contextRail = (
    <>
      {isDesktop && (
        <ActivityFeed items={items} loading={activityLoading} error={activityError} />
      )}
      {/* Phase 2: AI Insight slot */}
      {/* Phase 2: Community Context slot */}
    </>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background.page }}>
      <AppHeader
        backLabel="Journey"
        onBack={() => router.back()}
        title={<GoalTitleRow
          title={goal.title}
          variant="nav-title"
          numberOfLines={1}
          iconSize={16}
          style={{ alignItems: 'center' }}
          iconStyle={{ marginTop: 0 }}
        />}
        actions={isDesktop ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginLeft: 20 }}>
            <Pressable
              onPress={() => router.push(`/(app)/goals/${goalId}/vault` as never)}
              style={[
                HEADER_ACTION_STYLE,
                { backgroundColor: colors.background.card, borderColor: colors.border.divider },
              ]}
            >
              <Typography variant="meta" style={{ fontSize: 17, color: colors.text.accent }}>◫</Typography>
              <View>
                <Typography variant="emphasis-sm" style={{ color: colors.text.primary }}>
                  Vault
                </Typography>
                <Typography variant="caption">
                  {vaultItemCount === 0
                    ? 'No items yet'
                    : `${vaultItemCount} item${vaultItemCount !== 1 ? 's' : ''}`}
                </Typography>
              </View>
            </Pressable>
            <Pressable
              onPress={() => router.push(`/(app)/echo?goalId=${goalId}` as never)}
              style={[
                HEADER_ACTION_STYLE,
                { backgroundColor: colors.background.card, borderColor: colors.border.divider },
              ]}
            >
              <Typography variant="meta" style={{ fontSize: 17, color: colors.text.accent }}>✦</Typography>
              <View>
                <Typography variant="emphasis-sm" style={{ color: colors.text.primary }}>
                  Entries
                </Typography>
                <Typography variant="caption">Add entry</Typography>
              </View>
            </Pressable>
          </View>
        ) : undefined}
      />

      {isDesktop ? (
        /* Desktop: main workspace (flex-2) + context rail (flex-1) */
        <View style={{ flex: 1, flexDirection: 'row', paddingHorizontal: 20, gap: 16 }}>
          <ScrollView
            ref={mainScrollRef}
            style={{ flex: 2, minWidth: 0 }}
            contentContainerStyle={{ paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
          >
            {mainWorkspace}
          </ScrollView>
          <ScrollView
            style={{ flex: 1, minWidth: 0 }}
            contentContainerStyle={{ paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
          >
            {contextRail}
          </ScrollView>
        </View>
      ) : (
        /* Mobile: single column */
        <ScrollView
          ref={mainScrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          {mainWorkspace}
          {contextRail}
        </ScrollView>
      )}

      <GoalProjectPickerModal
        currentProjectId={goal.projectId}
        error={projectMoveError}
        isLoading={projectsLoading}
        isSaving={isSavingProject}
        onClose={() => {
          if (isSavingProject) return;
          setProjectMoveError(null);
          setIsProjectPickerVisible(false);
        }}
        onSave={handleSaveProject}
        projects={projects}
        visible={isProjectPickerVisible}
      />
    </SafeAreaView>
  );
}
