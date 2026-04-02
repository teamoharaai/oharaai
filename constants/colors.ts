export const COLORS = {
  cream: '#FAF9F6',
  nearBlack: '#1A1A1A',
  earthGreen: '#4A7C59',
  amber: '#D4A574',
  cardBg: '#F0EFEB',
  muted: '#6B6B6B',
  border: '#E8E5DF',
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
    page: '#F5F1EA',
    card: '#FFFFFF',
    sidebar: '#3D5247',
    input: '#F0EDE6',
    subtle: '#EAE7E0',
  },
  text: {
    primary: '#1A1F1C',
    secondary: '#6B7B6E',
    inverse: '#E8EDE9',
    accent: '#4A7C5F',
    muted: '#9CAF9F',
  },
  border: {
    default: 'rgba(0,0,0,0.06)',
    subtle: 'rgba(0,0,0,0.04)',
    accent: '#4A7C5F',
  },
  accent: {
    primary: '#4A7C5F',
    teal: '#6FDFB8',
    tealSubtle: '#E8F5EF',
  },
} as const;
