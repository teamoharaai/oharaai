import { View } from 'react-native';
import { useThemeColors } from '@/store/uiStore';
import { Card, CardSubtitle, CardTitle } from './Card';
import { Button } from './Button';

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
    <Card padding="spacious" style={{ alignItems: 'center', paddingVertical: 40 }}>
      <View
        className="mb-4 h-12 w-12 items-center justify-center rounded-full border"
        style={{ backgroundColor: colors.background.selectedRow, borderColor: colors.border.divider }}
      >
        <View
          className="h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: colors.accent.primary }}
        />
      </View>
      <CardTitle style={{ textAlign: 'center' }}>
        {title}
      </CardTitle>
      <CardSubtitle
        style={{ lineHeight: 24, marginTop: 8, maxWidth: 260, textAlign: 'center' }}
      >
        {description}
      </CardSubtitle>
      {actionLabel && onActionPress ? (
        <Button
          size="compact"
          style={{ marginTop: 20, minHeight: 40 }}
          onPress={onActionPress}
        >
          {actionLabel}
        </Button>
      ) : null}
    </Card>
  );
}
