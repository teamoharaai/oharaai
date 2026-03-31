import { TouchableOpacity, Text } from 'react-native';
import { router } from 'expo-router';

export function NewGoalButton() {
  return (
    <TouchableOpacity
      onPress={() => router.push('/goals/create')}
      className="flex-row items-center gap-1 rounded-full bg-[#1B7A5A] px-4 py-2"
      activeOpacity={0.8}
    >
      <Text className="text-sm font-semibold text-ink">+ New Goal</Text>
    </TouchableOpacity>
  );
}
