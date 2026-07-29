import assert from 'node:assert/strict';
import test from 'node:test';
import { GET as getConstellationRoute } from '../../app/api/constellation/index+api.ts';
import {
  GET as getReflectionInspectorRoute,
} from '../../app/api/constellation/reflections/[id]+api.ts';
import {
  constellationErrorResponse,
  parseCreateAnnotationRequest,
  parseCreateEvidenceReferenceRequest,
  parseUpdateAnnotationRequest,
} from '../../lib/api/constellation.ts';
import {
  archiveConstellationAnnotation,
  assembleConstellationGraphDTO,
  classifyConstellationPersistenceError,
  ConstellationDataError,
  createConstellationAnnotation,
  createOrUpdateConstellationEvidenceReference,
  deleteConstellationEvidenceReference,
  derivedSeasonNodeId,
  updateConstellationAnnotation,
  updateConstellationEvidenceReference,
  type ConstellationAnnotationRow,
  type ConstellationAnnotationRowPatch,
  type ConstellationEvidenceReferenceRow,
  type ConstellationEvidenceReferenceRowPatch,
  type ConstellationMutationRepository,
  type ConstellationSnapshot,
} from './services/constellation-server-core.ts';
import type {
  CreateConstellationAnnotationInput,
  CreateConstellationEvidenceReferenceInput,
} from './types.ts';

const OWNER_ID = '00000000-0000-4000-8000-000000000001';
const OTHER_OWNER_ID = '00000000-0000-4000-8000-000000000002';
const GOAL_A_ID = '00000000-0000-4000-8000-000000000003';
const GOAL_B_ID = '00000000-0000-4000-8000-000000000004';
const ECHO_ID = '00000000-0000-4000-8000-000000000005';
const NODE_ID = '00000000-0000-4000-8000-000000000006';
const ANNOTATION_ID = '00000000-0000-4000-8000-000000000007';
const EVIDENCE_ID = '00000000-0000-4000-8000-000000000008';
const GENERATED_AT = '2026-07-27T16:00:00.000Z';

function emptySnapshot(): ConstellationSnapshot {
  return {
    nodes: [],
    edges: [],
    annotations: [],
    evidenceLinks: [],
    echoBrtCategories: [],
    goals: [],
    projects: [],
    echoEntryCount: 0,
    characterProfile: {},
  };
}

function annotationRow(
  overrides: Partial<ConstellationAnnotationRow> = {},
): ConstellationAnnotationRow {
  return {
    id: ANNOTATION_ID,
    owner_id: OWNER_ID,
    kind: 'note',
    status: 'draft',
    authorship: 'user',
    is_draft: true,
    label: 'A note',
    body: null,
    anchor_earned_node_id: null,
    anchor_goal_id: null,
    created_at: GENERATED_AT,
    updated_at: GENERATED_AT,
    archived_at: null,
    ...overrides,
  };
}

function evidenceRow(
  overrides: Partial<ConstellationEvidenceReferenceRow> = {},
): ConstellationEvidenceReferenceRow {
  return {
    id: EVIDENCE_ID,
    owner_id: OWNER_ID,
    echo_entry_id: ECHO_ID,
    goal_id: GOAL_A_ID,
    note: null,
    created_at: GENERATED_AT,
    updated_at: GENERATED_AT,
    ...overrides,
  };
}

