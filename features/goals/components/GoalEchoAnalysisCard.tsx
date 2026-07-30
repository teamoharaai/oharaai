import { Pressable, View, useWindowDimensions } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Typography } from '@/components/ui/Typography';
import { getCategoryAccentTheme } from '@/constants/themes';
import { getGoalCreationTemplate } from '@/lib/goals/templates';
import { useThemeColors, useUIStore } from '@/store/uiStore';
import type { GoalCategory, GoalCreationCategory } from '@/lib/goals/schema';

type AnalysisPreview = {
  copy: string;
  metric: string;
  status: string;
  value: number;
};

const CATEGORY_ALIASES: Partial<Record<string, string>> = {
  body: 'health',
  connect: 'relationships',
  contribute: 'growth',
  create: 'creative',
  mind: 'education',
  money: 'finance',
};

const ANALYSIS_PREVIEWS: Record<string, AnalysisPreview> = {
  health: {
    copy: 'Your recent activity suggests a developing training rhythm.',
    metric: 'Training consistency',
    status: 'Building',
    value: 72,
  },
  finance: {
    copy: 'Your current pace is moving steadily toward this financial goal.',
    metric: 'Savings pace',
    status: 'On track',
    value: 68,
  },
  career: {
    copy: 'You are making consistent progress through the goal’s key milestones.',
    metric: 'Milestone velocity',
    status: 'Steady',
    value: 64,
  },
  creative: {
    copy: 'Your recent effort is beginning to form a repeatable creative rhythm.',
    metric: 'Creative output rhythm',
    status: 'Building',
    value: 59,
  },
  education: {
    copy: 'Your learning activity shows a strong and consistent study pattern.',
    metric: 'Learning consistency',
    status: 'Strong',
    value: 81,
  },
  relationships: {
    copy: 'Your recent actions support a stable rhythm of meaningful connection.',
    metric: 'Connection consistency',
    status: 'Steady',
    value: 66,
  },
  growth: {
    copy: 'Your entries are beginning to form a consistent pattern of growth.',
    metric: 'Entry rhythm',
    status: 'Building',
    value: 70,
  },
};

const FALLBACK_PREVIEW: AnalysisPreview = {
  copy: 'Your recent activity is beginning to establish forward movement.',
  metric: 'Goal momentum',
  status: 'Developing',
  value: 60,
};

