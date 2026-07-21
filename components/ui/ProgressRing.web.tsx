import { View, Text } from 'react-native';
import { useThemeColors } from '@/store/uiStore';

interface ProgressRingProps {
  progress: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  // 'default' keeps the legacy dark track + stroke-matched percentage text.
  // 'warm' opts into the dashboard redesign: warm-neutral track + ink percentage.
  variant?: 'default' | 'warm';
}

// Web version: proper SVG arc ring with animated fill
export function ProgressRing({ progress, size = 64, strokeWidth = 5, color, variant = 'default' }: ProgressRingProps) {
  const colors = useThemeColors();
  const resolvedColor = color ?? colors.accent.primary;
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (Math.min(100, Math.max(0, progress)) / 100) * circumference;
  const center = size / 2;
  const trackColor = variant === 'warm' ? colors.border.warm : colors.border.divider;
  const textColor = variant === 'warm' ? colors.text.primary : resolvedColor;

  return (
    <View style={{ width: size, height: size }}>
      {/* @ts-ignore — SVG elements are valid in React Native Web */}
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        {/* @ts-ignore */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* @ts-ignore */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          stroke={resolvedColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
      </svg>
      <View
        style={{
          position: 'absolute',
          width: size,
          height: size,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ color: textColor, fontSize: size * 0.22, fontFamily: 'Inter-Bold' }}>
          {Math.round(progress)}%
        </Text>
      </View>
    </View>
  );
}
