import { useRef, useState } from 'react';
import {
  Platform,
  Pressable,
  View,
  useWindowDimensions,
  type GestureResponderEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  AnchoredPopover,
  type AnchorRect,
} from '@/components/ui/AnchoredPopover';
import { Typography } from '@/components/ui/Typography';
import { useThemeColors } from '@/store/uiStore';
import type { ConstellationAnnotationKind } from '../types';

interface ConstellationActionMenuProps {
  canLinkGoals: boolean;
  onCreateAnnotation: (kind: ConstellationAnnotationKind) => void;
  onOpenGoalLinks: () => void;
}

function rectFromValues(
  x: number,
  y: number,
  width: number,
  height: number,
): AnchorRect {
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

export function ConstellationActionMenu({
  canLinkGoals,
  onCreateAnnotation,
  onOpenGoalLinks,
}: ConstellationActionMenuProps) {
  const colors = useThemeColors();
  const { width } = useWindowDimensions();
  const compact = width < 760;
  const [open, setOpen] = useState(false);
  const [anchorRect, setAnchorRect] = useState<AnchorRect | null>(null);
  const anchorRef = useRef<View>(null);

  function openMenu(event: GestureResponderEvent) {
    const node = anchorRef.current as
      | (View & {
          measureInWindow?: (
            callback: (
              x: number,
              y: number,
              width: number,
              height: number,
            ) => void,
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
    if (rect) {
      setAnchorRect(
        rectFromValues(rect.left, rect.top, rect.width, rect.height),
      );
    }
    setOpen(true);
  }

  const items = [
    {
      disabled: false,
      icon: 'document-text-outline' as const,
      label: 'New note',
      onPress: () => onCreateAnnotation('note'),
    },
    {
      disabled: false,
      icon: 'telescope-outline' as const,
      label: 'New projection',
      onPress: () => onCreateAnnotation('projection'),
    },
    {
      disabled: !canLinkGoals,
      icon: 'link-outline' as const,
      label: 'Link goals',
      onPress: onOpenGoalLinks,
    },
  ];

  return (
    <>
      <View collapsable={false} ref={anchorRef}>
        <Pressable
          accessibilityLabel="Add to Constellation"
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
            width: compact ? 44 : undefined,
          })}
        >
          <Ionicons color={colors.text.onAccent} name="add" size={19} />
          {!compact ? (
            <Typography
              variant="emphasis-sm"
              style={{ color: colors.text.onAccent }}
            >
              Add
            </Typography>
          ) : null}
        </Pressable>
      </View>

      <AnchoredPopover
        anchorRect={anchorRect}
        contentStyle={{
          borderRadius: 14,
          borderWidth: 1,
          minWidth: 220,
          padding: 8,
          ...Platform.select({
            web: {
              boxShadow: `0 4px 14px ${colors.effects.shadow}`,
            },
            default: {
              shadowColor: colors.effects.shadow,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.1,
              shadowRadius: 14,
            },
          }),
        }}
        onDismiss={() => setOpen(false)}
        visible={open}
      >
        {items.map((item) => (
          <Pressable
            accessibilityHint={
              item.disabled
                ? 'At least two visible goals are required.'
                : undefined
            }
            accessibilityLabel={item.label}
            accessibilityRole="menuitem"
            accessibilityState={{ disabled: item.disabled }}
            disabled={item.disabled}
            key={item.label}
            onPress={() => {
              setOpen(false);
              item.onPress();
            }}
            style={({ pressed }) => ({
              alignItems: 'center',
              backgroundColor: pressed
                ? colors.background.selectedRow
                : 'transparent',
              borderRadius: 9,
              flexDirection: 'row',
              gap: 10,
              opacity: item.disabled ? 0.42 : 1,
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
