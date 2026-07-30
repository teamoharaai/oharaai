import type { ComponentProps } from 'react';
import type { ConstellationGoalEvidencePanel } from '../components/ConstellationGoalEvidencePanel';
import type { ConstellationReflectionInspector } from '../components/ConstellationReflectionInspector';
import type {
  ConstellationGoalEvidenceItem,
  ConstellationGraphCountsDTO,
  ConstellationReflectionInspectorDTO,
} from '../types.ts';

type GoalEvidenceController = ComponentProps<
  typeof ConstellationGoalEvidencePanel
>['evidence'];

type ReflectionInspectorController = ComponentProps<
  typeof ConstellationReflectionInspector
>['inspector'];

const GOAL_ID = 'renderer-goal-train-source';
const FIXTURE_TIMESTAMP = '2026-07-27T18:00:00.000Z';

export const constellationPreviewGoalEvidenceItems:
readonly ConstellationGoalEvidenceItem[] = [
  {
    id: 'renderer-evidence-train-bud',
    ownerId: 'renderer-owner',
    echoEntryId: 'renderer-echo-consistency',
    goalId: GOAL_ID,
    brtCategory: 'bud',
    note: 'Consistency is beginning to feel more natural than motivation.',
    createdAt: '2026-07-21T08:00:00.000Z',
    updatedAt: FIXTURE_TIMESTAMP,
    echo: {
      id: 'renderer-echo-consistency',
      title: 'The shape of consistency',
      excerpt: 'I trained before work even though the morning felt crowded.',
      excerptTruncated: false,
      createdAt: '2026-07-21T08:00:00.000Z',
    },
  },
  {
    id: 'renderer-evidence-train-rose',
    ownerId: 'renderer-owner',
    echoEntryId: 'renderer-echo-energy',
    goalId: GOAL_ID,
    brtCategory: 'rose',
    note: 'Movement cleared the afternoon fog.',
    createdAt: '2026-07-24T18:30:00.000Z',
    updatedAt: FIXTURE_TIMESTAMP,
    echo: {
      id: 'renderer-echo-energy',
      title: 'Energy after movement',
      excerpt: 'The session was short, but I returned with a quieter mind.',
      excerptTruncated: false,
      createdAt: '2026-07-24T18:30:00.000Z',
    },
  },
  {
    id: 'renderer-evidence-train-thorn',
    ownerId: 'renderer-owner',
    echoEntryId: 'renderer-echo-recovery',
    goalId: GOAL_ID,
    brtCategory: 'thorn',
    note: 'Pushing through fatigue made the next day harder.',
    createdAt: '2026-07-26T21:15:00.000Z',
    updatedAt: FIXTURE_TIMESTAMP,
    echo: {
      id: 'renderer-echo-recovery',
      title: 'Recovery is part of training',
      excerpt: 'I mistook intensity for progress and ignored the need to rest.',
      excerptTruncated: false,
      createdAt: '2026-07-26T21:15:00.000Z',
    },
  },
];

async function returnFalse(): Promise<false> {
  return false;
}

async function doNothing(): Promise<void> {
  return undefined;
}

export const constellationPreviewGoalEvidenceDto = {
  goal: {
    id: GOAL_ID,
    title: 'Train three times weekly',
    description: 'Build a durable relationship with movement and recovery.',
    status: 'active',
    deadline: '2026-09-30T23:59:59.000Z',
    project: {
      id: 'renderer-project-health',
      title: 'Body & Health',
    },
    vaultId: 'renderer-vault-train',
  },
  // Two additional canonical goal-container Entries have no BRT evidence
  // reference, proving that the authoritative total is independent of the
  // separately editable evidence-reference list below.
  connectedEntryCount: 5,
  recentEntries: [...constellationPreviewGoalEvidenceItems]
    .sort((left, right) => (
      right.echo.createdAt.localeCompare(left.echo.createdAt)
      || left.echo.id.localeCompare(right.echo.id)
    ))
    .slice(0, 3)
    .map((item) => ({
      ...item.echo,
      brtCategory: item.brtCategory,
      connectionSource: 'both' as const,
    })),
  items: constellationPreviewGoalEvidenceItems,
} satisfies NonNullable<GoalEvidenceController['dto']>;

