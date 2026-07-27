export const CONSTELLATION_GOAL_ACCESS_GATE = 3;
export const CONSTELLATION_ECHO_ACCESS_GATE = 10;

export interface DashboardSummary {
  goalCount: number;
  echoCount: number;
}

export interface ConstellationGateSuccess {
  summary: DashboardSummary;
  accessEligible: boolean;
  hasGraphData: null;
}

function isCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

export function parseDashboardSummary(value: unknown): DashboardSummary | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return null;
  }

  const summary = value as Record<string, unknown>;
  if (!isCount(summary.goalCount) || !isCount(summary.echoCount)) {
    return null;
  }

  return {
    goalCount: summary.goalCount,
    echoCount: summary.echoCount,
  };
}

export function toConstellationGateSuccess(
  summary: DashboardSummary,
): ConstellationGateSuccess {
  return {
    summary,
    accessEligible:
      summary.goalCount >= CONSTELLATION_GOAL_ACCESS_GATE
      && summary.echoCount >= CONSTELLATION_ECHO_ACCESS_GATE,
    // Dashboard activity counts are an onboarding gate only. They do not say
    // whether any earned graph entity has qualified for display.
    hasGraphData: null,
  };
}
