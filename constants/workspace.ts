import { DARK_THEME, LIGHT_THEME, type ThemeColors } from './colors.ts';

/** Web workspace-only theme overlays. Marketing and native retain their tokens. */
export const WORKSPACE_LIGHT: ThemeColors = {
  ...LIGHT_THEME,
  background: { ...LIGHT_THEME.background, sidebar: '#F1F3EF', input: '#FFFFFF', selectedRow: '#E6EDE6', hoverAccent: '#EDF1EB' },
  text: { ...LIGHT_THEME.text, accent: '#315743', onAccent: '#FFFFFF', muted: '#6B716C' },
  accent: { ...LIGHT_THEME.accent, primary: '#315743', primaryHover: '#234434' },
  border: { ...LIGHT_THEME.border, accent: '#315743', input: '#C3CBC3', default: '#E1E6DE', subtle: '#E8ECE5', toggleGlyph: '#53675A' },
};

export const WORKSPACE_DARK: ThemeColors = {
  ...DARK_THEME,
  background: { ...DARK_THEME.background, page: '#191D1B', card: '#222724', goalCard: '#222724', sidebar: '#1D221F', input: '#272D29', subtle: '#202622', selectedRow: '#2D3D32', hoverAccent: '#29372E' },
  text: { ...DARK_THEME.text, primary: '#F1F4EF', secondary: '#B1BAB3', muted: '#A0ABA3', accent: '#A6D1B1', onAccent: '#17291F' },
  accent: { ...DARK_THEME.accent, primary: '#A6D1B1', primaryHover: '#B7DDC1' },
  border: { ...DARK_THEME.border, accent: '#A6D1B1', input: '#68796D', default: '#38423B', subtle: '#303A33', divider: '#38423B', toggleGlyph: '#A0ABA3' },
};

export const WORKSPACE = {
  sidebar: { expanded: 232, collapsed: 76, desktopMin: 1100 },
  headerHeight: 64,
  spacing: { pageCompact: 16, page: 32, section: 32, card: 24, controlGap: 8 },
  radius: { control: 8, card: 16, dialog: 20 },
  typography: {
    page: { fontFamily: 'Lora-Regular', fontSize: 32, lineHeight: 42, letterSpacing: -0.8 },
    pageCompact: { fontFamily: 'Lora-Regular', fontSize: 28, lineHeight: 36, letterSpacing: -0.6 },
    editorial: { fontFamily: 'Lora-Regular', fontSize: 24, lineHeight: 34 },
  },
  chart: { lineWidth: 2, pointRadius: 4, gridOpacity: 0.12, labelSize: 11, tooltipRadius: 8 },
} as const;
