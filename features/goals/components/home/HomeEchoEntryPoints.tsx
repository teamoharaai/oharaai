import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { BrandIcon } from '@/components/ui/BrandIcon';
import { Card } from '@/components/ui/Card';
import { Typography } from '@/components/ui/Typography';
import { useWorkspaceDimensions } from '@/components/layout/WorkspaceContext';
import { RADIUS, SPACE } from '@/constants/design';
import { useThemeColors } from '@/store/uiStore';

/** Entry points only: no library fetch, AI generation, or editor mounted on Home. */
export function HomeEchoEntryPoints() {
  const colors = useThemeColors();
  const { width } = useWorkspaceDimensions();
  const compact = width < 760;
  return <Card accessibilityLabel="Notes and reflection shortcuts" elevation="none" padding="spacious">
    <View style={{ alignItems: compact ? 'stretch' : 'center', flexDirection: compact ? 'column' : 'row', gap: SPACE.xl }}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ alignItems: 'center', flexDirection: 'row', gap: SPACE.sm }}>
          <BrandIcon name="echo" size={18} color={colors.text.accent} />
          <Typography variant="eyebrow">A little room to think</Typography>
        </View>
        <Typography variant="body-small" style={{ marginTop: SPACE.sm }}>Capture an idea, or reflect on your day.</Typography>
      </View>
      <View style={{ flexDirection: compact ? 'column' : 'row', gap: SPACE.md }}>
        {([{ label: 'New note', icon: 'notes', copy: 'Keep an idea close.', href: '/notes', create: 'note' },
          { label: 'Write a reflection', icon: 'reflections', copy: 'Make space in your Reflections.', href: '/journal', create: 'new' }] as const).map((item) =>
          <Pressable key={item.label} accessibilityRole="link" accessibilityLabel={item.label}
            onPress={() => router.push({ pathname: item.href, params: { create: item.create } })}
            style={({ hovered, pressed }) => ({ alignItems: 'center', backgroundColor: hovered || pressed ? colors.background.selectedRow : colors.background.subtle, borderRadius: RADIUS.md, flexDirection: 'row', gap: SPACE.md, minHeight: 66, paddingHorizontal: SPACE.lg, paddingVertical: SPACE.md })}>
            <BrandIcon name={item.icon} size={22} color={colors.text.accent} />
            <View style={{ flexShrink: 1 }}>
              <Typography variant="emphasis-sm" style={{ color: colors.text.accent }}>{item.label} →</Typography>
              <Typography variant="caption" style={{ marginTop: SPACE.xs }}>{item.copy}</Typography>
            </View>
          </Pressable>)}
      </View>
    </View>
  </Card>;
}
