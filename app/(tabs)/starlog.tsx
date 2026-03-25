import { View, Text, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import supabase from '@/lib/db/client';

export default function StarlogScreen() {
  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace('/(auth)/login');
  }

  return (
    <View className="flex-1 bg-cream items-center justify-center px-6">
      <Text className="text-2xl font-bold text-near-black mb-2">Starlog</Text>
      <Text className="text-base text-muted text-center mb-12">
        Starlog coming soon.
      </Text>
      <TouchableOpacity
        className="bg-near-black rounded-full px-8 py-3"
        onPress={handleLogout}
      >
        <Text className="text-base text-cream font-medium">Log out</Text>
      </TouchableOpacity>
    </View>
  );
}
