export const LIGHT_THEME = {
  background: {
    page: '#F8F4EC', // reconciled: was #F5F1EA (warm-neutral repalette)
    card: '#FFFFFF',
    sidebar: '#1E3226', // reconciled: was #3D5247 (deep emerald)
    input: '#F0EDE6',
    subtle: '#EAE7E0',
    goalCard: '#FCFAF4', // new: goal ring card surface
    selectedRow: '#EEF2EF',
  },
  text: {
    primary: '#211F1A', // reconciled: was #1A1F1C (warm ink)
    secondary: '#8A8172', // reconciled: was #6B7B6E (warm ink secondary)
    inverse: '#EDE7DA', // reconciled: was #E8EDE9 (on-dark / wordmark)
    accent: '#4A7C5F',
    muted: '#A79E8E', // reconciled: was #9CAF9F (warm ink muted)
    mutedOnDark: '#9C9483', // new: muted text on dark surfaces (checked hero)
  },
  border: {
    default: 'rgba(0,0,0,0.06)',
    subtle: 'rgba(0,0,0,0.04)',
    accent: '#4A7C5F',
    warm: '#EDE6D8', // new: warm border (cards / dividers)
    warmSubtle: '#EFE9DC', // new: warm border (goal ring card)
    input: '#D8D2C8',
    divider: '#E8E5DF',
    toggleGlyph: '#A8C4AE', // new: sidebar collapse/expand toggle chevron glyph
  },
  brt: {
    bud: '#4A7C5F',
    rose: '#F59E0B',
    thorn: '#EF4444',
  },
  accent: {
    primary: '#4A7C5F',
    teal: '#6FDFB8',
    tealSubtle: '#E8F5EF',
    tealMid: '#2F8F6D', // new: mid teal (today-ring, project dot, streak number)
    tealSoft: '#9FD9C4', // new: soft teal (mint labels on dark, filled streak ring)
  },
  feedback: {
    danger: '#C0483A', // new: overdue due-dates, destructive actions, error text
    pending: {
      bg: '#FFFBEB', // unconfirmed AI-suggestion banner (Echo links, Vault insights)
      border: '#FDE68A',
      text: '#B45309',
    },
  },
} as const;
