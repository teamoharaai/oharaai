import { useMemo, useState } from 'react';
import { SafeAreaView, useWindowDimensions } from 'react-native';
import { DARK_THEME, LIGHT_THEME } from '@/constants/colors';
import {
  calculateConstellationLayout,
  calculateSproutedLabelLayout,
} from '../layout.ts';
import { createConstellationVisualTokens, type ConstellationAppearance } from '../visual-tokens.ts';
import { ConstellationCanvasShell } from '../components/ConstellationCanvasShell';
import {
  CONSTELLATION_RENDERER_INITIAL_SELECTION,
  constellationRendererFixtureGraph,
  constellationRendererFixtureLayoutSpec,
} from './renderer-fixture.dev.ts';

interface ConstellationFixturePreviewProps {
  appearance: ConstellationAppearance;
}

const fixtureLayout = calculateConstellationLayout(
  constellationRendererFixtureGraph,
  constellationRendererFixtureLayoutSpec,
);

export function ConstellationFixturePreview({
  appearance,
}: ConstellationFixturePreviewProps) {
  const { height } = useWindowDimensions();
  const [selectedKey, setSelectedKey] = useState<string | null>(
    CONSTELLATION_RENDERER_INITIAL_SELECTION,
  );
  const colors = appearance === 'dark' ? DARK_THEME : LIGHT_THEME;
  const tokens = useMemo(
    () => createConstellationVisualTokens(colors, appearance),
    [appearance, colors],
  );
  const sproutedLabel = useMemo(() => {
    const selected = constellationRendererFixtureGraph.nodes.find(
      (node) => node.selectionKey === selectedKey,
    );
    if (selected?.entityType !== 'earned_node' || selected.node.kind !== 'goal') {
      return null;
    }
    return calculateSproutedLabelLayout(fixtureLayout, selectedKey);
  }, [selectedKey]);

  return (
    <SafeAreaView
      style={{
        backgroundColor: tokens.canvas.background,
        flex: 1,
        minHeight: Math.max(height, 720),
      }}
    >
      <ConstellationCanvasShell
        fixture
        graph={constellationRendererFixtureGraph}
        layout={fixtureLayout}
        onSelect={(selectionKey) => {
          setSelectedKey((current) => current === selectionKey ? null : selectionKey);
        }}
        seasonLabel="Season 03"
        selectedKey={selectedKey}
        sproutedLabel={sproutedLabel}
        tokens={tokens}
      />
    </SafeAreaView>
  );
}
