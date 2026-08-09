import { Image, Text, View } from 'react-native';
import { useThemeColors } from '@/store/uiStore';

export function getInitials(displayName: string): string {
  const words = displayName.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '';
  return words
    .slice(0, 2)
    .map((word) => word[0]!.toUpperCase())
    .join('');
}

interface AvatarProps {
  avatarUrl: string | null;
  displayName: string;
  size: number;
}

export function Avatar({ avatarUrl, displayName, size }: AvatarProps) {
  const colors = useThemeColors();
  if (avatarUrl) {
    return (
      <Image
        source={{ uri: avatarUrl }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
      />
    );
  }

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: colors.accent.primary,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text
        style={{
          color: colors.text.inverse,
          fontFamily: 'Inter-Medium',
          fontSize: size * 0.38,
          fontWeight: '600',
          includeFontPadding: false,
          lineHeight: Math.round(size * 0.42),
        }}
      >
        {getInitials(displayName) || 'U'}
      </Text>
    </View>
  );
}
