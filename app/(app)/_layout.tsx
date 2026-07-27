import { View } from 'react-native';
import { Stack } from 'expo-router';
import { Sidebar } from '@/components/layout/Sidebar';
import { useThemeColors } from '@/store/uiStore';

export default function AppLayout() {
  const colors = useThemeColors();

  return (
    <View
      style={{
        backgroundColor: colors.background.page,
        flex: 1,
        flexDirection: 'row',
        minHeight: 0,
      }}
    >
      <Sidebar />
      <View
        style={{
          backgroundColor: colors.background.page,
          flex: 1,
          minHeight: 0,
          overflow: 'hidden',
        }}
      >
        <Stack
          screenOptions={{
            contentStyle: { backgroundColor: colors.background.page },
            headerShown: false,
          }}
        >
          <Stack.Screen name="dashboard" />
          <Stack.Screen name="momentum" />
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
