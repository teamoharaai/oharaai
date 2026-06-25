import { View, Text, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import supabase from '@/lib/db/client';
import { clearAllStores } from '@/store/clearAllStores';

export default function GoalsScreen() {
  async function handleLogout() {
    clearAllStores();
    await supabase.auth.signOut();
    router.replace('/(auth)/login');
  }

  return (
    <View className="flex-1 bg-cream items-center justify-center px-6">
      <Text className="text-2xl font-bold text-near-black mb-2" style={{ fontFamily: 'Inter' }}>Goals</Text>
      <Text className="text-base text-muted text-center mb-8" style={{ fontFamily: 'Inter' }}>
        Your goals will appear here.
      </Text>
      <TouchableOpacity
        className="bg-near-black rounded-full px-8 py-3 mb-4"
        onPress={() => router.push('/goals/create')}
      >
        <Text className="text-base text-cream font-medium" style={{ fontFamily: 'Inter' }}>Create a goal</Text>
      </TouchableOpacity>
      <TouchableOpacity
        className="rounded-full px-8 py-3"
        onPress={handleLogout}
      >
        <Text className="text-base text-muted font-medium" style={{ fontFamily: 'Inter' }}>Log out</Text>
      </TouchableOpacity>
    </View>
  );
}
