import { View } from 'react-native';
import { Stack } from 'expo-router';
import { Sidebar } from '@/components/layout/Sidebar';
import { LIGHT_THEME } from '@/constants/colors';

export default function AppLayout() {
  return (
    <View
      style={{
        backgroundColor: LIGHT_THEME.background.page,
        flex: 1,
        flexDirection: 'row',
        minHeight: 0,
      }}
    >
      <Sidebar />
      <View style={{ backgroundColor: LIGHT_THEME.background.page, flex: 1, minHeight: 0 }}>
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
