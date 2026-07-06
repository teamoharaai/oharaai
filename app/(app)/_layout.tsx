import { View } from 'react-native';
import { Stack } from 'expo-router';
import { Sidebar } from '@/components/layout/Sidebar';

export default function AppLayout() {
  return (
    <View style={{ flex: 1, flexDirection: 'row' }}>
      <Sidebar />
      <View style={{ flex: 1 }}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="dashboard" />
          <Stack.Screen name="echo" />
          <Stack.Screen name="constellation" />
          <Stack.Screen name="explore" />
          <Stack.Screen name="projects/[id]" />
          <Stack.Screen name="projects/create" />
          <Stack.Screen name="goals/[id]/index" />
          <Stack.Screen name="goals/[id]/vault" />
        </Stack>
      </View>
    </View>
  );
}
