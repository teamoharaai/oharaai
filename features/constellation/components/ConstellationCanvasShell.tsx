import {
  forwardRef,
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
} from 'react';
import {
  type LayoutChangeEvent,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
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
import { GoalCategoryShape } from './GoalCategoryShape';
import { SelectionRing } from './SelectionRing';
import { SproutedLabel } from './SproutedLabel';
import { VirtualBrtClusterShape } from './VirtualBrtClusterShape';
import { useReducedMotion } from '../hooks/useReducedMotion';
import {
  createConstellationGradientIds,
  type ConstellationGradientIds,
} from '../svg-ids';
import {
  CONSTELLATION_FIT_ZOOM,
  CONSTELLATION_ZOOM_STEP,
  clampConstellationNodePosition,
  clampConstellationTranslation,
  constellationDragDeltaToNormalized,
  fitConstellationViewport,
  panConstellationViewport,
  zoomConstellationViewportAt,
  type ConstellationViewportTransform,
} from '../viewport';

interface ConstellationCanvasShellProps {
  fixture?: boolean;
  focusLabel?: string | null;
  graph: ConstellationGraphViewModel;
  isLayoutBusy?: boolean;
  layout: ConstellationLayout;
  layoutError?: string | null;
  onCreateAnnotation?: (kind: ConstellationAnnotationKind) => void;
  onMoveNode?: (
    selectionKey: string,
    normalized: { x: number; y: number },
  ) => void;
  onMoveNodeEnd?: (selectionKey: string) => void;
  onOpenGoalLinks?: () => void;
  onResetLayout?: () => void;
  onSelect: (selectionKey: string | null) => void;
  onSelectGoalLink?: (goalLinkId: string) => void;
  refreshError?: string | null;
  seasonLabel: string;
  selectedKey: string | null;
  selectedGoalLinkId?: string | null;
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
      preserveAspectRatio="xMidYMid slice"
      style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}
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
  onSelectGoalLink,
  selectedGoalLinkId,
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
            onSelectGoalLink={onSelectGoalLink}
            selectedGoalLinkId={selectedGoalLinkId}
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
            case 'virtual_goal_category':
              return (
                <GoalCategoryShape
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
  | 'graph'
  | 'isLayoutBusy'
  | 'layout'
  | 'layoutError'
  | 'onMoveNode'
  | 'onMoveNodeEnd'
  | 'onSelect'
  | 'onSelectGoalLink'
  | 'selectedKey'
  | 'selectedGoalLinkId'
  | 'sproutedLabel'
  | 'tokens'
>;

interface WebKeyboardEvent {
  readonly currentTarget?: unknown;
  readonly key?: string;
  readonly target?: unknown;
  preventDefault?: () => void;
}

const VIEWPORT_ANIMATION = { duration: 180 };
const KEYBOARD_PAN_STEP = 48;

interface ConstellationViewportHandle {
  fit(): void;
  zoomIn(): void;
  zoomOut(): void;
}

const ConstellationViewport = forwardRef<
  ConstellationViewportHandle,
  ConstellationViewportProps
>(function ConstellationViewport(props, ref) {
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
  const livePropsRef = useRef(props);
  livePropsRef.current = props;

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

  useImperativeHandle(ref, () => ({
    fit() {
      setTransform(fitConstellationViewport(), true);
    },
    zoomIn() {
      zoomBy(CONSTELLATION_ZOOM_STEP);
    },
    zoomOut() {
      zoomBy(1 / CONSTELLATION_ZOOM_STEP);
    },
  }));

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
    const activePointers = new Map<number, { x: number; y: number }>();
    let gestureStartTransform = currentTransform();
    let gestureStartPoint = { x: 0, y: 0 };
    let pinchStartCenter = { x: 0, y: 0 };
    let pinchStartDistance = 1;
    let nodeDrag: {
      moved: boolean;
      selectionKey: string;
      startNormalized: { x: number; y: number };
      startPoint: { x: number; y: number };
    } | null = null;
    let suppressNextClick = false;

    const localPoint = (event: PointerEvent) => {
      const rect = element.getBoundingClientRect();
      return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      };
    };

    const pointerPair = () => {
      const [first, second] = [...activePointers.values()];
      if (!first || !second) return null;
      return {
        center: {
          x: (first.x + second.x) / 2,
          y: (first.y + second.y) / 2,
        },
        distance: Math.max(
          1,
          Math.hypot(second.x - first.x, second.y - first.y),
        ),
      };
    };

    const startSinglePointer = (point: { x: number; y: number }) => {
      cancelAnimation(translationX);
      cancelAnimation(translationY);
      gestureStartTransform = currentTransform();
      gestureStartPoint = point;
    };

    const startPointerPair = () => {
      const pair = pointerPair();
      if (!pair) return;
      cancelAnimation(scale);
      cancelAnimation(translationX);
      cancelAnimation(translationY);
      gestureStartTransform = currentTransform();
      pinchStartCenter = pair.center;
      pinchStartDistance = pair.distance;
    };

    const handlePointerDown = (event: PointerEvent) => {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      const point = localPoint(event);
      activePointers.set(event.pointerId, point);
      if (activePointers.size === 1) {
        const target = event.target instanceof Element ? event.target : null;
        const selectionKey = target
          ?.closest('[data-constellation-node]')
          ?.getAttribute('data-constellation-node');
        const nodeLayout = selectionKey
          ? livePropsRef.current.layout.nodes.find(
              (node) => node.selectionKey === selectionKey,
            )
          : undefined;
        if (selectionKey && nodeLayout && livePropsRef.current.onMoveNode) {
          nodeDrag = {
            moved: false,
            selectionKey,
            startNormalized: nodeLayout.normalized,
            startPoint: point,
          };
        } else {
          nodeDrag = null;
          startSinglePointer(point);
        }
      } else if (activePointers.size === 2) {
        nodeDrag = null;
        for (const pointerId of activePointers.keys()) {
          element.setPointerCapture?.(pointerId);
        }
        startPointerPair();
      }
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (!activePointers.has(event.pointerId)) return;
      const point = localPoint(event);
      activePointers.set(event.pointerId, point);

      if (activePointers.size === 1) {
        if (nodeDrag) {
          const delta = {
            x: point.x - nodeDrag.startPoint.x,
            y: point.y - nodeDrag.startPoint.y,
          };
          if (!nodeDrag.moved && Math.hypot(delta.x, delta.y) < 3) return;
          nodeDrag.moved = true;
          suppressNextClick = true;
          if (!element.hasPointerCapture?.(event.pointerId)) {
            element.setPointerCapture?.(event.pointerId);
          }
          const normalizedDelta = constellationDragDeltaToNormalized(
            delta,
            scale.value,
            {
              height: viewportHeight.value,
              width: viewportWidth.value,
            },
            livePropsRef.current.layout.viewBox,
          );
          livePropsRef.current.onMoveNode?.(
            nodeDrag.selectionKey,
            clampConstellationNodePosition({
              x: nodeDrag.startNormalized.x + normalizedDelta.x,
              y: nodeDrag.startNormalized.y + normalizedDelta.y,
            }),
          );
          if (event.cancelable) event.preventDefault();
          return;
        }

        const delta = {
          x: point.x - gestureStartPoint.x,
          y: point.y - gestureStartPoint.y,
        };
        if (Math.hypot(delta.x, delta.y) < 6) return;
        if (!element.hasPointerCapture?.(event.pointerId)) {
          element.setPointerCapture?.(event.pointerId);
        }
        const next = clampConstellationTranslation(
          {
            x: gestureStartTransform.x + delta.x,
            y: gestureStartTransform.y + delta.y,
          },
          gestureStartTransform.scale,
          {
            height: viewportHeight.value,
            width: viewportWidth.value,
          },
        );
        translationX.value = next.x;
        translationY.value = next.y;
      } else {
        const pair = pointerPair();
        if (!pair) return;
        const zoomed = zoomConstellationViewportAt(
          gestureStartTransform,
          gestureStartTransform.scale
            * (pair.distance / pinchStartDistance),
          pinchStartCenter,
          {
            height: viewportHeight.value,
            width: viewportWidth.value,
          },
        );
        const moved = clampConstellationTranslation(
          {
            x: zoomed.x + pair.center.x - pinchStartCenter.x,
            y: zoomed.y + pair.center.y - pinchStartCenter.y,
          },
          zoomed.scale,
          {
            height: viewportHeight.value,
            width: viewportWidth.value,
          },
        );
        scale.value = zoomed.scale;
        translationX.value = moved.x;
        translationY.value = moved.y;
      }

      if (event.cancelable) event.preventDefault();
    };

    const handlePointerEnd = (event: PointerEvent) => {
      const completedNodeDrag = nodeDrag;
      activePointers.delete(event.pointerId);
      if (element.hasPointerCapture?.(event.pointerId)) {
        element.releasePointerCapture(event.pointerId);
      }
      const remaining = [...activePointers.values()][0];
      if (remaining) {
        startSinglePointer(remaining);
      } else if (completedNodeDrag?.moved) {
        livePropsRef.current.onMoveNodeEnd?.(
          completedNodeDrag.selectionKey,
        );
      }
      nodeDrag = null;
    };

    const handleClickCapture = (event: MouseEvent) => {
      if (!suppressNextClick) return;
      suppressNextClick = false;
      event.preventDefault();
      event.stopPropagation();
    };

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

    element.addEventListener('pointerdown', handlePointerDown);
    element.addEventListener('pointermove', handlePointerMove);
    element.addEventListener('pointerup', handlePointerEnd);
    element.addEventListener('pointercancel', handlePointerEnd);
    element.addEventListener('click', handleClickCapture, true);
    element.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      element.removeEventListener('pointerdown', handlePointerDown);
      element.removeEventListener('pointermove', handlePointerMove);
      element.removeEventListener('pointerup', handlePointerEnd);
      element.removeEventListener('pointercancel', handlePointerEnd);
      element.removeEventListener('click', handleClickCapture, true);
      element.removeEventListener('wheel', handleWheel);
    };
  }, []);

  const interactionSurface = (
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
          isLayoutBusy={props.isLayoutBusy}
          layout={props.layout}
          layoutError={props.layoutError}
          onSelect={props.onSelect}
          onSelectGoalLink={props.onSelectGoalLink}
          selectedKey={props.selectedKey}
          selectedGoalLinkId={props.selectedGoalLinkId}
          sproutedLabel={props.sproutedLabel}
          tokens={props.tokens}
        />
      </Animated.View>
    </View>
  );

  return (
    <View
      style={{
        flex: 1,
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <CanvasBackdrop layout={props.layout} tokens={props.tokens} />
      {Platform.OS === 'web' ? interactionSurface : (
        <GestureDetector gesture={composedGesture}>
          {interactionSurface}
        </GestureDetector>
      )}
      {props.layoutError ? (
        <View
          accessibilityLiveRegion="polite"
          accessibilityRole="alert"
          style={{
            backgroundColor: props.tokens.panel.background,
            borderColor: props.tokens.panel.border,
            borderRadius: 10,
            borderWidth: 1,
            bottom: 16,
            maxWidth: 360,
            paddingHorizontal: 12,
            paddingVertical: 9,
            position: 'absolute',
            right: 16,
          }}
        >
          <Text
            style={{
              color: props.tokens.text.secondary,
              fontFamily: 'Inter-Regular',
              fontSize: 12,
            }}
          >
            {props.layoutError}
          </Text>
        </View>
      ) : null}
    </View>
  );
});

