import { useState } from 'react';
import { View } from 'react-native';
import { router, Stack } from 'expo-router';
import { AppNavigation } from '@/components/layout/AppNavigation';
import { CreateProjectModal } from '@/features/projects/components/CreateProjectModal';
import { useThemeColors } from '@/store/uiStore';

export default function AppLayout() {
  const colors = useThemeColors();
  const [projectModalOpen, setProjectModalOpen] = useState(false);

  return (
    <View
      style={{
        backgroundColor: colors.background.page,
        flex: 1,
        flexDirection: 'column',
        minHeight: 0,
      }}
    >
      <AppNavigation
        onNewEntry={() => router.push({
          pathname: '/entries',
          params: { create: 'new' },
        })}
        onNewProject={() => setProjectModalOpen(true)}
      />
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
            contentStyle: {
              backgroundColor: colors.background.page,
              flex: 1,
              minHeight: 0,
            },
            headerShown: false,
          }}
        >
          <Stack.Screen name="dashboard" />
          <Stack.Screen name="momentum" />
          <Stack.Screen name="entries" />
          <Stack.Screen name="entries/[id]" />
          <Stack.Screen name="entries/reflection" />
          <Stack.Screen name="echo" />
          <Stack.Screen name="goals/index" />
          <Stack.Screen name="constellation" />
          <Stack.Screen name="explore" />
          <Stack.Screen name="projects/[id]" />
          <Stack.Screen name="projects/create" />
          <Stack.Screen name="goals/[id]/index" />
          <Stack.Screen name="goals/[id]/vault" />
        </Stack>
      </View>
      <CreateProjectModal
        onClose={() => setProjectModalOpen(false)}
        visible={projectModalOpen}
      />
    </View>
  );
}
