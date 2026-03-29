import { View, Text } from 'react-native';

interface ProgressRingProps {
  progress: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
}

// Web version: proper SVG arc ring with animated fill
export function ProgressRing({ progress, size = 64, strokeWidth = 5, color = '#5FA8D3' }: ProgressRingProps) {
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (Math.min(100, Math.max(0, progress)) / 100) * circumference;
  const center = size / 2;

  return (
    <View style={{ width: size, height: size }}>
      {/* @ts-ignore — SVG elements are valid in React Native Web */}
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        {/* @ts-ignore */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          stroke="#1E1E2E"
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* @ts-ignore */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          stroke={color}
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
        <Text style={{ color, fontSize: size * 0.22, fontWeight: '700' }}>
          {Math.round(progress)}%
        </Text>
      </View>
    </View>
  );
}
