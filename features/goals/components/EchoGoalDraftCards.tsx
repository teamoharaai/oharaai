import { Pressable, View, useWindowDimensions } from 'react-native';
import { Typography } from '@/components/ui/Typography';
import { FocusedField } from '@/constants/focused-tokens';
import type { GoalTemplateOption } from '@/lib/ai/schemas/goal-creation';

export interface EchoGoalDraftCardsProps {
  concrete: GoalTemplateOption;
  open: GoalTemplateOption;
  /** False when the API did not provide a narrative draft and we surface a distinct alternative. */
  openIsNarrative?: boolean;
  onSelect: (choice: 'concrete' | 'open', template: GoalTemplateOption) => void;
  onSeeAll?: () => void;
  totalCount?: number;
}

interface MetaRow {
  label: string;
  value: string;
}

function formatDeadline(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}

function cadenceLabel(template: GoalTemplateOption): string {
  const frequency = template.target_frequency;
  if (!frequency) return 'Narrative pace';
  if (frequency.period === 'week') return `${frequency.times} days / week`;
  if (frequency.period === 'day') return `${frequency.times}× / day`;
  return `${frequency.times}× / month`;
}

function metaRows(template: GoalTemplateOption, isConcrete: boolean): MetaRow[] {
  return [
    { label: 'Deadline', value: formatDeadline(template.goal.deadline) },
    { label: 'Cadence', value: cadenceLabel(template) },
    {
      label: 'Success',
      value: isConcrete ? template.goal.smart.measurable : template.goal.smart.relevant,
    },
  ];
}

function DraftCard({
  isConcrete,
  openIsNarrative,
  stacked,
  template,
  onPress,
}: {
  isConcrete: boolean;
  openIsNarrative: boolean;
  stacked: boolean;
  template: GoalTemplateOption;
  onPress: () => void;
}) {
  const meta = metaRows(template, isConcrete);
  const label = isConcrete ? 'CONCRETE' : openIsNarrative ? 'OPEN' : 'ALTERNATIVE';

  return (
    <Pressable
      accessibilityLabel={`Choose the ${label.toLowerCase()} framing: ${template.goal.title}`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: isConcrete ? FocusedField.surface.card : FocusedField.surface.cardAlt,
        borderColor: isConcrete ? FocusedField.accent.primary : FocusedField.border.subtle,
        borderRadius: FocusedField.radius.innerCard,
        borderWidth: isConcrete ? 1.5 : 1,
        flex: stacked ? undefined : 1,
        opacity: pressed ? 0.85 : 1,
        paddingHorizontal: 14,
        paddingVertical: 12,
      })}
    >
      <View
        style={{
          alignSelf: 'flex-start',
          backgroundColor: isConcrete ? FocusedField.accent.primary : FocusedField.surface.input,
          borderColor: FocusedField.border.input,
          borderRadius: 999,
          borderWidth: isConcrete ? 0 : 1,
          marginBottom: 8,
          paddingHorizontal: 8,
          paddingVertical: 2,
        }}
      >
        <Typography
          style={{
            color: isConcrete ? FocusedField.accent.onPrimary : FocusedField.text.secondary,
            fontFamily: 'Inter-SemiBold',
            fontSize: 9,
            letterSpacing: 1.5,
          }}
        >
          {label}
        </Typography>
      </View>
      <Typography
        style={{
          color: isConcrete ? FocusedField.accent.primary : FocusedField.text.muted,
          fontFamily: 'Inter-SemiBold',
          fontSize: 9,
          letterSpacing: 1.5,
          marginBottom: 5,
        }}
      >
        {isConcrete
          ? 'OPTION A · STRICT TO THE GOAL'
          : openIsNarrative
            ? 'OPTION B · MORE OPEN'
            : 'OPTION B · ANOTHER PATH'}
      </Typography>
      <Typography
        style={{
          color: '#FFFFFF',
          fontFamily: 'Lora-SemiBold',
          fontSize: 15,
          letterSpacing: -0.2,
          lineHeight: 18,
          marginBottom: 6,
        }}
      >
        {template.goal.title}
      </Typography>
      <Typography
        numberOfLines={3}
        style={{
          color: FocusedField.text.muted,
          fontFamily: 'Lora-Italic',
          fontSize: 11.5,
          lineHeight: 17,
          marginBottom: 9,
        }}
      >
        {template.goal.description}
      </Typography>
      <View style={{ borderTopColor: FocusedField.border.subtle, borderTopWidth: 1, gap: 3, paddingTop: 8 }}>
        {meta.map((row) => (
          <View key={row.label} style={{ flexDirection: 'row', gap: 6, justifyContent: 'space-between' }}>
            <Typography style={{ color: FocusedField.text.faint, flexShrink: 0, fontFamily: 'Inter-Regular', fontSize: 10.5 }}>
              {row.label}
            </Typography>
            <Typography
              numberOfLines={1}
              style={{ color: '#FFFFFF', flex: 1, fontFamily: 'Inter-SemiBold', fontSize: 10.5, textAlign: 'right' }}
            >
              {row.value}
            </Typography>
          </View>
        ))}
      </View>
    </Pressable>
  );
}

export function EchoGoalDraftCards({
  concrete,
  open,
  openIsNarrative = true,
  onSelect,
  onSeeAll,
  totalCount,
}: EchoGoalDraftCardsProps) {
  const { width } = useWindowDimensions();
  const stacked = width < 620;

  return (
    <View style={{ gap: 8, marginTop: 6 }}>
      <View style={{ flexDirection: stacked ? 'column' : 'row', gap: 10 }}>
        <DraftCard
          isConcrete
          stacked={stacked}
          openIsNarrative
          template={concrete}
          onPress={() => onSelect('concrete', concrete)}
        />
        <DraftCard
          isConcrete={false}
          openIsNarrative={openIsNarrative}
          stacked={stacked}
          template={open}
          onPress={() => onSelect('open', open)}
        />
      </View>
      {onSeeAll && totalCount && totalCount > 2 ? (
        <Pressable accessibilityRole="link" onPress={onSeeAll}>
          <Typography
            style={{
              color: FocusedField.text.faint,
              fontFamily: 'Lora-Italic',
              fontSize: 12,
              marginTop: 4,
              textAlign: 'center',
            }}
          >
            See all {totalCount} drafts →
          </Typography>
        </Pressable>
      ) : null}
    </View>
  );
}

export default EchoGoalDraftCards;
