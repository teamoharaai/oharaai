export const COLORS = {
  cream: '#FAF9F6',
  nearBlack: '#1A1A1A',
  earthGreen: '#4A7C59',
  amber: '#D4A574',
  cardBg: '#F0EFEB',
  muted: '#6B6B6B',
  border: '#E8E5DF',
} as const;

export const STATUS = {
  pending: {
    bg: '#FFFBEB',
    border: '#FDE68A',
    text: '#B45309',
  },
  error: {
    bg: '#FEF3C7',
    border: '#FCD34D',
    text: '#92400E',
  },
} as const;

export const THEME = {
  light: {
    text: '#000',
    background: '#fff',
    tint: '#2f95dc',
    tabIconDefault: '#ccc',
    tabIconSelected: '#2f95dc',
  },
  dark: {
    text: '#fff',
    background: '#000',
    tint: '#fff',
    tabIconDefault: '#ccc',
    tabIconSelected: '#fff',
  },
} as const;

export const LIGHT_THEME = {
  background: {
    page: '#F8F4EC', // reconciled: was #F5F1EA (warm-neutral repalette)
    card: '#FFFFFF',
    sidebar: '#1E3226', // reconciled: was #3D5247 (deep emerald)
    input: '#F0EDE6',
    subtle: '#EAE7E0',
    goalCard: '#FCFAF4', // new: goal ring card surface
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
  },
  accent: {
    primary: '#4A7C5F',
    teal: '#6FDFB8',
    tealSubtle: '#E8F5EF',
    tealMid: '#2F8F6D', // new: mid teal (today-ring, project dot, streak number)
    tealSoft: '#9FD9C4', // new: soft teal (mint labels on dark, filled streak ring)
  },
} as const;
