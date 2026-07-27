import { View } from 'react-native';
import { Fragment } from 'react';
import Svg, { Circle, Line, Polyline, Text as SvgText } from 'react-native-svg';
import { useThemeColors } from '@/store/uiStore';

export type MomentumTrendPoint = number;

export const SEVEN_DAY_MOMENTUM_POINTS: readonly MomentumTrendPoint[] = [
  18, 30, 25, 46, 41, 65, 75,
];

export function MomentumTrendChart({
  height = 96,
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
  const viewWidth = showAxes ? 620 : 250;
  const viewHeight = showAxes ? 300 : 100;
  const left = showAxes ? 62 : 8;
  const right = showAxes ? 18 : 8;
  const top = showAxes ? 20 : 10;
  const bottom = showAxes ? 62 : 10;
  const plotWidth = viewWidth - left - right;
  const plotHeight = viewHeight - top - bottom;
  const pointCoordinates = points.map((value, index) => {
    const x = left + (index / Math.max(1, points.length - 1)) * plotWidth;
    const y = top + ((100 - value) / 100) * plotHeight;
    return [x, y] as const;
  });
  const polylinePoints = pointCoordinates.map(([x, y]) => `${x},${y}`).join(' ');
  const yTicks = [0, 25, 50, 75, 100];
  const gridColor = colors.border.divider;
  const labelColor = colors.text.muted;

  return (
    <View pointerEvents="none">
      <Svg
        accessibilityLabel="Sample Momentum trend preview"
        height={height}
        viewBox={`0 0 ${viewWidth} ${viewHeight}`}
        width="100%"
      >
        {showAxes ? (
          <>
            {yTicks.map((tick) => {
              const y = top + ((100 - tick) / 100) * plotHeight;
              return (
                <Fragment key={`y-${tick}`}>
                  <Line
                    stroke={gridColor}
                    strokeWidth="1"
                    x1={left}
                    x2={viewWidth - right}
                    y1={y}
                    y2={y}
                  />
                  <SvgText
                    fill={labelColor}
                    fontFamily="Inter-Regular"
                    fontSize="11"
                    textAnchor="end"
                    x={left - 10}
                    y={y + 4}
                  >
                    {tick}
                  </SvgText>
                </Fragment>
              );
            })}
            {pointCoordinates.map(([x], index) => (
              <Line
                key={`x-grid-${index}`}
                stroke={gridColor}
                strokeWidth="1"
                x1={x}
                x2={x}
                y1={top}
                y2={top + plotHeight}
              />
            ))}
            <Line
              stroke={labelColor}
              strokeWidth="1.5"
              x1={left}
              x2={viewWidth - right}
              y1={top + plotHeight}
              y2={top + plotHeight}
            />
            <Line
              stroke={labelColor}
              strokeWidth="1.5"
              x1={left}
              x2={left}
              y1={top}
              y2={top + plotHeight}
            />
            {pointCoordinates.map(([x], index) => (
              <SvgText
                fill={labelColor}
                fontFamily="Inter-Regular"
                fontSize="10.5"
                key={`x-label-${index}`}
                textAnchor="middle"
                x={x}
                y={top + plotHeight + 20}
              >
                {xLabels[index] ?? ''}
              </SvgText>
            ))}
            <SvgText
              fill={labelColor}
              fontFamily="Inter-Medium"
              fontSize="11"
              textAnchor="middle"
              x={left + plotWidth / 2}
              y={viewHeight - 7}
            >
              Time
            </SvgText>
            <SvgText
              fill={labelColor}
              fontFamily="Inter-Medium"
              fontSize="11"
              textAnchor="middle"
              transform={`rotate(-90 13 ${top + plotHeight / 2})`}
              x={13}
              y={top + plotHeight / 2}
            >
              Momentum
            </SvgText>
          </>
        ) : null}
        <Polyline
          fill="none"
          points={polylinePoints}
          stroke={colors.accent.primary}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="3"
        />
        {pointCoordinates.map(([cx, cy], index) => (
          <Circle
            cx={cx}
            cy={cy}
            fill={colors.background.card}
            key={`${cx}-${cy}-${index}`}
            r={showAxes ? 4.5 : 4}
            stroke={colors.accent.primary}
            strokeWidth="2.5"
          />
        ))}
      </Svg>
    </View>
  );
}
