import type { ReactNode } from 'react';

export function InteractiveSvgGroup({
  children,
  onActivate,
}: {
  children: ReactNode;
  onActivate: () => void;
}) {
  return <g onClick={onActivate}>{children}</g>;
}