class MemoryConstellationRepository
implements ConstellationMutationRepository {
  readonly ownedNodes = new Set<string>([NODE_ID]);
  readonly ownedEchoEntries = new Set<string>([ECHO_ID]);
  readonly ownedGoals = new Set<string>([GOAL_A_ID, GOAL_B_ID]);
  readonly annotations = new Map<string, ConstellationAnnotationRow>();
  readonly evidenceReferences =
    new Map<string, ConstellationEvidenceReferenceRow>();
  annotationInsertCount = 0;
  annotationUpdateCount = 0;
  evidenceInsertCount = 0;
  evidenceUpdateCount = 0;
  evidenceDeleteCount = 0;
  concurrentDuplicate: ConstellationEvidenceReferenceRow | null = null;
  private idSequence = 20;

  hasOwnedVisibleEarnedNode(
    ownerId: string,
    nodeId: string,
  ): Promise<boolean> {
    return Promise.resolve(
      ownerId === OWNER_ID && this.ownedNodes.has(nodeId),
    );
  }

  findAnnotation(
    ownerId: string,
    annotationId: string,
  ): Promise<ConstellationAnnotationRow | null> {
    const row = this.annotations.get(annotationId);
    return Promise.resolve(
      row?.owner_id === ownerId ? { ...row } : null,
    );
  }

  insertAnnotation(
    ownerId: string,
    input: CreateConstellationAnnotationInput,
  ): Promise<ConstellationAnnotationRow> {
    this.annotationInsertCount += 1;
    const row = annotationRow({
      owner_id: ownerId,
      kind: input.kind,
      label: input.label,
      body: input.body,
      anchor_earned_node_id: input.anchorEarnedNodeId,
    });
    this.annotations.set(row.id, row);
    return Promise.resolve({ ...row });
  }

  updateAnnotation(
    ownerId: string,
    annotationId: string,
    patch: ConstellationAnnotationRowPatch,
  ): Promise<ConstellationAnnotationRow | null> {
    const existing = this.annotations.get(annotationId);
    if (
      !existing
      || existing.owner_id !== ownerId
      || existing.status !== 'draft'
    ) {
      return Promise.resolve(null);
    }
    this.annotationUpdateCount += 1;
    const next: ConstellationAnnotationRow = {
      ...existing,
      ...patch,
      status: patch.status ?? existing.status,
      archived_at:
        patch.status === 'archived' ? GENERATED_AT : existing.archived_at,
      updated_at: GENERATED_AT,
    };
    this.annotations.set(annotationId, next);
    return Promise.resolve({ ...next });
  }

  hasOwnedEchoEntry(
    ownerId: string,
    echoEntryId: string,
  ): Promise<boolean> {
    return Promise.resolve(
      ownerId === OWNER_ID && this.ownedEchoEntries.has(echoEntryId),
    );
  }

  hasOwnedGoal(ownerId: string, goalId: string): Promise<boolean> {
    return Promise.resolve(
      ownerId === OWNER_ID && this.ownedGoals.has(goalId),
    );
  }

  findEvidenceReferenceByPair(
    ownerId: string,
    echoEntryId: string,
    goalId: string,
  ): Promise<ConstellationEvidenceReferenceRow | null> {
    const row = [...this.evidenceReferences.values()].find(
      (candidate) =>
        candidate.owner_id === ownerId
        && candidate.echo_entry_id === echoEntryId
        && candidate.goal_id === goalId,
    );
    return Promise.resolve(row ? { ...row } : null);
  }

  findEvidenceReference(
    ownerId: string,
    evidenceReferenceId: string,
  ): Promise<ConstellationEvidenceReferenceRow | null> {
    const row = this.evidenceReferences.get(evidenceReferenceId);
    return Promise.resolve(
      row?.owner_id === ownerId ? { ...row } : null,
    );
  }

  insertEvidenceReference(
    ownerId: string,
    input: CreateConstellationEvidenceReferenceInput,
  ): Promise<ConstellationEvidenceReferenceRow> {
    this.evidenceInsertCount += 1;
    if (this.concurrentDuplicate) {
      this.evidenceReferences.set(
        this.concurrentDuplicate.id,
        this.concurrentDuplicate,
      );
      this.concurrentDuplicate = null;
      return Promise.reject({
        code: '23505',
        message: 'sensitive database duplicate prose',
      });
    }

    const suffix = String(this.idSequence).padStart(12, '0');
    this.idSequence += 1;
    const row = evidenceRow({
      id: `00000000-0000-4000-8000-${suffix}`,
      owner_id: ownerId,
      echo_entry_id: input.echoEntryId,
      goal_id: input.goalId,
      note: input.note ?? null,
    });
    this.evidenceReferences.set(row.id, row);
    return Promise.resolve({ ...row });
  }

  updateEvidenceReference(
    ownerId: string,
    evidenceReferenceId: string,
    patch: ConstellationEvidenceReferenceRowPatch,
  ): Promise<ConstellationEvidenceReferenceRow | null> {
    const existing = this.evidenceReferences.get(evidenceReferenceId);
    if (!existing || existing.owner_id !== ownerId) {
      return Promise.resolve(null);
    }
    this.evidenceUpdateCount += 1;
    const next = {
      ...existing,
      ...patch,
      updated_at: GENERATED_AT,
    };
    this.evidenceReferences.set(evidenceReferenceId, next);
    return Promise.resolve({ ...next });
  }

  deleteEvidenceReference(
    ownerId: string,
    evidenceReferenceId: string,
  ): Promise<boolean> {
    const existing = this.evidenceReferences.get(evidenceReferenceId);
    if (!existing || existing.owner_id !== ownerId) {
      return Promise.resolve(false);
    }
    this.evidenceDeleteCount += 1;
    this.evidenceReferences.delete(evidenceReferenceId);
    return Promise.resolve(true);
  }
}

