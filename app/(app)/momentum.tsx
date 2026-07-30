import { useMemo, useState } from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  View,
  useWindowDimensions,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams } from 'expo-router';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { Typography } from '@/components/ui/Typography';
import {
  GoalEchoAnalysisCard,
  getGoalEchoAnalysisPreview,
} from '@/features/goals/components/GoalEchoAnalysisCard';
import { useGoals } from '@/features/goals/hooks/useGoals';
import {
  MomentumTrendChart,
  type MomentumTrendPoint,
} from '@/features/momentum/components/MomentumTrendChart';
import { useThemeColors } from '@/store/uiStore';

type TimeRange = '7D' | '30D' | '3M' | '1Y';
type GoalFilter = 'All goals' | 'Building' | 'Steady' | 'Needs attention';
type ActivityFilter = 'All' | 'Progress' | 'Entries' | 'Changes';

const SAMPLE_TRENDS: Record<TimeRange, readonly MomentumTrendPoint[]> = {
  '7D': [18, 30, 25, 46, 41, 65, 75],
  '30D': [22, 28, 37, 34, 51, 61, 68],
  '3M': [26, 33, 41, 48, 44, 59, 72],
  '1Y': [20, 31, 29, 43, 54, 63, 76],
};

const SAMPLE_TREND_LABELS: Record<TimeRange, readonly string[]> = {
  '7D': ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  '30D': ['Jul 1', 'Jul 6', 'Jul 11', 'Jul 16', 'Jul 21', 'Jul 26', 'Jul 30'],
  '3M': ['May 1', 'May 15', 'Jun 1', 'Jun 15', 'Jul 1', 'Jul 15', 'Jul 30'],
  '1Y': ['Aug', 'Oct', 'Dec', 'Feb', 'Apr', 'Jun', 'Jul'],
};

const DRIVERS = [
  { icon: 'trending-up-outline' as const, label: 'Consistency', state: 'Improving' },
  { icon: 'remove-outline' as const, label: 'Milestone progress', state: 'Steady' },
  { icon: 'trending-up-outline' as const, label: 'Reflection rhythm', state: 'Improving' },
  { icon: 'trending-down-outline' as const, label: 'Recent activity', state: 'Slowing' },
];

const PATTERNS = [
  'Your consistency may be strongest earlier in the week.',
  'Reflection may often follow milestone progress.',
  'A smaller weekly target may help restore momentum when routines change.',
];

function PreviewBadge() {
  const colors = useThemeColors();
  return (
    <View
      style={{
        backgroundColor: colors.background.input,
        borderRadius: 999,
        paddingHorizontal: 9,
        paddingVertical: 4,
      }}
    >
      <Typography variant="badge-text" style={{ color: colors.text.accent }}>
        Preview
      </Typography>
    </View>
  );
}

function SectionHeading({
  title,
  preview = false,
  copy,
}: {
  title: string;
  preview?: boolean;
  copy?: string;
}) {
  const colors = useThemeColors();
  return (
    <View style={{ gap: 7, marginBottom: 14 }}>
      <View style={{ alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <Typography accessibilityRole="header" variant="heading" style={{ fontSize: 20 }}>
          {title}
        </Typography>
        {preview ? <PreviewBadge /> : null}
      </View>
      {copy ? (
        <Typography variant="caption" style={{ color: colors.text.secondary, lineHeight: 19 }}>
          {copy}
        </Typography>
      ) : null}
    </View>
  );
}

function FilterPill({
  active,
  label,
  onPress,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  const colors = useThemeColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: active ? colors.background.selectedRow : colors.background.card,
        borderColor: active ? colors.border.accent : colors.border.warm,
        borderRadius: 999,
        borderWidth: 1,
        opacity: pressed ? 0.6 : 1,
        paddingHorizontal: 12,
        paddingVertical: 7,
      })}
    >
      <Typography variant="label" style={{ color: active ? colors.text.accent : colors.text.secondary }}>
        {label}
      </Typography>
    </Pressable>
  );
}

