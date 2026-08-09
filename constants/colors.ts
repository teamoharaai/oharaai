export interface ThemeColors {
  readonly background: {
    readonly page: string;
    readonly card: string;
    readonly sidebar: string;
    readonly input: string;
    readonly subtle: string;
    readonly goalCard: string;
    readonly selectedRow: string;
    readonly hoverAccent: string;
  };
  readonly text: {
    readonly primary: string;
    readonly secondary: string;
    readonly inverse: string;
    readonly onAccent: string;
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
  readonly effects: {
    readonly overlay: string;
    readonly shadow: string;
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
    page: '#F8F8F6',
    card: '#FFFFFF',
    sidebar: '#F1F3EF',
    input: '#F3F4F1',
    subtle: '#F5F6F3',
    goalCard: '#FFFFFF',
    selectedRow: 'rgba(42,127,80,0.12)',
    hoverAccent: 'rgba(42,127,80,0.18)',
  },
  text: {
    primary: '#1C1C1E',
    secondary: '#6E6E73',
    inverse: '#EDE7DA', // reconciled: was #E8EDE9 (on-dark / wordmark)
    onAccent: '#EDE7DA', // high-contrast text on accent.primary
    accent: '#2A7F50',
    muted: '#8E8E93',
    mutedOnDark: '#9C9483', // new: muted text on dark surfaces (checked hero)
  },
  border: {
    default: 'rgba(0,0,0,0.06)',
    subtle: 'rgba(0,0,0,0.04)',
    accent: '#2A7F50',
    warm: '#E5E5EA',
    warmSubtle: 'rgba(15,23,42,0.06)',
    input: '#E5E5EA',
    divider: '#E5E5EA',
    toggleGlyph: '#A8C4AE', // new: sidebar collapse/expand toggle chevron glyph
  },
  brt: {
    bud: '#5B8C6F',
    rose: '#F59E0B',
    thorn: '#EF4444',
  },
  accent: {
    primary: '#2A7F50',
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
  effects: {
    overlay: 'rgba(36,35,31,0.24)',
    shadow: '#163A34',
  },
} as const satisfies ThemeColors;

export const DARK_THEME = {
  background: {
    page: '#111111',
    card: '#1C1C1E',
    sidebar: '#161719',
    input: '#242426',
    subtle: '#18191B',
    goalCard: '#1C1C1E',
    selectedRow: 'rgba(88,199,123,0.14)',
    hoverAccent: 'rgba(88,199,123,0.18)',
  },
  text: {
    primary: '#F5F5F7',
    secondary: '#A1A1A6',
    inverse: '#F1F0ED', // derived, no Figma dark token
    onAccent: '#111111', // high-contrast text on accent.primary
    accent: '#58C77B',
    muted: '#8E8E93',
    mutedOnDark: '#737378',
  },
  border: {
    default: 'rgba(255,255,255,0.06)', // derived, no Figma dark token
    subtle: 'rgba(255,255,255,0.04)', // derived, no Figma dark token
    accent: '#58C77B',
    warm: '#2C2C2E',
    warmSubtle: 'rgba(255,255,255,0.06)',
    input: '#38383A',
    divider: '#2C2C2E',
    toggleGlyph: '#33463C',
  },
  brt: {
    bud: '#7FAF8C',
    rose: '#F8B950', // derived, no Figma dark token
    thorn: '#F48181', // derived, no Figma dark token
  },
  accent: {
    primary: '#58C77B',
    teal: '#7BE0B4',
    tealSubtle: '#FAFDFB', // derived, no Figma dark token
    tealMid: '#55C983',
    tealSoft: '#A6DFB5',
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
  effects: {
    overlay: 'rgba(0,0,0,0.48)',
    shadow: '#000000',
  },
} as const satisfies ThemeColors;
