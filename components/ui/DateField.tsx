import {
  Platform,
  StyleSheet,
  TextInput,
  type StyleProp,
  type TextStyle,
} from 'react-native';
import {
  createElement,
  useState,
  type ChangeEvent,
  type CSSProperties,
} from 'react';
import { useThemeColors } from '@/store/uiStore';

export interface DateFieldProps {
  accessibilityLabel?: string;
  error?: string | null;
  minimumDate?: string;
  onBlur?: (value: string) => void;
  onChange: (value: string) => void;
  style?: StyleProp<TextStyle>;
  value: string;
}

export function DateField({
  accessibilityLabel = 'Date',
  error = null,
  minimumDate,
  onBlur,
  onChange,
  style,
  value,
}: DateFieldProps) {
  const colors = useThemeColors();
  const [focused, setFocused] = useState(false);
  const borderColor = error
    ? colors.feedback.danger.border
    : focused
      ? colors.border.accent
      : colors.border.input;

  if (Platform.OS === 'web') {
    const flattenedStyle = StyleSheet.flatten(style);
    const webStyle: CSSProperties = {
      backgroundColor: colors.background.input,
      border: `1px solid ${borderColor}`,
      borderRadius: 999,
      boxSizing: 'border-box',
      color: colors.text.primary,
      fontFamily: 'Inter-Regular',
      fontSize: 13,
      height: 36,
      outline: 'none',
      padding: '8px 16px',
      width: 170,
      ...(flattenedStyle as unknown as CSSProperties),
    };

    return createElement('input', {
      'aria-invalid': Boolean(error),
      'aria-label': accessibilityLabel,
      min: minimumDate,
      onBlur: (event: ChangeEvent<HTMLInputElement>) => {
        setFocused(false);
        onBlur?.(event.currentTarget.value);
      },
      onChange: (event: ChangeEvent<HTMLInputElement>) =>
        onChange(event.currentTarget.value),
      onFocus: () => setFocused(true),
      style: webStyle,
      type: 'date',
      value,
    });
  }

  return (
    <TextInput
      accessibilityHint={error ?? undefined}
      accessibilityLabel={accessibilityLabel}
      autoCapitalize="none"
      autoCorrect={false}
      onBlur={() => {
        setFocused(false);
        onBlur?.(value);
      }}
      onChangeText={onChange}
      onFocus={() => setFocused(true)}
      placeholder="YYYY-MM-DD"
      placeholderTextColor={colors.text.muted}
      style={[
        {
          backgroundColor: colors.background.input,
          borderColor,
          borderRadius: 999,
          borderWidth: 1,
          color: colors.text.primary,
          fontFamily: 'Inter-Regular',
          fontSize: 13,
          height: 36,
          paddingHorizontal: 16,
          paddingVertical: 8,
          width: 170,
        },
        style,
      ]}
      value={value}
    />
  );
}

export default DateField;
