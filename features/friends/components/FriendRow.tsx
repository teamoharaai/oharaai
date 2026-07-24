import { View, type StyleProp, type ViewStyle } from 'react-native';
import type { ReactNode } from 'react';
import { Avatar } from '@/components/ui/Avatar';
import { Typography } from '@/components/ui/Typography';
import { useThemeColors } from '@/store/uiStore';

interface FriendRowProps {
  action?: ReactNode;
  avatarUrl: string | null;
  containerStyle?: StyleProp<ViewStyle>;
  displayName: string;
  error?: string | null;
  subtitle: string;
}

export function FriendRow({
  action,
  avatarUrl,
  containerStyle,
  displayName,
  error,
  subtitle,
}: FriendRowProps) {
  const colors = useThemeColors();

  return (
    <View
      style={[
        {
          borderBottomColor: colors.border.warmSubtle,
          borderBottomWidth: 1,
          paddingHorizontal: 12,
          paddingVertical: 11,
        },
        containerStyle,
      ]}
    >
      <View style={{ alignItems: 'center', flexDirection: 'row', gap: 12 }}>
        <Avatar
          avatarUrl={avatarUrl}
          displayName={displayName}
          size={38}
        />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Typography numberOfLines={1} variant="card-title">
            {displayName}
          </Typography>
          <Typography
            numberOfLines={1}
            style={{ color: colors.text.muted, marginTop: 1 }}
            variant="meta"
          >
            {subtitle}
          </Typography>
        </View>
        {action ? <View style={{ flexShrink: 0 }}>{action}</View> : null}
      </View>
      {error ? (
        <Typography
          accessibilityLiveRegion="polite"
          style={{
            color: colors.feedback.danger.text,
            marginLeft: 50,
            marginTop: 7,
          }}
          variant="caption"
        >
          {error}
        </Typography>
      ) : null}
    </View>
  );
}
