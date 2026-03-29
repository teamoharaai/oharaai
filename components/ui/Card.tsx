import { View } from 'react-native';
import type { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  accentColor?: string;
  style?: object;
}

export function Card({ children, accentColor, style }: CardProps) {
  return (
    <View
      className="bg-dark-card rounded-xl border border-dark-border"
      style={[
        accentColor ? { borderLeftWidth: 3, borderLeftColor: accentColor } : undefined,
        style,
      ]}
    >
      {children}
    </View>
  );
}
