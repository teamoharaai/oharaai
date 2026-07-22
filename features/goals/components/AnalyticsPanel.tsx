import { Text, View, useWindowDimensions } from 'react-native';
import Svg, { Circle, Line, Polyline } from 'react-native-svg';
import { useThemeColors } from '@/store/uiStore';

export type AnalyticsSource =
  | { state: 'stub'; label?: string }
  | { state: 'disconnected'; label?: string }
  | { state: 'connected'; name: string; updatedLabel?: string };

export interface AnalyticsMetric {
  label: string;
  value: string;
  unit?: string;
  highlighted?: boolean;
}

export interface AnalyticsDistancePoint {
  label: string;
  value: number;
}

export interface AnalyticsPacePoint {
  label: string;
  secondsPerKilometer: number;
}

export interface AnalyticsPanelData {
  metrics: readonly AnalyticsMetric[];
  distancePoints: readonly AnalyticsDistancePoint[];
  pacePoints: readonly AnalyticsPacePoint[];
  bestPaceLabel: string;
  trendSummary: string;
  trendHighlight?: string;
}

export interface AnalyticsPanelProps {
  source?: AnalyticsSource;
  data?: AnalyticsPanelData | null;
}

const STUB_DATA: AnalyticsPanelData = {
  metrics: [
    { label: 'Avg pace /km', value: '6:24' },
    { label: 'Longest run', value: '4.1', unit: 'km' },
    { label: 'Total runs', value: '18' },
    { label: 'Pace improved', value: '+9%', highlighted: true },
  ],
  distancePoints: [
    { label: 'W1', value: 3.9 },
    { label: 'W2', value: 5.7 },
    { label: 'W3', value: 7.1 },
    { label: 'W4', value: 8.8 },
    { label: 'W5', value: 10.9 },
    { label: 'Now', value: 12.4 },
  ],
  pacePoints: [
    { label: '6 runs ago', secondsPerKilometer: 400 },
    { label: '5 runs ago', secondsPerKilometer: 394 },
    { label: '4 runs ago', secondsPerKilometer: 397 },
    { label: '3 runs ago', secondsPerKilometer: 380 },
    { label: '2 runs ago', secondsPerKilometer: 372 },
    { label: 'Latest', secondsPerKilometer: 362 },
  ],
  bestPaceLabel: 'best 6:02 /km',
  trendSummary: "Trending faster — you've shaved",
  trendHighlight: '38s/km since you started.',
};

function sourcePresentation(source: AnalyticsSource) {
  if (source.state === 'connected') {
    return {
      badge: source.name.slice(0, 1).toUpperCase(),
      label: `via ${source.name}${source.updatedLabel ? ` · ${source.updatedLabel}` : ''}`,
      strava: source.name.toLowerCase() === 'strava',
    };
  }

  if (source.state === 'disconnected') {
    return { badge: '—', label: source.label ?? 'No data source connected', strava: false };
  }

  return { badge: 'P', label: source.label ?? 'Sample data · integration pending', strava: false };
}

function paceCoordinates(points: readonly AnalyticsPacePoint[]): string {
  if (points.length === 0) return '';
  const values = points.map((point) => point.secondsPerKilometer);
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const range = Math.max(1, maximum - minimum);

  return points
    .map((point, index) => {
      const x = points.length === 1 ? 130 : 6 + (index / (points.length - 1)) * 248;
      const y = 24 + ((maximum - point.secondsPerKilometer) / range) * 60;
      return `${x},${y}`;
    })
    .join(' ');
}

function pacePointPosition(
  point: AnalyticsPacePoint,
  index: number,
  points: readonly AnalyticsPacePoint[],
) {
  const values = points.map((item) => item.secondsPerKilometer);
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const range = Math.max(1, maximum - minimum);

  return {
    x: points.length === 1 ? 130 : 6 + (index / (points.length - 1)) * 248,
    y: 24 + ((maximum - point.secondsPerKilometer) / range) * 60,
  };
}

