import { useEffect, useId, useRef } from 'react';
import {
  type LayoutChangeEvent,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import {
  Gesture,
  GestureDetector,
  MouseButton,
} from 'react-native-gesture-handler';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
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
import { useReducedMotion } from '../hooks/useReducedMotion';
import {
  createConstellationGradientIds,
  type ConstellationGradientIds,
} from '../svg-ids';
import {
  CONSTELLATION_FIT_ZOOM,
  CONSTELLATION_ZOOM_STEP,
  clampConstellationTranslation,
  fitConstellationViewport,
  panConstellationViewport,
  zoomConstellationViewportAt,
  type ConstellationViewportTransform,
} from '../viewport';

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
      <LinearGradient id={gradientIds.mixedEdge} x1="0%" x2="100%" y1="0%" y2="0%">
        <Stop offset="0%" stopColor={tokens.brt.bud} stopOpacity={0.82} />
        <Stop offset="52%" stopColor={tokens.brt.rose} stopOpacity={0.82} />
        <Stop offset="100%" stopColor={tokens.brt.thorn} stopOpacity={0.82} />
      </LinearGradient>
      <HaloGradient color={tokens.canvas.halo.bud} id={gradientIds.budHalo} />
      <HaloGradient color={tokens.canvas.halo.rose} id={gradientIds.roseHalo} />
      <HaloGradient color={tokens.canvas.halo.thorn} id={gradientIds.thornHalo} />
      <HaloGradient color={tokens.canvas.halo.teal} id={gradientIds.tealHalo} />
    </Defs>
  );
}

