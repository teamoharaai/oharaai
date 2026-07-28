import { Text, View } from 'react-native';
import type { ConstellationGraphCountsDTO } from '../types.ts';
import type { ConstellationVisualTokens } from '../visual-tokens.ts';

interface ConstellationHeaderMetadataProps {
  counts: ConstellationGraphCountsDTO;
  fixture?: boolean;
  seasonLabel: string;
  tokens: ConstellationVisualTokens;
}

export function ConstellationHeaderMetadata({
  counts,
  fixture = false,
  seasonLabel,
  tokens,
}: ConstellationHeaderMetadataProps) {
  const metadata = [
    seasonLabel,
    `${counts.earnedNodes.total} earned`,
    `${counts.edges} connections`,
    `${counts.annotations.draft} drafts`,
    `${counts.evidenceLinks} evidence references`,
  ].join(' · ');

  return (
    <View
      style={{
        alignItems: 'center',
        backgroundColor: tokens.canvas.background,
        flexDirection: 'row',
        justifyContent: 'space-between',
        minHeight: 86,
        paddingHorizontal: 30,
        paddingVertical: 17,
      }}
    >
      <View style={{ gap: 4 }}>
        <Text
          accessibilityRole="header"
          style={{
            color: tokens.text.primary,
            fontFamily: 'Inter-SemiBold',
            fontSize: 28,
            letterSpacing: -0.4,
          }}
        >
          Constellation
        </Text>
        <Text
          style={{
            color: tokens.text.secondary,
            fontFamily: 'Inter-Regular',
            fontSize: 13,
          }}
        >
          {metadata}
        </Text>
      </View>
      {fixture ? (
        <View
          style={{
            backgroundColor: tokens.annotation.badgeFill,
            borderColor: tokens.annotation.stroke,
            borderRadius: 999,
            borderWidth: 1,
            paddingHorizontal: 12,
            paddingVertical: 7,
          }}
        >
          <Text
            style={{
              color: tokens.annotation.badgeText,
              fontFamily: 'Inter-SemiBold',
              fontSize: 10,
              letterSpacing: 1.1,
              textTransform: 'uppercase',
            }}
          >
            Development fixture
          </Text>
        </View>
      ) : null}
    </View>
  );
}
