import { View } from 'react-native';
import { Typography } from './Typography';

type BadgeVariant = 'new' | 'active' | 'ended' | 'complete' | 'ai' | 'category' | 'momentum' | 'paused' | 'archived';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
}

const VARIANT_STYLES: Record<BadgeVariant, { bg: string; text: string }> = {
  new: { bg: '#E09F3E26', text: '#E09F3E' },
  active: { bg: '#E8F5EF', text: '#4A7C5F' },
  ended: { bg: '#F7E6E2', text: '#C0483A' },
  complete: { bg: '#EAE7E0', text: '#8A8172' },
  paused: { bg: '#EAE7E0', text: '#8A8172' },
  archived: { bg: '#EAE7E0', text: '#A79E8E' },
  ai: { bg: '#6E5CE726', text: '#6E5CE7' },
  category: { bg: '#F0EDE6', text: '#4A7C5F' },
  momentum: { bg: '#E8F5EF', text: '#2F8F6D' },
};

export function Badge({ label, variant = 'active' }: BadgeProps) {
  const style = VARIANT_STYLES[variant] ?? VARIANT_STYLES.category;
  const prefix = variant === 'ai' ? '✦ ' : '';

  return (
    <View
      style={{
        backgroundColor: style.bg,
        borderRadius: 8,
        paddingHorizontal: 8,
        paddingVertical: 3,
        alignSelf: 'flex-start',
      }}
    >
      <Typography variant="badge-text" style={{ color: style.text }}>
        {prefix}{label}
      </Typography>
    </View>
  );
}
