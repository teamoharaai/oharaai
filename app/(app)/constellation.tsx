import { useEffect, useState } from 'react';
import { View, Text, ScrollView, SafeAreaView } from 'react-native';
import ConstellationSample from '@/components/constellation/ConstellationSample';
import { Typography } from '@/components/ui/Typography';
import { useThemeColors } from '@/store/uiStore';
import { authedFetch } from '@/lib/api/client';

const GOAL_GATE = 3;
const ECHO_GATE = 10;

export default function ConstellationScreen() {
  const colors = useThemeColors();
  const [goalCount, setGoalCount] = useState<number | null>(null);
  const [echoCount, setEchoCount] = useState<number | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const res = await authedFetch('/api/dashboard/summary');
        if (!res.ok || !active) return;
        const body = (await res.json()) as { goalCount: number; echoCount: number };
        if (active) {
          setGoalCount(body.goalCount);
          setEchoCount(body.echoCount);
        }
      } catch {
        // Fail silently — counts stay null
      }
    }

    void load();
    return () => { active = false; };
  }, []);

  const goalFill = goalCount !== null
    ? Math.min((goalCount / GOAL_GATE) * 100, 100)
    : 0;
  const echoFill = echoCount !== null
    ? Math.min((echoCount / ECHO_GATE) * 100, 100)
    : 0;

  const bothMet =
    goalCount !== null && echoCount !== null &&
    goalCount >= GOAL_GATE && echoCount >= ECHO_GATE;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background.page }}>
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: 32,
          paddingVertical: 48,
        }}
      >
        {/* Visual */}
        <View
          style={{
            width: '100%',
            maxWidth: 360,
            backgroundColor: colors.background.card,
            borderRadius: 24,
            borderWidth: 1,
            borderColor: colors.border.subtle,
            padding: 20,
            marginBottom: 40,
            shadowColor: '#000000',
            shadowOpacity: 0.06,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 2 },
            elevation: 2,
          }}
        >
          <ConstellationSample />
        </View>

        {/* Headline */}
        <Text
          style={{
            fontFamily: 'Inter-SemiBold',
            fontSize: 22,
            color: colors.text.primary,
            textAlign: 'center',
            marginBottom: 12,
          }}
        >
          Your Constellation is forming
        </Text>

        {/* Subtext */}
        <Typography
          variant="description"
          style={{
            textAlign: 'center',
            marginBottom: 40,
            maxWidth: 280,
          }}
        >
          As you set goals and reflect in Echo, Ohara maps your patterns into a
          personal Constellation — a living picture of who you&apos;re becoming.
        </Typography>

        {/* Progress gates */}
        <View style={{ width: '100%', maxWidth: 320, gap: 20 }}>
          {/* Goals progress */}
          <View>
            <Text
              style={{
                fontFamily: 'Inter-Regular',
                fontSize: 12,
                color: colors.text.secondary,
                marginBottom: 6,
              }}
            >
              {goalCount !== null ? `${goalCount} of ${GOAL_GATE} goals` : `— of ${GOAL_GATE} goals`}
            </Text>
            <View
              style={{
                height: 4,
                backgroundColor: colors.border.divider,
                borderRadius: 2,
                overflow: 'hidden',
              }}
            >
              <View
                style={{
                  width: `${goalFill}%`,
                  height: 4,
                  backgroundColor: colors.accent.primary,
                  borderRadius: 2,
                }}
              />
            </View>
          </View>

          {/* Echo progress */}
          <View>
            <Text
              style={{
                fontFamily: 'Inter-Regular',
                fontSize: 12,
                color: colors.text.secondary,
                marginBottom: 6,
              }}
            >
              {echoCount !== null
                ? `${echoCount} of ${ECHO_GATE} reflections`
                : `— of ${ECHO_GATE} reflections`}
            </Text>
            <View
              style={{
                height: 4,
                backgroundColor: colors.border.divider,
                borderRadius: 2,
                overflow: 'hidden',
              }}
            >
              <View
                style={{
                  width: `${echoFill}%`,
                  height: 4,
                  backgroundColor: colors.accent.primary,
                  borderRadius: 2,
                }}
              />
            </View>
          </View>

          {/* Status */}
          <Text
            style={{
              fontFamily: 'Inter-Regular',
              fontSize: 13,
              color: bothMet ? colors.text.accent : colors.text.muted,
              textAlign: 'center',
              marginTop: 4,
            }}
          >
            {bothMet ? 'Constellation unlocking soon ✦' : 'Keep going'}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
