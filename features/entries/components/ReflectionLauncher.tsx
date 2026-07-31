import { useState } from 'react';
import { Pressable, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Button } from '@/components/ui/Button';
import { Typography } from '@/components/ui/Typography';
import { useThemeColors } from '@/store/uiStore';
import type { ReflectionType } from '../types';

const REFLECTION_OPTIONS: Array<{
  type: ReflectionType;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
}> = [
  {
    type: 'week',
    title: 'My week',
    description: 'Notice what shifted, supported you, or needs care across the week.',
    icon: 'calendar-outline',
  },
  {
    type: 'goal',
    title: 'A goal',
    description: 'Explore movement, friction, and what matters next for one goal.',
    icon: 'flag-outline',
  },
  {
    type: 'milestone',
    title: 'A milestone',
    description: 'Pause around a meaningful marker and what helped you reach it.',
    icon: 'trail-sign-outline',
  },
  {
    type: 'open',
    title: 'On my mind',
    description: 'Begin with whatever feels most present without choosing a structure.',
    icon: 'chatbubble-ellipses-outline',
  },
];

export function ReflectionLauncher() {
  const colors = useThemeColors();
  const { width } = useWindowDimensions();
  const compact = width < 720;
  const [selectedType, setSelectedType] = useState<ReflectionType>('week');
  const [previewType, setPreviewType] = useState<ReflectionType | null>(null);
  const describedType = previewType ?? selectedType;
  const description = REFLECTION_OPTIONS.find((option) => option.type === describedType);

  return (
    <View
      style={{
        backgroundColor: colors.background.card,
        borderColor: colors.border.divider,
        borderRadius: 16,
        borderWidth: 1,
        gap: 12,
        padding: compact ? 14 : 16,
      }}
    >
      <View
        style={{
          alignItems: compact ? 'flex-start' : 'center',
          flexDirection: compact ? 'column' : 'row',
          gap: 10,
        }}
      >
        <View style={{ minWidth: compact ? undefined : 180 }}>
          <Typography variant="eyebrow" style={{ color: colors.text.accent }}>
            REFLECT
          </Typography>
          <Typography variant="emphasis-sm" style={{ marginTop: 3 }}>
            Choose a starting point
          </Typography>
        </View>

        <View
          accessibilityLabel="Reflection starting point"
          accessibilityRole="radiogroup"
          style={{
            flex: 1,
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 8,
            width: compact ? '100%' : undefined,
          }}
        >
          {REFLECTION_OPTIONS.map((option) => {
            const selected = option.type === selectedType;
            const previewed = option.type === describedType;
            return (
              <Pressable
                accessibilityLabel={option.title}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                key={option.type}
                onBlur={() => setPreviewType(null)}
                onFocus={() => setPreviewType(option.type)}
                onHoverIn={() => setPreviewType(option.type)}
                onHoverOut={() => setPreviewType(null)}
                onPress={() => setSelectedType(option.type)}
                style={({ pressed }) => ({
                  alignItems: 'center',
                  backgroundColor: selected
                    ? colors.background.selectedRow
                    : colors.background.input,
                  borderColor: selected || previewed
                    ? colors.border.accent
                    : colors.border.subtle,
                  borderRadius: 999,
                  borderWidth: 1,
                  flexDirection: 'row',
                  gap: 6,
                  minHeight: 40,
                  opacity: pressed ? 0.72 : 1,
                  paddingHorizontal: 11,
                })}
              >
                <Ionicons
                  name={option.icon}
                  color={selected ? colors.text.accent : colors.text.secondary}
                  size={17}
                />
                <Typography variant="emphasis-sm">{option.title}</Typography>
              </Pressable>
            );
          })}
        </View>

        <Button
          onPress={() => router.push({
            pathname: '/(app)/entries/reflection',
            params: { type: selectedType },
          } as never)}
          size="compact"
          style={{ minWidth: compact ? '100%' : 132 }}
        >
          Start
        </Button>
      </View>

      <View
        accessibilityLiveRegion="polite"
        style={{
          alignItems: 'center',
          backgroundColor: colors.background.input,
          borderRadius: 10,
          flexDirection: 'row',
          gap: 8,
          minHeight: 38,
          paddingHorizontal: 12,
          paddingVertical: 8,
        }}
      >
        <Ionicons
          name={description?.icon ?? 'sparkles-outline'}
          color={colors.text.accent}
          size={16}
        />
        <Typography variant="caption" style={{ flex: 1 }}>
          <Typography variant="emphasis-sm">{description?.title}: </Typography>
          {description?.description}
        </Typography>
      </View>
    </View>
  );
}
