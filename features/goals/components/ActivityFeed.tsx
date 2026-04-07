import { Pressable, Text, View, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import type { ActivityItem, EchoEntryActivity, MilestoneCompletedActivity, GoalCreatedActivity } from '@/types/activity';

interface ActivityFeedProps {
  items: ActivityItem[];
  loading: boolean;
  error: string | null;
}

function formatDate(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function GoalCreatedRow({ item }: { item: GoalCreatedActivity }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <Text style={{ fontSize: 11, color: '#9CAF9F' }}>◉</Text>
      <Text style={{ fontSize: 13, color: '#9CAF9F', flex: 1 }}>Goal created</Text>
      <Text style={{ fontFamily: 'Inter', fontSize: 12, color: '#9CAF9F' }}>{formatDate(item.timestamp)}</Text>
    </View>
  );
}

function EchoEntryCard({ item }: { item: EchoEntryActivity }) {
  return (
    <Pressable
      onPress={() => router.push(`/(app)/echo/${item.entryId}` as never)}
      style={({ pressed }) => ({
        backgroundColor: pressed ? '#F0EDE6' : '#F8F6F1',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#EAE7E0',
        paddingHorizontal: 14,
        paddingVertical: 12,
      })}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={{ fontSize: 11, color: '#9CAF9F' }}>✦</Text>
          <Text style={{ fontSize: 12, color: '#9CAF9F' }}>{formatDate(item.timestamp)}</Text>
        </View>
        {item.emotion?.primary ? (
          <View
            style={{
              backgroundColor: '#EAE7E0',
              borderRadius: 999,
              paddingHorizontal: 8,
              paddingVertical: 2,
            }}
          >
            <Text style={{ fontSize: 11, color: '#6B7B6E', textTransform: 'capitalize' }}>
              {item.emotion.primary}
            </Text>
          </View>
        ) : null}
      </View>
      <Text style={{ fontFamily: 'Inter', fontSize: 13, color: '#1A1F1C', lineHeight: 20 }} numberOfLines={3}>
        {item.preview}
      </Text>
    </Pressable>
  );
}

function MilestoneRow({ item }: { item: MilestoneCompletedActivity }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <Text style={{ fontSize: 13, color: '#3D5247' }}>✓</Text>
      <Text style={{ fontSize: 13, color: '#1A1F1C', flex: 1 }} numberOfLines={1}>
        {item.label}
      </Text>
      <Text style={{ fontSize: 12, color: '#9CAF9F' }}>{formatDate(item.timestamp)}</Text>
    </View>
  );
}

function ActivityRow({ item, isLast }: { item: ActivityItem; isLast: boolean }) {
  const content = (() => {
    switch (item.kind) {
      case 'goal_created':
        return <GoalCreatedRow item={item} />;
      case 'echo_entry':
        return <EchoEntryCard item={item} />;
      case 'milestone_completed':
        return <MilestoneRow item={item} />;
      case 'vault_item_added':
        return (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontSize: 11, color: '#9CAF9F' }}>◈</Text>
            <Text style={{ fontSize: 13, color: '#9CAF9F', flex: 1 }}>Added an item to Vault</Text>
            <Text style={{ fontFamily: 'Inter', fontSize: 12, color: '#9CAF9F' }}>{formatDate(item.timestamp)}</Text>
          </View>
        );
      case 'insight_confirmed':
        return (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontSize: 11, color: '#9CAF9F' }}>✦</Text>
            <Text style={{ fontSize: 13, color: '#9CAF9F', flex: 1 }}>Confirmed an insight</Text>
            <Text style={{ fontFamily: 'Inter', fontSize: 12, color: '#9CAF9F' }}>{formatDate(item.timestamp)}</Text>
          </View>
        );
      case 'echo_linked':
        return (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontSize: 11, color: '#9CAF9F' }}>✦</Text>
            <Text style={{ fontSize: 13, color: '#9CAF9F', flex: 1 }}>Linked a reflection</Text>
            <Text style={{ fontFamily: 'Inter', fontSize: 12, color: '#9CAF9F' }}>{formatDate(item.timestamp)}</Text>
          </View>
        );
    }
  })();

  return (
    <View
      style={{
        marginBottom: isLast ? 0 : 12,
        paddingBottom: isLast ? 0 : 12,
        borderBottomWidth: isLast ? 0 : 1,
        borderBottomColor: '#EAE7E0',
      }}
    >
      {content}
    </View>
  );
}

export function ActivityFeed({ items, loading, error }: ActivityFeedProps) {
  void error;

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
          fontFamily: 'Inter',
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

      {loading ? (
        <ActivityIndicator size="small" color="#9CAF9F" style={{ alignSelf: 'flex-start' }} />
      ) : (
        items.map((item, index) => (
          <ActivityRow key={item.id} item={item} isLast={index === items.length - 1} />
        ))
      )}
    </View>
  );
}
