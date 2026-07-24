import { View } from 'react-native';
import { Typography } from '@/components/ui/Typography';
import { useThemeColors } from '@/store/uiStore';

interface StatCellProps {
  label: string;
  value: number;
}

export function StatCell({ label, value }: StatCellProps) {
  const colors = useThemeColors();

  return (
    <View style={{ flex: 1, minWidth: 0 }}>
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
          color: colors.text.muted,
          fontSize: 9,
          letterSpacing: 1,
          marginTop: 4,
        }}
      >
        {label}
      </Typography>
    </View>
  );
}
