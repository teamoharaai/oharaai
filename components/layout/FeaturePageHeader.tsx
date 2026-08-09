import type { ReactNode } from 'react';
import { View, useWindowDimensions, type StyleProp, type ViewStyle } from 'react-native';

import { SPACE } from '@/constants/design';
import { useThemeColors } from '@/store/uiStore';
import { Typography } from '@/components/ui/Typography';

type FeaturePageHeaderProps = {
  badge?: ReactNode;
  description: ReactNode;
  icon?: ReactNode;
  title: string;
  trailing?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

/** Canonical identity row for authenticated feature pages. */
export function FeaturePageHeader({
  badge,
  description,
  icon,
  title,
  trailing,
  style,
}: FeaturePageHeaderProps) {
  const colors = useThemeColors();
  const { width } = useWindowDimensions();
  const compact = width < 720;

  return (
    <View
      style={[{
        alignItems: compact ? 'stretch' : 'flex-start',
        flexDirection: compact ? 'column' : 'row',
        gap: compact ? SPACE.xl : SPACE['3xl'],
        justifyContent: 'space-between',
        minWidth: 0,
      }, style]}
    >
      <View style={{ flex: 1, minWidth: 0 }}>
        <View
          style={{
            alignItems: 'center',
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: SPACE.lg,
          }}
        >
          {icon}
          <Typography
            accessibilityRole="header"
            variant="heading"
            style={{
              fontSize: compact ? 32 : 42,
              fontWeight: '600',
              letterSpacing: -1,
              lineHeight: compact ? 39 : 50,
            }}
          >
            {title}
          </Typography>
          {badge}
        </View>
        <Typography
          variant="body"
          style={{
            color: colors.text.secondary,
            lineHeight: 24,
            marginTop: SPACE.xs,
            maxWidth: 760,
          }}
        >
          {description}
        </Typography>
      </View>
      {trailing ? <View style={{ flexShrink: 0 }}>{trailing}</View> : null}
    </View>
  );
}