test('GET /api/constellation rejects unauthenticated requests with the stable envelope', async () => {
  const response = await getConstellationRoute(
    new Request('http://localhost/api/constellation'),
  );
  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), {
    ok: false,
    data: null,
    error: { code: 'UNAUTHORIZED', message: 'Unauthorized' },
  });
});

test('GET Reflection inspector rejects unauthenticated IDs without disclosing data', async () => {
  const response = await getReflectionInspectorRoute(
    new Request(`http://localhost/api/constellation/reflections/${NODE_ID}`),
    { id: NODE_ID },
  );
  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), {
    ok: false,
    data: null,
    error: { code: 'UNAUTHORIZED', message: 'Unauthorized' },
  });
});

test('eligible empty graphs return one deterministic real Season and no fixtures', () => {
  const graph = assembleConstellationGraphDTO(
    OWNER_ID,
    emptySnapshot(),
    GENERATED_AT,
  );

  assert.equal(graph.state.renderState, 'season_only');
  assert.equal(graph.state.hasGraphData, false);
  assert.equal(graph.state.dataOrigin, 'real');
  assert.equal(graph.earnedNodes.length, 1);
  assert.equal(graph.earnedNodes[0].kind, 'season');
  assert.equal(graph.state.seasonNodeId, derivedSeasonNodeId(OWNER_ID));
  assert.equal(graph.state.seasonNodeId?.includes(OWNER_ID), false);
  assert.equal(graph.counts.evidenceLinks, 0);
  assert.deepEqual(graph.annotations, []);
  assert.deepEqual(graph.virtualBrtClusters, []);
});

test('goal nodes are direct-read from the goals table, never from constellation_nodes', () => {
  const snapshot = emptySnapshot();
  snapshot.goals = [{
    id: GOAL_A_ID,
    title: 'A real goal',
    status: 'active',
    updated_at: GENERATED_AT,
  }];
  // A stray constellation_nodes row of kind='goal' must be ignored entirely.
  snapshot.nodes = [{
    id: NODE_ID,
    owner_id: OWNER_ID,
    kind: 'goal',
    status: 'active',
    label: 'Ignored persisted goal node',
    description: null,
    authorship: 'system',
    is_earned: true,
    source_type: 'goal',
    source_project_id: null,
    source_goal_id: GOAL_A_ID,
    source_profile_id: null,
    source_key: null,
    visibility_score: 3,
    first_seen_at: GENERATED_AT,
    last_activity_at: GENERATED_AT,
    updated_at: GENERATED_AT,
  }];

  const graph = assembleConstellationGraphDTO(OWNER_ID, snapshot, GENERATED_AT);

  // No access gate: any goal makes the graph render, with the Season anchor set.
  assert.equal(graph.state.hasGraphData, true);
  assert.equal(graph.state.renderState, 'graph');
  assert.equal(graph.state.seasonNodeId, derivedSeasonNodeId(OWNER_ID));
  const goalNodes = graph.earnedNodes.filter((node) => node.kind === 'goal');
  assert.equal(goalNodes.length, 1);
  // Node identity is goals.id, never the constellation_nodes UUID.
  assert.equal(goalNodes[0].id, GOAL_A_ID);
  assert.notEqual(goalNodes[0].id, NODE_ID);
  assert.equal(goalNodes[0].label, 'A real goal');
});

