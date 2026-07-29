import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  useWindowDimensions,
} from 'react-native';
import { DARK_THEME, LIGHT_THEME } from '@/constants/colors';
import { useUIStore } from '@/store/uiStore';
import {
  calculateConstellationLayout,
  calculateSproutedLabelLayout,
} from '../layout.ts';
import {
  focusGraphViewModel,
  selectConnectedNeighborhood,
} from '../graph.ts';
import { getConstellationResponsiveLayout } from '../responsive.ts';
import { createConstellationVisualTokens, type ConstellationAppearance } from '../visual-tokens.ts';
import { ConstellationCanvasShell } from '../components/ConstellationCanvasShell';
import { ConstellationEmptyState } from '../components/ConstellationEmptyState';
import { ConstellationGenericInspector } from '../components/ConstellationGenericInspector';
import { ConstellationGoalEvidencePanel } from '../components/ConstellationGoalEvidencePanel';
import { ConstellationReflectionInspector } from '../components/ConstellationReflectionInspector';
import {
  constellationPreviewEmptyCounts,
  constellationPreviewGoalEvidence,
  constellationPreviewReflectionInspector,
} from './inspector-fixtures.dev.ts';
import type { ConstellationPreviewState } from './preview-state.dev.ts';
import {
  CONSTELLATION_RENDERER_INITIAL_SELECTION,
  constellationRendererFixtureGraph,
  constellationRendererFixtureLayoutSpec,
} from './renderer-fixture.dev.ts';

interface ConstellationFixturePreviewProps {
  appearance: ConstellationAppearance;
  previewState: ConstellationPreviewState;
}

const GOAL_SELECTION = 'node:renderer-goal-train';
const REFLECTION_SELECTION = 'node:renderer-reflection-motion';

function initialSelection(previewState: ConstellationPreviewState): string | null {
  switch (previewState) {
    case 'goal':
      return GOAL_SELECTION;
    case 'reflection':
      return REFLECTION_SELECTION;
    case 'canvas':
      return CONSTELLATION_RENDERER_INITIAL_SELECTION;
    case 'empty':
      return null;
  }
}

export function ConstellationFixturePreview({
  appearance,
  previewState,
}: ConstellationFixturePreviewProps) {
  const { height, width } = useWindowDimensions();
  const themeMode = useUIStore((state) => state.themeMode);
  const sidebarCollapsed = useUIStore((state) => state.sidebarCollapsed);
  const originalUiState = useRef({
    sidebarCollapsed: useUIStore.getState().sidebarCollapsed,
    themeMode: useUIStore.getState().themeMode,
  });
  const [selectedKey, setSelectedKey] = useState<string | null>(
    initialSelection(previewState),
  );
  const [inspectorOpen, setInspectorOpen] = useState(
    previewState === 'goal' || previewState === 'reflection',
  );
  const colors = appearance === 'dark' ? DARK_THEME : LIGHT_THEME;
  const tokens = useMemo(
    () => createConstellationVisualTokens(colors, appearance),
    [appearance, colors],
  );
  const focusedGraph = useMemo(
    () => inspectorOpen
      ? focusGraphViewModel(constellationRendererFixtureGraph, selectedKey)
      : constellationRendererFixtureGraph,
    [inspectorOpen, selectedKey],
  );
  const fixtureLayout = useMemo(
    () => calculateConstellationLayout(
      focusedGraph,
      constellationRendererFixtureLayoutSpec,
    ),
    [focusedGraph],
  );
  const selectedNode = constellationRendererFixtureGraph.nodes.find(
    (node) => node.selectionKey === selectedKey,
  );
  const neighborhood = selectedNode
    ? selectConnectedNeighborhood(
        constellationRendererFixtureGraph.nodes,
        constellationRendererFixtureGraph.edges,
        selectedNode.id,
      )
    : null;
  const connectedNodes = neighborhood?.nodes.filter(
    (node) => node.selectionKey !== selectedKey,
  ) ?? [];
  const selectedGoal = (
    selectedNode?.entityType === 'earned_node'
    && selectedNode.node.kind === 'goal'
  )
    ? selectedNode.node
    : null;
  const selectedReflection = (
    selectedNode?.entityType === 'earned_node'
    && selectedNode.node.kind === 'reflection'
  )
    ? selectedNode.node
    : null;
  const { narrow } = getConstellationResponsiveLayout(width, true);
  const sproutedLabel = useMemo(() => {
    if (
      selectedNode?.entityType !== 'earned_node'
      || selectedNode.node.kind !== 'goal'
    ) {
      return null;
    }
    return calculateSproutedLabelLayout(fixtureLayout, selectedKey);
  }, [fixtureLayout, selectedKey, selectedNode]);

  useLayoutEffect(() => {
    useUIStore.setState({
      sidebarCollapsed: true,
      themeMode: appearance,
    });
  }, [appearance]);

  useEffect(() => () => {
    useUIStore.setState(originalUiState.current);
  }, []);

  useEffect(() => {
    setSelectedKey(initialSelection(previewState));
    setInspectorOpen(
      previewState === 'goal' || previewState === 'reflection',
    );
  }, [previewState]);

  if (themeMode !== appearance || !sidebarCollapsed) {
    return (
      <View
        style={{
          backgroundColor: tokens.canvas.background,
          flex: 1,
          minHeight: Math.max(height, 640),
        }}
      />
    );
  }

  if (previewState === 'empty') {
    return (
      <SafeAreaView
        style={{
          backgroundColor: colors.background.page,
          flex: 1,
          minHeight: Math.max(height, 640),
        }}
      >
        <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
          <ConstellationEmptyState
            counts={constellationPreviewEmptyCounts}
            renderState="season_only"
            seasonLabel="Season 03"
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={{
        backgroundColor: tokens.canvas.background,
        flex: 1,
        minHeight: Math.max(height, 720),
      }}
    >
      <View style={{ flex: 1, flexDirection: 'row', minHeight: 0 }}>
        {narrow && inspectorOpen ? null : (
          <View style={{ flex: 1, minHeight: 0 }}>
            <ConstellationCanvasShell
              fixture
              focusLabel={inspectorOpen ? selectedNode?.node.label ?? null : null}
              graph={focusedGraph}
              layout={fixtureLayout}
              onSelect={(selectionKey) => {
                setSelectedKey((current) => (
                  current === selectionKey ? null : selectionKey
                ));
              }}
              seasonLabel="Season 03"
              selectedKey={selectedKey}
              sproutedLabel={sproutedLabel}
              tokens={tokens}
            />
          </View>
        )}
        {inspectorOpen && selectedGoal ? (
          <ConstellationGoalEvidencePanel
            connectedCount={connectedNodes.length}
            evidence={constellationPreviewGoalEvidence}
            goalDescription={selectedGoal.description}
            goalTitle={selectedGoal.label}
            onClose={() => setInspectorOpen(false)}
            selectionKey={selectedGoal.selectionKey}
          />
        ) : inspectorOpen && selectedReflection ? (
          <ConstellationReflectionInspector
            inspector={constellationPreviewReflectionInspector}
            node={selectedReflection}
            onClose={() => setInspectorOpen(false)}
            onReadInEcho={() => undefined}
          />
        ) : inspectorOpen && selectedNode?.entityType === 'earned_node' ? (
          <ConstellationGenericInspector
            neighbors={connectedNodes}
            node={selectedNode.node}
            onClose={() => setInspectorOpen(false)}
            onSelect={setSelectedKey}
          />
        ) : null}
      </View>
    </SafeAreaView>
  );
}
