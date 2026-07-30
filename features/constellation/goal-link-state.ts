import type {
  ConstellationGoalLink,
  ConstellationGraphDTO,
  UserGoalLinkGraphEdge,
} from './types';

function edgeFromGoalLink(
  link: ConstellationGoalLink,
): UserGoalLinkGraphEdge {
  return {
    id: `goal-link:${link.id}`,
    linkId: link.id,
    from: { entityType: 'earned_node', id: link.sourceGoalId },
    to: { entityType: 'earned_node', id: link.targetGoalId },
    kind: 'user_goal_link',
    valence: null,
    weight: null,
    isPersisted: true,
    authorship: 'user',
    note: link.note,
    createdAt: link.createdAt,
    updatedAt: link.updatedAt,
  };
}

function hasVisibleGoal(dto: ConstellationGraphDTO, goalId: string): boolean {
  return dto.earnedNodes.some(
    (node) => node.kind === 'goal' && node.id === goalId,
  );
}

export function addGoalLinkToGraph(
  dto: ConstellationGraphDTO,
  link: ConstellationGoalLink,
): ConstellationGraphDTO {
  if (
    !hasVisibleGoal(dto, link.sourceGoalId)
    || !hasVisibleGoal(dto, link.targetGoalId)
    || dto.edges.some(
      (edge) => edge.kind === 'user_goal_link' && edge.linkId === link.id,
    )
  ) {
    return dto;
  }
  return {
    ...dto,
    state: {
      ...dto.state,
      hasGraphData: true,
      renderState: 'graph',
    },
    edges: [...dto.edges, edgeFromGoalLink(link)],
    counts: {
      ...dto.counts,
      edges: dto.counts.edges + 1,
      goalLinks: dto.counts.goalLinks + 1,
    },
  };
}

export function replaceGoalLinkInGraph(
  dto: ConstellationGraphDTO,
  currentLinkId: string,
  link: ConstellationGoalLink,
): ConstellationGraphDTO {
  const edgeIndex = dto.edges.findIndex(
    (edge) =>
      edge.kind === 'user_goal_link'
      && edge.linkId === currentLinkId,
  );
  if (edgeIndex === -1) return addGoalLinkToGraph(dto, link);
  const edges = [...dto.edges];
  edges[edgeIndex] = edgeFromGoalLink(link);
  return { ...dto, edges };
}

export function removeGoalLinkFromGraph(
  dto: ConstellationGraphDTO,
  goalLinkId: string,
): ConstellationGraphDTO {
  const edges = dto.edges.filter(
    (edge) =>
      edge.kind !== 'user_goal_link'
      || edge.linkId !== goalLinkId,
  );
  if (edges.length === dto.edges.length) return dto;
  return {
    ...dto,
    edges,
    counts: {
      ...dto.counts,
      edges: Math.max(0, dto.counts.edges - 1),
      goalLinks: Math.max(0, dto.counts.goalLinks - 1),
    },
  };
}
