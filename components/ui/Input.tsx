import { View, Text, TextInput } from 'react-native';

interface InputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
}

export function Input({ label, value, onChangeText, placeholder }: InputProps) {
  return (
    <View>
      <Text className="text-sm font-medium text-near-black mb-1.5">{label}</Text>
      <TextInput
        className="bg-card-bg rounded-2xl px-4 py-3.5 text-base text-near-black border border-transparent"
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#6B6B6B"
      />
    </View>
  );
}
