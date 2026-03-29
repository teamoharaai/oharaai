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
