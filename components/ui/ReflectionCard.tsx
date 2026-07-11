import { View, Text } from 'react-native';
import { resolveBrt, type BrtCategory } from '@/lib/utils/resolveBrt';
import type { EchoBrt } from '@/types/brt';

export type ReflectionCardVariant = 'compact' | 'full';

export interface ReflectionCardProps {
  variant: ReflectionCardVariant;
  timestamp: string; // ISO string
  aiResponse: string;
  brt: EchoBrt | null;
}

const BRT_LABELS: Record<BrtCategory, 'Bud' | 'Rose' | 'Thorn'> = {
  bud: 'Bud',
  rose: 'Rose',
  thorn: 'Thorn',
};

// Matches EchoTrail.tsx's BrtBadge exactly — same colors, same shape.
function BrtPill({ brt }: { brt: 'Bud' | 'Rose' | 'Thorn' }) {
  if (brt === 'Bud') {
    return (
      <View className="bg-green-100 px-2 py-0.5 rounded-full">
        <Text className="text-xs font-medium text-green-700">Bud</Text>
      </View>
    );
  }
  if (brt === 'Rose') {
    return (
      <View className="bg-amber-100 px-2 py-0.5 rounded-full">
        <Text className="text-xs font-medium" style={{ color: '#F59E0B' }}>Rose</Text>
      </View>
    );
  }
  return (
    <View className="bg-red-100 px-2 py-0.5 rounded-full">
      <Text className="text-xs font-medium text-red-700">Thorn</Text>
    </View>
  );
}

function formatTimestamp(value: string): string {
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function ReflectionCard({ variant, timestamp, aiResponse, brt }: ReflectionCardProps) {
  const brtCategory = resolveBrt(brt);
  const brtLabel = brtCategory ? BRT_LABELS[brtCategory] : null;
  const isFull = variant === 'full';

  return (
    <View className={isFull ? 'bg-white rounded-xl p-6 shadow-sm' : 'bg-white rounded-xl p-4 shadow-sm'}>
      <View className="flex-row items-center justify-between mb-2">
        <Text className={isFull ? 'text-sm text-[#A79E8E]' : 'text-xs text-[#A79E8E]'}>
          {formatTimestamp(timestamp)}
        </Text>
        {brtLabel ? <BrtPill brt={brtLabel} /> : null}
      </View>
      <Text
        className={
          isFull
            ? 'text-near-black text-base leading-relaxed'
            : 'text-near-black text-sm leading-relaxed'
        }
      >
        {aiResponse}
      </Text>
    </View>
  );
}
