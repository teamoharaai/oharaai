import { View, Text } from 'react-native';
import type { EchoBrt } from '@/types/brt';

export type ReflectionCardVariant = 'compact' | 'full';

export interface ReflectionCardProps {
  variant: ReflectionCardVariant;
  timestamp: string; // ISO string
  aiResponse: string;
  brt: EchoBrt | null;
}

// Mirrors features/goals/hooks/useEchoTrail.ts's deriveBrtLabel — same priority
// (bud → rose → thorn), kept local since this component must stay cross-feature-safe.
function deriveBrtLabel(brt: EchoBrt | null): 'Bud' | 'Rose' | 'Thorn' | null {
  if (!brt) return null;
  const scores: Array<['Bud' | 'Rose' | 'Thorn', number]> = [
    ['Bud', brt.bud.length],
    ['Rose', brt.rose.length],
    ['Thorn', brt.thorn.length],
  ];
  const best = scores.reduce((a, b) => (b[1] > a[1] ? b : a));
  return best[1] > 0 ? best[0] : null;
}

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
  const brtLabel = deriveBrtLabel(brt);
  const isFull = variant === 'full';

  return (
    <View className={isFull ? 'bg-white rounded-xl p-6 shadow-sm' : 'bg-white rounded-xl p-4 shadow-sm'}>
      <View className="flex-row items-center justify-between mb-2">
        <Text className={isFull ? 'text-sm text-gray-400' : 'text-xs text-gray-400'}>
          {formatTimestamp(timestamp)}
        </Text>
        {brtLabel ? <BrtPill brt={brtLabel} /> : null}
      </View>
      <Text
        className={
          isFull
            ? 'text-[#1A1A1A] text-base leading-relaxed'
            : 'text-[#1A1A1A] text-sm leading-relaxed'
        }
      >
        {aiResponse}
      </Text>
    </View>
  );
}
