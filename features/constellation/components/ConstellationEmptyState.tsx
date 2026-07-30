import {
  View,
  useWindowDimensions,
} from 'react-native';
import { router } from 'expo-router';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Typography } from '@/components/ui/Typography';
import { useThemeColors } from '@/store/uiStore';
import { CONSTELLATION_COPY } from '../copy';
import type {
  ConstellationAnnotationKind,
  ConstellationGraphCountsDTO,
  ConstellationRenderState,
} from '../types';
import { ConstellationSeedPreview } from './ConstellationSeedPreview';
import { ConstellationActionMenu } from './ConstellationActionMenu';

// The access gate is gone; `season_only` is the sole empty state (only the
// Season anchor exists — no goal, annotation, or cluster yet).
type EmptyRenderState = Extract<ConstellationRenderState, 'season_only'>;

interface ConstellationEmptyStateProps {
  counts: ConstellationGraphCountsDTO;
  onCreateAnnotation?: (kind: ConstellationAnnotationKind) => void;
  onOpenGoalLinks?: () => void;
  refreshError?: string | null;
  renderState: EmptyRenderState;
  seasonLabel: string;
}

function nonDraftGoalCount(
  counts: ConstellationGraphCountsDTO,
): number {
  const goals = counts.source.goalsByStatus;
  return (
    goals.active
    + goals.complete
    + goals.stagnant
    + goals.discovered
    + goals.archived
  );
}

function stateCopy(_renderState: EmptyRenderState) {
  return {
    headline: CONSTELLATION_COPY.seasonOnlyHeadline,
    body: CONSTELLATION_COPY.seasonOnlyBody,
    status: 'Season only',
  };
}

function IntroductionCard({
  counts,
  renderState,
}: Omit<ConstellationEmptyStateProps, 'seasonLabel'>) {
  const colors = useThemeColors();
  const { width } = useWindowDimensions();
  const compact = width < 720;
  const copy = stateCopy(renderState);

  return (
    <Card elevated padding="spacious" style={{ maxWidth: 380, width: '100%' }}>
      <View style={{ gap: 16 }}>
        <View style={{ gap: 8 }}>
          <Typography variant="section-eyebrow" style={{ color: colors.text.muted }}>
            {CONSTELLATION_COPY.emptyEyebrow}
          </Typography>
          <Typography
            accessibilityRole="header"
            variant="heading"
            style={{
              fontSize: compact ? 24 : 28,
              lineHeight: compact ? 31 : 35,
            }}
          >
            {copy.headline}
          </Typography>
          <Typography variant="description">{copy.body}</Typography>
        </View>

        <View
          accessibilityRole="summary"
          style={{
            backgroundColor: colors.background.subtle,
            borderRadius: 10,
            gap: 4,
            padding: 12,
          }}
        >
          <Typography
            variant="section-eyebrow"
            style={{ color: colors.text.accent }}
          >
            {copy.status}
          </Typography>
          <Typography variant="caption">
            {`${counts.source.echoEntries} entries · ${nonDraftGoalCount(counts)} goals · ${counts.source.qualifiedCandidates} qualified patterns`}
          </Typography>
        </View>

        <View
          style={{
            backgroundColor: colors.background.subtle,
            borderRadius: 10,
            gap: 6,
            padding: 14,
          }}
        >
          <Typography variant="section-eyebrow" style={{ color: colors.text.primary }}>
            {CONSTELLATION_COPY.earnedEyebrow}
          </Typography>
          <Typography variant="description">
            {CONSTELLATION_COPY.earnedKinds}
          </Typography>
        </View>

        <View style={{ flexDirection: compact ? 'column' : 'row', gap: 8 }}>
          <Button
            accessibilityLabel="Set a goal"
            onPress={() => router.push('/goals/create')}
            style={{ flex: compact ? undefined : 1 }}
          >
            Set a goal
          </Button>
          <Button
            accessibilityLabel="Write an entry"
            onPress={() => router.push('/(app)/echo')}
            style={{ flex: compact ? undefined : 1 }}
            variant="secondary"
          >
            Write an entry
          </Button>
        </View>
      </View>
    </Card>
  );
}

export function ConstellationEmptyState({
  counts,
  onCreateAnnotation,
  onOpenGoalLinks,
  refreshError,
  renderState,
  seasonLabel,
}: ConstellationEmptyStateProps) {
  const colors = useThemeColors();
  const { width } = useWindowDimensions();
  const compact = width < 720;
  const copy = stateCopy(renderState);

  return (
    <View style={{ backgroundColor: colors.background.page, flex: 1 }}>
      <View
        style={{
          paddingHorizontal: compact ? 20 : 32,
          paddingTop: compact ? 24 : 28,
        }}
      >
        <View style={{ alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' }}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Typography accessibilityRole="header" variant="heading">
              Constellation
            </Typography>
            <Typography variant="subtitle" style={{ marginTop: 2 }}>
              {`${seasonLabel} · ${copy.status.toLowerCase()}`}
            </Typography>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {onCreateAnnotation && onOpenGoalLinks ? (
              <ConstellationActionMenu
                canLinkGoals={false}
                onCreateAnnotation={onCreateAnnotation}
                onOpenGoalLinks={onOpenGoalLinks}
              />
            ) : null}
          </View>
        </View>
        {refreshError ? (
          <Typography
            accessibilityRole="alert"
            variant="caption"
            style={{ marginTop: 10 }}
          >
            {CONSTELLATION_COPY.staleRefresh}
          </Typography>
        ) : null}
      </View>

      <View
        style={{
          flex: 1,
          justifyContent: compact ? 'flex-start' : 'center',
          paddingBottom: compact ? 28 : 68,
          paddingHorizontal: compact ? 20 : 32,
          paddingTop: compact ? 8 : 0,
        }}
      >
        {compact ? (
          <View style={{ alignItems: 'center', gap: 8, width: '100%' }}>
            <ConstellationSeedPreview compact seasonLabel={seasonLabel} />
            <IntroductionCard counts={counts} renderState={renderState} />
          </View>
        ) : (
          <View style={{ alignSelf: 'center', height: 520, maxWidth: 1040, position: 'relative', width: '100%' }}>
            <ConstellationSeedPreview seasonLabel={seasonLabel} />
            <View style={{ position: 'absolute', right: 0, top: 36 }}>
              <IntroductionCard counts={counts} renderState={renderState} />
            </View>
          </View>
        )}
      </View>

      <Typography
        variant="description"
        style={{
          color: colors.text.muted,
          fontStyle: 'italic',
          paddingBottom: compact ? 20 : 30,
          paddingHorizontal: 20,
          textAlign: 'center',
        }}
      >
        Nothing is filled in with sample data. New nodes will appear only when the evidence supports them.
      </Typography>
    </View>
  );
}
