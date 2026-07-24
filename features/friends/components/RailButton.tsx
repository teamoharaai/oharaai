import { useState, type ReactNode, type RefObject } from 'react';
import {
  Platform,
  Pressable,
  View,
  type View as NativeView,
} from 'react-native';
import { Typography } from '@/components/ui/Typography';
import { useThemeColors } from '@/store/uiStore';

interface RailButtonProps {
  active?: boolean;
  badgeCount?: number;
  buttonRef?: RefObject<NativeView | null>;
  count?: number;
  danger?: boolean;
  icon: ReactNode;
  isTab?: boolean;
  label: string;
  onPress: () => void;
  onWebKeyDown?: (event: KeyboardEvent) => void;
}

export function RailButton({
  active = false,
  badgeCount,
  buttonRef,
  count,
  danger = false,
  icon,
  isTab = false,
  label,
  onPress,
  onWebKeyDown,
}: RailButtonProps) {
  const colors = useThemeColors();
  const [focused, setFocused] = useState(false);
  const webKeyProps =
    Platform.OS === 'web' && onWebKeyDown
      ? ({ onKeyDown: onWebKeyDown } as object)
      : {};

  return (
    <Pressable
      {...webKeyProps}
      ref={buttonRef}
      accessibilityRole={isTab ? 'tab' : 'button'}
      accessibilityState={isTab ? { selected: active } : undefined}
      onBlur={() => setFocused(false)}
      onFocus={() => setFocused(true)}
      onPress={onPress}
      tabIndex={isTab ? (active ? 0 : -1) : undefined}
      style={({ pressed }) => ({
        alignItems: 'center',
        backgroundColor: active
          ? colors.background.card
          : pressed
            ? colors.background.selectedRow
            : 'transparent',
        borderColor: focused ? colors.border.accent : 'transparent',
        borderRadius: 10,
        borderWidth: 1,
        flexDirection: 'row',
        gap: 10,
        minHeight: 40,
        paddingHorizontal: 9,
        paddingVertical: 8,
      })}
    >
      <View style={{ alignItems: 'center', width: 18 }}>{icon}</View>
      <Typography
        numberOfLines={1}
        style={{
          color: danger
            ? colors.feedback.danger.text
            : colors.text.primary,
          flex: 1,
          fontFamily: active ? 'Inter-SemiBold' : 'Inter-Regular',
        }}
        variant="micro-label"
      >
        {label}
      </Typography>
      {typeof count === 'number' ? (
        <Typography style={{ color: colors.text.muted }} variant="caption">
          {count}
        </Typography>
      ) : null}
      {typeof badgeCount === 'number' && badgeCount > 0 ? (
        <View
          accessibilityLabel={`${badgeCount} incoming ${
            badgeCount === 1 ? 'request' : 'requests'
          }`}
          accessible
          style={{
            alignItems: 'center',
            backgroundColor: colors.accent.primary,
            borderRadius: 999,
            height: 19,
            justifyContent: 'center',
            minWidth: 19,
            paddingHorizontal: 5,
          }}
        >
          <Typography
            style={{
              color: colors.text.onAccent,
              fontFamily: 'Inter-SemiBold',
            }}
            variant="badge-text"
          >
            {badgeCount}
          </Typography>
        </View>
      ) : null}
    </Pressable>
  );
}
