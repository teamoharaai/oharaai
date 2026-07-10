import { Text, View, ActivityIndicator } from 'react-native';
import { ReflectionCard } from '@/components/ui/ReflectionCard';
import { Typography } from '@/components/ui/Typography';
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
      <Text style={{ fontFamily: 'Inter-Regular', fontSize: 11, color: '#A79E8E' }}>◉</Text>
      <Typography variant="meta" className="text-[#A79E8E]" style={{ flex: 1 }}>Goal created</Typography>
      <Typography variant="caption">{formatDate(item.timestamp)}</Typography>
    </View>
  );
}

function EchoEntryCard({ item }: { item: EchoEntryActivity }) {
  // Entry has a generated AI reflection — render it via the shared ReflectionCard.
  // View-only (no tap-through; see OUTSTANDING.md EntryActionMenu extraction).
  if (item.aiResponse) {
    return (
      <ReflectionCard
        variant="compact"
        timestamp={item.timestamp}
        aiResponse={item.aiResponse}
        brt={item.brt}
      />
    );
  }

  // No reflection yet (unsummarized) — fall back to the raw content preview.
  return (
    <View
      style={{
        backgroundColor: '#F8F6F1',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#EAE7E0',
        paddingHorizontal: 14,
        paddingVertical: 12,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={{ fontFamily: 'Inter-Regular', fontSize: 11, color: '#A79E8E' }}>✦</Text>
          <Typography variant="caption">{formatDate(item.timestamp)}</Typography>
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
            <Text style={{ fontFamily: 'Inter-Regular', fontSize: 11, color: '#8A8172', textTransform: 'capitalize' }}>
              {item.emotion.primary}
            </Text>
          </View>
        ) : null}
      </View>
      <Typography variant="content" className="text-[13px] leading-5" numberOfLines={3}>
        {item.preview}
      </Typography>
    </View>
  );
}

function MilestoneRow({ item }: { item: MilestoneCompletedActivity }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <Text style={{ fontFamily: 'Inter-Regular', fontSize: 13, color: '#1E3226' }}>✓</Text>
      <Typography variant="content" className="text-[13px]" style={{ flex: 1 }} numberOfLines={1}>
        {item.label}
      </Typography>
      <Typography variant="caption">{formatDate(item.timestamp)}</Typography>
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
            <Text style={{ fontFamily: 'Inter-Regular', fontSize: 11, color: '#A79E8E' }}>◈</Text>
            <Typography variant="meta" className="text-[#A79E8E]" style={{ flex: 1 }}>Added an item to Vault</Typography>
            <Typography variant="caption">{formatDate(item.timestamp)}</Typography>
          </View>
        );
      case 'insight_confirmed':
        return (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontFamily: 'Inter-Regular', fontSize: 11, color: '#A79E8E' }}>✦</Text>
            <Typography variant="meta" className="text-[#A79E8E]" style={{ flex: 1 }}>Confirmed an insight</Typography>
            <Typography variant="caption">{formatDate(item.timestamp)}</Typography>
          </View>
        );
      case 'echo_linked':
        return (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontFamily: 'Inter-Regular', fontSize: 11, color: '#A79E8E' }}>✦</Text>
            <Typography variant="meta" className="text-[#A79E8E]" style={{ flex: 1 }}>Linked a reflection</Typography>
            <Typography variant="caption">{formatDate(item.timestamp)}</Typography>
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
  if (error) return null;

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
      <Typography variant="eyebrow" style={{ marginBottom: 14 }}>
        Activity
      </Typography>

      {loading ? (
        <ActivityIndicator size="small" color="#A79E8E" style={{ alignSelf: 'flex-start' }} />
      ) : (
        items.map((item, index) => (
          <ActivityRow key={item.id} item={item} isLast={index === items.length - 1} />
        ))
      )}
    </View>
  );
}