export function getGoalEchoAnalysisPreview(category: string | null | undefined): AnalysisPreview {
  const normalized = category?.trim().toLowerCase() ?? '';
  const resolved = CATEGORY_ALIASES[normalized] ?? normalized;
  return ANALYSIS_PREVIEWS[resolved] ?? FALLBACK_PREVIEW;
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
  const preview = getGoalEchoAnalysisPreview(category);
  const normalized = category?.trim().toLowerCase() ?? '';
  const recognized = Boolean(ANALYSIS_PREVIEWS[CATEGORY_ALIASES[normalized] ?? normalized]);
  const accent = recognized && category ? getCategoryAccentTheme(category) : null;
  const accentColor = accent?.color ?? colors.text.muted;
  const resolvedCategory = (CATEGORY_ALIASES[normalized] ?? normalized) as GoalCreationCategory;
  const categoryTemplate = recognized ? getGoalCreationTemplate(resolvedCategory) : null;
  const categoryLabel = categoryTemplate?.label ?? 'Uncategorized';
  const categoryIcon = categoryTemplate?.icon ?? '○';
  const rowStacked = width < 900;

  const navigation = goalId && navigationAction ? (
    <Pressable
      accessibilityRole="link"
      onPress={() => {
        if (navigationAction === 'goal') {
          router.push({
            pathname: '/(app)/goals/[id]' as never,
            params: { id: goalId },
          });
          return;
        }
        router.push({
          pathname: '/(app)/momentum' as never,
          params: { goalId },
        });
      }}
      style={({ pressed }) => ({
        alignSelf: rowStacked ? 'flex-start' : 'center',
        opacity: pressed ? 0.55 : 1,
        paddingHorizontal: 2,
        paddingVertical: 6,
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
        accessibilityLabel={`Goal Momentum preview. ${preview.metric}, ${preview.status}, ${preview.value} percent.`}
        style={{
          backgroundColor: colors.background.card,
          borderColor: highlighted ? accentColor : colors.border.divider,
          borderRadius: 14,
          borderWidth: 1,
          padding: rowStacked ? 16 : 18,
        }}
      >
        <View
          style={{
            alignItems: rowStacked ? 'stretch' : 'center',
            flexDirection: rowStacked ? 'column' : 'row',
            gap: rowStacked ? 16 : 22,
          }}
        >
          <View
            style={{
              alignItems: 'center',
              flexDirection: 'row',
              gap: 12,
              width: rowStacked ? '100%' : '29%',
            }}
          >
            <View
              style={{
                alignItems: 'center',
                backgroundColor: darkMode ? colors.background.input : accent?.tint ?? colors.background.input,
                borderRadius: 10,
                height: 38,
                justifyContent: 'center',
                width: 38,
              }}
            >
              <Typography variant="title" style={{ color: accentColor }}>
                {categoryIcon}
              </Typography>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Typography variant="title" style={{ color: colors.text.primary, lineHeight: 21 }}>
                {goalTitle}
              </Typography>
              <View style={{ alignItems: 'center', flexDirection: 'row', gap: 7, marginTop: 5 }}>
                <Typography variant="caption" style={{ color: accentColor }}>
                  {categoryLabel}
                </Typography>
                <PreviewBadge accentColor={accentColor} backgroundColor={
                  darkMode ? colors.background.input : accent?.tint ?? colors.background.input
                } />
              </View>
            </View>
          </View>

          <View style={{ width: rowStacked ? '100%' : '16%' }}>
            <Typography variant="caption" style={{ color: colors.text.muted }}>
              {preview.metric}
            </Typography>
            <Typography variant="title" style={{ color: colors.text.primary, marginTop: 3 }}>
              {preview.status}
            </Typography>
          </View>

          <View style={{ width: rowStacked ? '100%' : '17%' }}>
            <Typography
              variant="heading"
              style={{ color: accentColor, fontFamily: 'Inter-SemiBold', fontSize: 24 }}
            >
              {preview.value}%
            </Typography>
            <View
              style={{
                backgroundColor: colors.background.input,
                borderRadius: 999,
                height: 6,
                marginTop: 8,
                overflow: 'hidden',
              }}
            >
              <View
                style={{
                  backgroundColor: accentColor,
                  borderRadius: 999,
                  height: '100%',
                  width: `${preview.value}%`,
                }}
              />
            </View>
          </View>

          <Typography
            variant="caption"
            style={{
              color: colors.text.secondary,
              flex: rowStacked ? undefined : 1,
              lineHeight: 18,
            }}
          >
            {preview.copy}
          </Typography>

          <View style={{ minWidth: rowStacked ? 0 : 92 }}>
            {navigation}
          </View>
        </View>
      </View>
    );
  }

  return (
    <View
      accessibilityLabel={`Goal Momentum preview. ${preview.metric}, ${preview.status}, ${preview.value} percent.`}
      style={{
        backgroundColor: embedded ? 'transparent' : colors.background.card,
        borderColor: embedded
          ? 'transparent'
          : highlighted
            ? accentColor
            : colors.border.divider,
        borderRadius: embedded ? 0 : 14,
        borderWidth: embedded ? 0 : 1,
        padding: embedded ? 0 : 16,
      }}
    >
      {goalTitle ? (
        <Typography
          numberOfLines={2}
          variant="title"
          style={{ color: colors.text.primary, marginBottom: 12 }}
        >
          {goalTitle}
        </Typography>
      ) : null}
      <View style={{ alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' }}>
        <View style={{ alignItems: 'center', flexDirection: 'row', gap: 7 }}>
          <Ionicons color={accentColor} name="pulse-outline" size={16} />
          <Typography variant="eyebrow" style={{ color: accentColor }}>
            Goal Momentum
          </Typography>
        </View>
        <View
          style={{
            backgroundColor: darkMode ? colors.background.input : accent?.tint ?? colors.background.input,
            borderRadius: 999,
            paddingHorizontal: 8,
            paddingVertical: 4,
          }}
        >
          <Typography variant="badge-text" style={{ color: accentColor }}>
            Preview
          </Typography>
        </View>
      </View>

      <View
        style={{
          alignItems: 'flex-end',
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 10,
          justifyContent: 'space-between',
          marginTop: 13,
        }}
      >
        <View style={{ flex: 1, minWidth: 180 }}>
          <Typography variant="caption" style={{ color: colors.text.muted }}>
            {preview.metric}
          </Typography>
          <Typography
            variant="title"
            style={{ color: colors.text.primary, fontFamily: 'Inter-SemiBold', marginTop: 2 }}
          >
            {preview.status}
          </Typography>
        </View>
        <Typography
          variant="heading"
          style={{ color: accentColor, fontFamily: 'Inter-SemiBold', fontSize: 25 }}
        >
          {preview.value}%
        </Typography>
      </View>

      <View
        style={{
          backgroundColor: colors.background.input,
          borderRadius: 999,
          height: 6,
          marginTop: 12,
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            backgroundColor: accentColor,
            borderRadius: 999,
            height: '100%',
            width: `${preview.value}%`,
          }}
        />
      </View>
      <Typography
        variant="caption"
        style={{ color: colors.text.secondary, lineHeight: 18, marginTop: 10 }}
      >
        {preview.copy}
      </Typography>
      {navigation ? <View style={{ marginTop: 8 }}>{navigation}</View> : null}
    </View>
  );
}

function PreviewBadge({
  accentColor,
  backgroundColor,
}: {
  accentColor: string;
  backgroundColor: string;
}) {
  return (
    <View
      style={{
        backgroundColor,
        borderRadius: 999,
        paddingHorizontal: 7,
        paddingVertical: 3,
      }}
    >
      <Typography variant="badge-text" style={{ color: accentColor }}>
        Preview
      </Typography>
    </View>
  );
}
