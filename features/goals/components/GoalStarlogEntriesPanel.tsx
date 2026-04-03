import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import type { StarlogEntry } from '@/features/starlog/types';

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
  if (content.length <= 100) return content;
  return `${content.slice(0, 100).trimEnd()}...`;
}

function GoalStarlogEntryRow({ entry }: { entry: StarlogEntry }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isLongContent = entry.content.length > 100;
  const visibleContent = isExpanded ? entry.content : getPreview(entry.content);

  return (
    <View
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#EAE7E0',
        paddingHorizontal: 16,
        paddingVertical: 14,
      }}
    >
      <Text
        style={{
          fontSize: 10,
          fontWeight: '500',
          letterSpacing: 1.5,
          textTransform: 'uppercase',
          color: '#9CAF9F',
          marginBottom: 8,
        }}
      >
        {formatEntryDate(entry.createdAt)}
      </Text>
      <Text style={{ fontSize: 14, lineHeight: 22, color: '#1A1F1C' }}>
        {visibleContent}
      </Text>
      {isLongContent && (
        <Pressable
          style={{ marginTop: 10, alignSelf: 'flex-start' }}
          onPress={() => setIsExpanded((v) => !v)}
        >
          <Text
            style={{
              fontSize: 11,
              fontWeight: '500',
              letterSpacing: 1,
              textTransform: 'uppercase',
              color: '#9CAF9F',
            }}
          >
            {isExpanded ? 'Show less' : 'Read more'}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const SECTION_CARD_STYLE = {
  backgroundColor: '#FFFFFF',
  borderRadius: 16,
  padding: 20,
  marginBottom: 12,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.05,
  shadowRadius: 12,
  elevation: 1,
};

export function GoalStarlogEntriesPanel({ entries, isLoading }: GoalStarlogEntriesPanelProps) {
  return (
    <View style={SECTION_CARD_STYLE}>
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
        Reflections
      </Text>

      {isLoading ? (
        <View style={{ gap: 10 }}>
          {[0, 1].map((item) => (
            <View
              key={item}
              style={{
                backgroundColor: '#F5F1EA',
                borderRadius: 12,
                borderWidth: 1,
                borderColor: '#EAE7E0',
                paddingHorizontal: 16,
                paddingVertical: 14,
              }}
            >
              <View style={{ height: 10, width: 80, borderRadius: 999, backgroundColor: '#EAE7E0', marginBottom: 10 }} />
              <View style={{ height: 12, borderRadius: 999, backgroundColor: '#EAE7E0', marginBottom: 6 }} />
              <View style={{ height: 12, width: '80%', borderRadius: 999, backgroundColor: '#EAE7E0' }} />
            </View>
          ))}
        </View>
      ) : entries.length === 0 ? (
        <View style={{ paddingVertical: 12, paddingHorizontal: 4 }}>
          <Text style={{ fontSize: 14, color: '#6B7B6E', marginBottom: 4 }}>
            Reflections will collect here as you build momentum.
          </Text>
          <Text style={{ fontSize: 13, color: '#9CAF9F', lineHeight: 20 }}>
            When you log a Starlog entry linked to this goal, it will appear here.
          </Text>
        </View>
      ) : (
        <View style={{ gap: 8 }}>
          {entries.map((entry) => (
            <GoalStarlogEntryRow key={entry.id} entry={entry} />
          ))}
        </View>
      )}
    </View>
  );
}
