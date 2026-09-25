import Ionicons from '@expo/vector-icons/Ionicons';
import { View } from 'react-native';
import { SPACE } from '@/constants/design';
import { useThemeColors } from '@/store/uiStore';
import { Typography } from './Typography';

export function IntelligenceHeader({ insightType }: { insightType: string }) {
  const colors = useThemeColors();
  const label = insightType.replace(/\b\w/g, (character) => character.toUpperCase());

  return (
    <View style={{ alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm }}>
      <Ionicons color={colors.accent.primary} name="sparkles-outline" size={18} />
      <Typography variant="emphasis-sm" style={{ color: colors.text.accent }}>
        OHARA Intelligence
      </Typography>
      <Typography variant="caption" style={{ color: colors.text.muted }}>
        — {label}
      </Typography>
    </View>
  );
}
