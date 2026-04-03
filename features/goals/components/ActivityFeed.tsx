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
          marginBottom: 14,
        }}
      >
        Activity
      </Text>

      {sorted.length === 0 ? (
        <View style={{ paddingVertical: 8, paddingHorizontal: 4 }}>
          <Text style={{ fontSize: 14, color: '#6B7B6E', marginBottom: 4 }}>
            Activity will build here as you make progress.
          </Text>
          <Text style={{ fontSize: 13, color: '#9CAF9F', lineHeight: 20 }}>
            Logged reflections and milestone updates will appear in this feed.
          </Text>
        </View>
      ) : (
        sorted.map((entry, index) => (
          <View
            key={entry.id}
            style={{
              marginBottom: index < sorted.length - 1 ? 16 : 0,
              paddingBottom: index < sorted.length - 1 ? 16 : 0,
              borderBottomWidth: index < sorted.length - 1 ? 1 : 0,
              borderBottomColor: '#EAE7E0',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <Text style={{ color: '#9CAF9F', fontSize: 11 }}>
                {TYPE_ICONS[entry.type]}
              </Text>
              <Text style={{ color: '#9CAF9F', fontSize: 11, letterSpacing: 0.3 }}>
                {formatRelativeTime(entry.createdAt)}
              </Text>
            </View>

            <Text
              style={{ color: '#1A1F1C', fontSize: 13, lineHeight: 20 }}
              numberOfLines={4}
            >
              {entry.text}
            </Text>

            {entry.aiResponse && (
              <View
                style={{
                  marginTop: 8,
                  paddingLeft: 12,
                  borderLeftWidth: 2,
                  borderLeftColor: '#EAE7E0',
                }}
              >
                <Text style={{ color: '#6B7B6E', fontSize: 12, lineHeight: 18, fontStyle: 'italic' }}>
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