export function AnalyticsPanel({
  source = { state: 'stub' },
  data,
}: AnalyticsPanelProps) {
  const colors = useThemeColors();
  const { width } = useWindowDimensions();
  const compact = width < 700;
  const veryCompact = width < 420;
  const presentation = sourcePresentation(source);
  const displayData = data ?? (source.state === 'stub' ? STUB_DATA : null);
  const distanceMax = Math.max(1, ...(displayData?.distancePoints.map((point) => point.value) ?? []));
  const linePoints = displayData ? paceCoordinates(displayData.pacePoints) : '';

  return (
    <View
      accessibilityLabel={`Analytics. ${presentation.label}`}
      style={{
        backgroundColor: colors.background.card,
        borderColor: colors.border.warm,
        borderRadius: 20,
        borderWidth: 1,
        elevation: 1,
        paddingHorizontal: veryCompact ? 18 : 26,
        paddingVertical: 24,
        shadowColor: colors.background.sidebar,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 22,
      }}
    >
      <View
        style={{
          alignItems: compact ? 'flex-start' : 'center',
          flexDirection: compact ? 'column' : 'row',
          gap: 12,
          justifyContent: 'space-between',
          marginBottom: 18,
        }}
      >
        <View>
          <Text
            style={{
              color: colors.text.secondary,
              fontFamily: 'Inter-SemiBold',
              fontSize: 11,
              letterSpacing: 1.5,
              textTransform: 'uppercase',
            }}
          >
            Analytics
          </Text>
          <Text
            style={{
              color: colors.text.primary,
              fontFamily: 'Inter-Regular',
              fontSize: 19,
              marginTop: 3,
            }}
          >
            Your training trend
          </Text>
        </View>
        <View
          accessibilityLabel={presentation.label}
          style={{ alignItems: 'center', flexDirection: 'row', gap: 6 }}
        >
          <View
            style={{
              alignItems: 'center',
              backgroundColor: presentation.strava ? '#FC5200' : colors.background.selectedRow,
              borderRadius: 4,
              height: 14,
              justifyContent: 'center',
              width: 14,
            }}
          >
            <Text
              style={{
                color: presentation.strava ? colors.background.card : colors.text.secondary,
                fontFamily: 'Inter-Bold',
                fontSize: 8,
              }}
            >
              {presentation.badge}
            </Text>
          </View>
          <Text
            style={{
              color: colors.text.secondary,
              fontFamily: 'Inter-Regular',
              fontSize: 11.5,
            }}
          >
            {presentation.label}
          </Text>
        </View>
      </View>

      {displayData ? (
        <>
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: 10,
              marginBottom: 20,
            }}
          >
            {displayData.metrics.map((metric) => (
              <View
                key={metric.label}
                style={{
                  backgroundColor: colors.background.goalCard,
                  borderColor: colors.border.warm,
                  borderRadius: 12,
                  borderWidth: 1,
                  flexBasis: compact ? '47%' : 0,
                  flexGrow: 1,
                  minWidth: compact ? 120 : 0,
                  paddingHorizontal: 14,
                  paddingVertical: 13,
                }}
              >
                <Text
                  style={{
                    color: metric.highlighted ? colors.accent.tealMid : colors.text.primary,
                    fontFamily: 'Inter-Bold',
                    fontSize: 22,
                  }}
                >
                  {metric.value}
                  {metric.unit ? (
                    <Text
                      style={{
                        color: colors.text.muted,
                        fontFamily: 'Inter-Medium',
                        fontSize: 12,
                      }}
                    >
                      {metric.unit}
                    </Text>
                  ) : null}
                </Text>
                <Text
                  style={{
                    color: colors.text.muted,
                    fontFamily: 'Inter-Regular',
                    fontSize: 10.5,
                    letterSpacing: 0.5,
                    marginTop: 1,
                    textTransform: 'uppercase',
                  }}
                >
                  {metric.label}
                </Text>
              </View>
            ))}
          </View>

          <View style={{ flexDirection: compact ? 'column' : 'row', gap: 20 }}>
            <View style={{ flex: compact ? undefined : 1, minWidth: 0 }}>
              <View
                style={{
                  alignItems: 'center',
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  marginBottom: 14,
                }}
              >
                <Text
                  style={{
                    color: colors.text.primary,
                    fontFamily: 'Inter-SemiBold',
                    fontSize: 13,
                  }}
                >
                  Distance / week
                </Text>
                <Text style={{ color: colors.text.muted, fontFamily: 'Inter-Regular', fontSize: 11 }}>
                  km
                </Text>
              </View>
              <View
                accessibilityLabel={`Weekly distance sample: ${displayData.distancePoints
                  .map((point) => `${point.label} ${point.value} kilometers`)
                  .join(', ')}`}
                style={{ alignItems: 'flex-end', flexDirection: 'row', gap: 8, height: 110 }}
              >
                {displayData.distancePoints.map((point, index) => {
                  const isLatest = index === displayData.distancePoints.length - 1;
                  const barHeight = Math.max(12, (point.value / distanceMax) * 82);
                  const rampColors = [
                    colors.border.divider,
                    colors.accent.tealSubtle,
                    colors.border.accent,
                    colors.accent.primary,
                    colors.accent.primary,
                    colors.accent.tealMid,
                  ];

                  return (
                    <View
                      key={`${point.label}-${index}`}
                      style={{ alignItems: 'center', flex: 1, gap: 8, justifyContent: 'flex-end' }}
                    >
                      <View style={{ alignItems: 'center', justifyContent: 'flex-end' }}>
                        {isLatest ? (
                          <Text
                            style={{
                              color: colors.accent.tealMid,
                              fontFamily: 'Inter-Bold',
                              fontSize: 10.5,
                              marginBottom: 4,
                            }}
                          >
                            {point.value}
                          </Text>
                        ) : null}
                        <View
                          style={{
                            backgroundColor: rampColors[Math.min(index, rampColors.length - 1)],
                            borderRadius: 6,
                            height: barHeight,
                            maxWidth: 30,
                            width: 22,
                          }}
                        />
                      </View>
                      <Text
                        style={{
                          color: isLatest ? colors.text.primary : colors.text.muted,
                          fontFamily: isLatest ? 'Inter-SemiBold' : 'Inter-Regular',
                          fontSize: 10,
                        }}
                      >
                        {point.label}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>

            <View style={{ flex: compact ? undefined : 1, minWidth: 0 }}>
              <View
                style={{
                  alignItems: 'center',
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  marginBottom: 14,
                }}
              >
                <Text
                  style={{
                    color: colors.text.primary,
                    fontFamily: 'Inter-SemiBold',
                    fontSize: 13,
                  }}
                >
                  Pace trend
                </Text>
                <Text
                  style={{
                    color: colors.accent.tealMid,
                    fontFamily: 'Inter-SemiBold',
                    fontSize: 11,
                  }}
                >
                  {displayData.bestPaceLabel}
                </Text>
              </View>
              <View
                accessibilityLabel={`Pace trend from ${displayData.pacePoints.at(0)?.label ?? 'start'} to ${displayData.pacePoints.at(-1)?.label ?? 'latest'}`}
              >
                <Svg height={110} preserveAspectRatio="none" viewBox="0 0 260 110" width="100%">
                  {[27, 55, 83].map((y) => (
                    <Line
                      key={y}
                      stroke={colors.border.warmSubtle}
                      strokeWidth={1}
                      x1={0}
                      x2={260}
                      y1={y}
                      y2={y}
                    />
                  ))}
                  <Polyline
                    fill="none"
                    points={linePoints}
                    stroke={colors.accent.primary}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                  />
                  {displayData.pacePoints.map((point, index) => {
                    const position = pacePointPosition(point, index, displayData.pacePoints);
                    const isLatest = index === displayData.pacePoints.length - 1;
                    return (
                      <Circle
                        key={`${point.label}-${index}`}
                        cx={position.x}
                        cy={position.y}
                        fill={isLatest ? colors.accent.tealMid : colors.accent.primary}
                        r={isLatest ? 4.5 : 3.5}
                        stroke={isLatest ? colors.background.card : 'none'}
                        strokeWidth={isLatest ? 2 : 0}
                      />
                    );
                  })}
                </Svg>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
                <Text style={{ color: colors.text.muted, fontFamily: 'Inter-Regular', fontSize: 10 }}>
                  {displayData.pacePoints.at(0)?.label ?? 'Earlier'}
                </Text>
                <Text
                  style={{
                    color: colors.text.primary,
                    fontFamily: 'Inter-SemiBold',
                    fontSize: 10,
                  }}
                >
                  {displayData.pacePoints.at(-1)?.label ?? 'Latest'}
                </Text>
              </View>
              <Text
                style={{
                  color: colors.text.secondary,
                  fontFamily: 'Inter-Regular',
                  fontSize: 11.5,
                  lineHeight: 16,
                  marginTop: 8,
                }}
              >
                {displayData.trendSummary}{' '}
                {displayData.trendHighlight ? (
                  <Text style={{ color: colors.accent.tealMid, fontFamily: 'Inter-SemiBold' }}>
                    {displayData.trendHighlight}
                  </Text>
                ) : null}
              </Text>
            </View>
          </View>
        </>
      ) : (
        <View
          style={{
            alignItems: 'center',
            backgroundColor: colors.background.goalCard,
            borderColor: colors.border.warm,
            borderRadius: 12,
            borderWidth: 1,
            paddingHorizontal: 20,
            paddingVertical: 32,
          }}
        >
          <Text
            style={{
              color: colors.text.primary,
              fontFamily: 'Inter-SemiBold',
              fontSize: 14,
              marginBottom: 4,
            }}
          >
            Training data will appear here
          </Text>
          <Text
            style={{
              color: colors.text.muted,
              fontFamily: 'Inter-Regular',
              fontSize: 12,
              textAlign: 'center',
            }}
          >
            No live analytics source is connected yet.
          </Text>
        </View>
      )}
    </View>
  );
}
