import { View, Text } from 'react-native';
import { useThemeColors } from '@/store/uiStore';

interface ProgressRingProps {
  progress: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  // 'default' keeps stroke-matched percentage text; 'warm' uses ink text to
  // match the dashboard redesign treatment.
  variant?: 'default' | 'warm';
}

// Native fallback: simple bordered circle with percentage text
export function ProgressRing({ progress, size = 64, strokeWidth = 5, color = '#5FA8D3', variant = 'default' }: ProgressRingProps) {
  const colors = useThemeColors();
  const textColor = variant === 'warm' ? colors.text.primary : color;
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
      <Text style={{ color: textColor, fontSize: size * 0.22, fontFamily: 'Inter-Bold' }}>
        {Math.round(progress)}%
      </Text>
    </View>
  );
}
