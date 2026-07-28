import {
  Pressable,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { CONSTELLATION_COPY } from '../copy';
import type {
  ConstellationAnnotationKind,
  ConstellationGraphCountsDTO,
} from '../types.ts';
import type { ConstellationVisualTokens } from '../visual-tokens.ts';
import { ConstellationLoadingMark } from './ConstellationLoadingMark';

interface ConstellationHeaderMetadataProps {
  counts: ConstellationGraphCountsDTO;
  fixture?: boolean;
  focusLabel?: string | null;
  isRefreshing?: boolean;
  onCreateAnnotation?: (kind: ConstellationAnnotationKind) => void;
  onRefresh?: () => void;
  refreshError?: string | null;
  seasonLabel: string;
  tokens: ConstellationVisualTokens;
}

export function ConstellationHeaderMetadata({
  counts,
  fixture = false,
  focusLabel,
  isRefreshing = false,
  onCreateAnnotation,
  onRefresh,
  refreshError,
  seasonLabel,
  tokens,
}: ConstellationHeaderMetadataProps) {
  const { width } = useWindowDimensions();
  const compact = width < 760;
  const metadata = [
    focusLabel ? `Focus · ${focusLabel}` : seasonLabel,
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
      <View
        style={{
          alignItems: compact ? 'stretch' : 'center',
          flexDirection: compact ? 'column' : 'row',
          gap: compact ? 12 : 18,
          justifyContent: 'space-between',
        }}
      >
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
            {focusLabel ? 'Constellation · Focus' : 'Constellation'}
          </Text>
          <Text
            numberOfLines={2}
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
        ) : (
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: 8,
            }}
          >
            {onCreateAnnotation ? (
              <>
                {(['note', 'projection'] as const).map((kind) => (
                  <Pressable
                    accessibilityLabel={`Create ${kind}`}
                    accessibilityRole="button"
                    key={kind}
                    onPress={() => onCreateAnnotation(kind)}
                    style={({ pressed }) => ({
                      alignItems: 'center',
                      backgroundColor: kind === 'projection'
                        ? tokens.annotation.badgeFill
                        : tokens.panel.background,
                      borderColor: tokens.annotation.stroke,
                      borderRadius: 999,
                      borderWidth: 1,
                      justifyContent: 'center',
                      minHeight: 44,
                      opacity: pressed ? 0.68 : 1,
                      paddingHorizontal: 13,
                    })}
                  >
                    <Text
                      style={{
                        color: tokens.annotation.badgeText,
                        fontFamily: 'Inter-SemiBold',
                        fontSize: 12,
                        textTransform: 'capitalize',
                      }}
                    >
                      {`+ ${kind}`}
                    </Text>
                  </Pressable>
                ))}
              </>
            ) : null}
            {onRefresh ? (
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
                  minHeight: 44,
                  opacity: pressed || isRefreshing ? 0.68 : 1,
                  paddingHorizontal: 13,
                })}
              >
                {isRefreshing ? (
                  <ConstellationLoadingMark color={tokens.text.accent} />
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
        )}
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
