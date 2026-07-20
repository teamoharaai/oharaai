import { useMemo, useState } from 'react';
import { Pressable, Text, View, useWindowDimensions } from 'react-native';
import { useThemeColors } from '@/store/uiStore';

export type RecommendationFilter = 'all' | 'gear' | 'apps' | 'recovery';
export type RecommendationCategory = Exclude<RecommendationFilter, 'all'>;

export interface RecommendedProduct {
  id: string;
  category: RecommendationCategory;
  kicker: string;
  name: string;
  description: string;
  price: string;
  priceSuffix?: string;
}

export interface RecommendedPanelProps {
  products?: readonly RecommendedProduct[];
  title?: string;
  description?: string;
  disclosure?: string;
}

const PLACEHOLDER_PRODUCTS: readonly RecommendedProduct[] = [
  {
    id: 'stability-shoe-preview',
    category: 'gear',
    kicker: 'Gear · Stability shoe',
    name: 'Brooks Adrenaline GTS 23',
    description:
      "Firmer heel counter and guide-rail support — directly targets the ankle roll you've been feeling.",
    price: '$140',
  },
  {
    id: 'adaptive-plan-preview',
    category: 'apps',
    kicker: 'App · Training plan',
    name: 'Runna — 5K Adaptive Plan',
    description:
      'Syncs with your training data and re-plans each week around your pace. Includes prehab mobility sessions.',
    price: '$18',
    priceSuffix: '/mo',
  },
  {
    id: 'mobility-kit-preview',
    category: 'recovery',
    kicker: 'Recovery · Mobility',
    name: 'TheraBand Ankle Mobility Kit',
    description:
      'Resistance bands plus a guided ankle and calf routine — five minutes before every run.',
    price: '$25',
  },
];

const FILTERS: readonly { id: RecommendationFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'gear', label: 'Gear' },
  { id: 'apps', label: 'Apps & plans' },
  { id: 'recovery', label: 'Recovery' },
];

function placeholderGlyph(category: RecommendationCategory): string {
  if (category === 'gear') return '◇';
  if (category === 'apps') return '▦';
  return '✦';
}

