import { Pressable, View } from 'react-native';
import { Typography } from '@/components/ui/Typography';
import { getCategoryAccentTheme } from '@/constants/themes';
import type {
  GoalTemplateOption,
  GoalTemplateTargetFrequency,
} from '@/lib/ai/schemas/goal-creation';
import type { GoalCreationCategory } from '@/lib/goals/schema';
import { useThemeColors, useUIStore } from '@/store/uiStore';

export interface GoalTemplateCardsProps {
  templates: GoalTemplateOption[];
  derived_category: GoalCreationCategory;
  onSelect: (index: number) => void;
}

function formatDeadline(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function countLabel(count: number, singular: string): string {
  return `${count} ${count === 1 ? singular : `${singular}s`}`;
}

function frequencyLabel(frequency: GoalTemplateTargetFrequency | null): string {
  if (!frequency) return 'Narrative goal';
  if (frequency.period === 'week') return `${frequency.times} days/week`;
  if (frequency.period === 'day') return `${frequency.times}×/day`;
  return `${frequency.times}×/month`;
}

export function GoalTemplateCards({
  templates,
  derived_category,
  onSelect,
}: GoalTemplateCardsProps) {
  const colors = useThemeColors();
  const darkMode = useUIStore((state) => state.themeMode) === 'dark';
  const accent = getCategoryAccentTheme(derived_category);

  return (
    <View style={{ gap: 14, width: '100%' }}>
      {templates.map((template, index) => (
        <Pressable
          key={`${template.strategy_name}-${index}`}
          accessibilityRole="button"
          accessibilityLabel={`Choose the ${template.strategy_name} approach: ${template.goal.title}`}
          onPress={() => onSelect(index)}
          style={({ pressed }) => ({
            backgroundColor: colors.background.card,
            borderColor: pressed ? accent.color : colors.border.warm,
            borderLeftColor: accent.color,
            borderLeftWidth: 4,
            borderRadius: 16,
            borderWidth: 1,
            opacity: pressed ? 0.9 : 1,
            overflow: 'hidden',
            paddingHorizontal: 18,
            paddingVertical: 16,
            shadowColor: accent.color,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: darkMode ? 0 : pressed ? 0.14 : 0.06,
            shadowRadius: 14,
          })}
        >
          <View
            style={{
              alignItems: 'center',
              flexDirection: 'row',
              gap: 8,
              marginBottom: 6,
            }}
          >
            <View
              style={{
                backgroundColor: darkMode ? colors.background.input : accent.tint,
                borderRadius: 999,
                paddingHorizontal: 10,
                paddingVertical: 4,
              }}
            >
              <Typography
                variant="badge-text"
                style={{ color: accent.mid, fontFamily: 'Inter-SemiBold', letterSpacing: 0.5 }}
              >
                {template.strategy_name.toUpperCase()}
              </Typography>
            </View>
          </View>

          <Typography
            variant="title"
            style={{ fontFamily: 'Lora-SemiBold', fontSize: 19, lineHeight: 25 }}
          >
            {template.goal.title}
          </Typography>

          {template.goal.description ? (
            <Typography
              variant="caption"
              style={{ color: colors.text.secondary, lineHeight: 19, marginTop: 4 }}
            >
              {template.goal.description}
            </Typography>
          ) : null}

          <View
            style={{
              borderTopColor: colors.border.warmSubtle,
              borderTopWidth: 1,
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: 8,
              marginTop: 14,
              paddingTop: 12,
            }}
          >
            {[
              countLabel(template.milestones.length, 'milestone'),
              countLabel(template.trackers.length, 'tracker'),
              frequencyLabel(template.target_frequency),
              `By ${formatDeadline(template.goal.deadline)}`,
            ].map((label) => (
              <View
                key={label}
                style={{
                  backgroundColor: colors.background.input,
                  borderRadius: 999,
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                }}
              >
                <Typography variant="badge-text" style={{ color: colors.text.secondary }}>
                  {label}
                </Typography>
              </View>
            ))}
          </View>
        </Pressable>
      ))}
    </View>
  );
}

export default GoalTemplateCards;
