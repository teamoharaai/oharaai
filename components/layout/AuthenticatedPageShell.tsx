import { createContext, useContext, useRef, type ReactNode } from 'react';
import { ScrollView, View, useWindowDimensions } from 'react-native';
import { SPACE } from '@/constants/design';
import { useThemeColors } from '@/store/uiStore';

type AuthenticatedPageShellProps = {
  children: ReactNode;
};

const ScrollToContentContext = createContext<(target: View | null) => void>(() => {});
export const useScrollToPageContent = () => useContext(ScrollToContentContext);

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
  const scrollRef = useRef<ScrollView>(null);
  const contentRef = useRef<View>(null);

  function scrollToContent(target: View | null) {
    if (!target || !contentRef.current) return;
    target.measureLayout(contentRef.current, (_x, y) => {
      scrollRef.current?.scrollTo({ y, animated: true });
    }, () => {});
  }

  return (
    <View style={{ backgroundColor: colors.background.page, flex: 1, minHeight: 0 }}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={{
          minWidth: 0,
          paddingBottom: compact ? SPACE['4xl'] : SPACE.lg,
          paddingHorizontal: compact ? SPACE.xl : SPACE['3xl'],
          paddingTop: compact ? SPACE.xl : SPACE.lg,
        }}
      >
        <View ref={contentRef} collapsable={false} style={{ minWidth: 0, width: '100%' }}>
          <ScrollToContentContext.Provider value={scrollToContent}>
            {children}
          </ScrollToContentContext.Provider>
        </View>
      </ScrollView>
    </View>
  );
}
