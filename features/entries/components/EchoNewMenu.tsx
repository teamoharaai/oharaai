import { useRef, useState } from 'react';
import {
  Pressable,
  View,
  type GestureResponderEvent,
} from 'react-native';
import { AnchoredPopover, type AnchorRect } from '@/components/ui/AnchoredPopover';
import { BrandIcon, type BrandIconName } from '@/components/ui/BrandIcon';
import { Button } from '@/components/ui/Button';
import { Typography } from '@/components/ui/Typography';
import { RADIUS, SPACE, elevationStyle } from '@/constants/design';
import { useThemeColors, useUIStore } from '@/store/uiStore';
import type { EntryType } from '../types';

function anchorRect(x: number, y: number, width: number, height: number): AnchorRect {
  return {
    bottom: y + height,
    height,
    left: x,
    right: x + width,
    top: y,
    width,
    x,
    y,
  };
}

export function EchoNewMenu({
  compact,
  onSelectType,
}: {
  compact: boolean;
  onSelectType: (type: EntryType) => void;
}) {
  const colors = useThemeColors();
  const darkMode = useUIStore((state) => state.themeMode === 'dark');
  const triggerRef = useRef<View>(null);
  const [open, setOpen] = useState(false);
  const [triggerRect, setTriggerRect] = useState<AnchorRect | null>(null);

  function openMenu(event: GestureResponderEvent) {
    if (open) {
      setOpen(false);
      return;
    }

    const node = triggerRef.current as
      | (View & {
          measureInWindow?: (
            callback: (x: number, y: number, width: number, height: number) => void,
          ) => void;
        })
      | null;
    if (node?.measureInWindow) {
      node.measureInWindow((x, y, width, height) => {
        setTriggerRect(anchorRect(x, y, width, height));
        setOpen(true);
      });
      return;
    }

    const currentTarget = (
      event as GestureResponderEvent & {
        currentTarget?: { getBoundingClientRect?: () => DOMRect };
      }
    ).currentTarget;
    const rect = currentTarget?.getBoundingClientRect?.();
    if (rect) {
      setTriggerRect(anchorRect(rect.left, rect.top, rect.width, rect.height));
    }
    setOpen(true);
  }

  const items: Array<{
    description: string;
    icon: BrandIconName;
    label: string;
    type: EntryType;
  }> = [
    {
      description: 'Capture an idea, source, observation, or plan.',
      icon: 'echo-add-entry',
      label: 'New Note',
      type: 'note',
    },
    {
      description: 'Write privately about what you think, feel, or learn.',
      icon: 'echo',
      label: 'New Reflection',
      type: 'reflection',
    },
  ];

  return (
    <>
      <View collapsable={false} ref={triggerRef}>
        <Button
          accessibilityHint="Opens Note and Reflection creation choices"
          accessibilityLabel="New Echo entry"
          accessibilityState={{ expanded: open }}
          onPress={openMenu}
          style={{ minWidth: compact ? 98 : 112 }}
        >
          + New
        </Button>
      </View>

      <AnchoredPopover
        anchorRect={triggerRect}
        contentStyle={{
          borderRadius: RADIUS.lg,
          borderWidth: 1,
          minWidth: 292,
          padding: SPACE.md,
          ...elevationStyle('md', colors, darkMode),
        }}
        onDismiss={() => setOpen(false)}
        visible={open}
      >
        <View
          accessibilityLabel="Create in Echo"
          accessibilityRole="menu"
          style={{ gap: SPACE.xs }}
        >
          <Typography
            variant="eyebrow"
            style={{ marginBottom: SPACE.xs, paddingHorizontal: SPACE.md, paddingTop: SPACE.sm }}
          >
            CREATE IN ECHO
          </Typography>
          {items.map((item) => (
            <Pressable
              accessibilityHint={item.description}
              accessibilityLabel={item.label}
              accessibilityRole="menuitem"
              key={item.type}
              onPress={() => {
                setOpen(false);
                onSelectType(item.type);
              }}
              style={({ hovered, pressed }) => ({
                alignItems: 'center',
                backgroundColor: hovered || pressed
                  ? colors.background.selectedRow
                  : 'transparent',
                borderRadius: RADIUS.md,
                flexDirection: 'row',
                gap: SPACE.lg,
                minHeight: 62,
                opacity: pressed ? 0.72 : 1,
                paddingHorizontal: SPACE.md,
                paddingVertical: SPACE.sm,
              })}
            >
              <View
                style={{
                  alignItems: 'center',
                  backgroundColor: colors.background.input,
                  borderRadius: RADIUS.round,
                  height: 38,
                  justifyContent: 'center',
                  width: 38,
                }}
              >
                <BrandIcon color={colors.text.accent} name={item.icon} size={19} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Typography variant="emphasis-sm">{item.label}</Typography>
                <Typography
                  numberOfLines={2}
                  variant="caption"
                  style={{ color: colors.text.secondary, marginTop: 2 }}
                >
                  {item.description}
                </Typography>
              </View>
            </Pressable>
          ))}
        </View>
      </AnchoredPopover>
    </>
  );
}
