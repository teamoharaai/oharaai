import {
  buildProjectInsightFacts,
  selectContextualInsight,
  type ProjectFactInput,
} from '../intelligence/contextual-insights.ts';
import type { ProjectMode } from './types.ts';

export type ProjectInsightGoal = ProjectFactInput['goals'][number];
export type ProjectInsightTask = ProjectFactInput['tasks'][number];
export type ProjectInsightMilestone = ProjectFactInput['milestones'][number];

export type ProjectIntelligenceInput = Omit<ProjectFactInput, 'projectId' | 'activity'> & {
  projectId?: string;
  mode?: ProjectMode;
  activity?: ProjectFactInput['activity'];
};

export type ProjectInsight = {
  primary: string;
  secondary: string | null;
  kind: string;
  subtitle: 'Project insight';
};

/**
 * Compatibility adapter for the Project surface. It routes structured facts,
 * contextual
 * ranking, and presentation remain separate in the shared deterministic engine.
 */
export function buildProjectIntelligence(input: ProjectIntelligenceInput): ProjectInsight {
  const context = input.mode === 'team'
    ? 'project_team'
    : input.mode === 'guide'
      ? 'project_guide'
      : 'project_personal';
  const insight = selectContextualInsight(buildProjectInsightFacts({
    ...input,
    projectId: input.projectId ?? 'project',
    activity: input.activity ?? [],
  }), context);
  return {
    primary: insight.primary,
    secondary: insight.secondary,
    kind: insight.kind,
    subtitle: 'Project insight',
  };
}
