import { useEffect, useMemo, useState } from 'react';
import { Pressable, Text, View, useWindowDimensions } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { BrandIcon } from '@/components/ui/BrandIcon';
import { Card } from '@/components/ui/Card';
import { Toast } from '@/components/ui/Toast';
import { Typography } from '@/components/ui/Typography';
import { AuthenticatedPageShell } from '@/components/layout/AuthenticatedPageShell';
import { HomeCalendarPreview } from '@/features/calendar/components/HomeCalendarPreview';
import { deviceTimezone, filterHomeCalendarItems, rangeForView, todayYmd } from '@/features/calendar/domain';
import { useCalendarItems } from '@/features/calendar/hooks/useCalendarItems';
import { useGoals } from '@/features/goals/hooks/useGoals';
import { useSession } from '@/features/auth/hooks/useSession';
import { useProjectStore } from '@/features/projects/store';
import { useMomentumHomeSummary } from '@/features/momentum/hooks/useMomentumHomeSummary';
import { ProjectGoalRow } from '@/features/goals/components/ProjectGoalRow';
import { TodayFocus } from '@/features/goals/components/home/TodayFocus';
import {
  orderActiveGoals,
  resolveActiveGoalProjectTitles,
  selectActiveGoals,
} from '@/features/goals/active-goal-selectors';
import { useHomeSummary } from '@/features/goals/hooks/useHomeSummary';
import {
  DASHBOARD_DRAFT_SAVED_PARAM,
  DASHBOARD_GOAL_FILTER_PARAM,
} from '@/lib/navigation/dashboard';
import { useThemeColors } from '@/store/uiStore';
import { RADIUS, SPACE } from '@/constants/design';

/* Home is the personal execution surface. Social/feed work lives in /circles. */

// --- Helpers ---

function displayNameFromEmail(email: string | undefined): string | null {
  if (!email) return null;
  const local = email.split('@')[0];
  if (!local) return null;
  return local.charAt(0).toUpperCase() + local.slice(1);
}

function displayNameFromMetadata(metadata: Record<string, unknown> | undefined): string | null {
  if (!metadata) return null;
  const value = metadata.display_name ?? metadata.full_name ?? metadata.name ?? metadata.username;
  if (typeof value !== 'string' || !value.trim()) return null;
  return value
    .trim()
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function DashboardGreeting({
  displayName,
  momentumLoading,
  weeklyStreak,
}: {
  displayName: string | null;
  momentumLoading: boolean;
  weeklyStreak: number | null;
}) {
  const colors = useThemeColors();
  const name = displayName ?? 'there';
  const greetingName = name.replace(/[._-]+/g, ' ').replace(/\s+/g, ' ').trim().split(' ')[0];

  return (
    <View style={{ justifyContent: 'center', minHeight: 116 }}>
      <Typography
        variant="body"
        style={{ color: colors.text.secondary, fontSize: 18, lineHeight: 26 }}
      >
        Welcome back,
      </Typography>
      <Typography
        variant="greeting"
        style={{ fontSize: 46, letterSpacing: -1.5, lineHeight: 54 }}
      >
        {greetingName}.
      </Typography>
      <Typography
        variant="body"
        style={{ color: colors.text.secondary, fontSize: 16, lineHeight: 24, marginTop: SPACE.xs }}
      >
        {momentumLoading ? (
          'Your weekly rhythm is loading…'
        ) : weeklyStreak && weeklyStreak > 0 ? (
          <>
            You&apos;ve shown up for{' '}
            <Text style={{ color: colors.text.accent, fontWeight: '500' }}>{weeklyStreak}</Text>
            {' '}{weeklyStreak === 1 ? 'consecutive week' : 'consecutive weeks'}.
          </>
        ) : (
          'This week is ready for your next meaningful step.'
        )}
      </Typography>
    </View>
  );
}

function DashboardCreateButton({
  label,
  onPress,
}: {
  label: 'New Project' | 'New Goal' | 'New Note' | 'New Reflection';
  onPress: () => void;
}) {
  const colors = useThemeColors();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => ({
        alignItems: 'center',
        backgroundColor: colors.background.selectedRow,
        borderColor: colors.border.subtle,
        borderRadius: RADIUS.round,
        borderWidth: 1,
        flexDirection: 'row',
        minHeight: 42,
        opacity: pressed ? 0.72 : 1,
        paddingHorizontal: SPACE.lg,
        paddingVertical: SPACE.sm,
      })}
    >
      <Typography
        variant="control"
        style={{ color: colors.text.accent }}
      >
        + {label}
      </Typography>
    </Pressable>
  );
}

