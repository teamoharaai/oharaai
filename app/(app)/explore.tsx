import { View, Text, SafeAreaView } from 'react-native';
import { Typography } from '@/components/ui/Typography';

export default function ExploreScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8F4EC' }}>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 }}>
        <Text
          style={{
            fontFamily: 'Inter-SemiBold',
            fontSize: 22,
            color: '#211F1A',
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
