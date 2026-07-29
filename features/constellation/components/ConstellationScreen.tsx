import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Platform,
  SafeAreaView,
  ScrollView,
  View,
  useWindowDimensions,
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
  focusGraphViewModel,
  resolveGraphSelection,
  selectConnectedNeighborhood,
} from '../graph';
import { useConstellation } from '../hooks/useConstellation';
import { useBrtInspector } from '../hooks/useBrtInspector';
import { useGoalEvidence } from '../hooks/useGoalEvidence';
import { useReflectionInspector } from '../hooks/useReflectionInspector';
import {
  calculateConstellationLayout,
  calculateSproutedLabelLayout,
  createConstellationLayoutSpec,
} from '../layout';
import { isPersistedAnnotationAnchorTarget } from '../annotation-state';
import type { ConstellationAnnotationKind } from '../types';
import { createConstellationVisualTokens } from '../visual-tokens';
import { getConstellationResponsiveLayout } from '../responsive';
import { ConstellationAnnotationPanel } from './ConstellationAnnotationPanel';
import { ConstellationBrtInspector } from './ConstellationBrtInspector';
import { ConstellationCanvasShell } from './ConstellationCanvasShell';
import { ConstellationEmptyState } from './ConstellationEmptyState';
import { ConstellationGoalEvidencePanel } from './ConstellationGoalEvidencePanel';
import { ConstellationGenericInspector } from './ConstellationGenericInspector';
import { CONSTELLATION_GRAPH_FOCUS_ID } from './ConstellationInspectorSurface';
import { ConstellationReflectionInspector } from './ConstellationReflectionInspector';
import { ConstellationLoadingMark } from './ConstellationLoadingMark';

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
      <ConstellationLoadingMark color={colors.accent.primary} size="large" />
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
  const sidebarCollapsed = useUIStore((state) => state.sidebarCollapsed);
  const { width } = useWindowDimensions();
  const { narrow } = getConstellationResponsiveLayout(width, sidebarCollapsed);
  const [createKind, setCreateKind] =
    useState<ConstellationAnnotationKind | null>(null);
  const params = useLocalSearchParams<{
    selected?: string | string[];
  }>();
  const constellation = useConstellation();
  const requestedSelection = normalizeSelectionParam(params.selected);
  const hasSelectionParam = params.selected !== undefined;
  const [selection, setSelection] = useState<string | null>(
    requestedSelection,
  );
  const selectedKey = useMemo(
    () => constellation.dto
      ? resolveGraphSelection(constellation.dto, selection)
      : null,
    [constellation.dto, selection],
  );
  const previousSelectedKeyRef = useRef<string | null>(null);

  useEffect(() => {
    const previousSelectedKey = previousSelectedKeyRef.current;
    previousSelectedKeyRef.current = selectedKey;
    if (
      Platform.OS !== 'web'
      || !previousSelectedKey
      || selectedKey
      || typeof document === 'undefined'
    ) {
      return;
    }
    const frame = requestAnimationFrame(() => {
      document.getElementById(CONSTELLATION_GRAPH_FOCUS_ID)?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [selectedKey]);

  const graph = useMemo(
    () => constellation.dto
      ? adaptGraphDtoToViewModel(constellation.dto, { selectedKey })
      : null,
    [constellation.dto, selectedKey],
  );
  const focusedGraph = useMemo(
    () => graph ? focusGraphViewModel(graph, selectedKey) : null,
    [graph, selectedKey],
  );
  const layout = useMemo(
    () => focusedGraph
      ? calculateConstellationLayout(
          focusedGraph,
          createConstellationLayoutSpec(focusedGraph),
        )
      : null,
    [focusedGraph],
  );
  const tokens = useMemo(
    () => createConstellationVisualTokens(colors, themeMode),
    [colors, themeMode],
  );

  const seasonLabel = 'Current Season';
  const selectedNode = graph?.nodes.find(
    (node) => node.selectionKey === selectedKey,
  );
  const directlySelectedGoal = (
    selectedNode?.entityType === 'earned_node'
    && selectedNode.node.kind === 'goal'
  )
    ? selectedNode.node
    : undefined;
  const selectedCluster = selectedNode?.entityType === 'virtual_brt_cluster'
    ? selectedNode.node
    : undefined;
  const selectedGoalViewNode = selectedCluster
    ? graph?.nodes.find((node) => (
        node.entityType === 'earned_node'
        && node.node.kind === 'goal'
        && node.id === selectedCluster.goalNodeId
      ))
    : undefined;
  const selectedGoal = directlySelectedGoal ?? (
    selectedGoalViewNode?.entityType === 'earned_node'
    && selectedGoalViewNode.node.kind === 'goal'
      ? selectedGoalViewNode.node
      : undefined
  );
  const goalEvidence = useGoalEvidence({
    goalId: selectedGoal?.source.id ?? selectedCluster?.goalId ?? null,
    onItemsChanged: constellation.syncGoalEvidence,
  });
  const selectedReflection = (
    selectedNode?.entityType === 'earned_node'
    && selectedNode.node.kind === 'reflection'
  )
    ? selectedNode.node
    : undefined;
  const reflectionInspector = useReflectionInspector(
    selectedReflection?.id ?? null,
  );
  const brtInspector = useBrtInspector(
    selectedCluster?.brtCategory ?? null,
  );
  const selectedAnnotation = selectedNode?.entityType === 'annotation'
    ? selectedNode.node
    : undefined;
  const visibleEarnedNodes = useMemo(
    () => graph?.nodes.flatMap((node) => (
      node.entityType === 'earned_node'
      && isPersistedAnnotationAnchorTarget(node.node)
        ? [node.node]
        : []
    )) ?? [],
    [graph],
  );
  const annotationPanelOpen = createKind !== null || selectedAnnotation !== undefined;
  const goalEvidencePanelOpen = (
    selectedGoal !== undefined
    && selectedCluster === undefined
  );
  const sidePanelOpen = annotationPanelOpen || selectedNode !== undefined;
  const neighborhood = useMemo(
    () => graph && selectedNode
      ? selectConnectedNeighborhood(graph.nodes, graph.edges, selectedNode.id)
      : undefined,
    [graph, selectedNode],
  );
  const connectedNodes = neighborhood?.nodes.filter(
    (node) => node.selectionKey !== selectedKey,
  ) ?? [];
  const sproutedLabel = (
    layout
    && selectedNode?.entityType === 'earned_node'
    && selectedNode.node.kind === 'goal'
  )
    ? calculateSproutedLabelLayout(layout, selectedKey)
    : null;

  useEffect(() => {
    if (
      constellation.dto
      && selection
      && !selectedKey
      && !constellation.mutation.isSaving
      && !goalEvidence.mutation.isSaving
    ) {
      setSelection(null);
      if (hasSelectionParam) {
        router.setParams({ selected: undefined });
      }
    }
  }, [
    constellation.dto,
    constellation.mutation.isSaving,
    goalEvidence.mutation.isSaving,
    hasSelectionParam,
    selectedKey,
    selection,
  ]);

  function navigateSelection(nextSelection: string | null) {
    setSelection(nextSelection);
    if (hasSelectionParam) {
      router.setParams({ selected: undefined });
    }
  }

  function updateSelection(nextSelection: string | null) {
    if (
      constellation.mutation.isSaving
      || goalEvidence.mutation.isSaving
    ) {
      return;
    }
    setCreateKind(null);
    constellation.clearMutationError();
    goalEvidence.clearMutationError();
    navigateSelection(nextSelection === selectedKey ? null : nextSelection);
  }

  function openCreatePanel(kind: ConstellationAnnotationKind) {
    if (goalEvidence.mutation.isSaving) return;
    constellation.clearMutationError();
    setCreateKind(kind);
    if (selectedKey) navigateSelection(null);
  }

  function closeAnnotationPanel() {
    constellation.clearMutationError();
    setCreateKind(null);
    if (selectedAnnotation) navigateSelection(null);
  }

  function closeGoalEvidencePanel() {
    goalEvidence.clearMutationError();
    navigateSelection(null);
  }

  function closeInspector() {
    constellation.clearMutationError();
    goalEvidence.clearMutationError();
    navigateSelection(null);
  }

  async function saveAnnotation(
    input: Parameters<typeof constellation.createAnnotation>[0],
  ): Promise<boolean> {
    const annotation = selectedAnnotation
      ? await constellation.editAnnotation(selectedAnnotation.id, input)
      : await constellation.createAnnotation(input);
    if (!annotation) return false;

    setCreateKind(null);
    navigateSelection(annotation.selectionKey);
    return true;
  }

  async function archiveAnnotation(): Promise<boolean> {
    if (!selectedAnnotation) return false;
    const archived = await constellation.archiveAnnotation(
      selectedAnnotation.id,
    );
    if (!archived) return false;

    setCreateKind(null);
    navigateSelection(null);
    return true;
  }

  const readyContent = graph && focusedGraph && layout && constellation.dto
    ? constellation.dto.state.renderState === 'graph'
      ? (
          <ConstellationCanvasShell
            focusLabel={
              selectedNode?.entityType === 'earned_node'
              && selectedNode.node.kind === 'season'
                ? 'Current Season'
                : selectedNode?.node.label ?? null
            }
            graph={focusedGraph}
            isRefreshing={constellation.isRefreshing}
            layout={layout}
            onCreateAnnotation={openCreatePanel}
            onRefresh={constellation.refresh}
            onSelect={updateSelection}
            refreshError={constellation.refreshError}
            seasonLabel={seasonLabel}
            selectedKey={selectedKey}
            sproutedLabel={sproutedLabel}
            tokens={tokens}
          />
        )
      : (
          <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
            <ConstellationEmptyState
              counts={graph.counts}
              isRefreshing={constellation.isRefreshing}
              onCreateAnnotation={openCreatePanel}
              onRefresh={constellation.refresh}
              refreshError={constellation.refreshError}
              renderState={constellation.dto.state.renderState}
              seasonLabel={seasonLabel}
            />
          </ScrollView>
        )
    : null;

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
      ) : readyContent && constellation.dto ? (
        <View style={{ flex: 1, flexDirection: 'row', minHeight: 0 }}>
          {narrow && sidePanelOpen ? null : (
            <View
              accessibilityLabel="Constellation graph route"
              nativeID={CONSTELLATION_GRAPH_FOCUS_ID}
              style={{ flex: 1, minHeight: 0 }}
              tabIndex={-1}
            >
              {readyContent}
            </View>
          )}
          {annotationPanelOpen ? (
            <ConstellationAnnotationPanel
              annotation={selectedAnnotation}
              initialKind={createKind ?? selectedAnnotation?.kind}
              mutation={constellation.mutation}
              onArchive={archiveAnnotation}
              onCancel={closeAnnotationPanel}
              onSave={saveAnnotation}
              visibleEarnedNodes={visibleEarnedNodes}
            />
          ) : selectedCluster ? (
            <ConstellationBrtInspector
              inspector={brtInspector}
              node={selectedCluster}
              onClose={closeInspector}
              onEntriesChanged={constellation.refresh}
              onReadEntry={(entryId) => router.push({
                pathname: '/echo',
                params: { entryId },
              } as Href)}
            />
          ) : goalEvidencePanelOpen && selectedGoal ? (
            <ConstellationGoalEvidencePanel
              connectedCount={connectedNodes.length}
              evidence={goalEvidence}
              goalDescription={selectedGoal.description}
              goalTitle={selectedGoal.label}
              onClose={closeGoalEvidencePanel}
              onOpenVault={
                goalEvidence.dto?.goal.vaultId
                  ? () => router.push(
                      `/(app)/goals/${selectedGoal.source.id}/vault` as Href,
                    )
                  : undefined
              }
              selectionKey={selectedKey ?? selectedGoal.selectionKey}
            />
          ) : selectedReflection ? (
            <ConstellationReflectionInspector
              inspector={reflectionInspector}
              node={selectedReflection}
              onClose={closeInspector}
              onReadInEcho={(echoEntryId) => router.push({
                pathname: '/echo',
                params: { entryId: echoEntryId },
              } as Href)}
            />
          ) : selectedNode?.entityType === 'earned_node' ? (
            <ConstellationGenericInspector
              neighbors={connectedNodes}
              node={selectedNode.node}
              onClose={closeInspector}
              onSelect={updateSelection}
            />
          ) : null}
        </View>
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
