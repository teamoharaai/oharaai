import { Pressable, View } from 'react-native';
import { Typography } from '@/components/ui/Typography';
import { useThemeColors, useUIStore } from '@/store/uiStore';
import { RADIUS, SPACE } from '@/constants/design';

export interface SegmentedControlOption<T extends string> {
  value: T;
  label: string;
}

export function SegmentedControl<T extends string>({
  compact = false,
  options,
  value,
  onChange,
  accessibilityLabel,
}: {
  compact?: boolean;
  options: readonly SegmentedControlOption<T>[];
  value: T;
  onChange: (value: T) => void;
  accessibilityLabel?: string;
}) {
  const colors = useThemeColors();
  const darkMode = useUIStore((current) => current.themeMode) === 'dark';

  return (
    <View
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="tablist"
      style={{
        alignSelf: 'center',
        backgroundColor: colors.background.input,
        borderColor: colors.border.warm,
        borderRadius: RADIUS.round,
        borderWidth: 1,
        flexDirection: 'row',
        gap: SPACE.xs,
        padding: SPACE.xs,
      }}
    >
      {options.map((option) => {
        const selected = value === option.value;
        return (
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            key={option.value}
            onPress={() => onChange(option.value)}
            style={({ pressed }) => ({
              alignItems: 'center',
              backgroundColor: selected ? colors.background.card : 'transparent',
              borderColor: selected ? colors.border.subtle : 'transparent',
              borderRadius: RADIUS.round,
              borderWidth: 1,
              justifyContent: 'center',
              minHeight: 36,
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
              style={{ color: selected ? colors.text.accent : colors.text.secondary }}
            >
              {option.label}
            </Typography>
          </Pressable>
        );
      })}
    </View>
  );
}
