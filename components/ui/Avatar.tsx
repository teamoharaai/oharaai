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
        backgroundColor: '#3D5247',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text
        style={{
          color: '#F5F1EA',
          fontFamily: 'Inter',
          fontWeight: '600',
          fontSize: size * 0.4,
        }}
      >
        {getInitials(displayName)}
      </Text>
    </View>
  );
}
