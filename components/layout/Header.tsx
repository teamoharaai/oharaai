import { View, Text } from 'react-native';
import type { ReactNode } from 'react';

interface HeaderProps {
  title: string;
  rightAction?: ReactNode;
}

export function Header({ title, rightAction }: HeaderProps) {
  return (
    <View className="flex-row items-center justify-between py-3">
      <Text className="text-xl text-near-black" style={{ fontFamily: 'Inter-Bold' }}>{title}</Text>
      {rightAction}
    </View>
  );
}
