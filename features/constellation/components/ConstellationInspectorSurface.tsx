import {
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
  type ScrollViewProps,
} from 'react-native';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useThemeColors, useUIStore } from '@/store/uiStore';
import { getConstellationResponsiveLayout } from '../responsive';

const INSPECTOR_WIDTH = 360;
const CLOSE_CONTROL_ID = 'constellation-inspector-close';
const GRAPH_FOCUS_ID = 'constellation-graph-focus-root';

export function constellationNodeFocusId(selectionKey: string): string {
  return `constellation-node-${encodeURIComponent(selectionKey)}`;
}

interface ConstellationInspectorSurfaceProps {
  accessibilityLabel: string;
  children: ReactNode;
  closeDisabled?: boolean;
  onClose: () => void;
  scrollProps?: Omit<ScrollViewProps, 'children'>;
  selectionKey?: string | null;
}

function focusAfterInspectorClose(
  selectionKey: string | null | undefined,
  previousFocus: HTMLElement | null,
) {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;
  let observer: MutationObserver | null = null;
  let restoredTarget: HTMLElement | null = null;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const stopWaiting = () => {
    observer?.disconnect();
    observer = null;
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };
  const restore = (): boolean => {
    const nodeTarget = selectionKey
      ? document.getElementById(constellationNodeFocusId(selectionKey))
      : null;
    const fallback = document.getElementById(GRAPH_FOCUS_ID);
    const target = nodeTarget
      ?? (
        previousFocus && document.contains(previousFocus)
          ? previousFocus
          : fallback
      );
    if (!target) return false;
    target.focus();
    restoredTarget = target;
    return true;
  };
  const restoreOrWait = () => {
    if (document.body && typeof MutationObserver !== 'undefined') {
      observer = new MutationObserver(() => {
        if (restoredTarget && !document.contains(restoredTarget)) {
          restoredTarget = null;
        }
        if (!restoredTarget && document.activeElement === document.body) {
          restore();
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });
      timeoutId = setTimeout(stopWaiting, 10_000);
    }
    restore();
  };
  requestAnimationFrame(() => requestAnimationFrame(restoreOrWait));
  for (const delay of [100, 300, 750]) {
    setTimeout(() => {
      if (document.activeElement === document.body) {
        restore();
      }
    }, delay);
  }
}

export function ConstellationInspectorSurface({
  accessibilityLabel,
  children,
  closeDisabled = false,
  onClose,
  scrollProps,
  selectionKey,
}: ConstellationInspectorSurfaceProps) {
  const colors = useThemeColors();
  const { width } = useWindowDimensions();
  const sidebarCollapsed = useUIStore((state) => state.sidebarCollapsed);
  const { narrow } = getConstellationResponsiveLayout(width, sidebarCollapsed);
  const rootRef = useRef<View>(null);
  const [closeFocused, setCloseFocused] = useState(false);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const closeRef = useRef(onClose);
  closeRef.current = closeDisabled ? () => undefined : onClose;

  function requestClose() {
    if (closeDisabled) return;
    closeRef.current();
    focusAfterInspectorClose(selectionKey, previousFocusRef.current);
  }

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    const root = rootRef.current as unknown as HTMLElement | null;
    if (!root) return;
    const rootElement = root;
    previousFocusRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;

    const closeControl = document.getElementById(CLOSE_CONTROL_ID);
    closeControl?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        requestClose();
        return;
      }
      if (!narrow || event.key !== 'Tab') return;

      const focusable = Array.from(rootElement.querySelectorAll<HTMLElement>(
        'button,[href],input,textarea,select,[tabindex]:not([tabindex="-1"])',
      )).filter((element) => !element.hasAttribute('disabled'));
      if (focusable.length === 0) {
        event.preventDefault();
        closeControl?.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      focusAfterInspectorClose(selectionKey, previousFocusRef.current);
    };
  }, [closeDisabled, narrow, selectionKey]);

  return (
    <View
      accessibilityLabel={accessibilityLabel}
      accessibilityViewIsModal={narrow}
      ref={rootRef}
      style={{
        backgroundColor: colors.background.card,
        borderColor: colors.border.warm,
        borderLeftWidth: narrow ? 0 : 1,
        flex: narrow ? 1 : undefined,
        minHeight: 0,
        width: narrow ? '100%' : INSPECTOR_WIDTH,
      }}
    >
      <View
        style={{
          alignItems: 'center',
          borderBottomColor: colors.border.divider,
          borderBottomWidth: 1,
          flexDirection: 'row',
          justifyContent: 'flex-end',
          minHeight: 52,
          paddingHorizontal: narrow ? 16 : 20,
        }}
      >
        <Pressable
          accessibilityLabel={narrow ? 'Back to Constellation' : 'Close inspector'}
          accessibilityRole="button"
          accessibilityState={{ disabled: closeDisabled }}
          disabled={closeDisabled}
          nativeID={CLOSE_CONTROL_ID}
          onBlur={() => setCloseFocused(false)}
          onFocus={() => setCloseFocused(true)}
          onPress={requestClose}
          style={({ pressed }) => ({
            alignItems: 'center',
            borderColor: closeFocused ? colors.border.accent : colors.border.input,
            borderRadius: 999,
            borderWidth: closeFocused ? 2 : 1,
            justifyContent: 'center',
            minHeight: 44,
            opacity: closeDisabled ? 0.48 : pressed ? 0.68 : 1,
            paddingHorizontal: 13,
          })}
        >
          <Text
            style={{
              color: colors.text.accent,
              fontFamily: 'Inter-SemiBold',
              fontSize: 13,
            }}
          >
            {narrow ? '← Back' : 'Close'}
          </Text>
        </Pressable>
      </View>
      <ScrollView
        {...scrollProps}
        contentContainerStyle={[
          {
            flexGrow: 1,
            gap: 20,
            padding: narrow ? 20 : 22,
            width: '100%',
          },
          scrollProps?.contentContainerStyle,
        ]}
        keyboardShouldPersistTaps={
          scrollProps?.keyboardShouldPersistTaps ?? 'handled'
        }
        style={[{ minHeight: 0, overflow: 'hidden' }, scrollProps?.style]}
      >
        {children}
      </ScrollView>
    </View>
  );
}

export const CONSTELLATION_GRAPH_FOCUS_ID = GRAPH_FOCUS_ID;
