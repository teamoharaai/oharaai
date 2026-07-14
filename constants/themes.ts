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

export const CATEGORY_COLOR_THEME: Record<string, GoalTheme> = {
  body: 'ember',
  mind: 'lavender',
  money: 'slate',
  create: 'sunset',
  connect: 'coral',
  contribute: 'forest',
};
