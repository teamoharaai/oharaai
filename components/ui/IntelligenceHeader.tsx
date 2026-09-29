import { View } from 'react-native';
import { SPACE } from '@/constants/design';
import { useThemeColors } from '@/store/uiStore';
import { BrandIcon } from './BrandIcon';
import { Typography } from './Typography';

export function IntelligenceHeader({ insightType }: { insightType: string }) {
  const colors = useThemeColors();
  const label = insightType.replace(/\b\w/g, (character) => character.toUpperCase());

  return (
    <View style={{ alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm }}>
      <BrandIcon color={colors.accent.primary} name="echo" size={19} />
      <Typography variant="emphasis-sm" style={{ color: colors.text.accent }}>
        Echo
      </Typography>
      <Typography variant="caption" style={{ color: colors.text.muted }}>
        — {label}
      </Typography>
    </View>
  );
}
