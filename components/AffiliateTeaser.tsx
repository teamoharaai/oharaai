import { Text, View } from 'react-native';

export function AffiliateTeaser() {
  return (
    <View
      style={{
        backgroundColor: '#F0EDE6',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#DDD6CA',
        borderStyle: 'dashed',
        padding: 20,
        marginBottom: 12,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 12,
          marginBottom: 14,
        }}
      >
        <Text
          style={{
            fontSize: 11,
            fontFamily: 'Inter-Medium',
            color: '#6B7B6E',
            letterSpacing: 1.5,
            textTransform: 'uppercase',
            flex: 1,
          }}
        >
          YOUR JOURNEY
        </Text>

        <View
          style={{
            backgroundColor: 'rgba(61, 82, 71, 0.12)',
            borderRadius: 999,
            paddingHorizontal: 10,
            paddingVertical: 4,
          }}
        >
          <Text
            style={{
              fontSize: 11,
              fontFamily: 'Inter-SemiBold',
              color: '#3D5247',
            }}
          >
            Coming soon
          </Text>
        </View>
      </View>

      <Text
        style={{
          fontSize: 20,
          fontFamily: 'Inter-SemiBold',
          color: '#1A1F1C',
          marginBottom: 8,
        }}
      >
        Products & tools that moved the needle
      </Text>

      <Text
        style={{
          fontSize: 14,
          lineHeight: 21,
          color: '#6B7B6E',
        }}
      >
        As you make progress, resources that others used on this path will appear here.
      </Text>
    </View>
  );
}