test('graph assembly includes owner data, virtual evidence summaries, and no Echo excerpts', () => {
  const snapshot = emptySnapshot();
  snapshot.echoEntryCount = 10;
  snapshot.goals = [
    { id: GOAL_A_ID, title: 'Owned goal', status: 'active', updated_at: GENERATED_AT },
    { id: GOAL_B_ID, title: 'Draft goal', status: 'draft', updated_at: GENERATED_AT },
    {
      id: '00000000-0000-4000-8000-000000000009',
      title: 'Archived goal',
      status: 'archived',
      updated_at: GENERATED_AT,
    },
    {
      id: '00000000-0000-4000-8000-000000000014',
      title: 'Second active goal',
      status: 'active',
      updated_at: GENERATED_AT,
    },
  ];
  snapshot.annotations = [
    // Anchored to a direct-read goal node via anchor_goal_id.
    annotationRow({ anchor_goal_id: GOAL_A_ID }),
    annotationRow({
      id: '00000000-0000-4000-8000-000000000010',
      status: 'archived',
      archived_at: GENERATED_AT,
    }),
    annotationRow({
      id: '00000000-0000-4000-8000-000000000011',
      owner_id: OTHER_OWNER_ID,
    }),
  ];
  // BRT category now lives on the echo entry; both owner links inherit 'bud'.
  snapshot.echoBrtCategories = [{ id: ECHO_ID, brt_category: 'bud' }];
  snapshot.evidenceLinks = [
    { id: EVIDENCE_ID, owner_id: OWNER_ID, echo_entry_id: ECHO_ID, goal_id: GOAL_A_ID, updated_at: GENERATED_AT },
    {
      id: '00000000-0000-4000-8000-000000000012',
      owner_id: OWNER_ID,
      echo_entry_id: ECHO_ID,
      goal_id: GOAL_A_ID,
      updated_at: GENERATED_AT,
    },
    {
      id: '00000000-0000-4000-8000-000000000013',
      owner_id: OTHER_OWNER_ID,
      echo_entry_id: ECHO_ID,
      goal_id: GOAL_A_ID,
      updated_at: GENERATED_AT,
    },
  ];

  const graph = assembleConstellationGraphDTO(
    OWNER_ID,
    snapshot,
    GENERATED_AT,
  );

  assert.equal(graph.state.hasGraphData, true);
  assert.equal(graph.annotations.length, 1);
  assert.equal(graph.counts.annotations.archived, 1);
  assert.equal(graph.virtualBrtClusters.length, 1);
  assert.equal(graph.virtualBrtClusters[0].evidenceLinkCount, 2);
  assert.equal(graph.counts.evidenceLinks, 2);
  assert.ok(
    graph.edges.some((edge) => edge.kind === 'annotation_anchor'),
  );
  assert.ok(
    graph.edges.some((edge) => edge.kind === 'goal_evidence_cluster'),
  );
  assert.equal(JSON.stringify(graph).includes('echoExcerpt'), false);
  assert.equal(JSON.stringify(graph).includes('content'), false);
});

test('evidence creation supports one Echo across goals and idempotent note updates', async () => {
  const repository = new MemoryConstellationRepository();
  const first = await createOrUpdateConstellationEvidenceReference(
    OWNER_ID,
    {
      echoEntryId: ECHO_ID,
      goalId: GOAL_A_ID,
      note: 'Keep this note.',
    },
    repository,
  );
  const secondGoal = await createOrUpdateConstellationEvidenceReference(
    OWNER_ID,
    {
      echoEntryId: ECHO_ID,
      goalId: GOAL_B_ID,
      note: 'Relevant to both goals.',
    },
    repository,
  );
  const noteUpdate = await createOrUpdateConstellationEvidenceReference(
    OWNER_ID,
    {
      echoEntryId: ECHO_ID,
      goalId: GOAL_A_ID,
      note: 'Updated note.',
    },
    repository,
  );
  const repeated = await createOrUpdateConstellationEvidenceReference(
    OWNER_ID,
    {
      echoEntryId: ECHO_ID,
      goalId: GOAL_A_ID,
      note: 'Updated note.',
    },
    repository,
  );

  assert.equal(first.created, true);
  assert.equal(secondGoal.created, true);
  assert.equal(noteUpdate.created, false);
  assert.equal(noteUpdate.evidenceReference.id, first.evidenceReference.id);
  assert.equal(noteUpdate.evidenceReference.note, 'Updated note.');
  assert.equal(repeated.evidenceReference.id, first.evidenceReference.id);
  assert.equal(repository.evidenceReferences.size, 2);
  assert.equal(repository.evidenceUpdateCount, 1);
});

test('concurrent duplicate evidence inserts recover by updating the existing pair', async () => {
  const repository = new MemoryConstellationRepository();
  repository.concurrentDuplicate = evidenceRow();

  const result = await createOrUpdateConstellationEvidenceReference(
    OWNER_ID,
    {
      echoEntryId: ECHO_ID,
      goalId: GOAL_A_ID,
      note: 'Updated after the race.',
    },
    repository,
  );

  assert.equal(result.created, false);
  assert.equal(result.evidenceReference.id, EVIDENCE_ID);
  assert.equal(result.evidenceReference.note, 'Updated after the race.');
  assert.equal(repository.evidenceReferences.size, 1);
});

