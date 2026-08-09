import type { ReactNode } from 'react';
import { ScrollView, View, useWindowDimensions } from 'react-native';
import { SPACE } from '@/constants/design';
import { useThemeColors } from '@/store/uiStore';

type AuthenticatedPageShellProps = {
  children: ReactNode;
};

/**
 * The full-width authenticated workspace geometry used by Home.
 *
 * Feature pages own their cards and internal reading widths; this shell only
 * aligns their outer frame with the approved dashboard without imposing a
 * desktop max-width.
 */
export function AuthenticatedPageShell({ children }: AuthenticatedPageShellProps) {
  const colors = useThemeColors();
  const { width } = useWindowDimensions();
  const compact = width < 720;

  return (
    <View style={{ backgroundColor: colors.background.page, flex: 1, minHeight: 0 }}>
      <ScrollView
        contentContainerStyle={{
          minWidth: 0,
          paddingBottom: compact ? 104 : SPACE.lg,
          paddingHorizontal: compact ? SPACE.xl : SPACE['3xl'],
          paddingTop: compact ? SPACE.xl : SPACE.lg,
        }}
      >
        <View style={{ minWidth: 0, width: '100%' }}>
          {children}
        </View>
      </ScrollView>
    </View>
  );
}
