import { TouchableOpacity, View } from 'react-native';
import { useThemeColors } from '@/store/uiStore';
import { Typography } from './Typography';

interface EmptyStateCardProps {
  title: string;
  description: string;
  actionLabel?: string;
  onActionPress?: () => void;
}

export function EmptyStateCard({
  title,
  description,
  actionLabel,
  onActionPress,
}: EmptyStateCardProps) {
  const colors = useThemeColors();

  return (
    <View
      className="items-center rounded-xl border px-6 py-10"
      style={{ backgroundColor: colors.background.card, borderColor: colors.border.divider }}
    >
      <View
        className="mb-4 h-12 w-12 items-center justify-center rounded-full border"
        style={{ backgroundColor: colors.background.selectedRow, borderColor: colors.border.divider }}
      >
        <View
          className="h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: colors.accent.primary }}
        />
      </View>
      <Typography variant="title" className="text-center">
        {title}
      </Typography>
      <Typography
        variant="subtitle"
        className="mt-2 max-w-[260px] text-center leading-6"
      >
        {description}
      </Typography>
      {actionLabel && onActionPress ? (
        <TouchableOpacity
          className="mt-5 rounded-full px-4 py-2"
          style={{ backgroundColor: colors.accent.primary }}
          onPress={onActionPress}
          activeOpacity={0.8}
        >
          <Typography variant="emphasis-sm" style={{ color: colors.text.inverse }}>
            {actionLabel}
          </Typography>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}
