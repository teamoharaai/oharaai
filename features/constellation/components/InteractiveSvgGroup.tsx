import { G } from 'react-native-svg';
import type { ReactNode } from 'react';

export function InteractiveSvgGroup({
  children,
  onActivate,
}: {
  children: ReactNode;
  onActivate: () => void;
}) {
  return <G onPress={onActivate}>{children}</G>;
}
