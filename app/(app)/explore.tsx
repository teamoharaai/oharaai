import { View, Text, SafeAreaView } from 'react-native';

export default function ExploreScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F5F1EA' }}>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 }}>
        <Text
          style={{
            fontFamily: 'Inter-SemiBold',
            fontSize: 22,
            color: '#1A1F1C',
            textAlign: 'center',
            marginBottom: 12,
          }}
        >
          Explore is coming
        </Text>
        <Text
          style={{
            fontFamily: 'Inter-Regular',
            fontSize: 14,
            lineHeight: 21,
            color: '#6B7B6E',
            textAlign: 'center',
            maxWidth: 280,
          }}
        >
          Discover goals, patterns, and insights from the Ohara community. Launching in a future phase.
        </Text>
      </View>
    </SafeAreaView>
  );
}
