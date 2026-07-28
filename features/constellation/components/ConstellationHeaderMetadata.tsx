import {
  ActivityIndicator,
  Pressable,
  Text,
  View,
} from 'react-native';
import { CONSTELLATION_COPY } from '../copy';
import type { ConstellationGraphCountsDTO } from '../types.ts';
import type { ConstellationVisualTokens } from '../visual-tokens.ts';

interface ConstellationHeaderMetadataProps {
  counts: ConstellationGraphCountsDTO;
  fixture?: boolean;
  isRefreshing?: boolean;
  onRefresh?: () => void;
  refreshError?: string | null;
  seasonLabel: string;
  tokens: ConstellationVisualTokens;
}

export function ConstellationHeaderMetadata({
  counts,
  fixture = false,
  isRefreshing = false,
  onRefresh,
  refreshError,
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
        backgroundColor: tokens.canvas.background,
        minHeight: 86,
        paddingHorizontal: 30,
        paddingVertical: 17,
      }}
    >
      <View style={{ alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' }}>
        <View style={{ flex: 1, gap: 4, minWidth: 0 }}>
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
        ) : onRefresh ? (
          <Pressable
            accessibilityLabel={isRefreshing ? 'Refreshing Constellation' : 'Refresh Constellation'}
            accessibilityRole="button"
            accessibilityState={{ busy: isRefreshing, disabled: isRefreshing }}
            disabled={isRefreshing}
            onPress={onRefresh}
            style={({ pressed }) => ({
              alignItems: 'center',
              borderColor: tokens.panel.border,
              borderRadius: 999,
              borderWidth: 1,
              flexDirection: 'row',
              gap: 7,
              minHeight: 38,
              opacity: pressed || isRefreshing ? 0.68 : 1,
              paddingHorizontal: 13,
            })}
          >
            {isRefreshing ? (
              <ActivityIndicator color={tokens.text.accent} size="small" />
            ) : null}
            <Text
              style={{
                color: tokens.text.accent,
                fontFamily: 'Inter-SemiBold',
                fontSize: 12,
              }}
            >
              {isRefreshing ? 'Refreshing…' : 'Refresh'}
            </Text>
          </Pressable>
        ) : null}
      </View>
      {refreshError ? (
        <Text
          accessibilityRole="alert"
          style={{
            color: tokens.text.secondary,
            fontFamily: 'Inter-Regular',
            fontSize: 12,
            marginTop: 9,
          }}
        >
          {CONSTELLATION_COPY.staleRefresh}
        </Text>
      ) : null}
    </View>
  );
}
