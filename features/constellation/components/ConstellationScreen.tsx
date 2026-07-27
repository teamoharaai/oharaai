import { SafeAreaView, ScrollView } from 'react-native';
import { useThemeColors } from '@/store/uiStore';
import { useConstellationGate } from '../hooks/useConstellationGate';
import { ConstellationEmptyState } from './ConstellationEmptyState';

export function ConstellationScreen() {
  const colors = useThemeColors();
  const gate = useConstellationGate();

  return (
    <SafeAreaView style={{ backgroundColor: colors.background.page, flex: 1 }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <ConstellationEmptyState gate={gate} />
      </ScrollView>
    </SafeAreaView>
  );
}
