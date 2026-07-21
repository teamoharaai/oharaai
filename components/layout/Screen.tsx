import { SafeAreaView, ScrollView } from 'react-native';
import type { ReactNode } from 'react';
import { DARK_THEME } from '@/constants/colors';
import { useThemeColors } from '@/store/uiStore';

interface ScreenProps {
  children: ReactNode;
  scrollable?: boolean;
  dark?: boolean;
}

export function Screen({ children, scrollable = true, dark = false }: ScreenProps) {
  const colors = useThemeColors();
  const backgroundColor = dark ? DARK_THEME.background.page : colors.background.page;

  if (!scrollable) {
    return (
      <SafeAreaView className="flex-1" style={{ backgroundColor }}>
        {children}
      </SafeAreaView>
    );
  }
  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor }}>
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 32 }}>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}
