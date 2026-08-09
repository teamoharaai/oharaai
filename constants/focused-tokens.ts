/**
 * Design tokens scoped to the focused Echo goal-creation experience.
 *
 * Theme colors should remain the default at call sites. These literals cover
 * the intentional dark-surface variations called for by the focused design.
 */
export const FocusedField = {
  surface: {
    card: '#111A1F',
    cardAlt: '#0E171C',
    input: '#152126',
    selectedTint: '#182820',
  },
  border: {
    subtle: '#263238',
    input: '#2A383D',
  },
  text: {
    inverse: '#EDE7DA',
    secondary: '#C2C9C5',
    muted: '#8F9A95',
    faint: '#687570',
  },
  accent: {
    primary: '#69D56F',
    onPrimary: '#07100B',
  },
  radius: {
    card: 16,
    innerCard: 12,
  },
} as const;

export default FocusedField;
