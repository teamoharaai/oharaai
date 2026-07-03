import { View, TextInput } from 'react-native';
import { Typography } from '@/components/ui/Typography';

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
  return (
    <View>
      <Typography variant="field-label" className="mb-1.5">{label}</Typography>
      <TextInput
        className="bg-card-bg rounded-2xl px-4 py-3.5 text-base text-near-black border border-transparent"
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#6B6B6B"
        multiline={multiline}
        numberOfLines={multiline ? 4 : undefined}
        textAlignVertical={multiline ? 'top' : undefined}
        autoCapitalize={autoCapitalize}
      />
    </View>
  );
}
