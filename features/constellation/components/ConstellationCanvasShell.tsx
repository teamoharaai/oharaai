import { useId, useState } from 'react';
import {
  Platform,
  ScrollView,
  View,
  useWindowDimensions,
} from 'react-native';
import { useUIStore } from '@/store/uiStore';
import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  LinearGradient,
  Pattern,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';
import type {
  ConstellationLayout,
  SproutedLabelLayout,
} from '../layout.ts';
import type {
  ConstellationAnnotationKind,
  ConstellationGraphViewModel,
  ConstellationGraphViewNode,
} from '../types.ts';
import type { ConstellationVisualTokens } from '../visual-tokens.ts';
import { AnnotationShape } from './AnnotationShape';
import { ConstellationAccessibleList } from './ConstellationAccessibleList';
import { ConstellationEdge } from './ConstellationEdge';
import { ConstellationHeaderMetadata } from './ConstellationHeaderMetadata';
import { ConstellationLegend } from './ConstellationLegend';
import { EarnedNodeShape } from './EarnedNodeShape';
import { SelectionRing } from './SelectionRing';
import { SproutedLabel } from './SproutedLabel';
import { VirtualBrtClusterShape } from './VirtualBrtClusterShape';
import { getConstellationResponsiveLayout } from '../responsive';
import {
  createConstellationGradientIds,
  type ConstellationGradientIds,
} from '../svg-ids';

interface ConstellationCanvasShellProps {
  fixture?: boolean;
  focusLabel?: string | null;
  graph: ConstellationGraphViewModel;
  isRefreshing?: boolean;
  layout: ConstellationLayout;
  onCreateAnnotation?: (kind: ConstellationAnnotationKind) => void;
  onRefresh?: () => void;
  onSelect: (selectionKey: string | null) => void;
  refreshError?: string | null;
  seasonLabel: string;
  selectedKey: string | null;
  sproutedLabel: SproutedLabelLayout | null;
  tokens: ConstellationVisualTokens;
}

function nodeForLayout(
  graph: ConstellationGraphViewModel,
  selectionKey: string,
): ConstellationGraphViewNode | undefined {
  return graph.nodes.find((node) => node.selectionKey === selectionKey);
}

function HaloGradient({
  color,
  id,
}: {
  color: string;
  id: string;
}) {
  return (
    <RadialGradient id={id}>
      <Stop offset="0%" stopColor={color} stopOpacity={0.28} />
      <Stop offset="58%" stopColor={color} stopOpacity={0.12} />
      <Stop offset="100%" stopColor={color} stopOpacity={0} />
    </RadialGradient>
  );
}

function GraphDefinitions({
  gradientIds,
  tokens,
}: {
  gradientIds: ConstellationGradientIds;
  tokens: ConstellationVisualTokens;
}) {
  return (
    <Defs>
      <RadialGradient id={gradientIds.ambient}>
        <Stop offset="0%" stopColor={tokens.node.seasonStroke} stopOpacity={0.16} />
        <Stop offset="48%" stopColor={tokens.canvas.backgroundDeep} stopOpacity={0.9} />
        <Stop offset="100%" stopColor={tokens.canvas.background} stopOpacity={1} />
      </RadialGradient>
      <LinearGradient id={gradientIds.mixedEdge} x1="0%" x2="100%" y1="0%" y2="0%">
        <Stop offset="0%" stopColor={tokens.brt.bud} stopOpacity={0.82} />
        <Stop offset="52%" stopColor={tokens.brt.rose} stopOpacity={0.82} />
        <Stop offset="100%" stopColor={tokens.brt.thorn} stopOpacity={0.82} />
      </LinearGradient>
      <Pattern
        height={12}
        id={gradientIds.grain}
        patternUnits="userSpaceOnUse"
        width={12}
      >
        <Circle cx={2} cy={2} fill={tokens.canvas.grain} fillOpacity={0.3} r={0.8} />
      </Pattern>
      <HaloGradient color={tokens.canvas.halo.bud} id={gradientIds.budHalo} />
      <HaloGradient color={tokens.canvas.halo.rose} id={gradientIds.roseHalo} />
      <HaloGradient color={tokens.canvas.halo.thorn} id={gradientIds.thornHalo} />
      <HaloGradient color={tokens.canvas.halo.teal} id={gradientIds.tealHalo} />
    </Defs>
  );
}

function GraphHalos({
  gradientIds,
  graph,
  layout,
}: {
  gradientIds: ConstellationGradientIds;
  graph: ConstellationGraphViewModel;
  layout: ConstellationLayout;
}) {
  return (
    <G>
      {layout.nodes.map((nodeLayout) => {
        const node = nodeForLayout(graph, nodeLayout.selectionKey);
        let gradientId: string | null = null;

        if (node?.entityType === 'virtual_brt_cluster') {
          gradientId = {
            bud: gradientIds.budHalo,
            rose: gradientIds.roseHalo,
            thorn: gradientIds.thornHalo,
          }[node.node.brtCategory];
        } else if (node?.entityType === 'annotation' && node.node.kind === 'projection') {
          gradientId = gradientIds.tealHalo;
        }

        if (!gradientId) return null;
        return (
          <Ellipse
            cx={nodeLayout.center.x}
            cy={nodeLayout.center.y}
            fill={`url(#${gradientId})`}
            key={`halo:${nodeLayout.selectionKey}`}
            rx={nodeLayout.width * 0.9}
            ry={nodeLayout.height * 1.45}
          />
        );
      })}
    </G>
  );
}

