import { ActivityIndicator, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Typography } from '@/components/ui/Typography';
import { useThemeColors } from '@/store/uiStore';
import {
  CONSTELLATION_ECHO_ACCESS_GATE,
  CONSTELLATION_GOAL_ACCESS_GATE,
} from '../gate';
import { useConstellationGate } from '../hooks/useConstellationGate';
import { CONSTELLATION_COPY } from '../copy';
import { ConstellationSeedPreview } from './ConstellationSeedPreview';

type ConstellationGate = ReturnType<typeof useConstellationGate>;

interface ConstellationEmptyStateProps {
  gate: ConstellationGate;
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

function ActivityProgress({ gate }: ConstellationEmptyStateProps) {
  const colors = useThemeColors();

  if (gate.status === 'loading') {
    return (
      <View
        accessibilityLabel="Loading your Constellation activity progress"
        accessibilityRole="progressbar"
        accessibilityState={{ busy: true }}
        style={{ alignItems: 'center', gap: 10, paddingVertical: 28 }}
      >
        <ActivityIndicator color={colors.accent.primary} size="small" />
        <Typography variant="description" style={{ textAlign: 'center' }}>
          Loading your activity progress…
        </Typography>
      </View>
    );
  }

  if (gate.status === 'error' || gate.status === 'cancelled') {
    const cancelled = gate.status === 'cancelled';
    return (
      <View style={{ alignItems: 'center', gap: 14, paddingVertical: 18 }}>
        <Typography accessibilityRole="alert" variant="description" style={{ textAlign: 'center' }}>
          {cancelled ? 'Loading was paused.' : gate.error ?? CONSTELLATION_COPY.graphUnavailable}
        </Typography>
        <Button
          accessibilityLabel="Retry loading Constellation activity progress"
          onPress={gate.retry}
          size="compact"
          variant="secondary"
        >
          Retry
        </Button>
      </View>
    );
  }

  if (!gate.summary) return null;

  return (
    <View style={{ gap: 16 }}>
      <GateProgress
        current={gate.summary.goalCount}
        label={CONSTELLATION_COPY.emptyGateGoals}
        maximum={CONSTELLATION_GOAL_ACCESS_GATE}
      />
      <GateProgress
        current={gate.summary.echoCount}
        label={CONSTELLATION_COPY.emptyGateEchoes}
        maximum={CONSTELLATION_ECHO_ACCESS_GATE}
      />
      {gate.accessEligible ? (
        <View
          accessibilityRole="summary"
          style={{
            backgroundColor: colors.background.subtle,
            borderRadius: 10,
            padding: 12,
          }}
        >
          <Typography variant="caption" style={{ color: colors.text.accent, textAlign: 'center' }}>
            Your activity gate is complete. Patterns still appear here only when they are proven.
          </Typography>
        </View>
      ) : null}
    </View>
  );
}

function IntroductionCard({ gate }: ConstellationEmptyStateProps) {
  const colors = useThemeColors();
  const { width } = useWindowDimensions();
  const compact = width < 720;

  return (
    <Card
      elevated
      padding="spacious"
      style={{
        maxWidth: 360,
        width: '100%',
      }}
    >
      <View style={{ gap: 16 }}>
        <View style={{ gap: 8 }}>
          <Typography variant="section-eyebrow" style={{ color: colors.text.muted }}>
            {CONSTELLATION_COPY.emptyEyebrow}
          </Typography>
          <Typography accessibilityRole="header" variant="heading" style={{ fontSize: compact ? 24 : 28, lineHeight: compact ? 31 : 35 }}>
            {CONSTELLATION_COPY.emptyHeadline}
          </Typography>
          <Typography variant="description">
            {CONSTELLATION_COPY.emptyBody}
          </Typography>
        </View>

        <ActivityProgress gate={gate} />

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

export function ConstellationEmptyState({ gate }: ConstellationEmptyStateProps) {
  const colors = useThemeColors();
  const { width } = useWindowDimensions();
  const compact = width < 720;

  return (
    <View style={{ backgroundColor: colors.background.page, flex: 1 }}>
      <View style={{ paddingHorizontal: compact ? 20 : 32, paddingTop: compact ? 24 : 28 }}>
        <Typography accessibilityRole="header" variant="heading">
          Constellation
        </Typography>
        <Typography variant="subtitle" style={{ marginTop: 2 }}>
          Season 01 · beginning
        </Typography>
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
            <ConstellationSeedPreview compact />
            <IntroductionCard gate={gate} />
          </View>
        ) : (
          <View style={{ alignSelf: 'center', height: 520, maxWidth: 1040, position: 'relative', width: '100%' }}>
            <ConstellationSeedPreview />
            <View style={{ position: 'absolute', right: 0, top: 36 }}>
              <IntroductionCard gate={gate} />
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
        {CONSTELLATION_COPY.emptyFooter}
      </Typography>
    </View>
  );
}
