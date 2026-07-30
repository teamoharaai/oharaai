import { useState } from 'react';
import { View } from 'react-native';
import { router, Stack } from 'expo-router';
import { GlobalCreateControl } from '@/components/layout/GlobalCreateControl';
import { Sidebar } from '@/components/layout/Sidebar';
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
          <Stack.Screen name="constellation" />
          <Stack.Screen name="explore" />
          <Stack.Screen name="projects/[id]" />
          <Stack.Screen name="projects/create" />
          <Stack.Screen name="goals/[id]/index" />
          <Stack.Screen name="goals/[id]/vault" />
        </Stack>
      </View>
      <GlobalCreateControl
        onNewEntry={() => router.push({
          pathname: '/entries',
          params: { tab: 'notes', create: 'note' },
        })}
        onNewProject={() => setProjectModalOpen(true)}
      />
      <CreateProjectModal
        onClose={() => setProjectModalOpen(false)}
        visible={projectModalOpen}
      />
    </View>
  );
}