test('evidence writes verify ownership before any insert or update', async () => {
  const repository = new MemoryConstellationRepository();

  await assert.rejects(
    createOrUpdateConstellationEvidenceReference(
      OTHER_OWNER_ID,
      {
        echoEntryId: ECHO_ID,
        goalId: GOAL_A_ID,
        note: null,
      },
      repository,
    ),
    (error) =>
      error instanceof ConstellationDataError
      && error.code === 'NOT_FOUND',
  );
  assert.equal(repository.evidenceInsertCount, 0);
  assert.equal(repository.evidenceUpdateCount, 0);
});

test('owned goals cannot reference a cross-user Echo and owned Echoes cannot reference a cross-user goal', async () => {
  const foreignEchoRepository = new MemoryConstellationRepository();
  foreignEchoRepository.ownedEchoEntries.delete(ECHO_ID);
  await assert.rejects(
    createOrUpdateConstellationEvidenceReference(
      OWNER_ID,
      {
        echoEntryId: ECHO_ID,
        goalId: GOAL_A_ID,
        note: null,
      },
      foreignEchoRepository,
    ),
    (error) =>
      error instanceof ConstellationDataError
      && error.code === 'NOT_FOUND',
  );
  assert.equal(foreignEchoRepository.evidenceInsertCount, 0);

  const foreignGoalRepository = new MemoryConstellationRepository();
  foreignGoalRepository.ownedGoals.delete(GOAL_A_ID);
  await assert.rejects(
    createOrUpdateConstellationEvidenceReference(
      OWNER_ID,
      {
        echoEntryId: ECHO_ID,
        goalId: GOAL_A_ID,
        note: null,
      },
      foreignGoalRepository,
    ),
    (error) =>
      error instanceof ConstellationDataError
      && error.code === 'NOT_FOUND',
  );
  assert.equal(foreignGoalRepository.evidenceInsertCount, 0);
});

test('annotation creation, editing, archival, and archived conflict are deterministic', async () => {
  const repository = new MemoryConstellationRepository();
  const created = await createConstellationAnnotation(
    OWNER_ID,
    {
      kind: 'projection',
      label: 'Future direction',
      body: 'A private draft.',
      anchorEarnedNodeId: NODE_ID,
    },
    repository,
  );
  const edited = await updateConstellationAnnotation(
    OWNER_ID,
    created.id,
    { label: 'Refined direction', body: null },
    repository,
  );
  const archived = await archiveConstellationAnnotation(
    OWNER_ID,
    created.id,
    repository,
  );
  const archivedAgain = await archiveConstellationAnnotation(
    OWNER_ID,
    created.id,
    repository,
  );

  assert.equal(edited.label, 'Refined direction');
  assert.equal(edited.body, null);
  assert.equal(archived.status, 'archived');
  assert.equal(archivedAgain.status, 'archived');
  assert.equal(repository.annotationUpdateCount, 2);
  await assert.rejects(
    updateConstellationAnnotation(
      OWNER_ID,
      created.id,
      { label: 'Not allowed' },
      repository,
    ),
    (error) =>
      error instanceof ConstellationDataError
      && error.code === 'CONFLICT',
  );
});

test('annotation anchors must resolve to an active owner-visible earned node', async () => {
  const repository = new MemoryConstellationRepository();
  repository.ownedNodes.delete(NODE_ID);

  await assert.rejects(
    createConstellationAnnotation(
      OWNER_ID,
      {
        kind: 'note',
        label: 'Cannot anchor here',
        body: null,
        anchorEarnedNodeId: NODE_ID,
      },
      repository,
    ),
    (error) =>
      error instanceof ConstellationDataError
      && error.code === 'NOT_FOUND',
  );
  assert.equal(repository.annotationInsertCount, 0);
});

test('evidence update and delete return 404 semantics for non-owned IDs', async () => {
  const repository = new MemoryConstellationRepository();
  repository.evidenceReferences.set(EVIDENCE_ID, evidenceRow());

  const updated = await updateConstellationEvidenceReference(
    OWNER_ID,
    EVIDENCE_ID,
    { note: 'Updated note.' },
    repository,
  );
  const deleted = await deleteConstellationEvidenceReference(
    OWNER_ID,
    EVIDENCE_ID,
    repository,
  );

  assert.equal(updated.note, 'Updated note.');
  assert.deepEqual(deleted, { id: EVIDENCE_ID });
  await assert.rejects(
    updateConstellationEvidenceReference(
      OTHER_OWNER_ID,
      EVIDENCE_ID,
      { note: 'Another note.' },
      repository,
    ),
    (error) =>
      error instanceof ConstellationDataError
      && error.code === 'NOT_FOUND',
  );
});

