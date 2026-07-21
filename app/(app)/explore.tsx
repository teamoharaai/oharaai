import { View, Text, SafeAreaView } from 'react-native';
import { Typography } from '@/components/ui/Typography';
import { useThemeColors } from '@/store/uiStore';

export default function ExploreScreen() {
  const colors = useThemeColors();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background.page }}>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 }}>
        <Text
          style={{
            fontFamily: 'Inter-SemiBold',
            fontSize: 22,
            color: colors.text.primary,
            textAlign: 'center',
            marginBottom: 12,
          }}
        >
          Explore is coming
        </Text>
        <Typography
          variant="description"
          style={{
            textAlign: 'center',
            maxWidth: 280,
          }}
        >
          Discover goals, patterns, and insights from the Ohara community. Launching in a future phase.
        </Typography>
      </View>
    </SafeAreaView>
  );
}
