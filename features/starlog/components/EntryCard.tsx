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
        backgroundColor: '#14141F',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#1E1E2E',
        padding: 16,
        marginBottom: 12,
      }}
    >
      <Text
        style={{ color: '#FAFAFA', fontSize: 14, lineHeight: 20 }}
        numberOfLines={3}
      >
        {entry.content}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 8 }}>
        <Text style={{ color: '#8888A0', fontSize: 12 }}>
          {formatEntryDate(entry.createdAt)}
        </Text>
        {entry.goalTitle && (
          <View
            style={{
              backgroundColor: '#1E1E2E',
              borderRadius: 10,
              paddingHorizontal: 8,
              paddingVertical: 2,
            }}
          >
            <Text style={{ color: '#8888A0', fontSize: 11 }}>{entry.goalTitle}</Text>
          </View>
        )}
      </View>
    </View>
  );
}
