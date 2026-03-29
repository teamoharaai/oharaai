import { View, Text } from 'react-native';
import type { ReactNode } from 'react';

interface HeaderProps {
  title: string;
  rightAction?: ReactNode;
}

export function Header({ title, rightAction }: HeaderProps) {
  return (
    <View className="flex-row items-center justify-between py-3">
      <Text className="text-xl font-bold text-near-black">{title}</Text>
      {rightAction}
    </View>
  );
}
