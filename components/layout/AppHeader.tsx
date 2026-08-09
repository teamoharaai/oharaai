import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import type { ReactNode } from 'react';
import { useThemeColors } from '@/store/uiStore';
import { Typography } from '@/components/ui/Typography';
import { LAYOUT, SPACE } from '@/constants/design';

interface AppHeaderProps {
  actions?: ReactNode;
  backLabel: string;
  onBack: () => void;
  style?: StyleProp<ViewStyle>;
  title: ReactNode;
}

export function AppHeader({ actions, backLabel, onBack, style, title }: AppHeaderProps) {
  const colors = useThemeColors();

  return (
    <View
      style={[
        {
          alignItems: 'center',
          backgroundColor: colors.background.card,
          borderBottomColor: colors.border.subtle,
          borderBottomWidth: 1,
          flexDirection: 'row',
          minHeight: 64,
          paddingHorizontal: LAYOUT.standardGutter,
          paddingVertical: SPACE.md,
        },
        style,
      ]}
    >
      <Pressable
        accessibilityLabel={`Back to ${backLabel}`}
        accessibilityRole="button"
        hitSlop={6}
        onPress={onBack}
        style={({ pressed }) => ({
          alignItems: 'center',
          flexDirection: 'row',
          minHeight: 44,
          opacity: pressed ? 0.62 : 1,
        })}
      >
        <Typography variant="nav-back">← {backLabel}</Typography>
      </Pressable>

      <View
        style={{
          backgroundColor: colors.border.divider,
          height: 18,
          marginHorizontal: SPACE.lg,
          width: 1,
        }}
      />

      <View style={{ flex: 1, minWidth: 0 }}>
        {typeof title === 'string' ? (
          <Typography variant="nav-title" numberOfLines={1}>
            {title}
          </Typography>
        ) : (
          title
        )}
      </View>

      {actions ? <View style={{ marginLeft: SPACE.xl }}>{actions}</View> : null}
    </View>
  );
}
