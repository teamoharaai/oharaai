import { Pressable, View, useWindowDimensions } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Typography } from '@/components/ui/Typography';
import { getCategoryAccentTheme } from '@/constants/themes';
import { getGoalCreationTemplate } from '@/lib/goals/templates';
import { useGoalMomentumSummary } from '@/features/momentum/hooks/useMomentumHomeSummary';
import { MomentumTrendChart } from '@/features/momentum/components/MomentumTrendChart';
import { goalWorkspaceHref } from '../navigation';
import { useThemeColors, useUIStore } from '@/store/uiStore';
import type { GoalCategory, GoalCreationCategory } from '@/lib/goals/schema';

const CATEGORY_ALIASES: Partial<Record<string, string>> = {
  body: 'health', connect: 'relationships', contribute: 'growth',
  create: 'creative', mind: 'education', money: 'finance',
};

function statusLabel(status: string | undefined): string {
  if (!status) return 'Unavailable';
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export function GoalEchoAnalysisCard({
  category,
  embedded = false,
  goalId,
  goalTitle,
  navigationAction,
  highlighted = false,
  presentation = 'card',
}: {
  category: GoalCategory | null | undefined;
  embedded?: boolean;
  goalId?: string;
  goalTitle?: string;
  navigationAction?: 'goal' | 'momentum';
  highlighted?: boolean;
  presentation?: 'card' | 'row';
}) {
  const colors = useThemeColors();
  const { width } = useWindowDimensions();
  const darkMode = useUIStore((state) => state.themeMode) === 'dark';
  const momentum = useGoalMomentumSummary(goalId);
  const summary = momentum.goalSummary;
  const normalized = category?.trim().toLowerCase() ?? '';
  const accent = category ? getCategoryAccentTheme(category) : null;
  const accentColor = accent?.color ?? colors.text.accent;
  const resolvedCategory = (CATEGORY_ALIASES[normalized] ?? normalized) as GoalCreationCategory;
  const categoryTemplate = getGoalCreationTemplate(resolvedCategory);
  const categoryLabel = categoryTemplate?.label ?? 'Uncategorized';
  const categoryIcon = categoryTemplate?.icon ?? '○';
  const rowStacked = width < 900;
  const explanation = summary?.reasons[0]?.message
    ?? (momentum.isLoading
      ? 'Calculating from your goal’s authoritative activity…'
      : momentum.error ?? 'Momentum will appear when the V1.1 calculation is available.');
  const navigation = goalId && navigationAction ? (
    <Pressable
      accessibilityRole="link"
      onPress={() => navigationAction === 'goal'
        ? router.push(goalWorkspaceHref(goalId) as never)
        : router.push({ pathname: '/(app)/momentum' as never, params: { goalId } })}
      style={({ pressed }) => ({
        alignSelf: rowStacked ? 'flex-start' : 'center',
        minHeight: 44, justifyContent: 'center', opacity: pressed ? 0.55 : 1,
      })}
    >
      <Typography variant="emphasis-sm" style={{ color: colors.text.accent, fontSize: 12 }}>
        {navigationAction === 'goal' ? 'Open goal →' : 'See full Momentum →'}
      </Typography>
    </Pressable>
  ) : null;

  if (presentation === 'row') {
    return (
      <View
        accessibilityLabel={`Goal Momentum. ${statusLabel(summary?.status)}, ${summary?.displayedValue ?? 'unavailable'} percent.`}
        style={{
          backgroundColor: colors.background.card,
          borderColor: highlighted ? accentColor : colors.border.divider,
          borderRadius: 14, borderWidth: 1, padding: rowStacked ? 16 : 18,
        }}
      >
        <View style={{ alignItems: rowStacked ? 'stretch' : 'center', flexDirection: rowStacked ? 'column' : 'row', gap: rowStacked ? 16 : 22 }}>
          <View style={{ alignItems: 'center', flexDirection: 'row', gap: 12, width: rowStacked ? '100%' : '29%' }}>
            <View style={{ alignItems: 'center', backgroundColor: darkMode ? colors.background.input : accent?.tint ?? colors.background.input, borderRadius: 10, height: 38, justifyContent: 'center', width: 38 }}>
              <Typography variant="title" style={{ color: accentColor }}>{categoryIcon}</Typography>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Typography variant="title" style={{ color: colors.text.primary, lineHeight: 21 }}>{goalTitle}</Typography>
              <Typography variant="caption" style={{ color: accentColor, marginTop: 5 }}>{categoryLabel}</Typography>
            </View>
          </View>
          <View style={{ width: rowStacked ? '100%' : '16%' }}>
            <Typography variant="caption" style={{ color: colors.text.muted }}>Goal Momentum</Typography>
            <Typography variant="title" style={{ color: colors.text.primary, marginTop: 3 }}>{statusLabel(summary?.status)}</Typography>
            {summary ? <Typography variant="caption">This week · {summary.periodState}</Typography> : null}
          </View>
          <View style={{ width: rowStacked ? '100%' : '17%' }}>
            <Typography variant="heading" style={{ color: accentColor, fontSize: 24 }}>{summary?.displayedValue ?? '—'}%</Typography>
            <View style={{ backgroundColor: colors.background.input, borderRadius: 999, height: 6, marginTop: 8, overflow: 'hidden' }}>
              <View style={{ backgroundColor: accentColor, borderRadius: 999, height: '100%', width: `${summary?.displayedValue ?? 0}%` }} />
            </View>
          </View>
          <Typography variant="caption" style={{ color: colors.text.secondary, flex: rowStacked ? undefined : 1, lineHeight: 18 }}>{explanation}</Typography>
          <View style={{ minWidth: rowStacked ? 0 : 92 }}>{navigation}</View>
        </View>
      </View>
    );
  }

  return (
    <View
      accessibilityLabel={`Goal Momentum. ${statusLabel(summary?.status)}, ${summary?.displayedValue ?? 'unavailable'} percent.`}
      style={{ backgroundColor: embedded ? 'transparent' : colors.background.card, borderColor: embedded ? 'transparent' : highlighted ? accentColor : colors.border.divider, borderRadius: embedded ? 0 : 14, borderWidth: embedded ? 0 : 1, padding: embedded ? 0 : 16 }}
    >
      {goalTitle ? <Typography numberOfLines={2} variant="title" style={{ color: colors.text.primary, marginBottom: 12 }}>{goalTitle}</Typography> : null}
      <View style={{ alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' }}>
        <View style={{ alignItems: 'center', flexDirection: 'row', gap: 7 }}>
          <Ionicons color={accentColor} name="pulse-outline" size={16} />
          <Typography variant="eyebrow" style={{ color: accentColor }}>Goal Momentum</Typography>
        </View>
        <Typography variant="badge-text" style={{ color: accentColor }}>{summary?.algorithmVersion ?? 'V1.1 unavailable'}</Typography>
      </View>
      <View style={{ alignItems: 'flex-end', flexDirection: 'row', gap: 10, justifyContent: 'space-between', marginTop: 13 }}>
        <View style={{ flex: 1, minWidth: 180 }}>
          <Typography variant="caption" style={{ color: colors.text.muted }}>{statusLabel(summary?.status)}</Typography>
          {summary ? <Typography variant="caption" style={{ color: colors.text.muted }}>This week · {summary.periodState}</Typography> : null}
          <Typography variant="title" style={{ color: colors.text.primary, marginTop: 2 }}>{summary?.displayedValue ?? '—'} / 100</Typography>
        </View>
        {summary && summary.history.length ? (
          <View style={{ width: 150 }}><MomentumTrendChart height={64} points={summary.history.map((point) => point.value)} xLabels={summary.history.map(() => '')} yDomainMax={100} /></View>
        ) : null}
      </View>
      <View style={{ backgroundColor: colors.background.input, borderRadius: 999, height: 6, marginTop: 12, overflow: 'hidden' }}>
        <View style={{ backgroundColor: accentColor, borderRadius: 999, height: '100%', width: `${summary?.displayedValue ?? 0}%` }} />
      </View>
      <Typography variant="caption" style={{ color: colors.text.secondary, lineHeight: 18, marginTop: 10 }}>{explanation}</Typography>
      {navigation ? <View style={{ marginTop: 8 }}>{navigation}</View> : null}
    </View>
  );
}