test('API validation bounds private evidence notes and rejects identity fields', async () => {
  const oversized = new Request(
    'http://localhost/api/constellation/evidence-references',
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        echoEntryId: ECHO_ID,
        goalId: GOAL_A_ID,
        note: 'x'.repeat(281),
      }),
    },
  );
  await assert.rejects(
    parseCreateEvidenceReferenceRequest(oversized),
    (error) =>
      error instanceof ConstellationDataError
      && error.code === 'INVALID_INPUT',
  );

  const forgedOwner = new Request(
    'http://localhost/api/constellation/evidence-references',
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        ownerId: OTHER_OWNER_ID,
        echoEntryId: ECHO_ID,
        goalId: GOAL_A_ID,
      }),
    },
  );
  await assert.rejects(
    parseCreateEvidenceReferenceRequest(forgedOwner),
    (error) =>
      error instanceof ConstellationDataError
      && error.code === 'INVALID_INPUT',
  );
});

test('annotation API validation bounds content and limits editable fields', async () => {
  const valid = await parseCreateAnnotationRequest(new Request(
    'http://localhost/api/constellation/annotations',
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        kind: 'projection',
        label: '  Possible direction  ',
        body: '  Private context.  ',
        anchorEarnedNodeId: NODE_ID,
      }),
    },
  ));
  assert.deepEqual(valid, {
    kind: 'projection',
    label: 'Possible direction',
    body: 'Private context.',
    anchorEarnedNodeId: NODE_ID,
  });

  for (const body of [
    {
      kind: 'future',
      label: 'Invalid kind',
      body: null,
      anchorEarnedNodeId: null,
    },
    {
      kind: 'note',
      label: '   ',
      body: null,
      anchorEarnedNodeId: null,
    },
    {
      kind: 'note',
      label: 'Bounded body',
      body: 'x'.repeat(5_001),
      anchorEarnedNodeId: null,
    },
    {
      ownerId: OTHER_OWNER_ID,
      kind: 'note',
      label: 'Forged owner',
      body: null,
      anchorEarnedNodeId: null,
    },
  ]) {
    await assert.rejects(
      parseCreateAnnotationRequest(new Request(
        'http://localhost/api/constellation/annotations',
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(body),
        },
      )),
      (error) =>
        error instanceof ConstellationDataError
        && error.code === 'INVALID_INPUT',
    );
  }

  await assert.rejects(
    parseUpdateAnnotationRequest(new Request(
      `http://localhost/api/constellation/annotations/${ANNOTATION_ID}`,
      {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: '{}',
      },
    )),
    (error) =>
      error instanceof ConstellationDataError
      && error.code === 'INVALID_INPUT',
  );
});

test('safe error translation returns stable 400/404/409 envelopes without database prose', async () => {
  assert.equal(
    classifyConstellationPersistenceError({
      code: '23505',
      message: 'sensitive duplicate details',
    })?.code,
    'CONFLICT',
  );
  assert.equal(
    classifyConstellationPersistenceError({
      code: 'XX000',
      message: 'sensitive internal database details',
    }),
    null,
  );

  for (const [code, status] of [
    ['INVALID_INPUT', 400],
    ['NOT_FOUND', 404],
    ['CONFLICT', 409],
  ] as const) {
    const response = constellationErrorResponse(
      new ConstellationDataError(code, `Safe ${code}`),
      'Safe internal failure.',
    );
    assert.equal(response.status, status);
    const body = await response.json();
    assert.equal(body.error.code, code);
    assert.equal(JSON.stringify(body).includes('database'), false);
  }

  const originalConsoleError = console.error;
  console.error = () => undefined;
  try {
    const response = constellationErrorResponse(
      new Error('sensitive internal database details'),
      'Failed to process Constellation.',
    );
    assert.equal(response.status, 500);
    assert.deepEqual(await response.json(), {
      ok: false,
      data: null,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to process Constellation.',
      },
    });
  } finally {
    console.error = originalConsoleError;
  }
});