export function ConstellationCanvasShell(props: ConstellationCanvasShellProps) {
  const viewportRef = useRef<ConstellationViewportHandle>(null);
  const visibleGoalCount = props.graph.nodes.filter(
    (node) =>
      node.entityType === 'earned_node'
      && node.node.kind === 'goal',
  ).length;
  if (Platform.OS !== 'web') {
    return (
      <ScrollView style={{ backgroundColor: props.tokens.canvas.background }}>
        <ConstellationHeaderMetadata
          counts={props.graph.counts}
          canLinkGoals={visibleGoalCount >= 2}
          fixture={props.fixture}
          focusLabel={props.focusLabel}
          onCreateAnnotation={props.onCreateAnnotation}
          onOpenGoalLinks={props.onOpenGoalLinks}
          refreshError={props.refreshError}
          seasonLabel={props.seasonLabel}
          tokens={props.tokens}
        />
        <ConstellationAccessibleList
          graph={props.graph}
          onSelect={props.onSelect}
          onSelectGoalLink={props.onSelectGoalLink}
          selectedGoalLinkId={props.selectedGoalLinkId}
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
        canLinkGoals={visibleGoalCount >= 2}
        fixture={props.fixture}
        focusLabel={props.focusLabel}
        isLayoutBusy={props.isLayoutBusy}
        onCreateAnnotation={props.onCreateAnnotation}
        onFitViewport={() => viewportRef.current?.fit()}
        onOpenGoalLinks={props.onOpenGoalLinks}
        onResetLayout={props.onResetLayout}
        onZoomIn={() => viewportRef.current?.zoomIn()}
        onZoomOut={() => viewportRef.current?.zoomOut()}
        refreshError={props.refreshError}
        seasonLabel={props.seasonLabel}
        tokens={props.tokens}
      />
      <View style={{ flex: 1, minHeight: 554, position: 'relative' }}>
        <ConstellationViewport
          ref={viewportRef}
          graph={props.graph}
          isLayoutBusy={props.isLayoutBusy}
          layout={props.layout}
          layoutError={props.layoutError}
          onMoveNode={props.onMoveNode}
          onMoveNodeEnd={props.onMoveNodeEnd}
          onSelect={props.onSelect}
          onSelectGoalLink={props.onSelectGoalLink}
          selectedKey={props.selectedKey}
          selectedGoalLinkId={props.selectedGoalLinkId}
          sproutedLabel={props.sproutedLabel}
          tokens={props.tokens}
        />
        <ConstellationLegend tokens={props.tokens} />
        <ConstellationAccessibleList
          graph={props.graph}
          hiddenVisually
          onSelect={props.onSelect}
          onSelectGoalLink={props.onSelectGoalLink}
          selectedGoalLinkId={props.selectedGoalLinkId}
          selectedKey={props.selectedKey}
          tokens={props.tokens}
        />
      </View>
    </View>
  );
}
