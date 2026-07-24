// One tiny cell in the rail's stat strip (Friends · Active goals · Sent).
// Pulled out so the three cells share sizing / spacing without repetition.

import { View } from 'react-native';
import { Typography } from '@/components/ui/Typography';
import { useThemeColors } from '@/store/uiStore';

interface StatCellProps {
  value: number | string;
  label: string;
}

export function StatCell({ value, label }: StatCellProps) {
  const colors = useThemeColors();
  return (
    <View style={{ flex: 1 }}>
      <Typography
        variant="heading"
        style={{
          fontSize: 16,
          lineHeight: 18,
          letterSpacing: -0.2,
          color: colors.text.primary,
        }}
      >
        {String(value)}
      </Typography>
      <Typography
        variant="section-eyebrow"
        style={{
          fontSize: 9.5,
          letterSpacing: 1.1,
          marginTop: 5,
          color: colors.text.muted,
        }}
      >
        {label}
      </Typography>
    </View>
  );
}
