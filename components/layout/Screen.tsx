import { SafeAreaView, ScrollView, useWindowDimensions, View } from 'react-native';
import type { ReactNode } from 'react';
import { DARK_THEME } from '@/constants/colors';
import { useThemeColors } from '@/store/uiStore';
import { LAYOUT, SPACE } from '@/constants/design';

interface ScreenProps {
  children: ReactNode;
  scrollable?: boolean;
  dark?: boolean;
  constrained?: boolean;
  padded?: boolean;
}

export function Screen({
  children,
  scrollable = true,
  dark = false,
  constrained = false,
  padded = false,
}: ScreenProps) {
  const colors = useThemeColors();
  const { width } = useWindowDimensions();
  const backgroundColor = dark ? DARK_THEME.background.page : colors.background.page;
  const horizontalPadding = width >= 1440
    ? LAYOUT.wideGutter
    : width >= 900
      ? LAYOUT.desktopGutter
      : width >= 600
        ? LAYOUT.standardGutter
        : LAYOUT.compactGutter;
  const contentStyle = {
    alignSelf: constrained ? 'center' as const : undefined,
    maxWidth: constrained ? LAYOUT.contentMaxWidth : undefined,
    paddingHorizontal: padded ? horizontalPadding : undefined,
    width: '100%' as const,
  };

  if (!scrollable) {
    return (
      <SafeAreaView className="flex-1" style={{ backgroundColor }}>
        <View style={contentStyle}>{children}</View>
      </SafeAreaView>
    );
  }
  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor }}>
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: SPACE['4xl'] }}>
        <View style={contentStyle}>{children}</View>
      </ScrollView>
    </SafeAreaView>
  );
}
