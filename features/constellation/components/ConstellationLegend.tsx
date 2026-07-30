import { Pressable, Text, View } from 'react-native';
import { useUIStore } from '@/store/uiStore';
import type { ConstellationVisualTokens } from '../visual-tokens.ts';

interface ConstellationLegendProps {
  tokens: ConstellationVisualTokens;
}

interface ShapeSwatchProps {
  kind:
    | 'season'
    | 'ambition'
    | 'goal'
    | 'category'
    | 'reflection'
    | 'trait'
    | 'tension'
    | 'annotation'
    | 'evidence';
  tokens: ConstellationVisualTokens;
}

function ShapeSwatch({ kind, tokens }: ShapeSwatchProps) {
  const common = { height: 18, width: 18 };

  switch (kind) {
    case 'season':
      return <View style={{ ...common, backgroundColor: tokens.node.seasonFill, borderRadius: 9 }} />;
    case 'ambition':
      return <View style={{ backgroundColor: tokens.node.ambitionFill, borderRadius: 4, height: 13, width: 22 }} />;
    case 'goal':
      return (
        <View
          style={{
            ...common,
            backgroundColor: tokens.node.goalFill,
            borderColor: tokens.node.goalStroke,
            borderRadius: 9,
            borderWidth: 1.5,
          }}
        />
      );
    case 'category':
      return (
        <View
          style={{
            alignItems: 'center',
            borderColor: tokens.node.goalStroke,
            borderRadius: 9,
            borderWidth: 1,
            height: 18,
            justifyContent: 'center',
            width: 18,
          }}
        >
          <Text style={{ color: tokens.node.goalStroke, fontSize: 10 }}>✦</Text>
        </View>
      );
    case 'reflection':
      return (
        <View
          style={{
            ...common,
            backgroundColor: tokens.node.reflectionFill,
            borderColor: tokens.node.reflectionStroke,
            borderRadius: 9,
            borderWidth: 1.5,
          }}
        />
      );
    case 'trait':
      return (
        <View
          style={{
            ...common,
            backgroundColor: tokens.node.traitFill,
            borderRadius: 5,
          }}
        />
      );
    case 'tension':
      return (
        <View style={{ height: 18, position: 'relative', width: 26 }}>
          <View
            style={{
              borderColor: tokens.node.tensionStroke,
              borderRadius: 9,
              borderWidth: 1.5,
              height: 18,
              left: 1,
              position: 'absolute',
              width: 18,
            }}
          />
          <View
            style={{
              borderColor: tokens.node.tensionStroke,
              borderRadius: 9,
              borderWidth: 1.5,
              height: 18,
              position: 'absolute',
              right: 1,
              width: 18,
            }}
          />
        </View>
      );
    case 'annotation':
      return (
        <View
          style={{
            ...common,
            backgroundColor: tokens.annotation.fill,
            borderColor: tokens.annotation.stroke,
            borderRadius: 9,
            borderStyle: 'dashed',
            borderWidth: 1.5,
          }}
        />
      );
    case 'evidence':
      return (
        <View
          style={{
            alignItems: 'center',
            borderColor: tokens.brt.bud,
            borderRadius: 9,
            borderWidth: 1,
            height: 18,
            justifyContent: 'center',
            width: 18,
          }}
        >
          <Text style={{ color: tokens.brt.bud, fontSize: 9 }}>B</Text>
        </View>
      );
  }
}

function LegendRow({
  kind,
  label,
  tokens,
}: ShapeSwatchProps & { label: string }) {
  return (
    <View style={{ alignItems: 'center', flexDirection: 'row', gap: 10 }}>
      <View style={{ alignItems: 'center', justifyContent: 'center', width: 28 }}>
        <ShapeSwatch kind={kind} tokens={tokens} />
      </View>
      <Text style={{ color: tokens.text.secondary, fontFamily: 'Inter-Regular', fontSize: 12 }}>
        {label}
      </Text>
    </View>
  );
}

function EdgeSample({
  color,
  dashed = false,
  label,
  tokens,
}: {
  color: string;
  dashed?: boolean;
  label: string;
  tokens: ConstellationVisualTokens;
}) {
  return (
    <View style={{ alignItems: 'center', flexDirection: 'row', gap: 10 }}>
      <View
        style={{
          borderColor: color,
          borderStyle: dashed ? 'dashed' : 'solid',
          borderTopWidth: 2,
          width: 28,
        }}
      />
      <Text style={{ color: tokens.text.secondary, fontFamily: 'Inter-Regular', fontSize: 12 }}>
        {label}
      </Text>
    </View>
  );
}

export function ConstellationLegend({ tokens }: ConstellationLegendProps) {
  const collapsed = useUIStore(
    (state) => state.constellationLegendCollapsed,
  );
  const toggleCollapsed = useUIStore(
    (state) => state.toggleConstellationLegendCollapsed,
  );

  return (
    <View
      accessibilityLabel="Constellation legend"
      style={{
        backgroundColor: tokens.panel.background,
        borderColor: tokens.panel.border,
        borderRadius: 14,
        borderWidth: 1,
        bottom: 18,
        gap: collapsed ? 0 : 8,
        left: 18,
        paddingHorizontal: collapsed ? 10 : 16,
        paddingVertical: collapsed ? 6 : 10,
        position: 'absolute',
        width: collapsed ? 118 : 226,
      }}
    >
      <Pressable
        accessibilityLabel={collapsed
          ? 'Expand Constellation legend'
          : 'Collapse Constellation legend'}
        accessibilityRole="button"
        accessibilityState={{ expanded: !collapsed }}
        aria-expanded={!collapsed}
        onPress={toggleCollapsed}
        style={({ pressed }) => ({
          alignItems: 'center',
          flexDirection: 'row',
          height: 32,
          justifyContent: 'space-between',
          opacity: pressed ? 0.7 : 1,
        })}
      >
        <Text
          style={{
            color: tokens.text.primary,
            fontFamily: 'Inter-SemiBold',
            fontSize: 11,
            letterSpacing: 1.4,
            textTransform: 'uppercase',
          }}
        >
          Legend
        </Text>
        <Text style={{ color: tokens.text.muted, fontSize: 15 }}>
          {collapsed ? '▸' : '▾'}
        </Text>
      </Pressable>
      {!collapsed ? (
        <>
          <LegendRow kind="season" label="Season" tokens={tokens} />
          <LegendRow kind="ambition" label="Ambition" tokens={tokens} />
          <LegendRow kind="category" label="Goal category" tokens={tokens} />
          <LegendRow kind="goal" label="Goal planet" tokens={tokens} />
          <LegendRow kind="reflection" label="Reflection" tokens={tokens} />
          <LegendRow kind="trait" label="Trait" tokens={tokens} />
          <LegendRow kind="tension" label="Tension" tokens={tokens} />
          <LegendRow kind="annotation" label="User-authored draft" tokens={tokens} />
          <LegendRow kind="evidence" label="Goal BRT moon" tokens={tokens} />
          <View style={{ backgroundColor: tokens.panel.border, height: 1, marginVertical: 2 }} />
          <EdgeSample color={tokens.edge.positive.color} label="Positive" tokens={tokens} />
          <EdgeSample color={tokens.edge.contradictory.color} dashed label="Contradictory" tokens={tokens} />
          <EdgeSample color={tokens.edge.annotation.color} dashed label="Draft / goal Entry" tokens={tokens} />
          <EdgeSample color={tokens.edge.userLink.color} dashed label="User goal link" tokens={tokens} />
        </>
      ) : null}
    </View>
  );
}
