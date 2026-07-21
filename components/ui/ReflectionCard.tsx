import { View } from 'react-native';
import { resolveBrt, type BrtCategory } from '@/lib/utils/resolveBrt';
import type { EchoBrt } from '@/types/brt';
import { useThemeColors } from '@/store/uiStore';
import { Card, CardHeader, CardMetadata } from './Card';
import { Typography } from './Typography';

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

// BRT identity stays semantic while the pill surface follows the shared card palette.
function BrtPill({ brt }: { brt: 'Bud' | 'Rose' | 'Thorn' }) {
  const colors = useThemeColors();
  const textColor =
    brt === 'Bud' ? colors.brt.bud : brt === 'Rose' ? colors.brt.rose : colors.brt.thorn;

  return (
    <View
      className="rounded-full px-2 py-0.5"
      style={{ backgroundColor: colors.background.subtle }}
    >
      <Typography variant="badge-text" style={{ color: textColor }}>
        {brt}
      </Typography>
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
    <Card padding={isFull ? 'spacious' : 'compact'} elevated>
      <CardHeader style={{ marginBottom: 8 }}>
        <CardMetadata style={{ fontSize: isFull ? 14 : 12 }}>
          {formatTimestamp(timestamp)}
        </CardMetadata>
        {brtLabel ? <BrtPill brt={brtLabel} /> : null}
      </CardHeader>
      <Typography
        variant="content"
        style={{ fontSize: isFull ? 15 : 14, lineHeight: isFull ? 24 : 21 }}
      >
        {aiResponse}
      </Typography>
    </Card>
  );
}
