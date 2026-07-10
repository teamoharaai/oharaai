import { Image, Text, View } from 'react-native';

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
        backgroundColor: '#1E3226',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text
        style={{
          color: '#F8F4EC',
          fontFamily: 'Inter-SemiBold',
          fontSize: size * 0.4,
        }}
      >
        {getInitials(displayName)}
      </Text>
    </View>
  );
}
