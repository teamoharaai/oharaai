import { Pressable, Text, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useThemeColors } from '@/store/uiStore';

export type IntelligencePanelState = 'stub' | 'disconnected' | 'connected';

export interface IntelligenceStat {
  label: string;
  value: string;
  detail?: string;
  tone?: 'positive' | 'warning' | 'neutral';
}

export interface IntelligencePanelProps {
  state?: IntelligencePanelState;
  sourceName?: string;
  insight?: string | null;
  stats?: readonly IntelligenceStat[];
  onSeeWhatHelps?: () => void;
}

const STUB_INSIGHT =
  'You keep mentioning ankle discomfort after your longer runs. Try adding ankle-mobility and calf work before the practice 5K — and runners on this path often switch to shoes with firmer heel support.';

const STUB_STATS: readonly IntelligenceStat[] = [
  { label: 'Avg pace', value: '6:24', detail: '/km ↓', tone: 'positive' },
  { label: 'Ankle mentions', value: '4', detail: 'this month', tone: 'warning' },
];

function getSourceLabel(state: IntelligencePanelState, sourceName: string): string {
  if (state === 'connected') return `${sourceName} connected`;
  if (state === 'disconnected') return 'No data source';
  return 'Example insight';
}

export function IntelligencePanel({
  state = 'stub',
  sourceName = 'Strava',
  insight,
  stats,
  onSeeWhatHelps,
}: IntelligencePanelProps) {
  const colors = useThemeColors();
  const { width } = useWindowDimensions();
  const compact = width < 560;
  const displayInsight =
    insight ??
    (state === 'stub'
      ? STUB_INSIGHT
      : state === 'connected'
        ? 'Ohara is gathering enough context to offer a useful insight here.'
        : 'Connect a supported activity source when integrations become available to see contextual guidance here.');
  const displayStats = stats ?? (state === 'stub' ? STUB_STATS : []);
  const sourceLabel = getSourceLabel(state, sourceName);
  const sourceDotColor =
    state === 'connected'
      ? sourceName.toLowerCase() === 'strava'
        ? '#FC5200'
        : colors.accent.teal
      : state === 'stub'
        ? colors.accent.tealSoft
        : colors.text.mutedOnDark;

  return (
    <View
      accessibilityLabel={`Ohara Intelligence. ${sourceLabel}. ${displayInsight}`}
      style={{
        backgroundColor: colors.background.sidebar,
        borderRadius: 20,
        elevation: 2,
        overflow: 'hidden',
        shadowColor: colors.background.sidebar,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 22,
      }}
    >
      <LinearGradient
        colors={[colors.background.sidebar, `${colors.accent.primary}38`]}
        end={{ x: 1, y: 1 }}
        start={{ x: 0, y: 0 }}
        style={{ paddingHorizontal: compact ? 20 : 26, paddingVertical: 24 }}
      >
        <View
          style={{
            alignItems: 'center',
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 9,
            marginBottom: 14,
          }}
        >
          <View
            style={{
              alignItems: 'center',
              backgroundColor: `${colors.accent.teal}29`,
              borderRadius: 8,
              height: 26,
              justifyContent: 'center',
              width: 26,
            }}
          >
            <Text style={{ color: colors.accent.teal, fontSize: 14 }}>✦</Text>
          </View>
          <Text
            style={{
              color: colors.accent.tealSoft,
              flexGrow: 1,
              fontFamily: 'Inter-SemiBold',
              fontSize: 11,
              letterSpacing: 2,
              textTransform: 'uppercase',
            }}
          >
            Ohara Intelligence
          </Text>
          <View
            accessibilityLabel={sourceLabel}
            style={{
              alignItems: 'center',
              backgroundColor: `${colors.text.inverse}10`,
              borderRadius: 999,
              flexDirection: 'row',
              gap: 6,
              paddingHorizontal: 10,
              paddingVertical: 4,
            }}
          >
            <View
              style={{
                backgroundColor: sourceDotColor,
                borderRadius: 3,
                height: 6,
                width: 6,
              }}
            />
            <Text
              style={{
                color: colors.accent.tealSoft,
                fontFamily: 'Inter-Regular',
                fontSize: 11,
              }}
            >
              {sourceLabel}
            </Text>
          </View>
        </View>

        <Text
          style={{
            color: colors.text.inverse,
            fontFamily: 'Lora-Italic',
            fontSize: 18,
            lineHeight: 28,
            marginBottom: 16,
          }}
        >
          “{displayInsight}”
        </Text>

        <View
          style={{
            alignItems: compact ? 'stretch' : 'center',
            flexDirection: compact ? 'column' : 'row',
            flexWrap: 'wrap',
            gap: 10,
          }}
        >
          {displayStats.length > 0 ? (
            displayStats.map((stat) => {
              const detailColor =
                stat.tone === 'positive'
                  ? colors.accent.teal
                  : stat.tone === 'warning'
                    ? colors.brt.rose
                    : colors.accent.tealSoft;

              return (
                <View
                  key={`${stat.label}-${stat.value}`}
                  style={{
                    backgroundColor: `${colors.text.inverse}12`,
                    borderRadius: 10,
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                  }}
                >
                  <Text
                    style={{
                      color: colors.text.mutedOnDark,
                      fontFamily: 'Inter-Regular',
                      fontSize: 10.5,
                      letterSpacing: 1,
                      textTransform: 'uppercase',
                    }}
                  >
                    {stat.label}
                  </Text>
                  <Text
                    style={{
                      color: colors.text.inverse,
                      fontFamily: 'Inter-SemiBold',
                      fontSize: 16,
                      marginTop: 2,
                    }}
                  >
                    {stat.value}{' '}
                    {stat.detail ? (
                      <Text style={{ color: detailColor, fontFamily: 'Inter-Regular', fontSize: 11 }}>
                        {stat.detail}
                      </Text>
                    ) : null}
                  </Text>
                </View>
              );
            })
          ) : (
            <View
              style={{
                backgroundColor: `${colors.text.inverse}12`,
                borderRadius: 10,
                paddingHorizontal: 14,
                paddingVertical: 10,
              }}
            >
              <Text
                style={{
                  color: colors.text.mutedOnDark,
                  fontFamily: 'Inter-Regular',
                  fontSize: 11,
                }}
              >
                No live metrics yet
              </Text>
            </View>
          )}

          <Pressable
            accessibilityLabel="See recommendations that may help with this goal"
            accessibilityRole="button"
            accessibilityState={{ disabled: !onSeeWhatHelps }}
            disabled={!onSeeWhatHelps}
            onPress={onSeeWhatHelps}
            style={({ pressed }) => ({
              alignItems: 'center',
              alignSelf: compact ? 'stretch' : 'center',
              backgroundColor: colors.accent.teal,
              borderRadius: 10,
              justifyContent: 'center',
              marginLeft: compact ? 0 : 'auto',
              opacity: !onSeeWhatHelps ? 0.55 : pressed ? 0.82 : 1,
              paddingHorizontal: 16,
              paddingVertical: 10,
            })}
          >
            <Text
              style={{
                color: colors.background.sidebar,
                fontFamily: 'Inter-SemiBold',
                fontSize: 13,
              }}
            >
              See what helps →
            </Text>
          </Pressable>
        </View>
      </LinearGradient>
    </View>
  );
}
