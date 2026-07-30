import { Pressable, View } from 'react-native';
import { Typography } from '@/components/ui/Typography';
import { useThemeColors, useUIStore } from '@/store/uiStore';

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
        borderRadius: 999,
        borderWidth: 1,
        flexDirection: 'row',
        gap: 4,
        padding: 4,
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
              {option.label}
            </Typography>
          </Pressable>
        );
      })}
    </View>
  );
}
