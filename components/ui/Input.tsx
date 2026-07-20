import { View, TextInput } from 'react-native';
import { Typography } from '@/components/ui/Typography';
import { useThemeColors } from '@/store/uiStore';

interface InputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  multiline?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
}

export function Input({
  label,
  value,
  onChangeText,
  placeholder,
  multiline = false,
  autoCapitalize,
}: InputProps) {
  const colors = useThemeColors();

  return (
    <View>
      <Typography variant="field-label" className="mb-1.5">{label}</Typography>
      <TextInput
        className="rounded-2xl border px-4 py-3.5 font-sans text-base"
        style={{
          backgroundColor: colors.background.input,
          borderColor: colors.border.input,
          color: colors.text.primary,
        }}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.text.muted}
        multiline={multiline}
        numberOfLines={multiline ? 4 : undefined}
        textAlignVertical={multiline ? 'top' : undefined}
        autoCapitalize={autoCapitalize}
      />
    </View>
  );
}
