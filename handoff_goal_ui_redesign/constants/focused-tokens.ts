/**
 * Focused Field — design tokens for the redesigned Echo Goal Creation flow.
 *
 * Copy to: constants/focused-tokens.ts
 *
 * These are the exact literals used in the design prototype. They map onto
 * `DARK_THEME` in constants/colors.ts wherever a token already exists; the
 * few dark-surface variants here (`surfaceCardAlt`, `surfaceInput`) are the
 * prototype's derived shades and are safe to add as dark-only tokens if you
 * prefer a single source of truth.
 *
 * Prefer `useThemeColors()` at the callsite; use these constants only when
 * (a) rendering an element the theme has no token for, or (b) the design
 * calls for a specific shade that intentionally differs from the theme
 * default (e.g. the nested card variant #161616).
 */

export const FocusedField = {
  surface: {
    page:         '#141414',
    sidebar:      '#0E0E0E',
    card:         '#1A1A1A',
    cardAlt:      '#161616', // nested / secondary card variant
    input:        '#1D1D1D',
    selectedTint: '#222A23', // green-tinted "selected" surface
  },
  border: {
    warm:     '#292929',
    divider:  '#232323',
    input:    '#2D2D2D',
    subtle:   '#262626',
    faint:    '#3A3A3A',
  },
  text: {
    primary:   '#FFFFFF',
    inverse:   '#EDE7DA', // Echo body copy on dark
    secondary: '#B8B8B8',
    muted:     '#8F8F8F',
    faint:     '#6B6B6B',
    onAccent:  '#0B0B0B',
  },
  accent: {
    primary:   '#34B87A', // health category green (matches getCategoryAccentTheme('health').color)
    mid:       '#2A9564',
    tint:      '#222A23',
    softText:  '#8FBFA1',
    focusGlow: '0 0 8px #34B87A',
  },
  radius: {
    button:      10,
    chip:        999,
    card:        16,
    innerCard:   12,
    composer:    14,
  },
  shadow: {
    card:      '0 24px 60px rgba(0,0,0,.35), 0 2px 10px rgba(0,0,0,.2)',
    selected:  '0 12px 32px rgba(52,184,122,.14), 0 2px 10px rgba(0,0,0,.4)',
    button:    '0 4px 14px rgba(52,184,122,.24)',
    glow:      '0 0 0 6px rgba(52,184,122,.08), 0 0 40px rgba(52,184,122,.24)',
  },
  font: {
    serif: 'Lora, Georgia, serif',
    sans:  'Inter, system-ui, sans-serif',
  },
  type: {
    heroDisplay:  { fontFamily: 'Lora', fontSize: 52, lineHeight: 55, fontWeight: '600', letterSpacing: -0.9 },
    heroBody:     { fontFamily: 'Lora', fontSize: 44, lineHeight: 48, fontWeight: '600', letterSpacing: -0.7 },
    sectionTitle: { fontFamily: 'Lora', fontSize: 32, lineHeight: 36, fontWeight: '600', letterSpacing: -0.5 },
    echoTurnLg:   { fontFamily: 'Lora', fontSize: 22, lineHeight: 30, fontWeight: '500' },
    echoTurn:     { fontFamily: 'Lora', fontSize: 16, lineHeight: 24 },
    echoTurnSm:   { fontFamily: 'Lora', fontSize: 15.5, lineHeight: 24 },
    cardTitle:    { fontFamily: 'Lora', fontSize: 15, lineHeight: 18, fontWeight: '600', letterSpacing: -0.2 },
    cardSubtitle: { fontFamily: 'Lora', fontSize: 11.5, lineHeight: 17, fontStyle: 'italic' },
    userTurn:     { fontFamily: 'Inter', fontSize: 13.5, lineHeight: 20 },
    metaRow:      { fontFamily: 'Inter', fontSize: 11.5, lineHeight: 15 },
    label:        { fontFamily: 'Inter', fontSize: 10, letterSpacing: 1.8, fontWeight: '600' as const, textTransform: 'uppercase' as const },
    labelSm:      { fontFamily: 'Inter', fontSize: 9,  letterSpacing: 1.5, fontWeight: '700' as const, textTransform: 'uppercase' as const },
  },
  space: {
    xs: 4, sm: 8, md: 12, lg: 18, xl: 24, xxl: 32,
  },
} as const;

export type FocusedFieldTokens = typeof FocusedField;
