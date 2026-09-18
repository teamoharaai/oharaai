import { Pressable, View } from 'react-native';
import { Typography } from '@/components/ui/Typography';
import { useThemeColors } from '@/store/uiStore';

interface StatCellProps {
  active?: boolean;
  label: string;
  onPress?: () => void;
  value: number;
}

export function StatCell({
  active = false,
  label,
  onPress,
  value,
}: StatCellProps) {
  const colors = useThemeColors();
  const content = (
    <>
      <Typography
        variant="heading"
        style={{
          color: colors.text.primary,
          fontSize: 16,
          letterSpacing: -0.2,
          lineHeight: 19,
        }}
      >
        {String(value)}
      </Typography>
      <Typography
        numberOfLines={1}
        variant="section-eyebrow"
        style={{
          color: active ? colors.text.accent : colors.text.muted,
          fontSize: 9,
          letterSpacing: 1,
          marginTop: 4,
        }}
      >
        {label}
      </Typography>
    </>
  );

  if (onPress) {
    return (
      <Pressable
        accessibilityLabel={`Open ${label.toLowerCase()}`}
        accessibilityRole="button"
        accessibilityState={{ selected: active }}
        onPress={onPress}
        style={({ pressed }) => ({
          backgroundColor: active
            ? colors.background.card
            : pressed
              ? colors.background.selectedRow
              : 'transparent',
          borderColor: active ? colors.border.warm : 'transparent',
          borderRadius: 10,
          borderWidth: 1,
          flex: 1,
          justifyContent: 'center',
          minHeight: 48,
          minWidth: 0,
          paddingHorizontal: 9,
          paddingVertical: 6,
        })}
      >
        {content}
      </Pressable>
    );
  }

  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        minHeight: 48,
        minWidth: 0,
        paddingHorizontal: 9,
        paddingVertical: 6,
      }}
    >
      {content}
    </View>
  );
}
