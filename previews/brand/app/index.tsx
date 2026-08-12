import { useLocalSearchParams } from 'expo-router';
import { ScrollView, View } from 'react-native';
import type { ReactNode } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { BrandIcon, type BrandIconName } from '@/components/ui/BrandIcon';
import { Typography } from '@/components/ui/Typography';
import { DARK_THEME, LIGHT_THEME } from '@/constants/colors';

const FAMILY: ReadonlyArray<{ name: BrandIconName; label: string }> = [
  { name: 'ohara', label: 'OHARA' },
  { name: 'home', label: 'Home' },
  { name: 'goals', label: 'Goals' },
  { name: 'goal-mark', label: 'Goal mark' },
  { name: 'today', label: "Today's Focus" },
  { name: 'echo', label: 'Echo' },
  { name: 'echo-add-entry', label: 'Echo entry' },
  { name: 'momentum', label: 'Momentum' },
  { name: 'constellation', label: 'Constellation' },
  { name: 'project', label: 'Project' },
];
const SIZES = [16, 20, 24, 32, 48] as const;

function Surface({ children, color, border, style }: { children: ReactNode; color: string; border: string; style?: object }) {
  return <View style={[{ backgroundColor: color, borderColor: border, borderRadius: 20, borderWidth: 1, padding: 24 }, style]}>{children}</View>;
}

export default function BrandPreview() {
  const params = useLocalSearchParams<{ appearance?: string | string[] }>();
  const appearance = Array.isArray(params.appearance) ? params.appearance[0] : params.appearance;
  const dark = appearance === 'dark';
  const colors = dark ? DARK_THEME : LIGHT_THEME;
  const neutral = colors.text.secondary;

  return (
    <ScrollView style={{ backgroundColor: colors.background.page, flex: 1 }} contentContainerStyle={{ gap: 24, padding: 32 }}>
      <View style={{ gap: 8 }}>
        <Typography variant="greeting" style={{ color: colors.text.primary }}>Canonical logo system</Typography>
        <Typography variant="body" style={{ color: colors.text.secondary }}>
          {dark ? 'Dark' : 'Light'} appearance · semantic currentColor vectors · production asset mapping
        </Typography>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 24 }}>
        <Surface color={colors.background.sidebar} border={colors.border.divider} style={{ minWidth: 240 }}>
          <View style={{ alignItems: 'center', flexDirection: 'row', gap: 12, marginBottom: 24 }}>
            <BrandIcon color={colors.accent.primary} name="ohara" size={38} />
            <Typography variant="title" style={{ color: colors.text.primary, letterSpacing: 4 }}>OHARA</Typography>
          </View>
          {(['home', 'goals', 'echo', 'momentum', 'constellation'] as BrandIconName[]).map((name, index) => (
            <View key={name} style={{ alignItems: 'center', backgroundColor: index === 0 ? colors.background.selectedRow : 'transparent', borderRadius: 14, flexDirection: 'row', gap: 14, minHeight: 48, paddingHorizontal: 14 }}>
              <BrandIcon color={index === 0 ? colors.accent.primary : neutral} name={name} size={22} />
              <Typography variant="body" style={{ color: index === 0 ? colors.text.accent : colors.text.secondary, textTransform: 'capitalize' }}>{name}</Typography>
            </View>
          ))}
        </Surface>

        <View style={{ flex: 1, gap: 16, minWidth: 560 }}>
          <Surface color={colors.background.card} border={colors.border.divider}>
            <View style={{ alignItems: 'center', flexDirection: 'row', gap: 12 }}>
              <BrandIcon color={colors.accent.primary} name="momentum" size={24} />
              <Typography variant="heading" style={{ color: colors.text.primary }}>Momentum</Typography>
            </View>
            <Typography variant="body" style={{ color: colors.text.secondary, marginTop: 8 }}>Understand what is moving forward and where attention may help.</Typography>
          </Surface>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
            {([
              ['today', "TODAY'S FOCUS", 'Owner validation goal'],
              ['echo', 'ECHO', 'Reflect on today'],
              ['goals', 'GOALS', 'Your active goals'],
              ['project', 'PROJECTS', 'Connected work'],
            ] as const).map(([name, label, title]) => (
              <Surface key={name} color={colors.background.card} border={colors.border.divider} style={{ flex: 1, minHeight: 150, minWidth: 250 }}>
                <View style={{ alignItems: 'center', flexDirection: 'row', gap: 10 }}>
                  <BrandIcon color={colors.accent.primary} name={name} size={20} />
                  <Typography variant="eyebrow" style={{ color: colors.text.primary }}>{label}</Typography>
                </View>
                <Typography variant="title" style={{ color: colors.text.primary, marginTop: 28 }}>{title}</Typography>
              </Surface>
            ))}
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
            <Surface color={colors.background.card} border={colors.border.divider} style={{ flex: 1, minWidth: 270 }}>
              <Typography variant="eyebrow" style={{ color: colors.text.secondary, marginBottom: 18 }}>GLOBAL CREATE</Typography>
              {([
                ['echo-add-entry', 'New entry'], ['goals', 'New goal'], ['project', 'New project'],
              ] as const).map(([name, label]) => (
                <View key={name} style={{ alignItems: 'center', flexDirection: 'row', gap: 12, minHeight: 42 }}>
                  <BrandIcon color={colors.accent.primary} name={name} size={19} />
                  <Typography variant="body" style={{ color: colors.text.primary }}>{label}</Typography>
                </View>
              ))}
            </Surface>
            <Surface color={colors.background.selectedRow} border={colors.border.accent} style={{ flex: 1.3, minWidth: 340 }}>
              <View style={{ alignItems: 'center', flexDirection: 'row', gap: 12 }}>
                <Ionicons color={colors.accent.primary} name="sparkles-outline" size={24} />
                <Typography variant="title" style={{ color: colors.text.primary }}>Ohara Intelligence</Typography>
              </View>
              <Typography variant="body" style={{ color: colors.text.secondary, marginTop: 16 }}>Contextual insight grounded in your linked goals and entries.</Typography>
            </Surface>
          </View>
        </View>
      </View>

      <Surface color={colors.background.card} border={colors.border.divider}>
        <Typography variant="section-header" style={{ color: colors.text.primary, marginBottom: 24 }}>Complete family and optical sizes</Typography>
        <View style={{ gap: 10 }}>
          {FAMILY.map(({ name, label }) => (
            <View key={name} style={{ alignItems: 'center', borderBottomColor: colors.border.subtle, borderBottomWidth: 1, flexDirection: 'row', minHeight: 70, paddingVertical: 8 }}>
              <Typography variant="body" style={{ color: colors.text.primary, width: 150 }}>{label}</Typography>
              <View style={{ alignItems: 'center', flex: 1, flexDirection: 'row', justifyContent: 'space-around' }}>
                {SIZES.map((size) => <BrandIcon color={colors.accent.primary} key={size} name={name} size={size} />)}
              </View>
            </View>
          ))}
        </View>
      </Surface>
    </ScrollView>
  );
}