export function RecommendedPanel({
  products = PLACEHOLDER_PRODUCTS,
  title = "Editor's picks for the ankle work ahead",
  description =
    'Chosen from what worked for runners with this pattern — tied to the ankle discomfort in the example insight.',
  disclosure = 'Curated · placeholder recommendations',
}: RecommendedPanelProps) {
  const colors = useThemeColors();
  const { width } = useWindowDimensions();
  const [filter, setFilter] = useState<RecommendationFilter>('all');
  const compact = width < 540;
  const visibleProducts = useMemo(
    () => products.filter((product) => filter === 'all' || product.category === filter),
    [filter, products],
  );

  function categoryColor(category: RecommendationCategory): string {
    if (category === 'gear') return colors.brt.rose;
    if (category === 'apps') return colors.text.accent;
    return colors.accent.tealMid;
  }

  return (
    <View
      accessibilityLabel="Recommended for you. Placeholder recommendations only."
      style={{
        backgroundColor: colors.background.goalCard,
        borderColor: colors.border.warm,
        borderRadius: 20,
        borderWidth: 1,
        paddingHorizontal: compact ? 18 : 26,
        paddingVertical: 24,
      }}
    >
      <View
        style={{
          alignItems: 'flex-start',
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 12,
          justifyContent: 'space-between',
          marginBottom: 4,
        }}
      >
        <View style={{ flexGrow: 1, flexShrink: 1, minWidth: compact ? '100%' : 220 }}>
          <Text
            style={{
              color: colors.text.secondary,
              fontFamily: 'Inter-SemiBold',
              fontSize: 11,
              letterSpacing: 1.5,
              textTransform: 'uppercase',
            }}
          >
            Recommended for you
          </Text>
          <Text
            style={{
              color: colors.text.primary,
              fontFamily: 'Lora-Regular',
              fontSize: 19,
              marginTop: 3,
            }}
          >
            {title}
          </Text>
        </View>
        <View
          style={{
            backgroundColor: colors.background.selectedRow,
            borderRadius: 999,
            paddingHorizontal: 10,
            paddingVertical: 4,
          }}
        >
          <Text
            style={{
              color: colors.text.primary,
              fontFamily: 'Inter-SemiBold',
              fontSize: 10.5,
            }}
          >
            {disclosure}
          </Text>
        </View>
      </View>

      <Text
        style={{
          color: colors.text.muted,
          fontFamily: 'Inter-Regular',
          fontSize: 13,
          lineHeight: 20,
          marginBottom: 16,
          maxWidth: 560,
        }}
      >
        {description}
      </Text>

      <View
        accessibilityLabel="Recommendation filters"
        accessibilityRole="tablist"
        style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 18 }}
      >
        {FILTERS.map((item) => {
          const selected = item.id === filter;
          return (
            <Pressable
              key={item.id}
              accessibilityLabel={`Show ${item.label} recommendations`}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              onPress={() => setFilter(item.id)}
              style={({ pressed }) => ({
                backgroundColor: selected ? colors.background.sidebar : colors.background.card,
                borderColor: selected ? colors.background.sidebar : colors.border.divider,
                borderRadius: 999,
                borderWidth: 1,
                opacity: pressed ? 0.78 : 1,
                paddingHorizontal: 15,
                paddingVertical: 7,
              })}
            >
              <Text
                style={{
                  color: selected ? colors.text.inverse : colors.text.secondary,
                  fontFamily: 'Inter-Medium',
                  fontSize: 12,
                }}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}>
        {visibleProducts.map((product) => {
          const accentColor = categoryColor(product.category);
          return (
            <View
              key={product.id}
              accessible
              accessibilityLabel={`${product.kicker}. ${product.name}. ${product.description}. Placeholder only; no purchase action is available.`}
              style={{
                backgroundColor: colors.background.card,
                borderColor: colors.border.warm,
                borderRadius: 16,
                borderWidth: 1,
                flexBasis: compact ? '100%' : 200,
                flexGrow: 1,
                minWidth: compact ? '100%' : 200,
                padding: 14,
              }}
            >
              <View
                style={{
                  alignItems: 'center',
                  backgroundColor: colors.background.input,
                  borderColor: colors.border.input,
                  borderRadius: 12,
                  borderStyle: 'dashed',
                  borderWidth: 1,
                  height: 128,
                  justifyContent: 'center',
                  marginBottom: 14,
                }}
              >
                <View
                  style={{
                    alignItems: 'center',
                    backgroundColor: colors.background.card,
                    borderRadius: 999,
                    height: 42,
                    justifyContent: 'center',
                    marginBottom: 8,
                    width: 42,
                  }}
                >
                  <Text style={{ color: accentColor, fontSize: 20 }}>
                    {placeholderGlyph(product.category)}
                  </Text>
                </View>
                <Text
                  style={{
                    color: colors.text.muted,
                    fontFamily: 'Inter-Medium',
                    fontSize: 11,
                  }}
                >
                  Product image placeholder
                </Text>
              </View>

              <Text
                style={{
                  color: accentColor,
                  fontFamily: 'Inter-SemiBold',
                  fontSize: 10,
                  letterSpacing: 1,
                  textTransform: 'uppercase',
                }}
              >
                {product.kicker}
              </Text>
              <Text
                style={{
                  color: colors.text.primary,
                  fontFamily: 'Lora-Regular',
                  fontSize: 16.5,
                  marginBottom: 5,
                  marginTop: 3,
                }}
              >
                {product.name}
              </Text>
              <Text
                style={{
                  color: colors.text.secondary,
                  flexGrow: 1,
                  fontFamily: 'Inter-Regular',
                  fontSize: 12.5,
                  lineHeight: 18,
                }}
              >
                {product.description}
              </Text>

              <View
                style={{
                  alignItems: 'center',
                  flexDirection: 'row',
                  gap: 10,
                  justifyContent: 'space-between',
                  marginTop: 14,
                }}
              >
                <Text
                  style={{
                    color: colors.text.primary,
                    fontFamily: 'Inter-Bold',
                    fontSize: 16,
                  }}
                >
                  {product.price}
                  {product.priceSuffix ? (
                    <Text
                      style={{
                        color: colors.text.muted,
                        fontFamily: 'Inter-Medium',
                        fontSize: 11,
                      }}
                    >
                      {product.priceSuffix}
                    </Text>
                  ) : null}
                </Text>
                <View
                  accessibilityLabel="Preview recommendation; details are not available yet"
                  style={{
                    backgroundColor: colors.background.sidebar,
                    borderRadius: 9,
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                  }}
                >
                  <Text
                    style={{
                      color: colors.text.inverse,
                      fontFamily: 'Inter-SemiBold',
                      fontSize: 12,
                    }}
                  >
                    Preview
                  </Text>
                </View>
              </View>
            </View>
          );
        })}
      </View>

      {visibleProducts.length === 0 ? (
        <View
          style={{
            alignItems: 'center',
            backgroundColor: colors.background.card,
            borderColor: colors.border.warm,
            borderRadius: 12,
            borderWidth: 1,
            paddingHorizontal: 20,
            paddingVertical: 28,
          }}
        >
          <Text
            style={{
              color: colors.text.muted,
              fontFamily: 'Inter-Regular',
              fontSize: 13,
              textAlign: 'center',
            }}
          >
            No placeholder recommendations in this category yet.
          </Text>
        </View>
      ) : null}
    </View>
  );
}
