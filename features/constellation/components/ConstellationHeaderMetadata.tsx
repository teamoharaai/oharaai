import {
  Pressable,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FeaturePageHeader } from '@/components/layout/FeaturePageHeader';
import { useThemeColors } from '@/store/uiStore';
import { CONSTELLATION_COPY } from '../copy';
import type {
  ConstellationAnnotationKind,
  ConstellationGraphCountsDTO,
} from '../types.ts';
import type { ConstellationVisualTokens } from '../visual-tokens.ts';
import { ConstellationActionMenu } from './ConstellationActionMenu';

interface ConstellationHeaderMetadataProps {
  counts: ConstellationGraphCountsDTO;
  canLinkGoals?: boolean;
  fixture?: boolean;
  focusLabel?: string | null;
  isLayoutBusy?: boolean;
  onCreateAnnotation?: (kind: ConstellationAnnotationKind) => void;
  onFitViewport?: () => void;
  onOpenGoalLinks?: () => void;
  onResetLayout?: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  refreshError?: string | null;
  seasonLabel: string;
  tokens: ConstellationVisualTokens;
}

export function ConstellationHeaderMetadata({
  counts,
  canLinkGoals = false,
  fixture = false,
  focusLabel,
  isLayoutBusy = false,
  onCreateAnnotation,
  onFitViewport,
  onOpenGoalLinks,
  onResetLayout,
  onZoomIn,
  onZoomOut,
  refreshError,
  seasonLabel,
  tokens,
}: ConstellationHeaderMetadataProps) {
  const colors = useThemeColors();
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
        paddingBottom: 17,
        paddingHorizontal: 24,
        paddingTop: 12,
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
        <FeaturePageHeader
          description={metadata}
          icon={
            <Ionicons
              color={colors.accent.primary}
              name="git-network-outline"
              size={22}
            />
          }
          style={{ flex: 1 }}
          title={focusLabel ? 'Constellation · Focus' : 'Constellation'}
        />
        <View
          style={{
            alignItems: 'center',
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 8,
          }}
        >
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
          {!fixture && onCreateAnnotation && onOpenGoalLinks ? (
              <ConstellationActionMenu
                canLinkGoals={canLinkGoals}
                onCreateAnnotation={onCreateAnnotation}
                onOpenGoalLinks={onOpenGoalLinks}
              />
          ) : null}
          {onResetLayout ? (
              <Pressable
                accessibilityLabel="Reset saved Constellation node positions"
                accessibilityRole="button"
                accessibilityState={{ disabled: isLayoutBusy }}
                disabled={isLayoutBusy}
                onPress={onResetLayout}
                style={({ pressed }) => ({
                  alignItems: 'center',
                  backgroundColor: tokens.panel.background,
                  borderColor: tokens.panel.border,
                  borderRadius: 10,
                  borderWidth: 1,
                  height: 44,
                  justifyContent: 'center',
                  opacity: isLayoutBusy ? 0.45 : pressed ? 0.68 : 1,
                  paddingHorizontal: compact ? 0 : 13,
                  width: compact ? 44 : undefined,
                })}
              >
                <Text
                  style={{
                    color: tokens.text.primary,
                    fontFamily: 'Inter-SemiBold',
                    fontSize: compact ? 18 : 12,
                  }}
                >
                  {compact ? '↺' : 'Reset layout'}
                </Text>
              </Pressable>
          ) : null}
          {onZoomOut ? (
              <Pressable
                accessibilityLabel="Zoom out of Constellation"
                accessibilityRole="button"
                onPress={onZoomOut}
                style={({ pressed }) => ({
                  alignItems: 'center',
                  backgroundColor: tokens.panel.background,
                  borderColor: tokens.panel.border,
                  borderRadius: 10,
                  borderWidth: 1,
                  height: 44,
                  justifyContent: 'center',
                  opacity: pressed ? 0.68 : 1,
                  width: 44,
                })}
              >
                <Text style={{
                  color: tokens.text.primary,
                  fontFamily: 'Inter-SemiBold',
                  fontSize: 22,
                }}>
                  −
                </Text>
              </Pressable>
          ) : null}
          {onFitViewport ? (
              <Pressable
                accessibilityLabel="Reset Constellation to fit"
                accessibilityRole="button"
                onPress={onFitViewport}
                style={({ pressed }) => ({
                  alignItems: 'center',
                  backgroundColor: tokens.panel.background,
                  borderColor: tokens.panel.border,
                  borderRadius: 10,
                  borderWidth: 1,
                  height: 44,
                  justifyContent: 'center',
                  opacity: pressed ? 0.68 : 1,
                  paddingHorizontal: compact ? 0 : 13,
                  width: compact ? 44 : undefined,
                })}
              >
                <Text style={{
                  color: tokens.text.primary,
                  fontFamily: 'Inter-SemiBold',
                  fontSize: 12,
                }}>
                  Fit
                </Text>
              </Pressable>
          ) : null}
          {onZoomIn ? (
              <Pressable
                accessibilityLabel="Zoom in to Constellation"
                accessibilityRole="button"
                onPress={onZoomIn}
                style={({ pressed }) => ({
                  alignItems: 'center',
                  backgroundColor: tokens.panel.background,
                  borderColor: tokens.panel.border,
                  borderRadius: 10,
                  borderWidth: 1,
                  height: 44,
                  justifyContent: 'center',
                  opacity: pressed ? 0.68 : 1,
                  width: 44,
                })}
              >
                <Text style={{
                  color: tokens.text.primary,
                  fontFamily: 'Inter-SemiBold',
                  fontSize: 22,
                }}>
                  +
                </Text>
              </Pressable>
          ) : null}
        </View>
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
