import { TouchableOpacity, Text } from 'react-native';
import { router } from 'expo-router';

export function NewGoalButton() {
  return (
    <TouchableOpacity
      onPress={() => router.push('/(app)/goals')}
      style={{
        backgroundColor: '#6E5CE7',
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 8,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
      }}
      activeOpacity={0.8}
    >
      <Text style={{ color: '#FAFAFA', fontWeight: '600', fontSize: 14 }}>+ New Goal</Text>
    </TouchableOpacity>
  );
}
