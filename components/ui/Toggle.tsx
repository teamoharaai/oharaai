import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import { useThemeColors } from '@/store/uiStore';
import { RADIUS } from '@/constants/design';

export interface ToggleProps {
  accessibilityLabel: string;
  disabled?: boolean;
  onValueChange: (value: boolean) => void;
  style?: StyleProp<ViewStyle>;
  value: boolean;
}

export function Toggle({
  accessibilityLabel,
  disabled = false,
  onValueChange,
  style,
  value,
}: ToggleProps) {
  const colors = useThemeColors();

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
      disabled={disabled}
      hitSlop={8}
      onPress={() => onValueChange(!value)}
      style={({ pressed }) => [
        {
          backgroundColor: value ? colors.accent.primary : colors.border.input,
          borderRadius: RADIUS.round,
          height: 28,
          justifyContent: 'center',
          opacity: disabled ? 0.45 : pressed ? 0.78 : 1,
          padding: 3,
          width: 48,
        },
        style,
      ]}
    >
      <View
        style={{
          backgroundColor: value ? colors.text.onAccent : colors.text.primary,
          borderRadius: RADIUS.round,
          height: 22,
          transform: [{ translateX: value ? 20 : 0 }],
          width: 22,
        }}
      />
    </Pressable>
  );
}