function SvgGraph({
  graph,
  layout,
  onSelect,
  selectedKey,
  sproutedLabel,
  tokens,
}: Omit<
  ConstellationCanvasShellProps,
  'fixture' | 'focusLabel' | 'seasonLabel'
>) {
  const reactId = useId();
  const gradientIds = createConstellationGradientIds(reactId);
  const [focusedKey, setFocusedKey] = useState<string | null>(null);
  const selectedNode = selectedKey ? nodeForLayout(graph, selectedKey) : undefined;
  const highlightedKey = selectedKey ?? focusedKey;
  const highlightedLayout = layout.nodes.find(
    (node) => node.selectionKey === highlightedKey,
  );

  return (
    <Svg
      accessibilityLabel="Visual Constellation graph"
      height="100%"
      preserveAspectRatio="xMidYMid meet"
      viewBox={`0 0 ${layout.viewBox.width} ${layout.viewBox.height}`}
      width="100%"
    >
      <GraphDefinitions gradientIds={gradientIds} tokens={tokens} />
      <Rect
        fill={tokens.appearance === 'dark'
          ? `url(#${gradientIds.ambient})`
          : tokens.canvas.background}
        height={layout.viewBox.height}
        width={layout.viewBox.width}
      />
      {tokens.appearance === 'dark' ? (
        <Rect
          fill={`url(#${gradientIds.grain})`}
          height={layout.viewBox.height}
          opacity={0.42}
          width={layout.viewBox.width}
        />
      ) : null}
      <G>
        {layout.orbits.map((orbit) => (
          <Circle
            cx={orbit.center.x}
            cy={orbit.center.y}
            fill="none"
            key={`orbit:${orbit.radius}`}
            opacity={tokens.appearance === 'dark' ? 0.24 : 0.28}
            r={orbit.radius}
            stroke={tokens.canvas.orbit}
            strokeDasharray={tokens.appearance === 'dark' ? undefined : '2 8'}
            strokeWidth={1}
          />
        ))}
      </G>
      <GraphHalos gradientIds={gradientIds} graph={graph} layout={layout} />
      <G>
        {layout.edges.map((edge) => (
          <ConstellationEdge
            edge={edge}
            gradientId={gradientIds.mixedEdge}
            key={edge.id}
            nodes={graph.nodes}
            tokens={tokens}
          />
        ))}
      </G>
      <G>
        {layout.nodes.map((nodeLayout) => {
          const node = nodeForLayout(graph, nodeLayout.selectionKey);
          if (!node) return null;

          switch (node.entityType) {
            case 'earned_node':
              return (
                <EarnedNodeShape
                  key={node.selectionKey}
                  layout={nodeLayout}
                  node={node.node}
                  onFocus={setFocusedKey}
                  onSelect={onSelect}
                  tokens={tokens}
                />
              );
            case 'annotation':
              return (
                <AnnotationShape
                  key={node.selectionKey}
                  layout={nodeLayout}
                  node={node.node}
                  onFocus={setFocusedKey}
                  onSelect={onSelect}
                  tokens={tokens}
                />
              );
            case 'virtual_brt_cluster':
              return (
                <VirtualBrtClusterShape
                  key={node.selectionKey}
                  layout={nodeLayout}
                  node={node.node}
                  onFocus={setFocusedKey}
                  onSelect={onSelect}
                  tokens={tokens}
                />
              );
          }
        })}
      </G>
      {highlightedLayout ? <SelectionRing node={highlightedLayout} tokens={tokens} /> : null}
      {sproutedLabel && selectedNode?.entityType === 'earned_node' ? (
        <SproutedLabel layout={sproutedLabel} node={selectedNode.node} tokens={tokens} />
      ) : null}
    </Svg>
  );
}

export function ConstellationCanvasShell(props: ConstellationCanvasShellProps) {
  const { width } = useWindowDimensions();
  const sidebarCollapsed = useUIStore((state) => state.sidebarCollapsed);
  const { compact } = getConstellationResponsiveLayout(width, sidebarCollapsed);
  if (Platform.OS !== 'web') {
    return (
      <ScrollView style={{ backgroundColor: props.tokens.canvas.background }}>
        <ConstellationHeaderMetadata
          counts={props.graph.counts}
          fixture={props.fixture}
          focusLabel={props.focusLabel}
          isRefreshing={props.isRefreshing}
          onCreateAnnotation={props.onCreateAnnotation}
          onRefresh={props.onRefresh}
          refreshError={props.refreshError}
          seasonLabel={props.seasonLabel}
          tokens={props.tokens}
        />
        <ConstellationAccessibleList
          graph={props.graph}
          onSelect={props.onSelect}
          selectedKey={props.selectedKey}
          tokens={props.tokens}
        />
      </ScrollView>
    );
  }

  return (
    <View
      accessibilityLabel="Constellation graph canvas"
      style={{ backgroundColor: props.tokens.canvas.background, flex: 1, minHeight: 640 }}
    >
      <ConstellationHeaderMetadata
        counts={props.graph.counts}
        fixture={props.fixture}
        focusLabel={props.focusLabel}
        isRefreshing={props.isRefreshing}
        onCreateAnnotation={props.onCreateAnnotation}
        onRefresh={props.onRefresh}
        refreshError={props.refreshError}
        seasonLabel={props.seasonLabel}
        tokens={props.tokens}
      />
      <View style={{ flex: 1, minHeight: 554, position: 'relative' }}>
        <SvgGraph
          graph={props.graph}
          layout={props.layout}
          onSelect={props.onSelect}
          selectedKey={props.selectedKey}
          sproutedLabel={props.sproutedLabel}
          tokens={props.tokens}
        />
        {!compact ? <ConstellationLegend tokens={props.tokens} /> : null}
        <ConstellationAccessibleList
          graph={props.graph}
          hiddenVisually
          onSelect={props.onSelect}
          selectedKey={props.selectedKey}
          tokens={props.tokens}
        />
      </View>
    </View>
  );
}
