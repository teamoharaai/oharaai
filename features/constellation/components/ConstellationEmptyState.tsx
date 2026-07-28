import {
  ActivityIndicator,
  View,
  useWindowDimensions,
} from 'react-native';
import { router } from 'expo-router';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Typography } from '@/components/ui/Typography';
import { useThemeColors } from '@/store/uiStore';
import {
  CONSTELLATION_ECHO_ACCESS_GATE,
  CONSTELLATION_GOAL_ACCESS_GATE,
} from '../gate';
import { CONSTELLATION_COPY } from '../copy';
import type {
  ConstellationAnnotationKind,
  ConstellationGraphCountsDTO,
  ConstellationRenderState,
} from '../types';
import { ConstellationSeedPreview } from './ConstellationSeedPreview';

type EmptyRenderState = Extract<
  ConstellationRenderState,
  'locked' | 'season_only' | 'patterns_forming'
>;

interface ConstellationEmptyStateProps {
  counts: ConstellationGraphCountsDTO;
  isRefreshing?: boolean;
  onCreateAnnotation?: (kind: ConstellationAnnotationKind) => void;
  onRefresh?: () => void;
  refreshError?: string | null;
  renderState: EmptyRenderState;
  seasonLabel: string;
}

interface GateProgressProps {
  current: number;
  label: string;
  maximum: number;
}

function GateProgress({ current, label, maximum }: GateProgressProps) {
  const colors = useThemeColors();
  const progress = Math.min((current / maximum) * 100, 100);

  return (
    <View
      accessibilityLabel={`${label}: ${current} of ${maximum}`}
      accessibilityRole="progressbar"
      accessibilityValue={{ max: maximum, min: 0, now: current }}
    >
      <View style={{ alignItems: 'baseline', flexDirection: 'row', justifyContent: 'space-between' }}>
        <Typography variant="label" style={{ color: colors.text.primary }}>
          {label}
        </Typography>
        <Typography variant="caption">{current} of {maximum}</Typography>
      </View>
      <View
        style={{
          backgroundColor: colors.border.divider,
          borderRadius: 999,
          height: 5,
          marginTop: 7,
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            backgroundColor: colors.accent.primary,
            borderRadius: 999,
            height: '100%',
            width: `${progress}%`,
          }}
        />
      </View>
    </View>
  );
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

function AccessProgress({
  counts,
}: Pick<ConstellationEmptyStateProps, 'counts'>) {
  return (
    <View style={{ gap: 16 }}>
      <GateProgress
        current={nonDraftGoalCount(counts)}
        label={CONSTELLATION_COPY.emptyGateGoals}
        maximum={CONSTELLATION_GOAL_ACCESS_GATE}
      />
      <GateProgress
        current={counts.source.echoEntries}
        label={CONSTELLATION_COPY.emptyGateEchoes}
        maximum={CONSTELLATION_ECHO_ACCESS_GATE}
      />
    </View>
  );
}

function stateCopy(renderState: EmptyRenderState) {
  switch (renderState) {
    case 'locked':
      return {
        headline: CONSTELLATION_COPY.emptyHeadline,
        body: CONSTELLATION_COPY.lockedBody,
        status: 'Access gate not met',
      };
    case 'season_only':
      return {
        headline: CONSTELLATION_COPY.seasonOnlyHeadline,
        body: CONSTELLATION_COPY.seasonOnlyBody,
        status: 'Season only',
      };
    case 'patterns_forming':
      return {
        headline: CONSTELLATION_COPY.patternsFormingHeadline,
        body: CONSTELLATION_COPY.patternsFormingBody,
        status: 'Patterns forming',
      };
  }
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

        {renderState === 'locked' ? (
          <AccessProgress counts={counts} />
        ) : (
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
              {`${counts.source.echoEntries} Echoes · ${nonDraftGoalCount(counts)} goals · ${counts.source.qualifiedCandidates} qualified patterns`}
            </Typography>
          </View>
        )}

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
            accessibilityLabel="Write an Echo"
            onPress={() => router.push('/(app)/echo')}
            style={{ flex: compact ? undefined : 1 }}
            variant="secondary"
          >
            Write an Echo
          </Button>
        </View>
      </View>
    </Card>
  );
}

export function ConstellationEmptyState({
  counts,
  isRefreshing = false,
  onCreateAnnotation,
  onRefresh,
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
            {renderState !== 'locked' && onCreateAnnotation ? (
              <>
                <Button
                  accessibilityLabel="Create note annotation"
                  onPress={() => onCreateAnnotation('note')}
                  size="compact"
                  variant="secondary"
                >
                  + Note
                </Button>
                <Button
                  accessibilityLabel="Create projection annotation"
                  onPress={() => onCreateAnnotation('projection')}
                  size="compact"
                  variant="secondary"
                >
                  + Projection
                </Button>
              </>
            ) : null}
            {onRefresh ? (
              <Button
                accessibilityLabel={isRefreshing ? 'Refreshing Constellation' : 'Refresh Constellation'}
                disabled={isRefreshing}
                onPress={onRefresh}
                size="compact"
                variant="secondary"
              >
                {isRefreshing ? (
                  <View style={{ alignItems: 'center', flexDirection: 'row', gap: 7 }}>
                    <ActivityIndicator color={colors.accent.primary} size="small" />
                    <Typography variant="label">Refreshing…</Typography>
                  </View>
                ) : 'Refresh'}
              </Button>
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
        {renderState === 'locked'
          ? CONSTELLATION_COPY.emptyFooter
          : 'Nothing is filled in with sample data. New nodes will appear only when the evidence supports them.'}
      </Typography>
    </View>
  );
}
