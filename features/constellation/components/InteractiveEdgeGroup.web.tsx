import type { ReactNode } from 'react';

export function InteractiveEdgeGroup({
  children,
  linkId,
  onActivate,
}: {
  children: ReactNode;
  linkId: string;
  onActivate: () => void;
}) {
  return (
    <g
      data-constellation-goal-link={linkId}
      onClick={onActivate}
      style={{ cursor: 'pointer' }}
    >
      {children}
    </g>
  );
}
