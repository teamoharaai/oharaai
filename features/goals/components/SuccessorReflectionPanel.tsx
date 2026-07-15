import { Text, View } from 'react-native';

interface SuccessorReflectionPanelProps {
  reflection: string;
  reflectedAt: Date | null;
}

function formatReflectionDate(value: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(value);
}

/** A read-only reflection recorded when the continuation phase was created. */
export function SuccessorReflectionPanel({
  reflection,
  reflectedAt,
}: SuccessorReflectionPanelProps) {
  return (
    <View
      style={{
        backgroundColor: '#F6F0E4',
        borderColor: '#E7DEC9',
        borderRadius: 16,
        borderWidth: 1,
        marginBottom: 12,
        paddingHorizontal: 20,
        paddingVertical: 20,
      }}
    >
      <Text
        style={{
          color: '#9A8A6E',
          fontFamily: 'Inter-SemiBold',
          fontSize: 10.5,
          letterSpacing: 1.5,
          marginBottom: 8,
          textTransform: 'uppercase',
        }}
      >
        Reflection from the next phase
      </Text>
      <Text
        style={{
          color: '#5A5142',
          fontFamily: 'Lora-Italic',
          fontSize: 15,
          lineHeight: 24,
        }}
      >
        “{reflection}”
      </Text>
      {reflectedAt ? (
        <Text
          style={{
            color: '#9A8A6E',
            fontFamily: 'Inter-Regular',
            fontSize: 11.5,
            marginTop: 8,
          }}
        >
          — reflected {formatReflectionDate(reflectedAt)}
        </Text>
      ) : null}
    </View>
  );
}
