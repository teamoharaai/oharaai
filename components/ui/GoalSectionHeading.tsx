import type { ReactNode } from 'react';
import { Typography } from './Typography';
import { FONT, TYPE } from '@/constants/design';
import { useThemeColors } from '@/store/uiStore';

/** Major Goal sections, deliberately stronger than muted micro-labels. */
export function GoalSectionHeading({ children }: { children: ReactNode }) {
  const colors = useThemeColors();
  return <Typography accessibilityRole="header" variant="section-header" style={{
    ...TYPE.sectionTitle, fontFamily: FONT.ui.semibold, color: colors.text.accent,
    letterSpacing: 1, textTransform: 'uppercase',
  }}>{children}</Typography>;
}
