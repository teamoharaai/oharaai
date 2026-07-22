/**
 * Design tokens scoped to the focused Echo goal-creation experience.
 *
 * Theme colors should remain the default at call sites. These literals cover
 * the intentional dark-surface variations called for by the focused design.
 */
export const FocusedField = {
  surface: {
    card: '#1A1A1A',
    cardAlt: '#161616',
    input: '#1D1D1D',
    selectedTint: '#222A23',
  },
  border: {
    subtle: '#262626',
    input: '#2D2D2D',
  },
  text: {
    inverse: '#EDE7DA',
    secondary: '#B8B8B8',
    muted: '#8F8F8F',
    faint: '#6B6B6B',
  },
  accent: {
    primary: '#34B87A',
    onPrimary: '#0B0B0B',
  },
  radius: {
    card: 16,
    innerCard: 12,
  },
} as const;

export default FocusedField;
