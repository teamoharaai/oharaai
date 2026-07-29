import { View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { Typography } from '@/components/ui/Typography';
import { useThemeColors } from '@/store/uiStore';
import type { useReflectionInspector } from '../hooks/useReflectionInspector';
import type {
  ConstellationReflectionValence,
  ConstellationReflectionNodeDTO,
} from '../types';
import { ConstellationInspectorSurface } from './ConstellationInspectorSurface';
import { ConstellationLoadingMark } from './ConstellationLoadingMark';

type ReflectionInspectorController = ReturnType<typeof useReflectionInspector>;

interface ConstellationReflectionInspectorProps {
  inspector: ReflectionInspectorController;
  node: ConstellationReflectionNodeDTO;
  onClose: () => void;
  onReadInEcho: (echoEntryId: string) => void;
}

function valenceLabel(value: ConstellationReflectionValence | null): string {
  return value ? value[0].toUpperCase() + value.slice(1) : 'Not established';
}

function formattedDate(value: string | null): string {
  if (!value) return 'Not available';
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? date.toLocaleDateString(undefined, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : 'Not available';
}

export function ConstellationReflectionInspector({
  inspector,
  node,
  onClose,
  onReadInEcho,
}: ConstellationReflectionInspectorProps) {
  const colors = useThemeColors();
  const valenceColor = (valence: ConstellationReflectionValence) => ({
    positive: colors.brt.bud,
    negative: colors.feedback.danger.text,
    neutral: colors.text.muted,
    mixed: colors.brt.rose,
  })[valence];

  return (
    <ConstellationInspectorSurface
      accessibilityLabel={`Reflection inspector for ${node.label}`}
      onClose={onClose}
      selectionKey={node.selectionKey}
    >
      <View style={{ gap: 7 }}>
        <Typography
          variant="section-eyebrow"
          style={{ color: colors.text.accent }}
        >
          EARNED REFLECTION · LIVE EVIDENCE
        </Typography>
        <Typography
          accessibilityRole="header"
          numberOfLines={3}
          variant="heading"
          style={{ fontFamily: 'Inter-Italic' }}
        >
          {node.label}
        </Typography>
        <Typography numberOfLines={5} variant="description">
          {inspector.dto?.description
            ?? node.description
            ?? 'A validated pattern drawn from your entry history.'}
        </Typography>
      </View>

      {inspector.status === 'loading' ? (
        <View
          accessibilityLabel="Loading Reflection evidence"
          accessibilityRole="progressbar"
          style={{ alignItems: 'center', gap: 9, paddingVertical: 28 }}
        >
          <ConstellationLoadingMark color={colors.accent.primary} />
          <Typography variant="caption">Loading private evidence…</Typography>
        </View>
      ) : inspector.status === 'error' ? (
        <View
          accessibilityRole="alert"
          style={{
            backgroundColor: colors.feedback.danger.bg,
            borderColor: colors.feedback.danger.border,
            borderRadius: 10,
            borderWidth: 1,
            gap: 9,
            padding: 12,
          }}
        >
          <Typography
            variant="label"
            style={{ color: colors.feedback.danger.text }}
          >
            Reflection details are unavailable
          </Typography>
          <Typography
            variant="caption"
            style={{ color: colors.feedback.danger.text }}
          >
            {inspector.error}
          </Typography>
          {inspector.retryable ? (
            <Button onPress={() => void inspector.retry()} size="compact">
              Retry
            </Button>
          ) : null}
        </View>
      ) : inspector.dto ? (
        <>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {[
              ['Occurrences', String(inspector.dto.occurrences)],
              ['First seen', formattedDate(inspector.dto.firstSeenAt)],
              ['Last seen', formattedDate(inspector.dto.lastSeenAt)],
            ].map(([label, value]) => (
              <View
                key={label}
                style={{
                  backgroundColor: colors.background.subtle,
                  borderRadius: 10,
                  flex: 1,
                  gap: 3,
                  padding: 10,
                }}
              >
                <Typography variant="caption">{label}</Typography>
                <Typography numberOfLines={2} variant="label">
                  {value}
                </Typography>
              </View>
            ))}
          </View>

          <View style={{ gap: 9 }}>
            <Typography variant="section-eyebrow">
              Real valence history
            </Typography>
            {inspector.dto.valenceHistory.length === 0 ? (
              <Typography variant="description">
                No valid valence events are available for this Reflection.
              </Typography>
            ) : (
              <View
                accessibilityLabel={`Valence history with ${inspector.dto.valenceHistory.length} events`}
                style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}
              >
                {inspector.dto.valenceHistory.map((event, index) => (
                  <View
                    accessibilityLabel={`${valenceLabel(event.valence)} on ${formattedDate(event.timestamp)}`}
                    key={`${event.echoEntryId}:${event.timestamp}:${index}`}
                    style={{
                      backgroundColor: valenceColor(event.valence),
                      borderRadius: 999,
                      height: 12,
                      minWidth: 22,
                      opacity: 0.86,
                    }}
                  />
                ))}
              </View>
            )}
            <Typography variant="caption">
              {`${formattedDate(inspector.dto.firstSeenAt)} → ${formattedDate(inspector.dto.lastSeenAt)}`}
            </Typography>
          </View>

          <View style={{ gap: 10 }}>
            <Typography variant="section-eyebrow">
              {`Contributing entries · ${inspector.dto.evidence.length}`}
            </Typography>
            {inspector.dto.evidence.length === 0 ? (
              <Typography variant="description">
                The source references are no longer available to this account.
              </Typography>
            ) : inspector.dto.evidence.map((item) => (
              <View
                key={item.id}
                style={{
                  backgroundColor: item.valence === 'negative'
                    ? colors.feedback.danger.bg
                    : colors.background.input,
                  borderColor: item.valence === 'negative'
                    ? colors.feedback.danger.border
                    : colors.border.input,
                  borderRadius: 10,
                  borderWidth: 1,
                  gap: 8,
                  padding: 12,
                }}
              >
                <View style={{ gap: 3 }}>
                  <Typography numberOfLines={2} variant="label">
                    {item.title?.trim() || 'Untitled Entry'}
                  </Typography>
                  <Typography variant="caption">
                    {`${formattedDate(item.createdAt)} · ${valenceLabel(item.valence)}`}
                  </Typography>
                </View>
                <Typography numberOfLines={4} variant="caption">
                  {item.excerpt || 'This entry has no preview text.'}
                </Typography>
                <Button
                  onPress={() => onReadInEcho(item.id)}
                  size="compact"
                  variant="secondary"
                >
                  Read entry
                </Button>
              </View>
            ))}
          </View>
        </>
      ) : null}
    </ConstellationInspectorSurface>
  );
}
