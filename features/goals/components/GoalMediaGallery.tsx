import { View, Text, ScrollView, Image } from 'react-native';
import type { ActivityEntry } from '../types';

interface GoalMediaGalleryProps {
  entries: ActivityEntry[];
}

export function GoalMediaGallery({ entries }: GoalMediaGalleryProps) {
  const mediaEntries = entries.filter((e) => e.mediaUrl);
  if (mediaEntries.length === 0) return null;

  return (
    <View
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 20,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        elevation: 1,
      }}
    >
      <Text
        style={{
          fontSize: 11,
          fontWeight: '500',
          color: '#6B7B6E',
          letterSpacing: 1.5,
          textTransform: 'uppercase',
          marginBottom: 12,
        }}
      >
        Photos
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {mediaEntries.map((entry) => (
            <View
              key={entry.id}
              style={{ borderRadius: 10, overflow: 'hidden', backgroundColor: '#F0EDE6' }}
            >
              <Image
                source={{ uri: entry.mediaUrl }}
                style={{ width: 120, height: 90 }}
                resizeMode="cover"
              />
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
