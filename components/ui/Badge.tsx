import { View } from 'react-native';
import { Typography } from './Typography';

type BadgeVariant = 'new' | 'active' | 'complete' | 'ai' | 'category' | 'paused' | 'archived';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
}

const VARIANT_STYLES: Record<BadgeVariant, { bg: string; text: string }> = {
  new: { bg: '#E09F3E26', text: '#E09F3E' },
  active: { bg: '#E8F5EF', text: '#4A7C5F' },
  complete: { bg: '#EAE7E0', text: '#6B7B6E' },
  paused: { bg: '#EAE7E0', text: '#6B7B6E' },
  archived: { bg: '#EAE7E0', text: '#9CAF9F' },
  ai: { bg: '#6E5CE726', text: '#6E5CE7' },
  category: { bg: '#F0EDE6', text: '#4A7C5F' },
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
