import { Platform, ScrollView, View } from 'react-native';
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

interface ConstellationCanvasShellProps {
  fixture?: boolean;
  graph: ConstellationGraphViewModel;
  isRefreshing?: boolean;
  layout: ConstellationLayout;
  onRefresh?: () => void;
  onSelect: (selectionKey: string | null) => void;
  refreshError?: string | null;
  seasonLabel: string;
  selectedKey: string | null;
  sproutedLabel: SproutedLabelLayout | null;
  tokens: ConstellationVisualTokens;
}

const GRADIENT_IDS = {
  ambient: 'constellation-ambient',
  background: 'constellation-background',
  grain: 'constellation-grain',
  mixedEdge: 'constellation-edge-mixed',
  budHalo: 'constellation-halo-bud',
  roseHalo: 'constellation-halo-rose',
  thornHalo: 'constellation-halo-thorn',
  tealHalo: 'constellation-halo-teal',
} as const;

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

function GraphDefinitions({ tokens }: { tokens: ConstellationVisualTokens }) {
  return (
    <Defs>
      <LinearGradient id={GRADIENT_IDS.background} x1="0%" x2="100%" y1="0%" y2="100%">
        <Stop offset="0%" stopColor={tokens.canvas.background} stopOpacity={1} />
        <Stop offset="100%" stopColor={tokens.canvas.backgroundDeep} stopOpacity={1} />
      </LinearGradient>
      <RadialGradient id={GRADIENT_IDS.ambient}>
        <Stop offset="0%" stopColor={tokens.node.seasonStroke} stopOpacity={0.16} />
        <Stop offset="48%" stopColor={tokens.canvas.backgroundDeep} stopOpacity={0.9} />
        <Stop offset="100%" stopColor={tokens.canvas.background} stopOpacity={1} />
      </RadialGradient>
      <LinearGradient id={GRADIENT_IDS.mixedEdge} x1="0%" x2="100%" y1="0%" y2="0%">
        <Stop offset="0%" stopColor={tokens.brt.bud} stopOpacity={0.82} />
        <Stop offset="52%" stopColor={tokens.brt.rose} stopOpacity={0.82} />
        <Stop offset="100%" stopColor={tokens.brt.thorn} stopOpacity={0.82} />
      </LinearGradient>
      <Pattern
        height={12}
        id={GRADIENT_IDS.grain}
        patternUnits="userSpaceOnUse"
        width={12}
      >
        <Circle cx={2} cy={2} fill={tokens.canvas.grain} fillOpacity={0.3} r={0.8} />
      </Pattern>
      <HaloGradient color={tokens.canvas.halo.bud} id={GRADIENT_IDS.budHalo} />
      <HaloGradient color={tokens.canvas.halo.rose} id={GRADIENT_IDS.roseHalo} />
      <HaloGradient color={tokens.canvas.halo.thorn} id={GRADIENT_IDS.thornHalo} />
      <HaloGradient color={tokens.canvas.halo.teal} id={GRADIENT_IDS.tealHalo} />
    </Defs>
  );
}

function GraphHalos({
  graph,
  layout,
}: {
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
            bud: GRADIENT_IDS.budHalo,
            rose: GRADIENT_IDS.roseHalo,
            thorn: GRADIENT_IDS.thornHalo,
          }[node.node.brtCategory];
        } else if (node?.entityType === 'annotation' && node.node.kind === 'projection') {
          gradientId = GRADIENT_IDS.tealHalo;
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
}: Omit<ConstellationCanvasShellProps, 'fixture' | 'seasonLabel'>) {
  const selectedLayout = layout.nodes.find((node) => node.selectionKey === selectedKey);
  const selectedNode = selectedKey ? nodeForLayout(graph, selectedKey) : undefined;

  return (
    <Svg
      accessibilityLabel="Visual Constellation graph"
      height="100%"
      preserveAspectRatio="xMidYMid meet"
      viewBox={`0 0 ${layout.viewBox.width} ${layout.viewBox.height}`}
      width="100%"
    >
      <GraphDefinitions tokens={tokens} />
      <Rect
        fill={`url(#${tokens.appearance === 'dark' ? GRADIENT_IDS.ambient : GRADIENT_IDS.background})`}
        height={layout.viewBox.height}
        width={layout.viewBox.width}
      />
      {tokens.appearance === 'dark' ? (
        <Rect
          fill={`url(#${GRADIENT_IDS.grain})`}
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
      <GraphHalos graph={graph} layout={layout} />
      <G>
        {layout.edges.map((edge) => (
          <ConstellationEdge
            edge={edge}
            gradientId={GRADIENT_IDS.mixedEdge}
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
                  onSelect={onSelect}
                  tokens={tokens}
                />
              );
          }
        })}
      </G>
      {selectedLayout ? <SelectionRing node={selectedLayout} tokens={tokens} /> : null}
      {sproutedLabel && selectedNode?.entityType === 'earned_node' ? (
        <SproutedLabel layout={sproutedLabel} node={selectedNode.node} tokens={tokens} />
      ) : null}
    </Svg>
  );
}

export function ConstellationCanvasShell(props: ConstellationCanvasShellProps) {
  if (Platform.OS !== 'web') {
    return (
      <ScrollView style={{ backgroundColor: props.tokens.canvas.background }}>
        <ConstellationHeaderMetadata
          counts={props.graph.counts}
          fixture={props.fixture}
          isRefreshing={props.isRefreshing}
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
    <View style={{ backgroundColor: props.tokens.canvas.background, flex: 1, minHeight: 640 }}>
      <ConstellationHeaderMetadata
        counts={props.graph.counts}
        fixture={props.fixture}
        isRefreshing={props.isRefreshing}
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
        <ConstellationLegend tokens={props.tokens} />
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
