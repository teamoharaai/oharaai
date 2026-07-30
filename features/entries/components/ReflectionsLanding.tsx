import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Typography } from '@/components/ui/Typography';
import { useEntriesStore } from '../store';
import { useThemeColors } from '@/store/uiStore';
import type { ReflectionType } from '../types';

const REFLECTION_OPTIONS: Array<{
  type: ReflectionType;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
}> = [
  { type: 'week', title: 'My week', description: 'Notice what shifted, supported you, or needs care.', icon: 'calendar-outline' },
  { type: 'goal', title: 'A goal', description: 'Explore movement, friction, and what matters next.', icon: 'flag-outline' },
  { type: 'milestone', title: 'A milestone', description: 'Pause around a meaningful marker in your journey.', icon: 'trail-sign-outline' },
  { type: 'open', title: 'Something on my mind', description: 'Begin with whatever feels most present.', icon: 'chatbubble-ellipses-outline' },
];

export function ReflectionsLanding() {
  const colors = useThemeColors();
  const { width } = useWindowDimensions();
  const compact = width < 720;
  const entries = useEntriesStore((state) => state.entries);
  const isLoading = useEntriesStore((state) => state.isLoading);
  const error = useEntriesStore((state) => state.error);
  const loadEntries = useEntriesStore((state) => state.loadEntries);
  const [selectedType, setSelectedType] = useState<ReflectionType>('week');

  useEffect(() => {
    void loadEntries('reflection');
  }, [loadEntries]);

  const reflections = entries
    .filter((entry) => entry.entryType === 'reflection')
    .sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime());

  return (
    <View style={{ gap: compact ? 24 : 32 }}>
      <View style={{ alignItems: 'center', maxWidth: 760, alignSelf: 'center' }}>
        <Typography variant="eyebrow" style={{ color: colors.text.accent }}>
          A MOMENT TO NOTICE
        </Typography>
        <Typography
          variant="heading"
          style={{
            fontFamily: 'Inter-SemiBold',
            fontSize: compact ? 28 : 36,
            lineHeight: compact ? 35 : 44,
            marginTop: 10,
            textAlign: 'center',
          }}
        >
          What would you like to reflect on?
        </Typography>
        <Typography variant="body" style={{ marginTop: 10, textAlign: 'center' }}>
          Choose a starting point. Ohara will guide you with a transparent set of prompts—no AI response is generated.
        </Typography>
      </View>

      <View
        style={{
          alignSelf: 'center',
          flexDirection: compact ? 'column' : 'row',
          flexWrap: 'wrap',
          gap: 12,
          justifyContent: 'center',
          maxWidth: 980,
          width: '100%',
        }}
      >
        {REFLECTION_OPTIONS.map((option) => {
          const selected = option.type === selectedType;
          return (
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              key={option.type}
              onPress={() => setSelectedType(option.type)}
              style={({ pressed }) => ({
                opacity: pressed ? 0.72 : 1,
                width: compact ? '100%' : '48.5%',
              })}
            >
              <Card
                padding="default"
                style={{
                  backgroundColor: selected ? colors.background.selectedRow : colors.background.card,
                  borderColor: selected ? colors.border.accent : colors.border.divider,
                  minHeight: compact ? 112 : 132,
                }}
              >
                <View style={{ alignItems: 'center', flexDirection: 'row', gap: 12 }}>
                  <View
                    style={{
                      alignItems: 'center',
                      backgroundColor: colors.background.input,
                      borderRadius: 12,
                      height: 42,
                      justifyContent: 'center',
                      width: 42,
                    }}
                  >
                    <Ionicons name={option.icon} color={colors.text.accent} size={21} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Typography variant="title" style={{ fontSize: 16 }}>{option.title}</Typography>
                    <Typography variant="caption" style={{ marginTop: 4 }}>
                      {option.description}
                    </Typography>
                  </View>
                  <Ionicons
                    name={selected ? 'checkmark-circle' : 'ellipse-outline'}
                    color={selected ? colors.accent.primary : colors.text.muted}
                    size={22}
                  />
                </View>
              </Card>
            </Pressable>
          );
        })}
      </View>

      <Button
        onPress={() => router.push({
          pathname: '/(app)/entries/reflection',
          params: { type: selectedType },
        } as never)}
        style={{ alignSelf: 'center', minWidth: 190 }}
      >
        Start a Reflection
      </Button>

      <View style={{ gap: 12, marginTop: 8 }}>
        <Typography variant="title">Recent Reflections</Typography>
        {error ? (
          <Typography accessibilityRole="alert" variant="caption" style={{ color: colors.feedback.danger.text }}>
            {error}
          </Typography>
        ) : null}
        {isLoading && reflections.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 30 }}>
            <ActivityIndicator color={colors.accent.primary} />
          </View>
        ) : reflections.length ? (
          reflections.map((reflection) => (
            <Pressable
              accessibilityLabel={`Open reflection ${reflection.title}`}
              accessibilityRole="button"
              key={reflection.id}
              onPress={() => router.push(`/(app)/entries/${reflection.id}` as never)}
              style={({ pressed }) => ({ opacity: pressed ? 0.72 : 1 })}
            >
              <Card
                padding="default"
                style={{
                  alignItems: compact ? 'flex-start' : 'center',
                  flexDirection: compact ? 'column' : 'row',
                  gap: 12,
                }}
              >
                <View
                  style={{
                    alignItems: 'center',
                    backgroundColor: colors.background.input,
                    borderRadius: 12,
                    height: 42,
                    justifyContent: 'center',
                    width: 42,
                  }}
                >
                  <Ionicons name="sparkles-outline" color={colors.text.accent} size={20} />
                </View>
                <View style={{ flex: 1 }}>
                  <Typography variant="title" style={{ fontSize: 16 }}>
                    {reflection.title || 'Reflection'}
                  </Typography>
                  <Typography variant="body" numberOfLines={2} style={{ fontSize: 13.5, marginTop: 4 }}>
                    {reflection.takeaway || reflection.plainText}
                  </Typography>
                  <Typography variant="caption" style={{ marginTop: 6 }}>
                    {reflection.updatedAt.toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                    {reflection.goals[0] ? ` · ${reflection.goals[0].title}` : ''}
                  </Typography>
                </View>
                <Ionicons name="chevron-forward" color={colors.text.muted} size={20} />
              </Card>
            </Pressable>
          ))
        ) : (
          <View
            style={{
              borderColor: colors.border.subtle,
              borderRadius: 16,
              borderStyle: 'dashed',
              borderWidth: 1,
              padding: 24,
            }}
          >
            <Typography variant="emphasis-sm">Your reflections will gather here.</Typography>
            <Typography variant="caption" style={{ marginTop: 5 }}>
              Start with a week, goal, milestone, or whatever is on your mind.
            </Typography>
          </View>
        )}
      </View>
    </View>
  );
}
