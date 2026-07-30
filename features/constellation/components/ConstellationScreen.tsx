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
import { useConstellationLayout } from '../hooks/useConstellationLayout';
import { useBrtInspector } from '../hooks/useBrtInspector';
import { useGoalEvidence } from '../hooks/useGoalEvidence';
import { useReflectionInspector } from '../hooks/useReflectionInspector';
import {
  calculateConstellationLayout,
  calculateSproutedLabelLayout,
  createConstellationLayoutSpec,
  moveConstellationNode,
  sanitizeConstellationPositionOverrides,
  type ConstellationNodePosition,
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
import { ConstellationGoalLinkPanel } from './ConstellationGoalLinkPanel';
import { ConstellationGenericInspector } from './ConstellationGenericInspector';
import { ConstellationGoalCategoryInspector } from './ConstellationGoalCategoryInspector';
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
  const [goalLinkPanelOpen, setGoalLinkPanelOpen] = useState(false);
  const [selectedGoalLinkId, setSelectedGoalLinkId] =
    useState<string | null>(null);
  const [goalLinkInitialGoalId, setGoalLinkInitialGoalId] =
    useState<string | null>(null);
  const params = useLocalSearchParams<{
    selected?: string | string[];
  }>();
  const constellation = useConstellation();
  const layoutStorage = useConstellationLayout();
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
  const defaultLayoutSpec = useMemo(
    () => graph ? createConstellationLayoutSpec(graph) : null,
    [graph],
  );
  const layoutPositionOverrides = useMemo(
    () => graph
      ? sanitizeConstellationPositionOverrides(
          graph,
          layoutStorage.positions,
        )
      : {},
    [graph, layoutStorage.positions],
  );
  const layoutSpec = useMemo(
    () => defaultLayoutSpec
      ? {
          ...defaultLayoutSpec,
          nodePositions: {
            ...defaultLayoutSpec.nodePositions,
            ...layoutPositionOverrides,
          },
        }
      : null,
    [defaultLayoutSpec, layoutPositionOverrides],
  );
  const layout = useMemo(
    () => focusedGraph && layoutSpec
      ? calculateConstellationLayout(
          focusedGraph,
          layoutSpec,
        )
      : null,
    [focusedGraph, layoutSpec],
  );
  const tokens = useMemo(
    () => createConstellationVisualTokens(colors, themeMode),
    [colors, themeMode],
  );

  const seasonLabel = 'Current Season';
  const latestMovedPositionRef = useRef(
    new Map<string, ConstellationNodePosition>(),
  );
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
    selectedCluster?.goalId ?? null,
    selectedCluster?.brtCategory ?? null,
  );
  const selectedAnnotation = selectedNode?.entityType === 'annotation'
    ? selectedNode.node
    : undefined;
  const selectedGoalCategory = selectedNode?.entityType === 'virtual_goal_category'
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
  const visibleGoalNodes = useMemo(
    () => constellation.dto?.earnedNodes.filter(
      (node) => node.kind === 'goal',
    ) ?? [],
    [constellation.dto],
  );
  const userGoalLinks = useMemo(
    () => constellation.dto?.edges.filter(
      (edge) => edge.kind === 'user_goal_link',
    ) ?? [],
    [constellation.dto],
  );
  const annotationPanelOpen = createKind !== null || selectedAnnotation !== undefined;
  const goalEvidencePanelOpen = (
    selectedGoal !== undefined
    && selectedCluster === undefined
  );
  const sidePanelOpen = (
    goalLinkPanelOpen
    || annotationPanelOpen
    || selectedNode !== undefined
  );
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
    setGoalLinkPanelOpen(false);
    setSelectedGoalLinkId(null);
    setGoalLinkInitialGoalId(null);
    constellation.clearMutationError();
    constellation.clearGoalLinkMutationError();
    goalEvidence.clearMutationError();
    navigateSelection(nextSelection === selectedKey ? null : nextSelection);
  }

  function moveNode(
    selectionKey: string,
    normalized: { x: number; y: number },
  ) {
    if (!graph || !defaultLayoutSpec) return;
    layoutStorage.setPositions((current) => {
      const currentSpec = {
        ...defaultLayoutSpec,
        nodePositions: {
          ...defaultLayoutSpec.nodePositions,
          ...current,
        },
      };
      const moved = moveConstellationNode(
        graph,
        currentSpec,
        selectionKey,
        normalized,
      );
      const nextPosition = moved.nodePositions[selectionKey];
      if (nextPosition) {
        latestMovedPositionRef.current.set(selectionKey, nextPosition);
      }
      return nextPosition
        ? { ...current, [selectionKey]: nextPosition }
        : current;
    });
  }

  function finishMovingNode(selectionKey: string) {
    const position = latestMovedPositionRef.current.get(selectionKey);
    if (!position) return;
    latestMovedPositionRef.current.delete(selectionKey);
    void layoutStorage.persistPosition(selectionKey, position);
  }

  async function requestLayoutReset() {
    if (
      Platform.OS === 'web'
      && typeof window !== 'undefined'
      && !window.confirm(
        'Reset every Constellation node to its default position?',
      )
    ) {
      return;
    }
    latestMovedPositionRef.current.clear();
    await layoutStorage.reset();
  }

  function openCreatePanel(kind: ConstellationAnnotationKind) {
    if (goalEvidence.mutation.isSaving) return;
    constellation.clearMutationError();
    constellation.clearGoalLinkMutationError();
    setGoalLinkPanelOpen(false);
    setSelectedGoalLinkId(null);
    setGoalLinkInitialGoalId(null);
    setCreateKind(kind);
    if (selectedKey) navigateSelection(null);
  }

  function openGoalLinks(
    goalLinkId: string | null = null,
    initialGoalId: string | null = selectedGoal?.source.id ?? null,
  ) {
    if (
      constellation.mutation.isSaving
      || goalEvidence.mutation.isSaving
    ) {
      return;
    }
    constellation.clearMutationError();
    constellation.clearGoalLinkMutationError();
    setCreateKind(null);
    setGoalLinkInitialGoalId(initialGoalId);
    setSelectedGoalLinkId(goalLinkId);
    setGoalLinkPanelOpen(true);
    if (selectedKey) navigateSelection(null);
  }

  function closeGoalLinks() {
    if (constellation.goalLinkMutation.isSaving) return;
    constellation.clearGoalLinkMutationError();
    setGoalLinkPanelOpen(false);
    setSelectedGoalLinkId(null);
    setGoalLinkInitialGoalId(null);
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
            layout={layout}
            layoutError={layoutStorage.error}
            onCreateAnnotation={openCreatePanel}
            onMoveNode={moveNode}
            onMoveNodeEnd={finishMovingNode}
            onOpenGoalLinks={() => openGoalLinks()}
            onResetLayout={() => {
              void requestLayoutReset();
            }}
            onSelect={updateSelection}
            onSelectGoalLink={(goalLinkId) => openGoalLinks(goalLinkId, null)}
            refreshError={constellation.refreshError}
            seasonLabel={seasonLabel}
            selectedGoalLinkId={selectedGoalLinkId}
            selectedKey={selectedKey}
            sproutedLabel={sproutedLabel}
            tokens={tokens}
            isLayoutBusy={
              layoutStorage.isLoading
              || layoutStorage.isResetting
              || layoutStorage.isSaving
            }
          />
        )
      : (
          <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
            <ConstellationEmptyState
              counts={graph.counts}
              onCreateAnnotation={openCreatePanel}
              onOpenGoalLinks={() => openGoalLinks()}
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
          {goalLinkPanelOpen ? (
            <ConstellationGoalLinkPanel
              goals={visibleGoalNodes}
              initialGoalId={goalLinkInitialGoalId}
              initialLinkId={selectedGoalLinkId}
              links={userGoalLinks}
              mutation={constellation.goalLinkMutation}
              onClose={closeGoalLinks}
              onCreate={constellation.createGoalLink}
              onEdit={constellation.editGoalLink}
              onRemove={constellation.removeGoalLink}
            />
          ) : annotationPanelOpen ? (
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
              goalLinks={userGoalLinks.flatMap((link) => {
                if (
                  link.from.id !== selectedGoal.source.id
                  && link.to.id !== selectedGoal.source.id
                ) {
                  return [];
                }
                const otherGoalId = link.from.id === selectedGoal.source.id
                  ? link.to.id
                  : link.from.id;
                const otherGoal = visibleGoalNodes.find(
                  (goal) => goal.id === otherGoalId,
                );
                return [{
                  linkId: link.linkId,
                  note: link.note,
                  otherGoalTitle: otherGoal?.label ?? 'Unavailable goal',
                }];
              })}
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
              onReadEntry={(entryId) => router.push({
                pathname: '/echo',
                params: { entryId },
              } as Href)}
              onManageGoalLink={(goalLinkId) => {
                openGoalLinks(goalLinkId, selectedGoal.source.id);
              }}
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
          ) : selectedGoalCategory ? (
            <ConstellationGoalCategoryInspector
              neighbors={connectedNodes}
              node={selectedGoalCategory}
              onClose={closeInspector}
              onSelect={updateSelection}
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
