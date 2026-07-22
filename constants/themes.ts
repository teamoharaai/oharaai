import type { GoalCategory, GoalCreationCategory } from '@/lib/goals/schema';

export const GOAL_THEMES = {
  ocean: { gradient: ['#0A2342', '#1B4965', '#5FA8D3'], accent: '#5FA8D3' },
  sunset: { gradient: ['#6B2737', '#D4A373', '#FEFAE0'], accent: '#D4A373' },
  forest: { gradient: ['#1B4332', '#2D6A4F', '#52B788'], accent: '#52B788' },
  lavender: { gradient: ['#2B2D42', '#8D99AE', '#D6BCFA'], accent: '#D6BCFA' },
  ember: { gradient: ['#3D0814', '#9D0208', '#E85D04'], accent: '#E85D04' },
  mint: { gradient: ['#0B3D2E', '#1B7A5A', '#6FDFB8'], accent: '#6FDFB8' },
  slate: { gradient: ['#1E293B', '#475569', '#94A3B8'], accent: '#94A3B8' },
  coral: { gradient: ['#4A1942', '#C84B6B', '#FF8A80'], accent: '#FF8A80' },
} as const;

export type GoalTheme = keyof typeof GOAL_THEMES;

export const CATEGORY_COLOR_THEME: Record<GoalCategory, GoalTheme> = {
  body: 'ember',
  mind: 'lavender',
  money: 'slate',
  create: 'sunset',
  connect: 'coral',
  contribute: 'forest',
  health: 'mint',
  finance: 'ocean',
  career: 'ember',
  creative: 'lavender',
  education: 'mint',
  relationships: 'coral',
  growth: 'sunset',
};

export type CategoryAccentTheme = {
  color: string;
  mid: string;
  tint: string;
  shadow: string;
  pageBg: string;
};

export const CATEGORY_ACCENT_THEME: Record<GoalCreationCategory, CategoryAccentTheme> = {
  health: {
    color: '#34B87A',
    mid: '#2A9564',
    tint: '#E5F4EC',
    shadow: 'rgba(52,184,122,.28)',
    pageBg: '#F8F4EC',
  },
  finance: {
    color: '#3B82C4',
    mid: '#2E6BA5',
    tint: '#E6EFF7',
    shadow: 'rgba(59,130,196,.28)',
    pageBg: '#F5F3EE',
  },
  career: {
    color: '#E8853D',
    mid: '#C86D28',
    tint: '#FBEDDF',
    shadow: 'rgba(232,133,61,.28)',
    pageBg: '#F8F4EC',
  },
  creative: {
    color: '#9B5DE5',
    mid: '#7C43C4',
    tint: '#F0E7FA',
    shadow: 'rgba(155,93,229,.28)',
    pageBg: '#F6F2EC',
  },
  education: {
    color: '#2CAAA1',
    mid: '#218C85',
    tint: '#E1F1EF',
    shadow: 'rgba(44,170,161,.28)',
    pageBg: '#F5F4EE',
  },
  relationships: {
    color: '#E85D75',
    mid: '#C7455F',
    tint: '#FCE6EC',
    shadow: 'rgba(232,93,117,.28)',
    pageBg: '#F7F2EC',
  },
  growth: {
    color: '#D4A843',
    mid: '#B4892E',
    tint: '#F6EBD3',
    shadow: 'rgba(212,168,67,.32)',
    pageBg: '#F7F3EC',
  },
};
