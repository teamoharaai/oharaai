import { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  View,
  useWindowDimensions,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import type { ReactNode } from 'react';

export interface AnchorRect {
  x: number;
  y: number;
  width: number;
  height: number;
  top: number;
  left: number;
  right: number;
  bottom: number;
}

interface AnchoredPopoverProps {
  visible: boolean;
  onDismiss: () => void;
  anchorRect: AnchorRect | null;
  children: ReactNode;
  contentClassName?: string;
  contentStyle?: StyleProp<ViewStyle>;
}

const VIEWPORT_MARGIN = 8;
const ANCHOR_GAP = 6;

function clamp(value: number, min: number, max: number): number {
  if (min > max) return min;
  return Math.min(Math.max(value, min), max);
}

export function AnchoredPopover({
  visible,
  onDismiss,
  anchorRect,
  children,
  contentClassName,
  contentStyle,
}: AnchoredPopoverProps) {
  const { width: viewportWidth, height: viewportHeight } = useWindowDimensions();
  const [contentSize, setContentSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!visible) {
      setContentSize({ width: 0, height: 0 });
    }
  }, [visible]);

  const position = useMemo(() => {
    if (!anchorRect || contentSize.width === 0 || contentSize.height === 0) {
      return null;
    }

    const opensUpward =
      viewportHeight - anchorRect.bottom < contentSize.height + ANCHOR_GAP + VIEWPORT_MARGIN;
    const maxLeft = Math.max(VIEWPORT_MARGIN, viewportWidth - contentSize.width - VIEWPORT_MARGIN);
    const maxTop = Math.max(VIEWPORT_MARGIN, viewportHeight - contentSize.height - VIEWPORT_MARGIN);
    const preferredLeft = anchorRect.right - contentSize.width;
    const preferredTop = opensUpward
      ? anchorRect.top - contentSize.height - ANCHOR_GAP
      : anchorRect.bottom + ANCHOR_GAP;

    return {
      left: clamp(preferredLeft, VIEWPORT_MARGIN, maxLeft),
      top: clamp(preferredTop, VIEWPORT_MARGIN, maxTop),
    };
  }, [anchorRect, contentSize.height, contentSize.width, viewportHeight, viewportWidth]);

  const handleLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setContentSize((current) =>
      current.width === width && current.height === height ? current : { width, height }
    );
  };

  if (!visible || !anchorRect) {
    return null;
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <View className="flex-1">
        <Pressable className="absolute inset-0" onPress={onDismiss} />
        <View
          onLayout={handleLayout}
          className={contentClassName}
          style={[
            {
              position: 'absolute',
              left: position?.left ?? VIEWPORT_MARGIN,
              top: position?.top ?? VIEWPORT_MARGIN,
              opacity: position ? 1 : 0,
            },
            contentStyle,
          ]}
        >
          {children}
        </View>
      </View>
    </Modal>
  );
}
