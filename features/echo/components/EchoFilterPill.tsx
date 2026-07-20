import { useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, View, type GestureResponderEvent } from 'react-native';
import { AnchoredPopover, type AnchorRect } from '@/components/ui/AnchoredPopover';
import { useThemeColors } from '@/store/uiStore';
import type { EchoContainerOption } from '../types';

export type EchoFilterScope =
  | { type: 'all'; id: 'all'; label: 'All' }
  | { type: 'goal' | 'folder'; id: string; label: string };

type EchoFilterPillProps = {
  options: EchoContainerOption[];
  selectedScope: EchoFilterScope;
  onSelectScope: (scope: EchoFilterScope) => void;
};

const ALL_SCOPE: EchoFilterScope = { type: 'all', id: 'all', label: 'All' };
const MENU_MAX_HEIGHT = 300;

function createAnchorRect(x: number, y: number, width: number, height: number): AnchorRect {
  return {
    x,
    y,
    width,
    height,
    top: y,
    left: x,
    right: x + width,
    bottom: y + height,
  };
}

function getWebAnchorRect(event: GestureResponderEvent): AnchorRect | null {
  const currentTarget = (event as GestureResponderEvent & {
    currentTarget?: { getBoundingClientRect?: () => DOMRect };
  }).currentTarget;

  const domRect = currentTarget?.getBoundingClientRect?.();
  if (!domRect) {
    return null;
  }

  return createAnchorRect(domRect.left, domRect.top, domRect.width, domRect.height);
}

export function EchoFilterPill({
  options,
  selectedScope,
  onSelectScope,
}: EchoFilterPillProps) {
  const colors = useThemeColors();
  const [open, setOpen] = useState(false);
  const [anchorRect, setAnchorRect] = useState<AnchorRect | null>(null);
  const triggerRef = useRef<View | null>(null);
  const scopes = useMemo<EchoFilterScope[]>(
    () => [
      ALL_SCOPE,
      ...options.map((option) => ({
        type: option.type,
        id: option.id,
        label: option.label,
      })),
    ],
    [options],
  );

  function closeMenu() {
    setOpen(false);
    setAnchorRect(null);
  }

  function toggleMenu(event: GestureResponderEvent) {
    if (open) {
      closeMenu();
      return;
    }

    const webAnchorRect = getWebAnchorRect(event);
    if (webAnchorRect) {
      setAnchorRect(webAnchorRect);
      setOpen(true);
      return;
    }

    const triggerNode = triggerRef.current as
      | (View & {
          measureInWindow?: (
            callback: (x: number, y: number, width: number, height: number) => void
          ) => void;
        })
      | null;

    if (triggerNode?.measureInWindow) {
      triggerNode.measureInWindow((x, y, width, height) => {
        setAnchorRect(createAnchorRect(x, y, width, height));
        setOpen(true);
      });
      return;
    }

    const { pageX, pageY } = event.nativeEvent;
    setAnchorRect(createAnchorRect(pageX ?? 0, pageY ?? 0, 0, 0));
    setOpen(true);
  }

  function selectScope(scope: EchoFilterScope) {
    onSelectScope(scope);
    closeMenu();
  }

  return (
    <>
      <Pressable
        ref={triggerRef}
        onPress={toggleMenu}
        accessibilityRole="button"
        accessibilityLabel={`Filter Echo entries. Current filter: ${selectedScope.label}`}
        className="flex-row items-center rounded-full px-3.5 py-1.5"
        style={{ backgroundColor: colors.background.sidebar, flexShrink: 1 }}
      >
        <Text
          numberOfLines={1}
          className="font-sans"
          style={{
            color: '#EDE7DA',
            fontFamily: 'Inter-Medium',
            fontSize: 13,
            lineHeight: 17,
            maxWidth: 180,
          }}
        >
          {selectedScope.label}
        </Text>
        <Text
          className="ml-1.5 font-sans"
          style={{ color: '#EDE7DA', fontSize: 11, lineHeight: 14 }}
        >
          {'⌄'}
        </Text>
      </Pressable>

      <AnchoredPopover
        visible={open}
        anchorRect={anchorRect}
        onDismiss={closeMenu}
        contentClassName="rounded-[10px] border py-1 shadow-sm"
        contentStyle={{
          backgroundColor: colors.background.card,
          borderColor: colors.border.divider,
          maxHeight: MENU_MAX_HEIGHT,
          minWidth: 220,
        }}
      >
        <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: MENU_MAX_HEIGHT }}>
          {scopes.map((scope) => {
            const selected = selectedScope.type === scope.type && selectedScope.id === scope.id;
            return (
              <Pressable
                key={`${scope.type}-${scope.id}`}
                onPress={() => selectScope(scope)}
                className="px-3.5 py-2.5"
                style={{
                  backgroundColor: selected ? colors.background.selectedRow : 'transparent',
                }}
              >
                <Text
                  numberOfLines={1}
                  className="font-sans"
                  style={{
                    color: '#211F1A',
                    fontFamily: selected ? 'Inter-Bold' : 'Inter-Medium',
                    fontSize: 13,
                    lineHeight: 18,
                  }}
                >
                  {scope.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </AnchoredPopover>
    </>
  );
}
