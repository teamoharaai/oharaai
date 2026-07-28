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

import { PUBLIC_COLORS } from '@/components/landing/PublicPrimitives';

const PUBLIC_MOMENTUM_POINTS = [18, 30, 52, 36, 62, 55, 86] as const;
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

type ChartVariant = 'compact' | 'standard' | 'expanded';

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

export function PublicMomentumTrendChart({
  dark = false,
  variant = 'standard',
}: {
  dark?: boolean;
  variant?: ChartVariant;
}) {
  const instanceId = useId().replace(/:/g, '');
  const gradientId = `public-momentum-gradient-${instanceId}`;
  const clipId = `public-momentum-clip-${instanceId}`;
  const compact = variant === 'compact';
  const expanded = variant === 'expanded';
  const viewWidth = compact ? 440 : 620;
  const viewHeight = compact ? 180 : expanded ? 300 : 270;
  const left = compact ? 34 : 62;
  const right = compact ? 12 : 20;
  const top = compact ? 13 : 20;
  const bottom = compact ? 34 : 62;
  const plotWidth = viewWidth - left - right;
  const plotHeight = viewHeight - top - bottom;
  const plotBottom = top + plotHeight;
  const lineColor = dark ? '#A8C4AE' : PUBLIC_COLORS.forest;
  const markerFill = dark ? PUBLIC_COLORS.forestDark : PUBLIC_COLORS.surface;
  const gridColor = dark ? 'rgba(237,230,216,0.11)' : 'rgba(216,209,197,0.34)';
  const axisColor = dark ? 'rgba(237,230,216,0.32)' : 'rgba(124,118,107,0.46)';
  const labelColor = dark ? '#D8E3DA' : PUBLIC_COLORS.quiet;
  const yTicks = compact ? [0, 50, 100] : [0, 25, 50, 75, 100];
  const verticalIndexes = compact ? [0, 2, 4, 6] : [0, 1, 2, 3, 4, 5, 6];
  const coordinates = PUBLIC_MOMENTUM_POINTS.map((value, index) => {
    const x = left + (index / (PUBLIC_MOMENTUM_POINTS.length - 1)) * plotWidth;
    const y = top + ((100 - value) / 100) * plotHeight;
    return [x, y] as const;
  });
  const linePath = createCurvePath(coordinates);
  const areaPath = `${linePath} L ${coordinates[coordinates.length - 1][0]} ${plotBottom} L ${coordinates[0][0]} ${plotBottom} Z`;
  const visibleXLabels = compact ? DAY_LABELS.map((label) => label.charAt(0)) : DAY_LABELS;

  return (
    <View style={{ pointerEvents: 'none', width: '100%' }}>
      <Svg
        accessibilityLabel="Preview Momentum trend over seven days on a zero to one hundred scale"
        height={compact ? 126 : expanded ? 280 : 230}
        preserveAspectRatio="xMidYMid meet"
        viewBox={`0 0 ${viewWidth} ${viewHeight}`}
        width="100%"
      >
        <Defs>
          <LinearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
            <Stop offset="0%" stopColor={lineColor} stopOpacity={dark ? 0.18 : 0.24} />
            <Stop offset="56%" stopColor={lineColor} stopOpacity={dark ? 0.07 : 0.11} />
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
                <Line stroke={gridColor} strokeWidth={1} x1={left} x2={viewWidth - right} y1={y} y2={y} />
                <SvgText
                  fill={labelColor}
                  fontFamily="Inter-Regular"
                  fontSize={compact ? 9 : 10.5}
                  textAnchor="end"
                  x={left - (compact ? 7 : 10)}
                  y={y + 3.5}
                >
                  {tick}
                </SvgText>
              </G>
            );
          })}

          {verticalIndexes.map((index) => {
            const x = coordinates[index][0];
            return (
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

          <Line stroke={axisColor} strokeWidth={1} x1={left} x2={viewWidth - right} y1={plotBottom} y2={plotBottom} />
          <Line stroke={axisColor} strokeWidth={1} x1={left} x2={left} y1={top} y2={plotBottom} />

          <G clipPath={`url(#${clipId})`}>
            <Path d={areaPath} fill={`url(#${gradientId})`} />
          </G>
          <Path
            d={linePath}
            fill="none"
            stroke={lineColor}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={compact ? 3 : 3.4}
          />
          {coordinates.map(([cx, cy], index) => (
            <Circle
              cx={cx}
              cy={cy}
              fill={markerFill}
              key={`point-${index}`}
              r={compact ? 3.2 : 4}
              stroke={lineColor}
              strokeWidth={compact ? 2 : 2.4}
            />
          ))}

          {coordinates.map(([x], index) => (
            <SvgText
              fill={labelColor}
              fontFamily="Inter-Medium"
              fontSize={compact ? 9 : 10.5}
              key={`label-${index}`}
              textAnchor="middle"
              x={x}
              y={plotBottom + (compact ? 18 : 21)}
            >
              {visibleXLabels[index]}
            </SvgText>
          ))}

          {!compact ? (
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
