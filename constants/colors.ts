export interface ThemeColors {
  readonly background: {
    readonly page: string;
    readonly card: string;
    readonly sidebar: string;
    readonly input: string;
    readonly subtle: string;
    readonly goalCard: string;
    readonly selectedRow: string;
  };
  readonly text: {
    readonly primary: string;
    readonly secondary: string;
    readonly inverse: string;
    readonly accent: string;
    readonly muted: string;
    readonly mutedOnDark: string;
  };
  readonly border: {
    readonly default: string;
    readonly subtle: string;
    readonly accent: string;
    readonly warm: string;
    readonly warmSubtle: string;
    readonly input: string;
    readonly divider: string;
    readonly toggleGlyph: string;
  };
  readonly brt: {
    readonly bud: string;
    readonly rose: string;
    readonly thorn: string;
  };
  readonly accent: {
    readonly primary: string;
    readonly teal: string;
    readonly tealSubtle: string;
    readonly tealMid: string;
    readonly tealSoft: string;
  };
  readonly feedback: {
    readonly danger: FeedbackColors;
    readonly pending: FeedbackColors;
    readonly info: FeedbackColors;
  };
}

interface FeedbackColors {
  readonly text: string;
  readonly bg: string;
  readonly border: string;
}

export type ThemeTextColor = keyof ThemeColors['text'];

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
    danger: {
      text: '#C0483A', // overdue due-dates, destructive actions, error text
      bg: '#FCECEA', // soft error-banner background (Echo composer unconfirmed notice)
      border: '#F0B8AE', // soft error-banner border
    },
    pending: {
      bg: '#FFFBEB', // unconfirmed AI-suggestion banner (Echo links, Vault insights)
      border: '#FDE68A',
      text: '#B45309',
    },
    info: {
      bg: '#F8F5EF', // neutral info banner (Echo composer saved-without-summary notice)
      border: '#E4DDCB',
      text: '#5F6B66',
    },
  },
} as const satisfies ThemeColors;

export const DARK_THEME = {
  background: {
    page: '#111111',
    card: '#1A1A1A',
    sidebar: '#172019', // derived, no Figma dark token
    input: '#101010', // derived, no Figma dark token
    subtle: '#0D0D0D', // derived, no Figma dark token
    goalCard: '#121212', // derived, no Figma dark token
    selectedRow: '#101010', // derived, no Figma dark token
  },
  text: {
    primary: '#FFFFFF',
    secondary: '#B8B8B8',
    inverse: '#F1F0ED', // derived, no Figma dark token
    accent: '#8FAE8A', // derived, no Figma dark token
    muted: '#A3A3A3', // derived, no Figma dark token
    mutedOnDark: '#8F8F8F', // derived, no Figma dark token
  },
  border: {
    default: 'rgba(255,255,255,0.06)', // derived, no Figma dark token
    subtle: 'rgba(255,255,255,0.04)', // derived, no Figma dark token
    accent: '#8FAE8A', // derived, no Figma dark token
    warm: '#292929', // derived, no Figma dark token
    warmSubtle: '#313131', // derived, no Figma dark token
    input: '#202020', // derived, no Figma dark token
    divider: '#2D2D2D',
    toggleGlyph: '#272D29', // derived, no Figma dark token
  },
  brt: {
    bud: '#8FAE8A',
    rose: '#F8B950', // derived, no Figma dark token
    thorn: '#F48181', // derived, no Figma dark token
  },
  accent: {
    primary: '#8FAE8A',
    teal: '#88E5C4', // derived, no Figma dark token
    tealSubtle: '#FAFDFB', // derived, no Figma dark token
    tealMid: '#38AA81', // derived, no Figma dark token
    tealSoft: '#B5E2D1', // derived, no Figma dark token
  },
  feedback: {
    danger: {
      text: '#D3796E', // derived, no Figma dark token
      bg: '#2B1613', // derived, no Figma dark token
      border: '#5C3129', // derived, no Figma dark token
    },
    pending: {
      bg: '#29230F', // derived, no Figma dark token
      border: '#FEF3C6', // derived, no Figma dark token
      text: '#F37311', // derived, no Figma dark token
    },
    info: {
      bg: '#1D1F1C', // derived, no Figma dark token
      border: '#33362F', // derived, no Figma dark token
      text: '#B8BDB4', // derived, no Figma dark token
    },
  },
} as const satisfies ThemeColors;
