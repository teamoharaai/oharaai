import { useEffect, useState } from 'react';
import { View, Text, ScrollView, SafeAreaView } from 'react-native';
import supabase from '@/lib/db/client';

const GOAL_GATE = 3;
const ECHO_GATE = 10;

// Simple star node layout — no SVG dep needed
const STAR_NODES: Array<{ top: number; left: number; size: number; opacity: number }> = [
  { top: 20, left: 80,  size: 5, opacity: 0.9 },
  { top: 60, left: 40,  size: 3, opacity: 0.6 },
  { top: 50, left: 130, size: 4, opacity: 0.75 },
  { top: 90, left: 70,  size: 6, opacity: 1 },
  { top: 30, left: 160, size: 3, opacity: 0.5 },
  { top: 100, left: 20, size: 4, opacity: 0.65 },
  { top: 10, left: 200, size: 3, opacity: 0.55 },
  { top: 70, left: 190, size: 5, opacity: 0.8 },
];

async function getAccessToken(): Promise<string | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

export default function ConstellationScreen() {
  const [goalCount, setGoalCount] = useState<number | null>(null);
  const [echoCount, setEchoCount] = useState<number | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      const token = await getAccessToken();
      if (!token || !active) return;

      try {
        const res = await fetch('/api/dashboard/summary', {
          headers: { Authorization: `Bearer ${token}` },
        });
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
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F5F1EA' }}>
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: 32,
          paddingVertical: 48,
        }}
      >
        {/* Visual — star nodes simulated with Views */}
        <View
          style={{
            width: 240,
            height: 130,
            marginBottom: 40,
            position: 'relative',
          }}
        >
          {STAR_NODES.map((node, i) => (
            <View
              key={i}
              style={{
                position: 'absolute',
                top: node.top,
                left: node.left,
                width: node.size,
                height: node.size,
                borderRadius: node.size / 2,
                backgroundColor: '#3D5247',
                opacity: node.opacity,
              }}
            />
          ))}
        </View>

        {/* Headline */}
        <Text
          style={{
            fontFamily: 'Inter',
            fontSize: 22,
            fontWeight: '600',
            color: '#1A1F1C',
            textAlign: 'center',
            marginBottom: 12,
          }}
        >
          Your Constellation is forming
        </Text>

        {/* Subtext */}
        <Text
          style={{
            fontFamily: 'Inter',
            fontSize: 14,
            lineHeight: 21,
            color: '#6B7280',
            textAlign: 'center',
            marginBottom: 40,
            maxWidth: 280,
          }}
        >
          As you set goals and reflect in Echo, Ohara maps your patterns into a
          personal Constellation — a living picture of who you&apos;re becoming.
        </Text>

        {/* Progress gates */}
        <View style={{ width: '100%', maxWidth: 320, gap: 20 }}>
          {/* Goals progress */}
          <View>
            <Text
              style={{
                fontFamily: 'Inter',
                fontSize: 12,
                color: '#6B7280',
                marginBottom: 6,
              }}
            >
              {goalCount !== null ? `${goalCount} of ${GOAL_GATE} goals` : `— of ${GOAL_GATE} goals`}
            </Text>
            <View
              style={{
                height: 4,
                backgroundColor: '#EAE7E0',
                borderRadius: 2,
                overflow: 'hidden',
              }}
            >
              <View
                style={{
                  width: `${goalFill}%`,
                  height: 4,
                  backgroundColor: '#3D5247',
                  borderRadius: 2,
                }}
              />
            </View>
          </View>

          {/* Echo progress */}
          <View>
            <Text
              style={{
                fontFamily: 'Inter',
                fontSize: 12,
                color: '#6B7280',
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
                backgroundColor: '#EAE7E0',
                borderRadius: 2,
                overflow: 'hidden',
              }}
            >
              <View
                style={{
                  width: `${echoFill}%`,
                  height: 4,
                  backgroundColor: '#3D5247',
                  borderRadius: 2,
                }}
              />
            </View>
          </View>

          {/* Status */}
          <Text
            style={{
              fontFamily: 'Inter',
              fontSize: 13,
              color: bothMet ? '#3D5247' : '#9CAF9F',
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
