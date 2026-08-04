import { useId } from 'react';
import { View } from 'react-native';
import Svg, {
  Circle,
  ClipPath,
  Defs,
  G,
  Line,
  LinearGradient,
  Path,
  Rect,
  Stop,
  Text as SvgText,
} from 'react-native-svg';

import { useThemeColors, useUIStore } from '@/store/uiStore';

export type MomentumTrendPoint = number;

export const SEVEN_DAY_MOMENTUM_POINTS: readonly MomentumTrendPoint[] = [
  18, 30, 25, 46, 41, 65, 75,
];

function createCurvePath(points: readonly (readonly [number, number])[]) {
  if (!points.length) return '';
  let path = `M ${points[0][0]} ${points[0][1]}`;

  for (let index = 0; index < points.length - 1; index += 1) {
    const previous = points[Math.max(0, index - 1)];
    const current = points[index];
    const next = points[index + 1];
    const afterNext = points[Math.min(points.length - 1, index + 2)];
    const controlOneX = current[0] + (next[0] - previous[0]) / 6;
    const controlOneY = current[1] + (next[1] - previous[1]) / 6;
    const controlTwoX = next[0] - (afterNext[0] - current[0]) / 6;
    const controlTwoY = next[1] - (afterNext[1] - current[1]) / 6;

    path += ` C ${controlOneX} ${controlOneY}, ${controlTwoX} ${controlTwoY}, ${next[0]} ${next[1]}`;
  }

  return path;
}

export function MomentumTrendChart({
  height,
  points = SEVEN_DAY_MOMENTUM_POINTS,
  showAxes = false,
  xLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
}: {
  height?: number;
  points?: readonly MomentumTrendPoint[];
  showAxes?: boolean;
  xLabels?: readonly string[];
}) {
  const colors = useThemeColors();
  const themeMode = useUIStore((state) => state.themeMode);
  const instanceId = useId().replace(/:/g, '');
  const gradientId = `authenticated-momentum-gradient-${instanceId}`;
  const clipId = `authenticated-momentum-clip-${instanceId}`;
  const viewWidth = showAxes ? 620 : 440;
  const viewHeight = showAxes ? 300 : 180;
  const left = showAxes ? 62 : 34;
  const right = showAxes ? 20 : 12;
  const top = showAxes ? 20 : 13;
  const bottom = showAxes ? 62 : 34;
  const plotWidth = viewWidth - left - right;
  const plotHeight = viewHeight - top - bottom;
  const plotBottom = top + plotHeight;
  const yTicks = showAxes ? [0, 25, 50, 75, 100] : [0, 50, 100];
  const verticalIndexes = showAxes
    ? points.map((_, index) => index)
    : points.map((_, index) => index).filter((index) => index % 2 === 0 || index === points.length - 1);
  const lineColor = colors.accent.primary;
  const gridColor = colors.border.subtle;
  const axisColor = colors.border.divider;
  const labelColor = colors.text.muted;
  const markerFill = colors.background.card;
  const pointCoordinates = points.map((value, index) => {
    const x = left + (index / Math.max(1, points.length - 1)) * plotWidth;
    const y = top + ((100 - value) / 100) * plotHeight;
    return [x, y] as const;
  });
  const linePath = createCurvePath(pointCoordinates);
  const areaPath = pointCoordinates.length
    ? `${linePath} L ${pointCoordinates[pointCoordinates.length - 1][0]} ${plotBottom} L ${pointCoordinates[0][0]} ${plotBottom} Z`
    : '';
  const displayedXLabels = showAxes
    ? xLabels
    : xLabels.map((label) => label.length <= 3 ? label.charAt(0) : label);

  return (
    <View style={{ pointerEvents: 'none', width: '100%' }}>
      <Svg
        accessibilityLabel="Momentum trend"
        height={height ?? (showAxes ? 280 : 112)}
        preserveAspectRatio="xMidYMid meet"
        viewBox={`0 0 ${viewWidth} ${viewHeight}`}
        width="100%"
      >
        <Defs>
          <LinearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
            <Stop
              offset="0%"
              stopColor={lineColor}
              stopOpacity={themeMode === 'dark' ? 0.16 : 0.24}
            />
            <Stop
              offset="56%"
              stopColor={lineColor}
              stopOpacity={themeMode === 'dark' ? 0.06 : 0.11}
            />
            <Stop offset="100%" stopColor={lineColor} stopOpacity={0} />
          </LinearGradient>
          <ClipPath id={clipId}>
            <Rect height={plotHeight} width={plotWidth} x={left} y={top} />
          </ClipPath>
        </Defs>

        <G>
          {yTicks.map((tick) => {
            const y = top + ((100 - tick) / 100) * plotHeight;
            return (
              <G key={`y-${tick}`}>
                <Line
                  stroke={gridColor}
                  strokeWidth={1}
                  x1={left}
                  x2={viewWidth - right}
                  y1={y}
                  y2={y}
                />
                <SvgText
                  fill={labelColor}
                  fontFamily="Inter-Regular"
                  fontSize={showAxes ? 10.5 : 9}
                  textAnchor="end"
                  x={left - (showAxes ? 10 : 7)}
                  y={y + 3.5}
                >
                  {tick}
                </SvgText>
              </G>
            );
          })}

          {verticalIndexes.map((index) => {
            const x = pointCoordinates[index]?.[0];
            return x === undefined ? null : (
              <Line
                key={`x-${index}`}
                stroke={gridColor}
                strokeWidth={1}
                x1={x}
                x2={x}
                y1={top}
                y2={plotBottom}
              />
            );
          })}

          <Line
            stroke={axisColor}
            strokeWidth={1}
            x1={left}
            x2={viewWidth - right}
            y1={plotBottom}
            y2={plotBottom}
          />
          <Line
            stroke={axisColor}
            strokeWidth={1}
            x1={left}
            x2={left}
            y1={top}
            y2={plotBottom}
          />

          <G clipPath={`url(#${clipId})`}>
            <Path d={areaPath} fill={`url(#${gradientId})`} />
          </G>
          <Path
            d={linePath}
            fill="none"
            stroke={lineColor}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={showAxes ? 3.4 : 3}
          />
          {pointCoordinates.map(([cx, cy], index) => (
            <Circle
              cx={cx}
              cy={cy}
              fill={markerFill}
              key={`point-${index}`}
              r={showAxes ? 4 : 3.2}
              stroke={lineColor}
              strokeWidth={showAxes ? 2.4 : 2}
            />
          ))}

          {pointCoordinates.map(([x], index) => (
            <SvgText
              fill={labelColor}
              fontFamily="Inter-Medium"
              fontSize={showAxes ? 10.5 : 9}
              key={`label-${index}`}
              textAnchor="middle"
              x={x}
              y={plotBottom + (showAxes ? 21 : 18)}
            >
              {displayedXLabels[index] ?? ''}
            </SvgText>
          ))}

          {showAxes ? (
            <>
              <SvgText
                fill={labelColor}
                fontFamily="Inter-Medium"
                fontSize={10.5}
                textAnchor="middle"
                x={left + plotWidth / 2}
                y={viewHeight - 7}
              >
                Time
              </SvgText>
              <SvgText
                fill={labelColor}
                fontFamily="Inter-Medium"
                fontSize={10.5}
                textAnchor="middle"
                transform={`rotate(-90 14 ${top + plotHeight / 2})`}
                x={14}
                y={top + plotHeight / 2}
              >
                Momentum
              </SvgText>
            </>
          ) : null}
        </G>
      </Svg>
    </View>
  );
}
