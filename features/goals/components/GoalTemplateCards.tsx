import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { Typography } from '@/components/ui/Typography';
import { FocusedField } from '@/constants/focused-tokens';
import { getCategoryAccentTheme } from '@/constants/themes';
import type {
  GoalTemplateOption,
  GoalTemplateTargetFrequency,
} from '@/lib/ai/schemas/goal-creation';
import type { GoalCreationCategory } from '@/lib/goals/schema';
import { useThemeColors } from '@/store/uiStore';

export interface GoalTemplateCardsProps {
  templates: GoalTemplateOption[];
  derived_category: GoalCreationCategory;
  onSelect: (index: number) => void;
  /** Returns the user to the conversation when none of the drafts feel right. */
  onBackToChat?: () => void;
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

function TemplateMeta({ template }: { template: GoalTemplateOption }) {
  const details = [
    ['Deadline', formatDeadline(template.goal.deadline)],
    ['Cadence', frequencyLabel(template.target_frequency)],
    ['Milestones', countLabel(template.milestones.length, 'milestone')],
    ['Trackers', countLabel(template.trackers.length, 'tracker')],
  ];

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {details.map(([label, value]) => (
        <View
          key={label}
          style={{
            backgroundColor: FocusedField.surface.input,
            borderRadius: 999,
            paddingHorizontal: 10,
            paddingVertical: 5,
          }}
        >
          <Typography style={{ color: FocusedField.text.secondary, fontFamily: 'Inter-Regular', fontSize: 11 }}>
            {label}: {value}
          </Typography>
        </View>
      ))}
    </View>
  );
}

export function GoalTemplateCards({
  templates,
  derived_category,
  onSelect,
  onBackToChat,
}: GoalTemplateCardsProps) {
  const colors = useThemeColors();
  const accent = getCategoryAccentTheme(derived_category);
  const [expandedIndex, setExpandedIndex] = useState(0);

  return (
    <View style={{ alignSelf: 'center', gap: 14, maxWidth: 760, width: '100%' }}>
      <View style={{ alignItems: 'center', gap: 7, marginBottom: 4 }}>
        <Typography
          style={{
            color: accent.color,
            fontFamily: 'Inter-SemiBold',
            fontSize: 10.5,
            letterSpacing: 2.5,
          }}
        >
          ECHO
        </Typography>
        <Typography
          style={{
            color: colors.text.primary,
            fontFamily: 'Lora-Regular',
            fontSize: 22,
            lineHeight: 30,
            textAlign: 'center',
          }}
        >
          Here are three ways to make this real.
        </Typography>
      </View>

      {templates.map((template, index) => {
        const expanded = expandedIndex === index;
        return (
          <Pressable
            key={`${template.strategy_name}-${index}`}
            accessibilityLabel={`${expanded ? 'Expanded' : 'Expand'} ${template.strategy_name} approach: ${template.goal.title}`}
            accessibilityRole="button"
            onPress={() => setExpandedIndex(index)}
            style={({ pressed }) => ({
              backgroundColor: expanded ? FocusedField.surface.input : FocusedField.surface.card,
              borderColor: expanded ? accent.color : FocusedField.border.subtle,
              borderRadius: FocusedField.radius.card,
              borderWidth: expanded ? 1.5 : 1,
              opacity: pressed ? 0.92 : 1,
              overflow: 'hidden',
              paddingHorizontal: 22,
              paddingVertical: expanded ? 20 : 18,
              shadowColor: expanded ? accent.color : '#000000',
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: expanded ? 0.18 : 0.12,
              shadowRadius: expanded ? 22 : 12,
            })}
          >
            <View style={{ alignItems: 'center', flexDirection: 'row', gap: 8, marginBottom: 8 }}>
              <View
                style={{
                  backgroundColor: expanded ? accent.tint : FocusedField.surface.input,
                  borderColor: expanded ? accent.color : FocusedField.border.subtle,
                  borderRadius: 999,
                  borderWidth: 1,
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                }}
              >
                <Typography style={{ color: expanded ? accent.color : FocusedField.text.secondary, fontFamily: 'Inter-SemiBold', fontSize: 10.5, letterSpacing: 0.7 }}>
                  {template.strategy_name.toUpperCase()}
                </Typography>
              </View>
              {expanded ? (
                <Typography style={{ color: FocusedField.text.muted, fontFamily: 'Inter-Regular', fontSize: 11 }}>
                  Full detail
                </Typography>
              ) : null}
            </View>

            <Typography
              style={{
                color: '#FFFFFF',
                fontFamily: 'Lora-SemiBold',
                fontSize: expanded ? 21 : 18,
                lineHeight: expanded ? 27 : 24,
              }}
            >
              {template.goal.title}
            </Typography>

            {expanded ? (
              <View style={{ gap: 14, marginTop: 10 }}>
                <Typography
                  style={{
                    color: FocusedField.text.secondary,
                    fontFamily: 'Lora-Regular',
                    fontSize: 14,
                    lineHeight: 21,
                  }}
                >
                  {template.goal.description}
                </Typography>
                <TemplateMeta template={template} />
                <View style={{ borderTopColor: FocusedField.border.subtle, borderTopWidth: 1, gap: 8, paddingTop: 14 }}>
                  <Typography style={{ color: FocusedField.text.muted, fontFamily: 'Inter-SemiBold', fontSize: 10, letterSpacing: 1.5 }}>
                    ROADMAP
                  </Typography>
                  {template.milestones.map((milestone, milestoneIndex) => (
                    <Typography
                      key={`${milestone.title}-${milestoneIndex}`}
                      style={{ color: FocusedField.text.secondary, fontFamily: 'Inter-Regular', fontSize: 12.5, lineHeight: 18 }}
                    >
                      {milestoneIndex + 1}. {milestone.title}
                    </Typography>
                  ))}
                </View>
                {template.trackers.length > 0 ? (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>
                    {template.trackers.map((tracker, trackerIndex) => (
                      <View
                        key={`${tracker.title}-${trackerIndex}`}
                        style={{
                          backgroundColor: FocusedField.surface.cardAlt,
                          borderColor: FocusedField.border.subtle,
                          borderRadius: 999,
                          borderWidth: 1,
                          paddingHorizontal: 10,
                          paddingVertical: 5,
                        }}
                      >
                        <Typography style={{ color: FocusedField.text.secondary, fontFamily: 'Inter-Regular', fontSize: 11 }}>
                          {tracker.title}
                        </Typography>
                      </View>
                    ))}
                  </View>
                ) : null}
                <Button
                  onPress={() => onSelect(index)}
                  style={{ alignSelf: 'flex-start', backgroundColor: accent.color, borderColor: accent.color }}
                  textStyle={{ color: FocusedField.accent.onPrimary, fontFamily: 'Inter-SemiBold' }}
                >
                  Choose this one →
                </Button>
              </View>
            ) : null}
          </Pressable>
        );
      })}

      {onBackToChat ? (
        <Pressable accessibilityRole="button" onPress={onBackToChat} style={{ alignSelf: 'center', padding: 8 }}>
          <Typography style={{ color: FocusedField.text.muted, fontFamily: 'Lora-Italic', fontSize: 12.5 }}>
            Don’t love any? Ask Echo to try again
          </Typography>
        </Pressable>
      ) : null}
    </View>
  );
}

export default GoalTemplateCards;
