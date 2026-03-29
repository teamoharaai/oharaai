import { SafeAreaView, ScrollView } from 'react-native';
import type { ReactNode } from 'react';

interface ScreenProps {
  children: ReactNode;
  scrollable?: boolean;
  dark?: boolean;
}

export function Screen({ children, scrollable = true, dark = false }: ScreenProps) {
  const bg = dark ? 'flex-1 bg-dark-bg' : 'flex-1 bg-cream';
  if (!scrollable) {
    return <SafeAreaView className={bg}>{children}</SafeAreaView>;
  }
  return (
    <SafeAreaView className={bg}>
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 32 }}>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}
