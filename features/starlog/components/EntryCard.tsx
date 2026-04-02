import { View, Text } from 'react-native';
import type { StarlogEntry } from '../types';

function formatEntryDate(date: Date): string {
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[date.getMonth()]} ${date.getDate()}`;
}

export function EntryCard({ entry }: { entry: StarlogEntry }) {
  return (
    <View
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
        elevation: 2,
      }}
    >
      <Text
        style={{ color: '#1A1F1C', fontSize: 14, lineHeight: 20 }}
        numberOfLines={3}
      >
        {entry.content}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 8 }}>
        <Text style={{ color: '#9CAF9F', fontSize: 12 }}>
          {formatEntryDate(entry.createdAt)}
        </Text>
        {entry.goalTitle && (
          <View
            style={{
              backgroundColor: '#E8F5EF',
              borderRadius: 10,
              paddingHorizontal: 8,
              paddingVertical: 2,
            }}
          >
            <Text style={{ color: '#4A7C5F', fontSize: 11 }}>{entry.goalTitle}</Text>
          </View>
        )}
      </View>
    </View>
  );
}
