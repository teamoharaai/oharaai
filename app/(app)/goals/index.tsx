import { View } from 'react-native';
import { router, type ErrorBoundaryProps } from 'expo-router';
import { Button } from '@/components/ui/Button';
import { Typography } from '@/components/ui/Typography';
import { SPACE } from '@/constants/design';
import { GoalsWorkspace } from '@/features/goals/components/GoalsWorkspace';
import { useThemeColors } from '@/store/uiStore';

export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  const colors = useThemeColors();
  return <View accessibilityRole="alert" style={{ alignItems: 'center', backgroundColor: colors.background.page, flex: 1, gap: SPACE.lg, justifyContent: 'center', padding: SPACE['3xl'] }}>
    <Typography accessibilityRole="header" variant="heading">This Goal couldn’t open.</Typography>
    <Typography variant="body" style={{ maxWidth: 520, textAlign: 'center' }}>The rest of OHARA is still available. Retry this Goal or return to Projects.</Typography>
    {__DEV__ ? <Typography variant="caption">{error.message}</Typography> : null}
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.md }}><Button onPress={retry}>Retry Goal</Button><Button variant="secondary" onPress={() => router.replace('/(app)/projects')}>Back to Projects</Button></View>
  </View>;
}

export default function GoalsScreen() {
  return <GoalsWorkspace />;
}
