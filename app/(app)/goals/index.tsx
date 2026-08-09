import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { AuthenticatedPageShell } from '@/components/layout/AuthenticatedPageShell';
import { FeaturePageHeader } from '@/components/layout/FeaturePageHeader';
import { BrandIcon } from '@/components/ui/BrandIcon';
import { Card } from '@/components/ui/Card';
import { Typography } from '@/components/ui/Typography';
import { RADIUS, SPACE } from '@/constants/design';
import { useThemeColors } from '@/store/uiStore';

export default function GoalsComingSoonScreen() {
  const colors = useThemeColors();

  return (
    <AuthenticatedPageShell>
      <View style={{ gap: SPACE['4xl'], minWidth: 0 }}>
        <FeaturePageHeader
          description="A more complete place to understand your goals, their progress, and how they connect across OHARA is on the way."
          icon={
            <BrandIcon name="goals" size={22} tintColor={colors.accent.primary} />
          }
          title="Goals"
        />

        <Card elevation="md" padding="spacious" style={{ borderWidth: 0, maxWidth: 760 }}>
          <View style={{ gap: SPACE.xl }}>
            <View style={{ gap: SPACE.sm }}>
              <Typography variant="eyebrow" style={{ color: colors.text.accent }}>
                GOALS
              </Typography>
              <Typography variant="heading" style={{ fontSize: 24, fontWeight: '600', lineHeight: 32 }}>
                Coming soon.
              </Typography>
            </View>
            <Pressable
              accessibilityLabel="Create a goal"
              accessibilityRole="button"
              onPress={() => router.push('/goals/create')}
              style={({ pressed }) => ({
                alignItems: 'center',
                alignSelf: 'flex-start',
                backgroundColor: colors.background.selectedRow,
                borderColor: colors.border.subtle,
                borderRadius: RADIUS.round,
                borderWidth: 1,
                flexDirection: 'row',
                minHeight: 44,
                opacity: pressed ? 0.68 : 1,
                paddingHorizontal: SPACE.xl,
              })}
            >
              <Typography variant="emphasis-sm" style={{ color: colors.text.accent }}>
                + Create a Goal
              </Typography>
            </Pressable>
          </View>
        </Card>
      </View>
    </AuthenticatedPageShell>
  );
}
