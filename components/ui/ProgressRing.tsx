import { View, Text } from 'react-native';

interface ProgressRingProps {
  progress: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
}

// Native fallback: simple bordered circle with percentage text
export function ProgressRing({ progress, size = 64, strokeWidth = 5, color = '#5FA8D3' }: ProgressRingProps) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: strokeWidth,
        borderColor: color,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ color, fontSize: size * 0.22, fontFamily: 'Inter-Bold' }}>
        {Math.round(progress)}%
      </Text>
    </View>
  );
}
