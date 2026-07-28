import { useEffect, useMemo } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  View,
} from 'react-native';
import {
  router,
  useLocalSearchParams,
  type Href,
} from 'expo-router';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Typography } from '@/components/ui/Typography';
import { useThemeColors, useUIStore } from '@/store/uiStore';
import { CONSTELLATION_COPY } from '../copy';
import {
  adaptGraphDtoToViewModel,
  resolveGraphSelection,
} from '../graph';
import { useConstellation } from '../hooks/useConstellation';
import {
  calculateConstellationLayout,
  calculateSproutedLabelLayout,
  createConstellationLayoutSpec,
} from '../layout';
import { createConstellationVisualTokens } from '../visual-tokens';
import { ConstellationCanvasShell } from './ConstellationCanvasShell';
import { ConstellationEmptyState } from './ConstellationEmptyState';

function normalizeSelectionParam(
  value: string | string[] | undefined,
): string | null {
  if (typeof value === 'string') {
    return value.length > 0 && value.length <= 512 ? value : null;
  }
  if (
    Array.isArray(value)
    && value.length === 1
    && value[0].length > 0
    && value[0].length <= 512
  ) {
    return value[0];
  }
  return null;
}

function ConstellationLoadingState() {
  const colors = useThemeColors();

  return (
    <View
      accessibilityLabel="Loading Constellation"
      accessibilityRole="progressbar"
      accessibilityState={{ busy: true }}
      style={{
        alignItems: 'center',
        flex: 1,
        gap: 12,
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <ActivityIndicator color={colors.accent.primary} size="large" />
      <Typography accessibilityRole="header" variant="title">
        Loading your Constellation
      </Typography>
      <Typography variant="description" style={{ textAlign: 'center' }}>
        Gathering the patterns you have earned…
      </Typography>
    </View>
  );
}

function ConstellationErrorState({
  error,
  onRetry,
  retryable,
}: {
  error: string | null;
  onRetry: () => void;
  retryable: boolean;
}) {
  return (
    <View
      style={{
        alignItems: 'center',
        flex: 1,
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <Card elevated padding="spacious" style={{ maxWidth: 440, width: '100%' }}>
        <View style={{ alignItems: 'center', gap: 14 }}>
          <Typography accessibilityRole="header" variant="heading">
            Constellation is temporarily out of view.
          </Typography>
          <Typography
            accessibilityRole="alert"
            variant="description"
            style={{ textAlign: 'center' }}
          >
            {error ?? CONSTELLATION_COPY.graphUnavailable}
          </Typography>
          {retryable ? (
            <Button
              accessibilityLabel="Retry loading Constellation"
              onPress={onRetry}
            >
              Retry
            </Button>
          ) : null}
        </View>
      </Card>
    </View>
  );
}

export function ConstellationScreen() {
  const colors = useThemeColors();
  const themeMode = useUIStore((state) => state.themeMode);
  const params = useLocalSearchParams<{
    selected?: string | string[];
  }>();
  const constellation = useConstellation();
  const requestedSelection = normalizeSelectionParam(params.selected);
  const hasSelectionParam = params.selected !== undefined;
  const selectedKey = useMemo(
    () => constellation.dto
      ? resolveGraphSelection(constellation.dto, requestedSelection)
      : null,
    [constellation.dto, requestedSelection],
  );
  const graph = useMemo(
    () => constellation.dto
      ? adaptGraphDtoToViewModel(constellation.dto, { selectedKey })
      : null,
    [constellation.dto, selectedKey],
  );
  const layout = useMemo(
    () => graph
      ? calculateConstellationLayout(
          graph,
          createConstellationLayoutSpec(graph),
        )
      : null,
    [graph],
  );
  const tokens = useMemo(
    () => createConstellationVisualTokens(colors, themeMode),
    [colors, themeMode],
  );

  useEffect(() => {
    if (
      constellation.dto
      && hasSelectionParam
      && selectedKey === null
    ) {
      router.replace('/constellation');
    }
  }, [constellation.dto, hasSelectionParam, selectedKey]);

  const seasonLabel = graph?.nodes.find(
    (node) => node.entityType === 'earned_node' && node.node.kind === 'season',
  )?.node.label ?? 'Current Season';
  const selectedNode = graph?.nodes.find(
    (node) => node.selectionKey === selectedKey,
  );
  const sproutedLabel = (
    layout
    && selectedNode?.entityType === 'earned_node'
    && selectedNode.node.kind === 'goal'
  )
    ? calculateSproutedLabelLayout(layout, selectedKey)
    : null;

  function updateSelection(nextSelection: string | null) {
    const next = nextSelection === selectedKey ? null : nextSelection;
    if (!next) {
      router.push('/constellation');
      return;
    }
    router.push({
      pathname: '/constellation',
      params: { selected: next },
    } as Href);
  }

  return (
    <SafeAreaView
      style={{
        backgroundColor: colors.background.page,
        flex: 1,
        minHeight: 0,
      }}
    >
      {constellation.status === 'loading' ? (
        <ConstellationLoadingState />
      ) : constellation.status === 'error' ? (
        <ConstellationErrorState
          error={constellation.error}
          onRetry={constellation.retry}
          retryable={constellation.retryable}
        />
      ) : graph && layout && constellation.dto ? (
        constellation.dto.state.renderState === 'graph' ? (
          <ConstellationCanvasShell
            graph={graph}
            isRefreshing={constellation.isRefreshing}
            layout={layout}
            onRefresh={constellation.refresh}
            onSelect={updateSelection}
            refreshError={constellation.refreshError}
            seasonLabel={seasonLabel}
            selectedKey={selectedKey}
            sproutedLabel={sproutedLabel}
            tokens={tokens}
          />
        ) : (
          <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
            <ConstellationEmptyState
              counts={graph.counts}
              isRefreshing={constellation.isRefreshing}
              onRefresh={constellation.refresh}
              refreshError={constellation.refreshError}
              renderState={constellation.dto.state.renderState}
              seasonLabel={seasonLabel}
            />
          </ScrollView>
        )
      ) : (
        <ConstellationErrorState
          error={CONSTELLATION_COPY.graphUnavailable}
          onRetry={constellation.retry}
          retryable
        />
      )}
    </SafeAreaView>
  );
}