export const constellationPreviewGoalEvidence = {
  status: 'ready',
  dto: constellationPreviewGoalEvidenceDto,
  error: null,
  retryable: true,
  mutation: {
    kind: null,
    targetId: null,
    error: null,
    isSaving: false,
    retryable: true,
  },
  search: {
    status: 'ready',
    goalId: GOAL_ID,
    query: '',
    requestId: 1,
    options: [],
    error: null,
    retryable: true,
  },
  addReference: returnFalse,
  clearMutationError: () => undefined,
  editReference: returnFalse,
  retry: doNothing,
  retrySearch: doNothing,
  searchEchoes: doNothing,
  unlinkReference: returnFalse,
} satisfies GoalEvidenceController;

export const constellationPreviewReflectionInspectorDto:
ConstellationReflectionInspectorDTO = {
  nodeId: 'renderer-reflection-motion',
  label: 'Movement clears the fog',
  description: 'Physical movement repeatedly precedes clearer attention.',
  candidateKey: 'renderer-candidate-motion',
  candidateType: 'theme',
  occurrences: 7,
  aggregatedScore: 8.4,
  firstSeenAt: '2026-04-18T14:00:00.000Z',
  lastSeenAt: FIXTURE_TIMESTAMP,
  dominantValence: 'positive',
  valenceHistory: [
    {
      valence: 'negative',
      echoEntryId: 'renderer-reflection-echo-1',
      timestamp: '2026-04-18T14:00:00.000Z',
    },
    {
      valence: 'mixed',
      echoEntryId: 'renderer-reflection-echo-2',
      timestamp: '2026-05-02T14:00:00.000Z',
    },
    {
      valence: 'neutral',
      echoEntryId: 'renderer-reflection-echo-3',
      timestamp: '2026-05-28T14:00:00.000Z',
    },
    {
      valence: 'positive',
      echoEntryId: 'renderer-reflection-echo-4',
      timestamp: '2026-06-19T14:00:00.000Z',
    },
    {
      valence: 'positive',
      echoEntryId: 'renderer-reflection-echo-5',
      timestamp: FIXTURE_TIMESTAMP,
    },
  ],
  evidence: [
    {
      id: 'renderer-reflection-echo-4',
      title: 'The walk before the work',
      excerpt: 'Twenty minutes outside made the next decision feel obvious.',
      excerptTruncated: false,
      createdAt: '2026-06-19T14:00:00.000Z',
      valence: 'positive',
    },
    {
      id: 'renderer-reflection-echo-5',
      title: 'Motion and attention',
      excerpt: 'I stopped forcing focus, moved for a while, and returned ready.',
      excerptTruncated: false,
      createdAt: FIXTURE_TIMESTAMP,
      valence: 'positive',
    },
  ],
};

export const constellationPreviewReflectionInspector = {
  dto: constellationPreviewReflectionInspectorDto,
  error: null,
  retry: doNothing,
  retryable: true,
  status: 'ready',
} satisfies ReflectionInspectorController;

export const constellationPreviewEmptyCounts = {
  earnedNodes: {
    total: 1,
    byKind: {
      season: 1,
      ambition: 0,
      goal: 0,
      reflection: 0,
      trait: 0,
      tension: 0,
    },
  },
  annotations: { draft: 0, archived: 0 },
  virtualBrtClusters: { total: 0, bud: 0, rose: 0, thorn: 0 },
  virtualGoalCategories: 0,
  edges: 0,
  evidenceLinks: 0,
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
} satisfies ConstellationGraphCountsDTO;
