import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import type { PriorPhaseSummaryItem, Tracker } from '../types';

interface WhatYouBuiltPanelProps {
  previousGoalId: string;
  summary: PriorPhaseSummaryItem[] | null;
  trackers: Tracker[];
  reflection: string | null;
  reflectedAt: Date | null;
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(2)));
}

function formatReflectionDate(value: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(value);
}

function findClonedTracker(
  item: PriorPhaseSummaryItem,
  trackers: Tracker[],
): Tracker | null {
  return trackers.find((tracker) => tracker.title === item.title) ?? null;
}

function getRowPresentation(
  item: PriorPhaseSummaryItem,
  tracker: Tracker | null,
): { value: string; progress: number; valueColor: string } {
  if ('achieved' in item) {
    const hasTarget = item.target !== null && item.target > 0;

    return {
      value: `${formatNumber(item.achieved)}/${hasTarget ? formatNumber(item.target!) : '—'}`,
      progress: hasTarget ? Math.min(100, Math.max(0, (item.achieved / item.target!) * 100)) : 0,
      valueColor: '#8A6A3E',
    };
  }

  if (tracker?.type === 'checklist') {
    const complete = item.completions > 0;
    return {
      value: complete ? 'Done' : '0 completions',
      progress: complete ? 100 : 0,
      valueColor: complete ? '#3F8F63' : '#8A6A3E',
    };
  }

  return {
    value: `${formatNumber(item.completions)} completion${item.completions === 1 ? '' : 's'}`,
    progress: 0,
    valueColor: '#8A6A3E',
  };
}

export function WhatYouBuiltPanel({
  previousGoalId,
  summary,
  trackers,
  reflection,
  reflectedAt,
}: WhatYouBuiltPanelProps) {
  const reflectionText = reflection?.trim() ?? '';

  return (
    <>
      <View
        style={{
          backgroundColor: '#F6F0E4',
          borderColor: '#E7DEC9',
          borderRadius: 16,
          borderWidth: 1,
          marginBottom: 8,
          paddingHorizontal: 20,
          paddingVertical: 20,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <Text style={{ fontSize: 13 }}>🔒</Text>
          <Text
            style={{
              color: '#8A6A3E',
              fontFamily: 'Inter-SemiBold',
              fontSize: 11,
              letterSpacing: 1.5,
              textTransform: 'uppercase',
            }}
          >
            What You Built
          </Text>
        </View>
        <Text
          style={{
            color: '#9A8A6E',
            fontFamily: 'Inter-Regular',
            fontSize: 13,
            lineHeight: 19,
            marginBottom: summary?.length ? 16 : 0,
          }}
        >
          From your prior phase · locked and carried forward
        </Text>

        {summary?.map((item, index) => {
          const tracker = findClonedTracker(item, trackers);
          const presentation = getRowPresentation(item, tracker);

          return (
            <View key={`${item.title}-${index}`} style={{ marginBottom: index === summary.length - 1 ? 0 : 14 }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'baseline',
                  justifyContent: 'space-between',
                  gap: 12,
                  marginBottom: 6,
                }}
              >
                <Text
                  numberOfLines={2}
                  style={{
                    color: '#4A4237',
                    flex: 1,
                    fontFamily: 'Inter-Medium',
                    fontSize: 13.5,
                  }}
                >
                  {item.title}
                </Text>
                <Text
                  style={{
                    color: presentation.valueColor,
                    fontFamily: 'Inter-SemiBold',
                    fontSize: 13,
                  }}
                >
                  {presentation.value}
                </Text>
              </View>
              <View
                style={{
                  backgroundColor: '#E7DEC9',
                  borderRadius: 3,
                  height: 5,
                  overflow: 'hidden',
                }}
              >
                <View
                  style={{
                    backgroundColor: '#B79A6A',
                    borderRadius: 3,
                    height: 5,
                    width: `${presentation.progress}%`,
                  }}
                />
              </View>
            </View>
          );
        })}

        {reflectionText ? (
          <View
            style={{
              borderTopColor: '#E7DEC9',
              borderTopWidth: 1,
              marginTop: 18,
              paddingTop: 16,
            }}
          >
            <Text
              style={{
                color: '#9A8A6E',
                fontFamily: 'Inter-SemiBold',
                fontSize: 10.5,
                letterSpacing: 1.5,
                marginBottom: 8,
                textTransform: 'uppercase',
              }}
            >
              Reflection
            </Text>
            <Text
              style={{
                color: '#5A5142',
                fontFamily: 'Lora-Italic',
                fontSize: 15,
                lineHeight: 24,
              }}
            >
              “{reflectionText}”
            </Text>
            {reflectedAt ? (
              <Text
                style={{
                  color: '#9A8A6E',
                  fontFamily: 'Inter-Regular',
                  fontSize: 11.5,
                  marginTop: 8,
                }}
              >
                — reflected {formatReflectionDate(reflectedAt)}
              </Text>
            ) : null}
          </View>
        ) : null}
      </View>

      <Pressable
        onPress={() => router.push(`/(app)/goals/${previousGoalId}` as never)}
        style={{ alignSelf: 'flex-start', marginBottom: 12, paddingHorizontal: 2, paddingVertical: 4 }}
      >
        <Text style={{ color: '#8A8172', fontFamily: 'Inter-Regular', fontSize: 13 }}>
          View the original goal →
        </Text>
      </Pressable>
    </>
  );
}
