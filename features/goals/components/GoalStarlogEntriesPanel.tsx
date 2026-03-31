import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import type { StarlogEntry } from '@/features/starlog/types';
import { EmptyStateCard } from '@/components/ui/EmptyStateCard';

interface GoalStarlogEntriesPanelProps {
  entries: StarlogEntry[];
  isLoading: boolean;
}

function formatEntryDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getPreview(content: string): string {
  if (content.length <= 100) {
    return content;
  }

  return `${content.slice(0, 100).trimEnd()}...`;
}

function GoalStarlogEntryRow({ entry }: { entry: StarlogEntry }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isLongContent = entry.content.length > 100;
  const visibleContent = isExpanded ? entry.content : getPreview(entry.content);

  return (
    <View className="rounded-xl border border-dark-border bg-dark-card px-4 py-4">
      <Text className="mb-2 text-xs font-medium uppercase tracking-[0.2em] text-muted">
        {formatEntryDate(entry.createdAt)}
      </Text>
      <Text className="text-sm leading-6 text-white">
        {visibleContent}
      </Text>
      {isLongContent ? (
        <Pressable
          className="mt-3 self-start"
          onPress={() => setIsExpanded((value) => !value)}
        >
          <Text className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
            {isExpanded ? 'Show less' : 'Read more'}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function GoalStarlogEntriesPanel({
  entries,
  isLoading,
}: GoalStarlogEntriesPanelProps) {
  return (
    <View className="mt-6">
      <Text className="mb-3 text-base font-semibold text-white">
        Starlog Entries
      </Text>
      {isLoading ? (
        <View className="gap-3">
          {[0, 1].map((item) => (
            <View
              key={item}
              className="animate-pulse rounded-xl border border-dark-border bg-dark-card px-4 py-4"
            >
              <View className="mb-3 h-3 w-24 rounded-full bg-dark-border" />
              <View className="mb-2 h-4 w-full rounded-full bg-dark-border" />
              <View className="h-4 w-4/5 rounded-full bg-dark-border" />
            </View>
          ))}
        </View>
      ) : entries.length === 0 ? (
        <EmptyStateCard
          title="No Starlog entries yet."
          description="Linked reflections will show up here as you add them in Starlog."
        />
      ) : (
        <View className="gap-3">
          {entries.map((entry) => (
            <GoalStarlogEntryRow key={entry.id} entry={entry} />
          ))}
        </View>
      )}
    </View>
  );
}
