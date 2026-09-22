import { useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { AppNavigation } from '@/components/layout/AppNavigation';
import { GoalCreationModeToggle, type GoalCreationMode } from '@/components/ui/GoalCreationModeToggle';
import { AIGoalCreation } from '@/features/goals/components/AIGoalCreation';
import { ManualGoalCreationV22 } from '@/features/goals/components/ManualGoalCreationV22';
import { useThemeColors } from '@/store/uiStore';

export default function GoalCreateScreen() {
  const colors = useThemeColors();
  const { projectId } = useLocalSearchParams<{ projectId?: string }>();
  const [mode, setMode] = useState<GoalCreationMode>('manual');
  if (mode === 'manual') return <ManualGoalCreationV22
    initialProjectId={typeof projectId === 'string' ? projectId : null}
    onAI={() => setMode('ai')} />;
  return <View style={{ flex: 1, backgroundColor: colors.background.page }}>
    <AppNavigation />
    <View style={{ padding: 20 }}><GoalCreationModeToggle mode={mode} onChange={setMode} /></View>
    <AIGoalCreation onSwitchToManual={() => setMode('manual')} />
  </View>;
}
