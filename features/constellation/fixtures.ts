import type {
  ConstellationBrtCategory,
  ConstellationEvidenceLink,
  ConstellationGraphDTO,
} from './types.ts';

/**
 * Deterministic development and automated-test fixtures only.
 * Production code must obtain a real owner-scoped DTO and must never use these
 * values as an empty-state or fetch-failure fallback.
 */
export const CONSTELLATION_FIXTURE_OWNER_ID = 'fixture-owner';

// Links carry brtCategory here even though ConstellationEvidenceLink no
// longer does — these fixtures feed evidence-state.test.ts's item() helper,
// which composes them into full ConstellationGoalEvidenceItem values.
type FixtureEvidenceLink = ConstellationEvidenceLink & {
  brtCategory: ConstellationBrtCategory;
};

export const constellationFixtureEvidenceLinks: readonly FixtureEvidenceLink[] = [
  {
    id: 'fixture-evidence-bud',
    ownerId: CONSTELLATION_FIXTURE_OWNER_ID,
    echoEntryId: 'fixture-echo-1',
    goalId: 'fixture-goal-source',
    brtCategory: 'bud',
    note: null,
    createdAt: '2026-07-01T12:00:00.000Z',
    updatedAt: '2026-07-01T12:00:00.000Z',
  },
  {
    id: 'fixture-evidence-rose',
    ownerId: CONSTELLATION_FIXTURE_OWNER_ID,
    echoEntryId: 'fixture-echo-2',
    goalId: 'fixture-goal-source',
    brtCategory: 'rose',
    note: 'A deterministic fixture note.',
    createdAt: '2026-07-03T12:00:00.000Z',
    updatedAt: '2026-07-03T12:00:00.000Z',
  },
];

export const constellationFixtureGraph: ConstellationGraphDTO = {
  version: '1.0',
  state: {
    hasGraphData: true,
    renderState: 'graph',
    phase: 'initial_read_only',
    dataOrigin: 'real',
    generatedAt: '2026-07-04T12:00:00.000Z',
    dataAsOf: '2026-07-04T12:00:00.000Z',
    seasonNodeId: 'fixture-season',
  },
  earnedNodes: [
    {
      id: 'fixture-season',
      selectionKey: 'node:fixture-season',
      kind: 'season',
      label: 'Current Season',
      description: null,
      authorship: 'system',
      isEarned: true,
      source: { type: 'season', id: null },
      visibilityScore: null,
      firstSeenAt: '2026-07-01T00:00:00.000Z',
      lastActivityAt: '2026-07-04T12:00:00.000Z',
    },
    {
      id: 'fixture-goal',
      selectionKey: 'node:fixture-goal',
      kind: 'goal',
      label: 'Practice deliberately',
      description: 'A deterministic fixture goal.',
      authorship: 'system',
      isEarned: true,
      source: {
        type: 'goal',
        id: 'fixture-goal-source',
        goalStatus: 'active',
        category: 'growth',
      },
      visibilityScore: 6,
      firstSeenAt: '2026-07-01T00:00:00.000Z',
      lastActivityAt: '2026-07-04T12:00:00.000Z',
    },
  ],
  virtualGoalCategories: [
    {
      id: 'goal-category:growth',
      selectionKey: 'goal-category:growth',
      category: 'growth',
      label: 'Personal Growth',
      symbol: '❋',
      goalCount: 1,
      isVirtual: true,
      isPersisted: false,
    },
  ],
  annotations: [
    {
      id: 'fixture-note',
      selectionKey: 'annotation:fixture-note',
      kind: 'note',
      status: 'draft',
      authorship: 'user',
      isDraft: true,
      label: 'Fixture note',
      body: null,
      anchorEarnedNodeId: null,
      anchorGoalId: 'fixture-goal',
      createdAt: '2026-07-04T12:00:00.000Z',
      updatedAt: '2026-07-04T12:00:00.000Z',
      archivedAt: null,
    },
  ],
  virtualBrtClusters: [
    {
      id: 'brt:fixture-goal-source:bud',
      selectionKey: 'brt:fixture-goal-source:bud',
      goalId: 'fixture-goal-source',
      goalNodeId: 'fixture-goal',
      brtCategory: 'bud',
      label: 'Bud',
      entryCount: 1,
      latestEvidenceAt: '2026-07-01T12:00:00.000Z',
      isVirtual: true,
      isPersisted: false,
    },
  ],
  edges: [
    {
      id: 'fixture-season-goal',
      from: { entityType: 'earned_node', id: 'fixture-season' },
      to: { entityType: 'earned_node', id: 'fixture-goal' },
      kind: 'season_membership',
      valence: null,
      weight: null,
      isPersisted: false,
    },
    {
      id: 'fixture-category-goal',
      from: {
        entityType: 'virtual_goal_category',
        id: 'goal-category:growth',
      },
      to: { entityType: 'earned_node', id: 'fixture-goal' },
      kind: 'goal_category_membership',
      valence: null,
      weight: null,
      isPersisted: false,
    },
    {
      id: 'fixture-goal-bud',
      from: { entityType: 'earned_node', id: 'fixture-goal' },
      to: { entityType: 'virtual_brt_cluster', id: 'brt:fixture-goal-source:bud' },
      kind: 'goal_evidence_cluster',
      valence: null,
      weight: null,
      isPersisted: false,
    },
  ],
  counts: {
    earnedNodes: {
      total: 2,
      byKind: {
        season: 1,
        ambition: 0,
        goal: 1,
        reflection: 0,
        trait: 0,
        tension: 0,
      },
    },
    annotations: { draft: 1, archived: 0 },
    virtualBrtClusters: { total: 1, bud: 1, rose: 0, thorn: 0 },
    virtualGoalCategories: 1,
    edges: 3,
    evidenceLinks: 2,
    goalLinks: 0,
    source: {
      echoEntries: 2,
      qualifiedCandidates: 0,
      goalsByStatus: {
        active: 1,
        draft: 0,
        complete: 0,
        stagnant: 0,
        discovered: 0,
        archived: 0,
      },
    },
  },
};
