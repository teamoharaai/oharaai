import { useRef, useState } from 'react';
import { Pressable, Text, View, type GestureResponderEvent } from 'react-native';
import { AnchoredPopover, type AnchorRect } from '@/components/ui/AnchoredPopover';

interface EntryActionMenuProps {
  onMoveToFolder: () => void;
}

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

// Sits as an absolutely-positioned sibling to the card's own Pressable (not
// nested inside it) so opening the menu never triggers the card's onPress —
// no stopPropagation() needed, and behavior is identical on web and native.
export function EntryActionMenu({ onMoveToFolder }: EntryActionMenuProps) {
  const [menuVisible, setMenuVisible] = useState(false);
  const [anchorRect, setAnchorRect] = useState<AnchorRect | null>(null);
  const triggerRef = useRef<View | null>(null);

  const openMenu = (event: GestureResponderEvent) => {
    const webAnchorRect = getWebAnchorRect(event);
    if (webAnchorRect) {
      setAnchorRect(webAnchorRect);
      setMenuVisible(true);
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
        setMenuVisible(true);
      });
      return;
    }

    const { pageX, pageY } = event.nativeEvent;
    setAnchorRect(createAnchorRect(pageX ?? 0, pageY ?? 0, 0, 0));
    setMenuVisible(true);
  };

  const closeMenu = () => {
    setMenuVisible(false);
  };

  return (
    <>
      <Pressable
        ref={triggerRef}
        onPress={openMenu}
        hitSlop={10}
        style={{ position: 'absolute', top: 6, right: 6, padding: 8, zIndex: 1 }}
      >
        <Text style={{ fontSize: 18, lineHeight: 18, color: '#6B7B6E', fontFamily: 'Inter-Bold' }}>
          {'···'}
        </Text>
      </Pressable>

      <AnchoredPopover
        visible={menuVisible}
        anchorRect={anchorRect}
        onDismiss={closeMenu}
        contentClassName="min-w-[180px] rounded-xl border border-[#D8D2C8] bg-white py-2 shadow-sm"
        contentStyle={{ zIndex: 10 }}
      >
        <View>
          <Pressable
            onPress={() => {
              closeMenu();
              onMoveToFolder();
            }}
            className="px-4 py-3"
          >
            <Text className="font-sans text-base text-near-black">Move to folder</Text>
          </Pressable>
        </View>
      </AnchoredPopover>
    </>
  );
}
