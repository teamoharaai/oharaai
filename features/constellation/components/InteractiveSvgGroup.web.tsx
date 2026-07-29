import type { ReactNode } from 'react';

export function InteractiveSvgGroup({
  children,
  onActivate,
  selectionKey,
}: {
  children: ReactNode;
  onActivate: () => void;
  selectionKey: string;
}) {
  return (
    <g
      data-constellation-node={selectionKey}
      onClick={onActivate}
      style={{ cursor: 'grab' }}
    >
      {children}
    </g>
  );
}
