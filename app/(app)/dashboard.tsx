import { useWorkspaceDimensions, useWorkspaceTheme } from '@/components/layout/WorkspaceContext';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { BrandIcon } from '@/components/ui/BrandIcon';
import { Card } from '@/components/ui/Card';
import { Toast } from '@/components/ui/Toast';
import { Typography } from '@/components/ui/Typography';
import { AuthenticatedPageShell } from '@/components/layout/AuthenticatedPageShell';
import { HomeCalendarPreview } from '@/features/calendar/components/HomeCalendarPreview';
import { deviceTimezone, rangeForView, todayYmd } from '@/features/calendar/domain';
import { useCalendarItems } from '@/features/calendar/hooks/useCalendarItems';
import { useGoals } from '@/features/goals/hooks/useGoals';
import { useSession } from '@/features/auth/hooks/useSession';
import { useProjectStore } from '@/features/projects/store';
import { useMomentumHomeSummary } from '@/features/momentum/hooks/useMomentumHomeSummary';
import { HomeMomentumSnapshot } from '@/features/momentum/components/HomeMomentumSnapshot';
import { ProjectGoalRow } from '@/features/goals/components/ProjectGoalRow';
import { NextStepPanel } from '@/features/goals/components/home/NextStepPanel';
import { HomeEchoEntryPoints } from '@/features/goals/components/home/HomeEchoEntryPoints';
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
}: {
  displayName: string | null;
}) {
  const colors = useThemeColors();
  const { width } = useWorkspaceDimensions();
  const name = displayName ?? 'there';
  const greetingName = name.replace(/[._-]+/g, ' ').replace(/\s+/g, ' ').trim().split(' ')[0];
  const now = new Date();
  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <View style={{ gap: SPACE.sm, paddingVertical: SPACE.sm }}>
      <Typography variant="eyebrow" style={{ color: colors.text.muted }}>
        {new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).format(now)}
      </Typography>
      <Typography
        accessibilityRole="header"
        variant="greeting"
        style={{ fontSize: width < 620 ? 32 : 40, letterSpacing: -1, lineHeight: width < 620 ? 42 : 50 }}
      >
        {greeting}, {greetingName}.
      </Typography>
      <Typography variant="body" style={{ color: colors.text.secondary }}>
        Your plans, progress, and a little room to reflect.
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
  const { width } = useWorkspaceDimensions();
  const workspace = useWorkspaceTheme();
  const routeParams = useLocalSearchParams<{
    draftSaved?: string | string[];
    goalFilter?: string | string[];
  }>();
  const { goals, isLoading: goalsLoading, error: goalsError } = useGoals();
  const { session } = useSession();
  const momentum = useMomentumHomeSummary();
  const { projects, loadProjects } = useProjectStore();
  // Goal-derived Home signals in one round-trip (Stage 2 aggregator), SWR-cached
  // so return-navigation is instant. No longer waterfalled behind the client
  // goal load — the server resolves the caller's active goals itself.
  const { reflectionTimestamps } = useHomeSummary();
  const today = todayYmd();
  // Keep day selection when the responsive card layout changes parentage.
  const [selectedDate, setSelectedDate] = useState(today);
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
  const desktop = width >= 980;
  const momentumCard = <HomeMomentumSnapshot error={momentum.error} goals={activeGoals} isLoading={momentum.isLoading} summary={momentum.summary} onRetry={momentum.refresh} />;
  const nextStepsCard = <NextStepPanel fillHeight={!!workspace && desktop} goals={todayGoals} isLoading={goalsLoading} error={goalsError} />;
  const calendarCard = <HomeCalendarPreview fillHeight={!!workspace && desktop} accessState={homeCalendar.accessState} items={homeCalendar.items} isLoading={homeCalendar.isLoading} error={homeCalendar.error} onRetry={homeCalendar.refresh} selectedDate={selectedDate} onSelectDate={setSelectedDate} />;

  return (
    <>
      <AuthenticatedPageShell>
        <View style={{ alignSelf: 'center', maxWidth: 1280, minWidth: 0, width: '100%' }}>
          <View style={{ marginBottom: SPACE['3xl'] }}>
            <DashboardGreeting displayName={displayName} />
          </View>

          {desktop ? <View style={{ alignItems: 'stretch', flexDirection: 'row', gap: SPACE['3xl'] }}>
            <View style={{ flexBasis: '34%', gap: SPACE['3xl'], maxWidth: 430, minWidth: 320 }}>
              {momentumCard}
              {nextStepsCard}
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>{calendarCard}</View>
          </View> : <View style={{ gap: SPACE['3xl'] }}>
            {calendarCard}
            {nextStepsCard}
            {momentumCard}
          </View>}
          <View style={{ marginTop: SPACE['3xl'] }}>
            <HomeEchoEntryPoints />
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
