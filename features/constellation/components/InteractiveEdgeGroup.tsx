import { G } from 'react-native-svg';
import type { ReactNode } from 'react';

export function InteractiveEdgeGroup({
  children,
  onActivate,
}: {
  children: ReactNode;
  linkId: string;
  onActivate: () => void;
}) {
  return <G onPress={onActivate}>{children}</G>;
}
