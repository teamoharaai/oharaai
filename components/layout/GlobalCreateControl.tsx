import { useRef, useState } from 'react';
import {
  Pressable,
  View,
  useWindowDimensions,
  type GestureResponderEvent,
} from 'react-native';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { AnchoredPopover, type AnchorRect } from '@/components/ui/AnchoredPopover';
import { Typography } from '@/components/ui/Typography';
import { useThemeColors } from '@/store/uiStore';

type GlobalCreateControlProps = {
  onNewEntry: () => void;
  onNewProject: () => void;
};

function rectFromValues(x: number, y: number, width: number, height: number): AnchorRect {
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

export function GlobalCreateControl({
  onNewEntry,
  onNewProject,
}: GlobalCreateControlProps) {
  const colors = useThemeColors();
  const { width } = useWindowDimensions();
  const compact = width < 720;
  const [open, setOpen] = useState(false);
  const [anchorRect, setAnchorRect] = useState<AnchorRect | null>(null);
  const anchorRef = useRef<View>(null);

  function openMenu(event: GestureResponderEvent) {
    const node = anchorRef.current as
      | (View & {
          measureInWindow?: (
            callback: (x: number, y: number, width: number, height: number) => void,
          ) => void;
        })
      | null;
    if (node?.measureInWindow) {
      node.measureInWindow((x, y, measuredWidth, height) => {
        setAnchorRect(rectFromValues(x, y, measuredWidth, height));
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
    if (rect) setAnchorRect(rectFromValues(rect.left, rect.top, rect.width, rect.height));
    setOpen(true);
  }

  const menuItems = [
    {
      icon: 'document-text-outline' as const,
      label: 'New entry',
      onPress: onNewEntry,
    },
    {
      icon: 'flag-outline' as const,
      label: 'New goal',
      onPress: () => router.push('/goals/create'),
    },
    {
      icon: 'folder-outline' as const,
      label: 'New project',
      onPress: onNewProject,
    },
  ];

  return (
    <>
      <View
        collapsable={false}
        ref={anchorRef}
        style={{ bottom: compact ? 18 : 24, position: 'absolute', right: compact ? 16 : 24 }}
      >
        <Pressable
          accessibilityLabel="Create"
          accessibilityRole="button"
          accessibilityState={{ expanded: open }}
          onPress={openMenu}
          style={({ pressed }) => ({
            alignItems: 'center',
            backgroundColor: colors.background.sidebar,
            borderColor: colors.border.divider,
            borderRadius: 999,
            borderWidth: 1,
            flexDirection: 'row',
            gap: 6,
            height: 44,
            justifyContent: 'center',
            opacity: pressed ? 0.72 : 1,
            paddingHorizontal: compact ? 0 : 16,
            shadowColor: colors.effects.shadow,
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: 0.08,
            shadowRadius: 10,
            width: compact ? 44 : undefined,
          })}
        >
          <Ionicons color={colors.text.accent} name="add" size={19} />
          {!compact ? (
            <Typography variant="emphasis-sm" style={{ color: colors.text.accent }}>
              Create
            </Typography>
          ) : null}
        </Pressable>
      </View>

      <AnchoredPopover
        anchorRect={anchorRect}
        contentStyle={{
          borderRadius: 14,
          borderWidth: 1,
          minWidth: 210,
          padding: 8,
          shadowColor: colors.effects.shadow,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.1,
          shadowRadius: 14,
        }}
        onDismiss={() => setOpen(false)}
        visible={open}
      >
        {menuItems.map((item) => (
          <Pressable
            accessibilityLabel={item.label}
            accessibilityRole="menuitem"
            key={item.label}
            onPress={() => {
              setOpen(false);
              item.onPress();
            }}
            style={({ pressed }) => ({
              alignItems: 'center',
              backgroundColor: pressed ? colors.background.selectedRow : 'transparent',
              borderRadius: 9,
              flexDirection: 'row',
              gap: 10,
              paddingHorizontal: 11,
              paddingVertical: 10,
            })}
          >
            <Ionicons color={colors.text.accent} name={item.icon} size={17} />
            <Typography variant="meta" style={{ color: colors.text.primary }}>
              {item.label}
            </Typography>
          </Pressable>
        ))}
      </AnchoredPopover>
    </>
  );
}
