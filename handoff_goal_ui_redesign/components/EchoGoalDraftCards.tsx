/**
 * EchoGoalDraftCards — the Concrete + Open goal pair rendered inline at the tail of the chat.
 *
 * Copy to: features/goals/components/EchoGoalDraftCards.tsx
 *
 * Renders exactly two draft options side-by-side:
 *   • Card A — strict-to-the-goal (Concrete). Border-accented, primary emphasis.
 *   • Card B — abstract, felt-experience framing (Open). Muted variant.
 *
 * The parent (AIGoalCreation.tsx) resolves which of the API's templates is which
 * via `smart_data.frequency` (see README §Two-option surfacing).
 */
import { Pressable, View } from 'react-native';
import { Typography } from '@/components/ui/Typography';
import { FocusedField as T } from '@/constants/focused-tokens';
import type { GoalTemplateOption } from '@/lib/ai/schemas/goal-creation';

export interface EchoGoalDraftCardsProps {
  concrete: GoalTemplateOption;
  open: GoalTemplateOption;
  onSelect: (choice: 'concrete' | 'open', template: GoalTemplateOption) => void;
  /** Optional fallback: when the API returned >2 templates, show a link to the full list. */
  onSeeAll?: () => void;
  totalCount?: number;
}

interface MetaRow { label: string; value: string; }

function formatConcreteMeta(t: GoalTemplateOption): MetaRow[] {
  const deadline = t.goal.smart_data.deadline
    ? new Date(t.goal.smart_data.deadline).toLocaleDateString('en-US', {
        day: 'numeric', month: 'short', year: 'numeric',
      })
    : '—';
  const freq = t.goal.smart_data.frequency;
  const cadence = freq ? `${freq.times} / ${freq.period}` : '—';
  return [
    { label: 'Deadline', value: deadline },
    { label: 'Cadence',  value: cadence },
    { label: 'Success',  value: t.goal.smart_data.success_criteria ?? '—' },
  ];
}

function formatOpenMeta(t: GoalTemplateOption): MetaRow[] {
  // For narrative/open goals, the schema typically nulls-out frequency and
  // deadline may be a soft phrase. Fall back to human-readable copy.
  const deadline = t.goal.smart_data.deadline_display
    ?? (t.goal.smart_data.deadline
        ? new Date(t.goal.smart_data.deadline).toLocaleDateString('en-US', { month: 'long' })
        : 'Open-ended');
  return [
    { label: 'Deadline', value: deadline },
    { label: 'Cadence',  value: t.goal.smart_data.cadence_hint ?? 'Most days' },
    { label: 'Success',  value: t.goal.smart_data.success_criteria ?? 'Reflection · felt-shift' },
  ];
}

function LabelPill({ tone, children }: { tone: 'accent' | 'muted'; children: React.ReactNode }) {
  const bg = tone === 'accent' ? T.accent.primary : T.surface.input;
  const fg = tone === 'accent' ? T.text.onAccent : T.text.secondary;
  const border = tone === 'accent' ? undefined : T.border.input;
  return (
    <View
      style={{
        position: 'absolute', top: -9, left: 14,
        backgroundColor: bg, borderColor: border, borderWidth: border ? 1 : 0,
        borderRadius: T.radius.chip, paddingVertical: 2, paddingHorizontal: 8,
      }}
    >
      <Typography style={{ ...T.type.labelSm, color: fg }}>{children as string}</Typography>
    </View>
  );
}

function MetaList({ rows }: { rows: MetaRow[] }) {
  return (
    <View style={{ gap: 3, paddingTop: 8, borderTopWidth: 1, borderTopColor: T.border.subtle }}>
      {rows.map((r) => (
        <View key={r.label} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Typography style={{ ...T.type.metaRow, color: T.text.faint }}>{r.label}</Typography>
          <Typography style={{ ...T.type.metaRow, color: T.text.primary, fontWeight: '500' }}>
            {r.value}
          </Typography>
        </View>
      ))}
    </View>
  );
}

function DraftCard({
  variant, overline, title, subtitle, meta, onPress,
}: {
  variant: 'concrete' | 'open';
  overline: string;
  title: string;
  subtitle: string;
  meta: MetaRow[];
  onPress: () => void;
}) {
  const isConcrete = variant === 'concrete';
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Choose the ${isConcrete ? 'concrete' : 'open'} framing: ${title}`}
      style={({ pressed }) => ({
        flex: 1,
        backgroundColor: isConcrete ? T.surface.card : T.surface.cardAlt,
        borderColor: isConcrete ? T.accent.primary : T.border.subtle,
        borderWidth: isConcrete ? 1.5 : 1,
        borderRadius: T.radius.innerCard,
        padding: 12,
        paddingHorizontal: 14,
        position: 'relative',
        opacity: pressed ? 0.85 : 1,
        boxShadow: isConcrete ? T.shadow.selected : undefined,
      })}
    >
      <LabelPill tone={isConcrete ? 'accent' : 'muted'}>
        {isConcrete ? 'CONCRETE' : 'OPEN'}
      </LabelPill>
      <Typography
        style={{
          ...T.type.labelSm,
          color: isConcrete ? T.accent.primary : T.text.muted,
          marginTop: 2,
          marginBottom: 5,
        }}
      >
        {overline}
      </Typography>
      <Typography style={{ ...T.type.cardTitle, color: T.text.primary, marginBottom: 6 }}>
        {title}
      </Typography>
      <Typography style={{ ...T.type.cardSubtitle, color: T.text.muted, marginBottom: 9 }}>
        {subtitle}
      </Typography>
      <MetaList rows={meta} />
    </Pressable>
  );
}

export function EchoGoalDraftCards({
  concrete,
  open,
  onSelect,
  onSeeAll,
  totalCount,
}: EchoGoalDraftCardsProps) {
  return (
    <View style={{ gap: 8, marginTop: 6 }}>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <DraftCard
          variant="concrete"
          overline="Option A · strict to the goal"
          title={concrete.goal.title}
          subtitle={concrete.strategy_summary ?? 'A hard number, a hard date.'}
          meta={formatConcreteMeta(concrete)}
          onPress={() => onSelect('concrete', concrete)}
        />
        <DraftCard
          variant="open"
          overline="Option B · more abstract"
          title={open.goal.title}
          subtitle={open.strategy_summary ?? 'No clock. Success is showing up.'}
          meta={formatOpenMeta(open)}
          onPress={() => onSelect('open', open)}
        />
      </View>
      {onSeeAll && totalCount && totalCount > 2 ? (
        <Pressable onPress={onSeeAll} accessibilityRole="link">
          <Typography
            style={{
              fontFamily: 'Lora',
              fontSize: 12,
              fontStyle: 'italic',
              color: T.text.faint,
              textAlign: 'center',
              marginTop: 4,
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
