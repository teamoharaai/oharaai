// Vertical rail navigation item used inside FriendsPopover's left rail.
//
// A single component so the three items (Friends / Requests / Add) share
// hover/pressed/selected states, badge rendering, and focus ring — the rail
// looks and behaves like one thing.

import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import type { ReactNode } from 'react';
import { Typography } from '@/components/ui/Typography';
import { useThemeColors } from '@/store/uiStore';

interface RailButtonProps {
  icon: ReactNode;
  label: string;
  count?: number;
  badgeCount?: number; // renders as an accent pill (used for Requests)
  active?: boolean;
  onPress: () => void;
  danger?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  trailing?: ReactNode; // e.g. a switch on the "Dark mode" row
}

export function RailButton({
  icon,
  label,
  count,
  badgeCount,
  active = false,
  onPress,
  danger = false,
  containerStyle,
  trailing,
}: RailButtonProps) {
  const colors = useThemeColors();
  const labelColor = danger ? colors.feedback.danger.text : colors.text.primary;

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 11,
          paddingVertical: 9,
          paddingHorizontal: 10,
          borderRadius: 10,
          backgroundColor: active
            ? colors.background.card
            : pressed
              ? colors.background.selectedRow
              : 'transparent',
        },
        active && {
          shadowColor: '#1E3226',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.08,
          shadowRadius: 3,
          elevation: 1,
        },
        containerStyle,
      ]}
    >
      <View style={{ width: 18, alignItems: 'center' }}>{icon}</View>
      <Typography
        variant="micro-label"
        style={{
          flex: 1,
          color: labelColor,
          fontFamily: active ? 'Inter-SemiBold' : 'Inter-Regular',
        }}
      >
        {label}
      </Typography>
      {typeof count === 'number' ? (
        <Typography variant="caption" style={{ color: colors.text.muted }}>
          {count}
        </Typography>
      ) : null}
      {typeof badgeCount === 'number' && badgeCount > 0 ? (
        <View
          accessible
          accessibilityLabel={`${badgeCount} pending requests`}
          style={{
            minWidth: 18,
            height: 18,
            paddingHorizontal: 6,
            borderRadius: 999,
            backgroundColor: colors.accent.primary,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Typography
            variant="badge-text"
            style={{ color: colors.text.onAccent, fontFamily: 'Inter-SemiBold' }}
          >
            {badgeCount}
          </Typography>
        </View>
      ) : null}
      {trailing}
    </Pressable>
  );
}
