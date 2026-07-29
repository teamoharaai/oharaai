import { useEffect, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import { Stack, usePathname } from 'expo-router';
import { GlobalCreateControl } from '@/components/layout/GlobalCreateControl';
import { Sidebar } from '@/components/layout/Sidebar';
import { Toast } from '@/components/ui/Toast';
import { QuickEntryModal } from '@/features/echo/components/QuickEntryModal';
import { CreateProjectModal } from '@/features/projects/components/CreateProjectModal';
import { useThemeColors } from '@/store/uiStore';

export default function AppLayout() {
  const colors = useThemeColors();
  const pathname = usePathname();
  const [entryModalOpen, setEntryModalOpen] = useState(false);
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [entrySavedToastVisible, setEntrySavedToastVisible] = useState(false);
  const entrySavedToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialGoalId = useMemo(() => {
    const match = pathname.match(/^\/goals\/([^/]+)(?:\/|$)/);
    if (!match?.[1]) return null;
    try {
      return decodeURIComponent(match[1]);
    } catch {
      return match[1];
    }
  }, [pathname]);

  useEffect(() => {
    return () => {
      if (entrySavedToastTimerRef.current) clearTimeout(entrySavedToastTimerRef.current);
    };
  }, []);

  function handleEntrySaved() {
    setEntryModalOpen(false);
    setEntrySavedToastVisible(true);
    if (entrySavedToastTimerRef.current) clearTimeout(entrySavedToastTimerRef.current);
    entrySavedToastTimerRef.current = setTimeout(() => {
      setEntrySavedToastVisible(false);
      entrySavedToastTimerRef.current = null;
    }, 3500);
  }

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
      <GlobalCreateControl
        onNewEntry={() => setEntryModalOpen(true)}
        onNewProject={() => setProjectModalOpen(true)}
      />
      <QuickEntryModal
        initialGoalId={initialGoalId}
        onClose={() => setEntryModalOpen(false)}
        onSaved={handleEntrySaved}
        visible={entryModalOpen}
      />
      <CreateProjectModal
        onClose={() => setProjectModalOpen(false)}
        visible={projectModalOpen}
      />
      <Toast message="Entry saved" visible={entrySavedToastVisible} />
    </View>
  );
}
