import { useRef, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View, type GestureResponderEvent } from 'react-native';
import { AnchoredPopover, type AnchorRect } from '@/components/ui/AnchoredPopover';
import { useThemeColors } from '@/store/uiStore';

export interface OverflowAction {
  key: string;
  label: string;
  destructive?: boolean;
  disabled?: boolean;
  busy?: boolean;
  onPress: () => void;
}

function createAnchorRect(x: number, y: number, width: number, height: number): AnchorRect {
  return { x, y, width, height, top: y, left: x, right: x + width, bottom: y + height };
}

function getWebAnchorRect(event: GestureResponderEvent): AnchorRect | null {
  const currentTarget = (event as GestureResponderEvent & {
    currentTarget?: { getBoundingClientRect?: () => DOMRect };
  }).currentTarget;
  const domRect = currentTarget?.getBoundingClientRect?.();
  if (!domRect) return null;
  return createAnchorRect(domRect.left, domRect.top, domRect.width, domRect.height);
}

/**
 * A single `⋯` control that reveals a small popover of row actions (Edit /
 * Delete / Archive / photo). Shared by the Milestones and Tasks panels so the
 * goal-detail surfaces present one consistent overflow affordance.
 *
 * The popover renders through `AnchoredPopover` (a top-level transparent Modal),
 * so it always stacks above sibling content and is never clipped or covered by a
 * later-painted block — the reason a plain absolutely-positioned menu was wrong
 * here (a Tasks row menu was overlapped by the Completions lane below it).
 */
export function OverflowMenu({
  actions,
  accessibilityLabel,
  size = 30,
}: {
  actions: OverflowAction[];
  accessibilityLabel: string;
  size?: number;
}) {
  const colors = useThemeColors();
  const [visible, setVisible] = useState(false);
  const [anchorRect, setAnchorRect] = useState<AnchorRect | null>(null);
  const triggerRef = useRef<View | null>(null);
  if (actions.length === 0) return null;

  const open = (event: GestureResponderEvent) => {
    const webAnchorRect = getWebAnchorRect(event);
    if (webAnchorRect) {
      setAnchorRect(webAnchorRect);
      setVisible(true);
      return;
    }
    const triggerNode = triggerRef.current as
      | (View & {
          measureInWindow?: (
            callback: (x: number, y: number, width: number, height: number) => void,
          ) => void;
        })
      | null;
    if (triggerNode?.measureInWindow) {
      triggerNode.measureInWindow((x, y, width, height) => {
        setAnchorRect(createAnchorRect(x, y, width, height));
        setVisible(true);
      });
      return;
    }
    const { pageX, pageY } = event.nativeEvent;
    setAnchorRect(createAnchorRect(pageX ?? 0, pageY ?? 0, 0, 0));
    setVisible(true);
  };
  const close = () => setVisible(false);

  return (
    <>
      <Pressable
        ref={triggerRef}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button"
        accessibilityState={{ expanded: visible }}
        hitSlop={6}
        onPress={open}
        style={{ alignItems: 'center', height: size, justifyContent: 'center', width: size }}
      >
        <Text style={{ color: colors.text.secondary, fontFamily: 'Inter-Regular', fontSize: 18, lineHeight: 18 }}>
          ⋯
        </Text>
      </Pressable>
      <AnchoredPopover
        anchorRect={anchorRect}
        contentStyle={{ minWidth: 160, paddingVertical: 4 }}
        onDismiss={close}
        visible={visible}
      >
        <View>
          {actions.map((action) => (
            <Pressable
              accessibilityLabel={action.label}
              accessibilityRole="button"
              accessibilityState={{ disabled: action.disabled }}
              disabled={action.disabled || action.busy}
              key={action.key}
              onPress={() => {
                close();
                action.onPress();
              }}
              style={({ pressed }) => ({
                alignItems: 'center',
                backgroundColor: pressed ? colors.background.input : 'transparent',
                flexDirection: 'row',
                gap: 8,
                opacity: action.disabled ? 0.4 : 1,
                paddingHorizontal: 14,
                paddingVertical: 10,
              })}
            >
              {action.busy ? <ActivityIndicator color={colors.accent.primary} size="small" /> : null}
              <Text
                style={{
                  color: action.destructive ? colors.feedback.danger.text : colors.text.primary,
                  fontFamily: 'Inter-Medium',
                  fontSize: 13.5,
                }}
              >
                {action.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </AnchoredPopover>
    </>
  );
}