export default function MomentumScreen() {
  const colors = useThemeColors();
  const { width } = useWindowDimensions();
  const params = useLocalSearchParams<{ goalId?: string | string[] }>();
  const requestedGoalId = Array.isArray(params.goalId) ? params.goalId[0] : params.goalId;
  const { goals, isLoading } = useGoals();
  const [range, setRange] = useState<TimeRange>('7D');
  const [goalFilter, setGoalFilter] = useState<GoalFilter>('All goals');
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>('All');
  const [infoOpen, setInfoOpen] = useState(false);
  const horizontalPadding = width >= 1600 ? 56 : width >= 1024 ? 36 : width >= 720 ? 28 : 20;
  const twoColumn = width >= 1000;

  const activeGoals = useMemo(
    () => goals.filter((goal) => goal.status === 'active'),
    [goals],
  );
  const visibleGoals = useMemo(
    () => activeGoals.filter((goal) => {
      if (goalFilter === 'All goals') return true;
      const status = getGoalEchoAnalysisPreview(goal.category).status;
      if (goalFilter === 'Needs attention') return status === 'Developing';
      return status === goalFilter;
    }),
    [activeGoals, goalFilter],
  );

  return (
    <SafeAreaView style={{ backgroundColor: colors.background.page, flex: 1 }}>
      <ScrollView
        contentContainerStyle={{
          paddingBottom: 64,
          paddingHorizontal: horizontalPadding,
          paddingTop: width < 720 ? 20 : 32,
        }}
      >
        <View style={{ alignSelf: 'center', maxWidth: 1560, width: '100%' }}>
          <View style={{ marginBottom: 28 }}>
            <View style={{ alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              <Typography accessibilityRole="header" variant="greeting">
                Momentum
              </Typography>
              <PreviewBadge />
            </View>
            <Typography
              variant="body"
              style={{ color: colors.text.secondary, lineHeight: 23, marginTop: 8, maxWidth: 720 }}
            >
              Understand what is moving forward, what is changing, and where your attention may help.
            </Typography>
          </View>

          <View style={{ gap: 32 }}>
            <View>
              <SectionHeading title="Ohara Momentum overview" />
              <Card padding="spacious" elevated>
                <View
                  style={{
                    alignItems: width < 720 ? 'flex-start' : 'center',
                    flexDirection: width < 720 ? 'column' : 'row',
                    gap: 12,
                    justifyContent: 'space-between',
                  }}
                >
                  <View style={{ gap: 8 }}>
                    <View style={{ alignItems: 'center', flexDirection: 'row', gap: 8 }}>
                      <Typography variant="eyebrow" style={{ color: colors.text.accent }}>
                        Ohara Momentum
                      </Typography>
                      <PreviewBadge />
                    </View>
                    <View style={{ alignItems: 'baseline', flexDirection: 'row', gap: 10 }}>
                      <Typography variant="heading">Building</Typography>
                      <Typography variant="label" style={{ color: colors.text.accent }}>
                        +8% this week
                      </Typography>
                    </View>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setInfoOpen(true)}
                    style={({ pressed }) => ({
                      alignItems: 'center',
                      flexDirection: 'row',
                      gap: 6,
                      opacity: pressed ? 0.55 : 1,
                      paddingVertical: 5,
                    })}
                  >
                    <Ionicons color={colors.text.accent} name="information-circle-outline" size={17} />
                    <Typography variant="emphasis-sm" style={{ color: colors.text.accent }}>
                      How Momentum works
                    </Typography>
                  </Pressable>
                </View>

                <View style={{ marginTop: 18 }}>
                  <MomentumTrendChart
                    height={width < 720 ? 250 : 330}
                    points={SAMPLE_TRENDS[range]}
                    showAxes
                    xLabels={SAMPLE_TREND_LABELS[range]}
                  />
                </View>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                  {(Object.keys(SAMPLE_TRENDS) as TimeRange[]).map((item) => (
                    <FilterPill
                      active={range === item}
                      key={item}
                      label={item}
                      onPress={() => setRange(item)}
                    />
                  ))}
                </View>
                <View
                  style={{
                    backgroundColor: colors.background.subtle,
                    borderRadius: 12,
                    marginTop: 18,
                    padding: 14,
                  }}
                >
                  <Typography variant="caption" style={{ color: colors.text.secondary, lineHeight: 19 }}>
                    Preview explanation: future Echo signals may help explain whether consistency,
                    milestone movement, reflection, and recent activity are shaping this trend.
                  </Typography>
                </View>
              </Card>
            </View>

            <View>
              <SectionHeading
                copy="Examples of future inputs. These directional states are sample UI, not user analysis."
                preview
                title="Momentum drivers"
              />
              <View
                style={{
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  gap: 12,
                }}
              >
                {DRIVERS.map((driver) => (
                  <Card
                    key={driver.label}
                    padding="compact"
                    style={{
                      flexBasis: width >= 1180 ? '23%' : width >= 640 ? '47%' : '100%',
                      flexGrow: 1,
                    }}
                  >
                    <View style={{ alignItems: 'center', flexDirection: 'row', gap: 10 }}>
                      <View
                        style={{
                          alignItems: 'center',
                          backgroundColor: colors.background.selectedRow,
                          borderRadius: 9,
                          height: 34,
                          justifyContent: 'center',
                          width: 34,
                        }}
                      >
                        <Ionicons color={colors.text.accent} name={driver.icon} size={18} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Typography variant="label">{driver.label}</Typography>
                        <Typography variant="caption" style={{ color: colors.text.accent, marginTop: 2 }}>
                          {driver.state}
                        </Typography>
                      </View>
                    </View>
                  </Card>
                ))}
              </View>
            </View>

            <View>
              <SectionHeading
                copy="Category-specific sample metrics for your active goals. Values remain preview-only."
                preview
                title="Goal Momentum"
              />
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
                {(['All goals', 'Building', 'Steady', 'Needs attention'] as GoalFilter[]).map((filter) => (
                  <FilterPill
                    active={goalFilter === filter}
                    key={filter}
                    label={filter}
                    onPress={() => setGoalFilter(filter)}
                  />
                ))}
              </View>
              {isLoading ? (
                <Typography variant="hint">Loading active goals…</Typography>
              ) : visibleGoals.length ? (
                <View style={{ gap: 12 }}>
                  {visibleGoals.map((goal) => (
                    <View key={goal.id}>
                      <GoalEchoAnalysisCard
                        category={goal.category}
                        goalId={goal.id}
                        goalTitle={goal.title}
                        highlighted={requestedGoalId === goal.id}
                        navigationAction="goal"
                        presentation="row"
                      />
                    </View>
                  ))}
                </View>
              ) : (
                <Card padding="compact">
                  <Typography variant="hint">
                    {activeGoals.length
                      ? 'No active goals match this preview filter.'
                      : 'Active goals will appear here with a clearly labeled preview metric.'}
                  </Typography>
                </Card>
              )}
            </View>

            <View style={{ flexDirection: twoColumn ? 'row' : 'column', gap: 16 }}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <SectionHeading title="Activity" />
                <Card>
                  <View style={{ alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {(['All', 'Progress', 'Entries', 'Changes'] as ActivityFilter[]).map((filter) => (
                      <FilterPill
                        active={activityFilter === filter}
                        key={filter}
                        label={filter}
                        onPress={() => setActivityFilter(filter)}
                      />
                    ))}
                  </View>
                  <View style={{ marginTop: 22 }}>
                    <Typography variant="title">Activity will appear here</Typography>
                    <Typography
                      variant="caption"
                      style={{ color: colors.text.secondary, lineHeight: 19, marginTop: 6 }}
                    >
                      A complete cross-goal activity stream is not available yet. No sample events are
                      mixed with your real goal data.
                    </Typography>
                  </View>
                </Card>
              </View>

              <View style={{ flex: 1, minWidth: 0 }}>
                <SectionHeading preview title="Patterns from entries" />
                <Card>
                  <Typography variant="caption" style={{ color: colors.text.secondary, lineHeight: 19 }}>
                    Examples of future pattern recognition—not observations derived from your account.
                  </Typography>
                  <View style={{ gap: 12, marginTop: 16 }}>
                    {PATTERNS.map((pattern) => (
                      <View key={pattern} style={{ alignItems: 'flex-start', flexDirection: 'row', gap: 9 }}>
                        <Ionicons color={colors.text.accent} name="sparkles-outline" size={15} />
                        <Typography variant="caption" style={{ color: colors.text.primary, flex: 1, lineHeight: 19 }}>
                          {pattern}
                        </Typography>
                      </View>
                    ))}
                  </View>
                </Card>
              </View>
            </View>

            <View>
              <SectionHeading preview title="Suggested next step" />
              <Card padding="compact" style={{ backgroundColor: colors.background.subtle }}>
                <Typography variant="title">A useful next step</Typography>
                <Typography
                  variant="caption"
                  style={{ color: colors.text.secondary, lineHeight: 19, marginTop: 6 }}
                >
                  Choose one scheduled action to complete today, or adjust its timing if your week has changed.
                  This is sample guidance, not a personalized recommendation.
                </Typography>
              </Card>
            </View>

            <View style={{ alignItems: 'flex-start', gap: 8 }}>
              <Typography accessibilityRole="header" variant="heading" style={{ fontSize: 18 }}>
                How Momentum works
              </Typography>
              <Typography variant="caption" style={{ color: colors.text.secondary, lineHeight: 19, maxWidth: 760 }}>
                Momentum is intended as supportive guidance across active goals—not a judgment, grade, or comparison.
              </Typography>
              <Pressable
                accessibilityRole="button"
                onPress={() => setInfoOpen(true)}
                style={({ pressed }) => ({ opacity: pressed ? 0.55 : 1, paddingVertical: 5 })}
              >
                <Typography variant="emphasis-sm" style={{ color: colors.text.accent }}>
                  Read how Momentum works →
                </Typography>
              </Pressable>
            </View>
          </View>
        </View>
      </ScrollView>

      <Modal
        closeOnBackdropPress
        contentStyle={{ maxWidth: 620 }}
        onClose={() => setInfoOpen(false)}
        visible={infoOpen}
      >
        <Typography accessibilityRole="header" variant="heading">
          How Momentum works
        </Typography>
        <View style={{ gap: 11, marginTop: 16 }}>
          {[
            'Ohara Momentum reflects movement across active goals.',
            'Goal Momentum uses a preview metric appropriate to each goal category.',
            'Future signals may include consistency, milestones, recent activity, reflection, and recovery after interruptions.',
            'Recent activity may eventually carry more weight than older activity.',
            'Pausing, rescoping, or adjusting a goal should not automatically be treated as failure.',
            'Momentum is guidance, not a judgment or grade.',
            'This page contains preview data while the algorithm is being developed.',
          ].map((item) => (
            <View key={item} style={{ alignItems: 'flex-start', flexDirection: 'row', gap: 9 }}>
              <View
                style={{
                  backgroundColor: colors.accent.primary,
                  borderRadius: 4,
                  height: 7,
                  marginTop: 6,
                  width: 7,
                }}
              />
              <Typography variant="caption" style={{ color: colors.text.secondary, flex: 1, lineHeight: 19 }}>
                {item}
              </Typography>
            </View>
          ))}
        </View>
      </Modal>
    </SafeAreaView>
  );
}
