// One list-row primitive shared by Friends, Requests, and Add-people panes.
//
// The action pill (right side) is caller-provided so each pane can render its
// own state — <Button>Accept</Button>, <Pending />, <FriendsBadge />, etc. —
// without this component learning about every possible action.

import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import type { ReactNode } from 'react';
import { Avatar } from '@/components/ui/Avatar';
import { Typography } from '@/components/ui/Typography';
import { useThemeColors } from '@/store/uiStore';

interface FriendRowProps {
  avatarUrl: string | null;
  displayName: string;
  subtitle: string;
  action?: ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
}

export function FriendRow({
  avatarUrl,
  displayName,
  subtitle,
  action,
  onPress,
  disabled = false,
  containerStyle,
}: FriendRowProps) {
  const colors = useThemeColors();

  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      onPress={disabled ? undefined : onPress}
      disabled={disabled || !onPress}
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          paddingVertical: 10,
          paddingHorizontal: 12,
          borderRadius: 12,
          backgroundColor: pressed && onPress ? colors.background.selectedRow : 'transparent',
          opacity: disabled ? 0.55 : 1,
        },
        containerStyle,
      ]}
    >
      <Avatar avatarUrl={avatarUrl} displayName={displayName} size={36} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Typography variant="card-title" numberOfLines={1}>
          {displayName}
        </Typography>
        <Typography variant="meta" numberOfLines={1} style={{ marginTop: 2 }}>
          {subtitle}
        </Typography>
      </View>
      {action ? <View>{action}</View> : null}
    </Pressable>
  );
}
