import type { ThemeColors } from '@/constants/colors';
import type {
  ConstellationBrtCategory,
  GraphEdgeValence,
} from './types.ts';

export type ConstellationAppearance = 'light' | 'dark';

export interface EdgeVisualToken {
  readonly color: string;
  readonly dash: string | undefined;
  readonly opacity: number;
}

export interface ConstellationVisualTokens {
  readonly appearance: ConstellationAppearance;
  readonly canvas: {
    readonly background: string;
    readonly backgroundDeep: string;
    readonly ambient: string;
    readonly orbit: string;
    readonly grain: string;
    readonly halo: Record<ConstellationBrtCategory | 'teal', string>;
  };
  readonly text: {
    readonly primary: string;
    readonly secondary: string;
    readonly muted: string;
    readonly inverse: string;
    readonly accent: string;
  };
  readonly node: {
    readonly seasonFill: string;
    readonly seasonStroke: string;
    readonly ambitionFill: string;
    readonly ambitionStroke: string;
    readonly goalFill: string;
    readonly goalStroke: string;
    readonly reflectionFill: string;
    readonly reflectionStroke: string;
    readonly traitFill: string;
    readonly traitStroke: string;
    readonly tensionStroke: string;
    readonly selection: string;
  };
  readonly annotation: {
    readonly fill: string;
    readonly stroke: string;
    readonly badgeFill: string;
    readonly badgeText: string;
  };
  readonly brt: Record<ConstellationBrtCategory, string>;
  readonly edge: Record<
    GraphEdgeValence
    | 'structural'
    | 'annotation'
    | 'evidence'
    | 'userLink',
    EdgeVisualToken
  >;
  readonly panel: {
    readonly background: string;
    readonly border: string;
  };
}

export function createConstellationVisualTokens(
  colors: ThemeColors,
  appearance: ConstellationAppearance,
): ConstellationVisualTokens {
  const dark = appearance === 'dark';

  return {
    appearance,
    canvas: {
      background: colors.background.page,
      backgroundDeep: dark ? colors.background.subtle : colors.background.card,
      ambient: colors.background.selectedRow,
      orbit: dark ? colors.border.input : colors.border.divider,
      grain: dark ? colors.text.mutedOnDark : colors.text.muted,
      halo: {
        bud: colors.brt.bud,
        rose: colors.brt.rose,
        thorn: colors.brt.thorn,
        teal: colors.accent.tealMid,
      },
    },
    text: {
      primary: colors.text.primary,
      secondary: colors.text.secondary,
      muted: colors.text.muted,
      inverse: colors.text.inverse,
      accent: colors.text.accent,
    },
    node: {
      seasonFill: dark ? colors.background.goalCard : colors.effects.shadow,
      seasonStroke: dark ? colors.accent.primary : colors.effects.shadow,
      ambitionFill: dark ? colors.background.selectedRow : colors.accent.primary,
      ambitionStroke: colors.accent.primary,
      goalFill: dark ? colors.background.goalCard : colors.background.card,
      goalStroke: colors.accent.primary,
      reflectionFill: dark ? colors.background.card : colors.background.goalCard,
      reflectionStroke: dark ? colors.text.secondary : colors.text.muted,
      traitFill: dark ? colors.accent.primary : colors.accent.primary,
      traitStroke: dark ? colors.accent.tealSoft : colors.accent.primary,
      tensionStroke: colors.brt.rose,
      selection: dark ? colors.accent.teal : colors.accent.tealMid,
    },
    annotation: {
      fill: dark ? colors.background.card : colors.background.goalCard,
      stroke: colors.accent.tealMid,
      badgeFill: dark ? colors.background.selectedRow : colors.accent.tealSubtle,
      badgeText: dark ? colors.accent.tealSoft : colors.accent.tealMid,
    },
    brt: {
      bud: colors.brt.bud,
      rose: colors.brt.rose,
      thorn: colors.brt.thorn,
    },
    edge: {
      positive: { color: colors.accent.primary, dash: undefined, opacity: dark ? 0.72 : 0.62 },
      negative: { color: colors.feedback.danger.text, dash: undefined, opacity: 0.68 },
      neutral: { color: colors.text.muted, dash: undefined, opacity: dark ? 0.42 : 0.3 },
      mixed: { color: colors.accent.primary, dash: undefined, opacity: 0.84 },
      contradictory: { color: colors.feedback.danger.text, dash: '7 6', opacity: 0.68 },
      structural: { color: colors.text.muted, dash: undefined, opacity: dark ? 0.3 : 0.24 },
      annotation: { color: colors.accent.tealMid, dash: '4 6', opacity: 0.74 },
      evidence: { color: colors.text.muted, dash: '3 5', opacity: 0.5 },
      userLink: { color: colors.accent.tealMid, dash: '9 5', opacity: 0.9 },
    },
    panel: {
      background: colors.background.card,
      border: colors.border.divider,
    },
  };
}
