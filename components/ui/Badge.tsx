import { View, Text } from 'react-native';

type BadgeVariant = 'new' | 'active' | 'complete' | 'ai' | 'category' | 'paused' | 'archived';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
}

const VARIANT_STYLES: Record<BadgeVariant, { bg: string; text: string }> = {
  new: { bg: '#E09F3E26', text: '#E09F3E' },
  active: { bg: '#2D6A4F26', text: '#52B788' },
  complete: { bg: '#8888A026', text: '#8888A0' },
  paused: { bg: '#8888A026', text: '#8888A0' },
  archived: { bg: '#1E1E2E', text: '#8888A0' },
  ai: { bg: '#6E5CE726', text: '#6E5CE7' },
  category: { bg: '#1E1E2E', text: '#8888A0' },
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
      <Text style={{ color: style.text, fontSize: 11, fontWeight: '500' }}>
        {prefix}{label}
      </Text>
    </View>
  );
}
