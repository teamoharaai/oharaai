import { View, Text, ScrollView, Image } from 'react-native';
import type { ActivityEntry } from '../types';

interface GoalMediaGalleryProps {
  entries: ActivityEntry[];
}

export function GoalMediaGallery({ entries }: GoalMediaGalleryProps) {
  const mediaEntries = entries.filter((e) => e.mediaUrl);
  if (mediaEntries.length === 0) return null;

  return (
    <View style={{ padding: 16, paddingTop: 0 }}>
      <Text style={{ color: '#FAFAFA', fontSize: 15, fontWeight: '600', marginBottom: 10 }}>
        Photos
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {mediaEntries.map((entry) => (
            <View
              key={entry.id}
              style={{ borderRadius: 10, overflow: 'hidden', backgroundColor: '#1E1E2E' }}
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
