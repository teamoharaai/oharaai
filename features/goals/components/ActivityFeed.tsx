import { View, Text } from 'react-native';
import type { ActivityEntry } from '../types';

interface ActivityFeedProps {
  entries: ActivityEntry[];
}

const TYPE_ICONS: Record<ActivityEntry['type'], string> = {
  journal: '✦',
  milestone: '◎',
  measurable: '▲',
};

function formatRelativeTime(date: Date): string {
  const diff = Date.now() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function ActivityFeed({ entries }: ActivityFeedProps) {
  const sorted = [...entries].sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
  );

  return (
    <View style={{ padding: 16 }}>
      <Text style={{ color: '#FAFAFA', fontSize: 15, fontWeight: '600', marginBottom: 14 }}>
        Activity
      </Text>
      {sorted.length === 0 ? (
        <Text style={{ color: '#8888A0', fontSize: 13 }}>No activity yet.</Text>
      ) : (
        sorted.map((entry, index) => (
          <View
            key={entry.id}
            style={{
              marginBottom: 16,
              paddingBottom: 16,
              borderBottomWidth: index < sorted.length - 1 ? 1 : 0,
              borderBottomColor: '#1E1E2E',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <Text style={{ color: '#8888A0', fontSize: 13 }}>
                {TYPE_ICONS[entry.type]}
              </Text>
              <Text style={{ color: '#8888A0', fontSize: 11 }}>
                {formatRelativeTime(entry.createdAt)}
              </Text>
            </View>
            <Text
              style={{ color: '#FAFAFA', fontSize: 13, lineHeight: 20 }}
              numberOfLines={4}
            >
              {entry.text}
            </Text>
            {entry.aiResponse && (
              <View
                style={{
                  marginTop: 8,
                  paddingLeft: 10,
                  borderLeftWidth: 2,
                  borderLeftColor: '#8888A0',
                }}
              >
                <Text style={{ color: '#8888A0', fontSize: 12, lineHeight: 18, fontStyle: 'italic' }}>
                  {entry.aiResponse}
                </Text>
              </View>
            )}
          </View>
        ))
      )}
    </View>
  );
}
