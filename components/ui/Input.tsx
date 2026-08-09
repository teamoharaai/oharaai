import { useState } from 'react';
import { View, TextInput, type StyleProp, type TextInputProps, type TextStyle } from 'react-native';
import { Typography } from '@/components/ui/Typography';
import { CONTROL, RADIUS, SPACE } from '@/constants/design';
import { useThemeColors } from '@/store/uiStore';

interface InputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  multiline?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  autoComplete?: TextInputProps['autoComplete'];
  autoCorrect?: boolean;
  maxLength?: number;
  disabled?: boolean;
  error?: string | null;
  helpText?: string;
  inputStyle?: StyleProp<TextStyle>;
}

export function Input({
  label,
  value,
  onChangeText,
  placeholder,
  multiline = false,
  autoCapitalize,
  autoComplete,
  autoCorrect,
  maxLength,
  disabled = false,
  error = null,
  helpText,
  inputStyle,
}: InputProps) {
  const colors = useThemeColors();
  const [focused, setFocused] = useState(false);

  return (
    <View>
      <Typography variant="field-label" className="mb-1.5">{label}</Typography>
      <TextInput
        accessibilityLabel={label}
        style={[{
          backgroundColor: colors.background.input,
          borderColor: error
            ? colors.feedback.danger.border
            : focused
              ? colors.border.accent
              : colors.border.input,
          color: colors.text.primary,
          borderRadius: RADIUS.md,
          borderWidth: 1,
          fontFamily: 'Inter-Regular',
          fontSize: 15,
          minHeight: multiline ? 112 : CONTROL.defaultHeight,
          opacity: disabled ? 0.5 : 1,
          paddingHorizontal: SPACE.xl,
          paddingVertical: SPACE.lg,
        }, inputStyle]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.text.muted}
        multiline={multiline}
        numberOfLines={multiline ? 4 : undefined}
        textAlignVertical={multiline ? 'top' : undefined}
        autoCapitalize={autoCapitalize}
        autoComplete={autoComplete}
        autoCorrect={autoCorrect}
        maxLength={maxLength}
        editable={!disabled}
        onBlur={() => setFocused(false)}
        onFocus={() => setFocused(true)}
      />
      {error ? (
        <Typography
          accessibilityRole="alert"
          variant="caption"
          style={{ color: colors.feedback.danger.text, marginTop: 6 }}
        >
          {error}
        </Typography>
      ) : helpText ? (
        <Typography variant="caption" style={{ marginTop: SPACE.sm }}>
          {helpText}
        </Typography>
      ) : null}
    </View>
  );
}
