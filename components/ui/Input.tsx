import { useState } from 'react';
import { View, TextInput, type TextInputProps } from 'react-native';
import { Typography } from '@/components/ui/Typography';
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
}: InputProps) {
  const colors = useThemeColors();
  const [focused, setFocused] = useState(false);

  return (
    <View>
      <Typography variant="field-label" className="mb-1.5">{label}</Typography>
      <TextInput
        accessibilityLabel={label}
        className="rounded-2xl border px-4 py-3.5 font-sans text-base"
        style={{
          backgroundColor: colors.background.input,
          borderColor: error
            ? colors.feedback.danger.border
            : focused
              ? colors.border.accent
              : colors.border.input,
          color: colors.text.primary,
          opacity: disabled ? 0.5 : 1,
        }}
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
      ) : null}
    </View>
  );
}
