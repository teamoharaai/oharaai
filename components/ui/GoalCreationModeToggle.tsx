import { Pressable, View } from 'react-native';
import { Typography } from '@/components/ui/Typography';
import { useThemeColors, useUIStore } from '@/store/uiStore';

export type GoalCreationMode = 'manual' | 'ai';

export function GoalCreationModeToggle({
  compact = false,
  mode,
  onChange,
}: {
  compact?: boolean;
  mode: GoalCreationMode;
  onChange: (mode: GoalCreationMode) => void;
}) {
  const colors = useThemeColors();
  const darkMode = useUIStore((current) => current.themeMode) === 'dark';

  return (
    <View
      accessibilityRole="tablist"
      style={{
        alignSelf: 'center',
        backgroundColor: colors.background.input,
        borderColor: colors.border.warm,
        borderRadius: 999,
        borderWidth: 1,
        flexDirection: 'row',
        gap: 4,
        padding: 4,
      }}
    >
      {([
        ['manual', 'Build it myself'],
        ['ai', '✦ Chat with Echo'],
      ] as const).map(([value, label]) => {
        const selected = mode === value;
        return (
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            key={value}
            onPress={() => onChange(value)}
            style={({ pressed }) => ({
              alignItems: 'center',
              backgroundColor: selected ? colors.accent.primary : 'transparent',
              borderRadius: 999,
              justifyContent: 'center',
              minHeight: 38,
              opacity: pressed ? 0.76 : 1,
              paddingHorizontal: compact ? 12 : 16,
              shadowColor: colors.text.primary,
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: selected && !darkMode ? 0.08 : 0,
              shadowRadius: 4,
            })}
          >
            <Typography
              variant="emphasis-sm"
              style={{ color: selected ? colors.text.onAccent : colors.text.secondary }}
            >
              {label}
            </Typography>
          </Pressable>
        );
      })}
    </View>
  );
}