function CanvasBackdrop({
  layout,
  tokens,
}: Pick<ConstellationCanvasShellProps, 'layout' | 'tokens'>) {
  const reactId = useId();
  const gradientIds = createConstellationGradientIds(reactId);

  return (
    <Svg
      height="100%"
      pointerEvents="none"
      preserveAspectRatio="xMidYMid slice"
      style={StyleSheet.absoluteFill}
      viewBox={`0 0 ${layout.viewBox.width} ${layout.viewBox.height}`}
      width="100%"
    >
      <Defs>
        <RadialGradient id={gradientIds.ambient}>
          <Stop offset="0%" stopColor={tokens.node.seasonStroke} stopOpacity={0.16} />
          <Stop offset="48%" stopColor={tokens.canvas.backgroundDeep} stopOpacity={0.9} />
          <Stop offset="100%" stopColor={tokens.canvas.background} stopOpacity={1} />
        </RadialGradient>
        <Pattern
          height={12}
          id={gradientIds.grain}
          patternUnits="userSpaceOnUse"
          width={12}
        >
          <Circle cx={2} cy={2} fill={tokens.canvas.grain} fillOpacity={0.3} r={0.8} />
        </Pattern>
      </Defs>
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
    </Svg>
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
  const selectedNode = selectedKey ? nodeForLayout(graph, selectedKey) : undefined;
  const highlightedLayout = layout.nodes.find(
    (node) => node.selectionKey === selectedKey,
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
      {highlightedLayout ? <SelectionRing node={highlightedLayout} tokens={tokens} /> : null}
      {sproutedLabel && selectedNode?.entityType === 'earned_node' ? (
        <SproutedLabel layout={sproutedLabel} node={selectedNode.node} tokens={tokens} />
      ) : null}
    </Svg>
  );
}

type ConstellationViewportProps = Pick<
  ConstellationCanvasShellProps,
  'graph' | 'layout' | 'onSelect' | 'selectedKey' | 'sproutedLabel' | 'tokens'
>;

interface WebKeyboardEvent {
  readonly currentTarget?: unknown;
  readonly key?: string;
  readonly target?: unknown;
  preventDefault?: () => void;
}

const VIEWPORT_ANIMATION = { duration: 180 };
const KEYBOARD_PAN_STEP = 48;

function ConstellationViewport(props: ConstellationViewportProps) {
  const reducedMotion = useReducedMotion();
  const interactionRef = useRef<View>(null);
  const scale = useSharedValue(CONSTELLATION_FIT_ZOOM);
  const translationX = useSharedValue(0);
  const translationY = useSharedValue(0);
  const viewportWidth = useSharedValue(0);
  const viewportHeight = useSharedValue(0);
  const panStartX = useSharedValue(0);
  const panStartY = useSharedValue(0);
  const pinchStartScale = useSharedValue(CONSTELLATION_FIT_ZOOM);
  const pinchStartX = useSharedValue(0);
  const pinchStartY = useSharedValue(0);

  const graphLayerStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translationX.value },
      { translateY: translationY.value },
      { scale: scale.value },
    ],
  }));

  const panGesture = Gesture.Pan()
    .mouseButton(MouseButton.LEFT)
    .minDistance(6)
    .maxPointers(1)
    .averageTouches(true)
    .enableTrackpadTwoFingerGesture(true)
    .activeCursor('grabbing')
    .onBegin(() => {
      cancelAnimation(translationX);
      cancelAnimation(translationY);
      panStartX.value = translationX.value;
      panStartY.value = translationY.value;
    })
    .onUpdate((event) => {
      const next = clampConstellationTranslation(
        {
          x: panStartX.value + event.translationX,
          y: panStartY.value + event.translationY,
        },
        scale.value,
        {
          height: viewportHeight.value,
          width: viewportWidth.value,
        },
      );
      translationX.value = next.x;
      translationY.value = next.y;
    });

  const pinchGesture = Gesture.Pinch()
    .onStart(() => {
      cancelAnimation(scale);
      cancelAnimation(translationX);
      cancelAnimation(translationY);
      pinchStartScale.value = scale.value;
      pinchStartX.value = translationX.value;
      pinchStartY.value = translationY.value;
    })
    .onUpdate((event) => {
      const next = zoomConstellationViewportAt(
        {
          scale: pinchStartScale.value,
          x: pinchStartX.value,
          y: pinchStartY.value,
        },
        pinchStartScale.value * event.scale,
        { x: event.focalX, y: event.focalY },
        {
          height: viewportHeight.value,
          width: viewportWidth.value,
        },
      );
      scale.value = next.scale;
      translationX.value = next.x;
      translationY.value = next.y;
    });

  const composedGesture = Gesture.Simultaneous(panGesture, pinchGesture);

  function currentTransform(): ConstellationViewportTransform {
    return {
      scale: scale.value,
      x: translationX.value,
      y: translationY.value,
    };
  }

  function setTransform(
    transform: ConstellationViewportTransform,
    animate = false,
  ): void {
    cancelAnimation(scale);
    cancelAnimation(translationX);
    cancelAnimation(translationY);
    if (animate && !reducedMotion) {
      scale.value = withTiming(transform.scale, VIEWPORT_ANIMATION);
      translationX.value = withTiming(transform.x, VIEWPORT_ANIMATION);
      translationY.value = withTiming(transform.y, VIEWPORT_ANIMATION);
      return;
    }
    scale.value = transform.scale;
    translationX.value = transform.x;
    translationY.value = transform.y;
  }

  function zoomBy(factor: number): void {
    setTransform(
      zoomConstellationViewportAt(
        currentTransform(),
        scale.value * factor,
        {
          x: viewportWidth.value / 2,
          y: viewportHeight.value / 2,
        },
        {
          height: viewportHeight.value,
          width: viewportWidth.value,
        },
      ),
      true,
    );
  }

  function panBy(x: number, y: number): void {
    setTransform(
      panConstellationViewport(
        currentTransform(),
        { x, y },
        {
          height: viewportHeight.value,
          width: viewportWidth.value,
        },
      ),
      true,
    );
  }

  function handleKeyDown(event: WebKeyboardEvent): void {
    if (event.target !== event.currentTarget) return;

    switch (event.key) {
      case '+':
      case '=':
        event.preventDefault?.();
        zoomBy(CONSTELLATION_ZOOM_STEP);
        break;
      case '-':
      case '_':
        event.preventDefault?.();
        zoomBy(1 / CONSTELLATION_ZOOM_STEP);
        break;
      case '0':
        event.preventDefault?.();
        setTransform(fitConstellationViewport(), true);
        break;
      case 'ArrowLeft':
        event.preventDefault?.();
        panBy(KEYBOARD_PAN_STEP, 0);
        break;
      case 'ArrowRight':
        event.preventDefault?.();
        panBy(-KEYBOARD_PAN_STEP, 0);
        break;
      case 'ArrowUp':
        event.preventDefault?.();
        panBy(0, KEYBOARD_PAN_STEP);
        break;
      case 'ArrowDown':
        event.preventDefault?.();
        panBy(0, -KEYBOARD_PAN_STEP);
        break;
    }
  }

  function handleLayout(event: LayoutChangeEvent): void {
    const { height, width } = event.nativeEvent.layout;
    viewportHeight.value = height;
    viewportWidth.value = width;
    const next = clampConstellationTranslation(
      { x: translationX.value, y: translationY.value },
      scale.value,
      { height, width },
    );
    translationX.value = next.x;
    translationY.value = next.y;
  }

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const element = interactionRef.current as unknown as HTMLElement | null;
    if (!element) return;

    const handleWheel = (event: WheelEvent) => {
      const lineMultiplier = event.deltaMode === 1 ? 16 : 1;
      const pageMultiplier = event.deltaMode === 2
        ? Math.max(1, viewportHeight.value)
        : 1;
      const deltaX = event.deltaX * lineMultiplier * pageMultiplier;
      const deltaY = event.deltaY * lineMultiplier * pageMultiplier;

      cancelAnimation(scale);
      cancelAnimation(translationX);
      cancelAnimation(translationY);

      if (event.ctrlKey || event.metaKey) {
        const rect = element.getBoundingClientRect();
        const next = zoomConstellationViewportAt(
          currentTransform(),
          scale.value * Math.exp(-deltaY * 0.0025),
          {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top,
          },
          {
            height: viewportHeight.value,
            width: viewportWidth.value,
          },
        );
        setTransform(next);
      } else {
        const horizontalDelta = event.shiftKey && Math.abs(deltaX) < 0.01
          ? deltaY
          : deltaX;
        const verticalDelta = event.shiftKey && Math.abs(deltaX) < 0.01
          ? 0
          : deltaY;
        setTransform(
          panConstellationViewport(
            currentTransform(),
            { x: -horizontalDelta, y: -verticalDelta },
            {
              height: viewportHeight.value,
              width: viewportWidth.value,
            },
          ),
        );
      }

      if (event.cancelable) event.preventDefault();
    };

    element.addEventListener('wheel', handleWheel, { passive: false });
    return () => element.removeEventListener('wheel', handleWheel);
  });

  return (
    <View
      style={{
        flex: 1,
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <CanvasBackdrop layout={props.layout} tokens={props.tokens} />
      <GestureDetector gesture={composedGesture}>
        <View
          accessibilityHint="Drag or use two fingers to pan. Pinch, or hold Control or Command while scrolling, to zoom. Use arrow keys, plus, minus, or zero from the keyboard."
          accessibilityLabel="Interactive Constellation graph viewport"
          collapsable={false}
          onLayout={handleLayout}
          ref={interactionRef}
          role="region"
          style={{
            ...StyleSheet.absoluteFillObject,
            touchAction: 'none',
            userSelect: 'none',
          }}
          {...(Platform.OS === 'web' ? {
            onKeyDown: handleKeyDown,
            tabIndex: 0 as const,
          } : {})}
        >
          <Animated.View style={[StyleSheet.absoluteFill, graphLayerStyle]}>
            <SvgGraph
              graph={props.graph}
              layout={props.layout}
              onSelect={props.onSelect}
              selectedKey={props.selectedKey}
              sproutedLabel={props.sproutedLabel}
              tokens={props.tokens}
            />
          </Animated.View>
        </View>
      </GestureDetector>
      <View
        accessibilityLabel="Constellation zoom controls"
        style={{
          flexDirection: 'row',
          gap: 8,
          position: 'absolute',
          right: 16,
          top: 16,
        }}
      >
        <Pressable
          accessibilityLabel="Zoom out of Constellation"
          accessibilityRole="button"
          onPress={() => zoomBy(1 / CONSTELLATION_ZOOM_STEP)}
          style={({ pressed }) => ({
            alignItems: 'center',
            backgroundColor: props.tokens.panel.background,
            borderColor: props.tokens.panel.border,
            borderRadius: 10,
            borderWidth: 1,
            height: 44,
            justifyContent: 'center',
            opacity: pressed ? 0.72 : 1,
            width: 44,
          })}
        >
          <Text
            style={{
              color: props.tokens.text.primary,
              fontFamily: 'Inter-SemiBold',
              fontSize: 22,
              lineHeight: 24,
            }}
          >
            −
          </Text>
        </Pressable>
        <Pressable
          accessibilityLabel="Reset Constellation to fit"
          accessibilityRole="button"
          onPress={() => setTransform(fitConstellationViewport(), true)}
          style={({ pressed }) => ({
            alignItems: 'center',
            backgroundColor: props.tokens.panel.background,
            borderColor: props.tokens.panel.border,
            borderRadius: 10,
            borderWidth: 1,
            height: 44,
            justifyContent: 'center',
            opacity: pressed ? 0.72 : 1,
            paddingHorizontal: 14,
          })}
        >
          <Text
            style={{
              color: props.tokens.text.primary,
              fontFamily: 'Inter-SemiBold',
              fontSize: 12,
            }}
          >
            Fit
          </Text>
        </Pressable>
        <Pressable
          accessibilityLabel="Zoom in to Constellation"
          accessibilityRole="button"
          onPress={() => zoomBy(CONSTELLATION_ZOOM_STEP)}
          style={({ pressed }) => ({
            alignItems: 'center',
            backgroundColor: props.tokens.panel.background,
            borderColor: props.tokens.panel.border,
            borderRadius: 10,
            borderWidth: 1,
            height: 44,
            justifyContent: 'center',
            opacity: pressed ? 0.72 : 1,
            width: 44,
          })}
        >
          <Text
            style={{
              color: props.tokens.text.primary,
              fontFamily: 'Inter-SemiBold',
              fontSize: 22,
              lineHeight: 24,
            }}
          >
            +
          </Text>
        </Pressable>
      </View>
    </View>
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
        <ConstellationViewport
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
