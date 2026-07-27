import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Typography } from '@/components/ui/Typography';
import { getCategoryAccentTheme } from '@/constants/themes';
import { useThemeColors, useUIStore } from '@/store/uiStore';
import type { GoalCategory } from '@/lib/goals/schema';

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
    copy: 'Your reflections are beginning to form a consistent pattern of growth.',
    metric: 'Reflection rhythm',
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

export function GoalEchoAnalysisCard({ category }: { category: GoalCategory | null | undefined }) {
  const colors = useThemeColors();
  const darkMode = useUIStore((state) => state.themeMode) === 'dark';
  const preview = getGoalEchoAnalysisPreview(category);
  const normalized = category?.trim().toLowerCase() ?? '';
  const recognized = Boolean(ANALYSIS_PREVIEWS[CATEGORY_ALIASES[normalized] ?? normalized]);
  const accent = recognized && category ? getCategoryAccentTheme(category) : null;
  const accentColor = accent?.color ?? colors.text.muted;

  return (
    <View
      accessibilityLabel={`Echo Analysis preview. ${preview.metric}, ${preview.status}, ${preview.value} percent.`}
      style={{
        backgroundColor: colors.background.card,
        borderColor: colors.border.divider,
        borderRadius: 14,
        borderWidth: 1,
        padding: 16,
      }}
    >
      <View style={{ alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' }}>
        <View style={{ alignItems: 'center', flexDirection: 'row', gap: 7 }}>
          <Ionicons color={accentColor} name="pulse-outline" size={16} />
          <Typography variant="eyebrow" style={{ color: accentColor }}>
            Echo Analysis
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
    </View>
  );
}
