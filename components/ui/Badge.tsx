import { View } from 'react-native';
import { useThemeColors } from '@/store/uiStore';
import { Typography } from './Typography';

type BadgeVariant = 'new' | 'active' | 'ended' | 'complete' | 'ai' | 'category' | 'momentum' | 'paused' | 'archived';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
}

export function Badge({ label, variant = 'active' }: BadgeProps) {
  const colors = useThemeColors();
  const styles: Record<BadgeVariant, { bg: string; text: string }> = {
    new: { bg: colors.feedback.pending.bg, text: colors.feedback.pending.text },
    active: { bg: colors.background.selectedRow, text: colors.text.accent },
    ended: { bg: colors.feedback.danger.bg, text: colors.feedback.danger.text },
    complete: { bg: colors.background.subtle, text: colors.text.secondary },
    paused: { bg: colors.background.subtle, text: colors.text.secondary },
    archived: { bg: colors.background.subtle, text: colors.text.muted },
    ai: { bg: colors.feedback.info.bg, text: colors.feedback.info.text },
    category: { bg: colors.background.input, text: colors.text.accent },
    momentum: { bg: colors.background.selectedRow, text: colors.accent.tealMid },
  };
  const badgeStyle = styles[variant] ?? styles.category;
  const prefix = variant === 'ai' ? '✦ ' : '';

  return (
    <View
      style={{
        backgroundColor: badgeStyle.bg,
        borderRadius: 8,
        paddingHorizontal: 8,
        paddingVertical: 3,
        alignSelf: 'flex-start',
      }}
    >
      <Typography variant="badge-text" style={{ color: badgeStyle.text }}>
        {prefix}{label}
      </Typography>
    </View>
  );
}