function DraftsCard({ drafts }: { drafts: ReturnType<typeof useGoals>['goals'] }) {
  const colors = useThemeColors();
  return (
    <Card elevation="sm" padding="spacious">
      <View style={{ alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACE.xl }}>
        <View style={{ alignItems: 'center', flexDirection: 'row', gap: SPACE.sm }}>
          <BrandIcon name="goals" size={20} tintColor={colors.accent.primary} />
          <View>
            <Typography variant="eyebrow" style={{ color: colors.text.accent }}>Drafts</Typography>
            <Typography variant="title" style={{ fontSize: 20, marginTop: 4 }}>Ideas waiting for your return</Typography>
          </View>
        </View>
        <DashboardCreateButton label="New Goal" onPress={() => router.push('/goals/create')} />
      </View>
      {drafts.length > 0 ? (
        <View style={{ gap: SPACE.md }}>
          {drafts.map((goal) => <ProjectGoalRow goal={goal} key={goal.id} />)}
        </View>
      ) : (
        <Typography variant="hint">No drafts yet.</Typography>
      )}
      <Pressable
        accessibilityRole="button"
        onPress={() => router.replace('/dashboard')}
        style={({ pressed }) => ({ alignSelf: 'flex-start', marginTop: SPACE.lg, opacity: pressed ? 0.55 : 1 })}
      >
        <Typography variant="label" style={{ color: colors.text.accent }}>Close drafts</Typography>
      </Pressable>
    </Card>
  );
}

export default function DashboardScreen() {
  const { width } = useWindowDimensions();
  const routeParams = useLocalSearchParams<{
    draftSaved?: string | string[];
    goalFilter?: string | string[];
  }>();
  const { goals, isLoading: goalsLoading } = useGoals();
  const { session } = useSession();
  const momentum = useMomentumHomeSummary();
  const { projects, loadProjects } = useProjectStore();
  // Goal-derived Home signals in one round-trip (Stage 2 aggregator), SWR-cached
  // so return-navigation is instant. No longer waterfalled behind the client
  // goal load — the server resolves the caller's active goals itself.
  const { reflectionTimestamps, weeklyTaskCounts } = useHomeSummary();
  const today = todayYmd();
  // Home reads one bounded current-week projection for its Calendar canvas.
  // Social data and full month/year Calendar work stay off this route.
  const homeCalendar = useCalendarItems(rangeForView(today, 'week', deviceTimezone()));

  const draftsRequested = routeParams[DASHBOARD_GOAL_FILTER_PARAM] === 'drafts';
  const draftSaved = routeParams[DASHBOARD_DRAFT_SAVED_PARAM] === '1';
  const [draftToastVisible, setDraftToastVisible] = useState(draftSaved);

  useEffect(() => {
    if (!draftSaved) return;
    setDraftToastVisible(true);
    const timer = setTimeout(() => setDraftToastVisible(false), 4000);
    return () => clearTimeout(timer);
  }, [draftSaved]);

  useEffect(() => {
    loadProjects();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const draftGoals = useMemo(
    () => goals
      .filter((goal) => goal.status === 'draft')
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()),
    [goals],
  );
  const activeGoals = useMemo(() => selectActiveGoals(goals), [goals]);

  const todayGoals = useMemo(
    () => resolveActiveGoalProjectTitles(orderActiveGoals(activeGoals, reflectionTimestamps), projects),
    [activeGoals, projects, reflectionTimestamps],
  );

  const displayName = displayNameFromMetadata(session?.user.user_metadata)
    ?? displayNameFromEmail(session?.user.email);

  return (
    <>
      <AuthenticatedPageShell>
        <View style={{ alignSelf: 'center', maxWidth: 1280, minWidth: 0, width: '100%' }}>
          <View style={{ marginBottom: SPACE['3xl'] }}>
          <DashboardGreeting
            displayName={displayName}
            momentumLoading={momentum.isLoading}
            weeklyStreak={momentum.summary?.weeklyStreak ?? null}
          />
          </View>

          <View
            style={{
              alignItems: width >= 980 ? 'flex-start' : 'stretch',
              flexDirection: width >= 980 ? 'row' : 'column',
              gap: SPACE['3xl'],
            }}
          >
            <View style={{ flexBasis: width >= 980 ? '34%' : undefined, maxWidth: width >= 980 ? 430 : undefined, minWidth: width >= 980 ? 340 : 0 }}>
              <TodayFocus
                goals={todayGoals}
                weeklyTaskCounts={weeklyTaskCounts}
                isLoading={goalsLoading}
              />
            </View>
            <View style={{ flex: 1, minWidth: 0, width: width >= 980 ? undefined : '100%' }}>
              <HomeCalendarPreview accessState={homeCalendar.accessState} items={filterHomeCalendarItems(homeCalendar.items)} isLoading={homeCalendar.isLoading} />
            </View>
          </View>

          {draftsRequested ? <View style={{ marginTop: SPACE['3xl'] }}><DraftsCard drafts={draftGoals} /></View> : null}
        </View>
      </AuthenticatedPageShell>
      <Toast
        message="Saved as draft — pick it back up anytime"
        visible={draftToastVisible}
      />
    </>
  );
}
