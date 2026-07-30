import type { Page, Route } from '@playwright/test';
import {
  constellationPreviewEmptyCounts,
  constellationPreviewGoalEvidenceDto,
  constellationPreviewReflectionInspectorDto,
} from '../../features/constellation/dev/inspector-fixtures.dev.ts';
import {
  constellationRendererFixtureGraphDTO,
} from '../../features/constellation/dev/renderer-fixture.dev.ts';
import type {
  ConstellationAnnotationDTO,
  ConstellationEchoSearchOption,
  ConstellationEvidenceLink,
  ConstellationGoalEvidenceDTO,
  ConstellationGoalLink,
  ConstellationGraphDTO,
  ConstellationLayoutPositionDTO,
} from '../../features/constellation/types.ts';

export type AcceptanceFailureTarget =
  | 'echo-search'
  | 'goal-evidence'
  | 'graph'
  | 'reflection';

interface AcceptanceApiOptions {
  failOnce?: readonly AcceptanceFailureTarget[];
  graph?: ConstellationGraphDTO;
  graphDelayMs?: number;
}

const FIXED_TIME = '2026-07-28T14:00:00.000Z';

export const acceptanceEchoOption: ConstellationEchoSearchOption = {
  id: 'acceptance-echo-new-practice',
  title: 'A new practice taking root',
  excerpt: 'I protected a short training window and left with more energy.',
  excerptTruncated: false,
  createdAt: '2026-07-28T12:30:00.000Z',
  existingReference: null,
};

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function json(route: Route, data: unknown, status = 200) {
  return route.fulfill({
    body: JSON.stringify(data),
    contentType: 'application/json',
    status,
  });
}

function retryFailure(route: Route) {
  return json(route, {
    ok: true,
    data: null,
  });
}

// Access gate removed: this helper produces the canonical season_only graph
// used by the empty-state CTA journey.
export function createSeasonOnlyConstellationGraph(): ConstellationGraphDTO {
  const season = clone(constellationRendererFixtureGraphDTO).earnedNodes.find(
    (node) => node.kind === 'season',
  );
  return {
    ...clone(constellationRendererFixtureGraphDTO),
    state: {
      ...clone(constellationRendererFixtureGraphDTO.state),
      hasGraphData: false,
      renderState: 'season_only',
      seasonNodeId: season?.id ?? null,
    },
    earnedNodes: season ? [season] : [],
    annotations: [],
    virtualGoalCategories: [],
    virtualBrtClusters: [],
    edges: [],
    counts: clone(constellationPreviewEmptyCounts),
  };
}

export async function installConstellationAcceptanceApi(
  page: Page,
  options: AcceptanceApiOptions = {},
) {
  const failures = new Set(options.failOnce ?? []);
  const annotations = new Map<string, ConstellationAnnotationDTO>();
  let graph = clone(options.graph ?? constellationRendererFixtureGraphDTO);
  let goalEvidence: ConstellationGoalEvidenceDTO =
    clone(constellationPreviewGoalEvidenceDto);
  const entryCategories = new Map(
    goalEvidence.items.map((item) => [item.echoEntryId, item.brtCategory]),
  );
  let evidenceSequence = 0;
  let goalLinkSequence = 0;
  let annotationSequence = 0;
  const goalLinks = new Map<string, ConstellationGoalLink>();
  const layoutPositions = new Map<string, ConstellationLayoutPositionDTO>();

  async function failOnce(target: AcceptanceFailureTarget, route: Route) {
    if (!failures.delete(target)) return false;
    await retryFailure(route);
    return true;
  }

  await page.route('**/api/entries/**', async (route) => {
    const request = route.request();
    if (request.method() !== 'PATCH') {
      await route.continue();
      return;
    }
    const entryId = decodeURIComponent(
      new URL(request.url()).pathname.split('/').pop() ?? '',
    );
    const input = request.postDataJSON() as {
      brtCategory?: 'bud' | 'rose' | 'thorn' | null;
    };
    if (input.brtCategory !== undefined) {
      entryCategories.set(entryId, input.brtCategory);
      goalEvidence = {
        ...goalEvidence,
        items: goalEvidence.items.map((item) => (
          item.echoEntryId === entryId
            ? { ...item, brtCategory: input.brtCategory ?? null }
            : item
        )),
      };
    }
    await json(route, { success: true });
  });

  await page.route('**/api/constellation**', async (route) => {
    const request = route.request();
    const method = request.method();
    const url = new URL(request.url());
    const path = url.pathname;

    if (path === '/api/constellation/layout' && method === 'GET') {
      await json(route, {
        ok: true,
        data: {
          version: '1.0',
          positions: [...layoutPositions.values()],
        },
      });
      return;
    }
    if (path === '/api/constellation/layout' && method === 'PATCH') {
      const input = request.postDataJSON() as Omit<
        ConstellationLayoutPositionDTO,
        'updatedAt'
      >;
      const position = { ...input, updatedAt: FIXED_TIME };
      layoutPositions.set(position.selectionKey, position);
      await json(route, { ok: true, data: position });
      return;
    }
    if (path === '/api/constellation/layout' && method === 'DELETE') {
      layoutPositions.clear();
      await json(route, { ok: true, data: { reset: true } });
      return;
    }

    if (path === '/api/constellation' && method === 'GET') {
      if (await failOnce('graph', route)) return;
      if (options.graphDelayMs) {
        await new Promise((resolve) => {
          setTimeout(resolve, options.graphDelayMs);
        });
      }
      await json(route, graph);
      return;
    }

    const goalEvidenceMatch = path.match(
      /^\/api\/constellation\/goals\/([^/]+)\/evidence$/,
    );
    if (goalEvidenceMatch && method === 'GET') {
      if (await failOnce('goal-evidence', route)) return;
      await json(route, {
        ok: true,
        data: {
          ...goalEvidence,
          goal: {
            ...goalEvidence.goal,
            id: decodeURIComponent(goalEvidenceMatch[1]),
          },
          items: goalEvidence.items.map((item) => ({
            ...item,
            goalId: decodeURIComponent(goalEvidenceMatch[1]),
          })),
        },
      });
      return;
    }

    const echoSearchMatch = path.match(
      /^\/api\/constellation\/goals\/([^/]+)\/echo-options$/,
    );
    if (echoSearchMatch && method === 'GET') {
      if (await failOnce('echo-search', route)) return;
      const goalId = decodeURIComponent(echoSearchMatch[1]);
      const query = url.searchParams.get('query') ?? '';
      const normalizedQuery = query.trim().toLowerCase();
      const options = [
        acceptanceEchoOption,
        ...goalEvidence.items.map((item) => ({
          ...item.echo,
          existingReference: {
            id: item.id,
            brtCategory: item.brtCategory,
          },
        })),
      ].filter((option) => (
        normalizedQuery.length === 0
        || `${option.title ?? ''} ${option.excerpt}`
          .toLowerCase()
          .includes(normalizedQuery)
      ));
      await json(route, {
        ok: true,
        data: { goalId, options, query },
      });
      return;
    }

    const reflectionMatch = path.match(
      /^\/api\/constellation\/reflections\/([^/]+)$/,
    );
    if (reflectionMatch && method === 'GET') {
      if (await failOnce('reflection', route)) return;
      await json(route, {
        ok: true,
        data: {
          ...clone(constellationPreviewReflectionInspectorDto),
          nodeId: decodeURIComponent(reflectionMatch[1]),
        },
      });
      return;
    }

    const brtMatch = path.match(
      /^\/api\/constellation\/goals\/([^/]+)\/brt\/(bud|rose|thorn)$/,
    );
    if (brtMatch && method === 'GET') {
      const goalId = decodeURIComponent(brtMatch[1]);
      const category = brtMatch[2] as 'bud' | 'rose' | 'thorn';
      await json(route, {
        ok: true,
        data: {
          goalId,
          category,
          entries: goalEvidence.items
            .filter((item) => item.brtCategory === category)
            .map((item) => ({
              ...item.echo,
              brtCategory: category,
            })),
        },
      });
      return;
    }

    if (path === '/api/constellation/annotations' && method === 'POST') {
      const input = request.postDataJSON() as {
        anchorEarnedNodeId: string | null;
        anchorGoalId?: string | null;
        body: string | null;
        kind: 'note' | 'projection';
        label: string;
      };
      annotationSequence += 1;
      const id = `acceptance-annotation-${annotationSequence}`;
      const annotation: ConstellationAnnotationDTO = {
        id,
        selectionKey: `annotation:${id}`,
        kind: input.kind,
        status: 'draft',
        authorship: 'user',
        isDraft: true,
        label: input.label,
        body: input.body,
        anchorEarnedNodeId: input.anchorEarnedNodeId,
        anchorGoalId: input.anchorGoalId ?? null,
        createdAt: FIXED_TIME,
        updatedAt: FIXED_TIME,
        archivedAt: null,
      };
      annotations.set(id, annotation);
      graph = {
        ...graph,
        annotations: [annotation, ...graph.annotations],
      };
      await json(route, { ok: true, data: annotation }, 201);
      return;
    }

    if (path === '/api/constellation/goal-links' && method === 'POST') {
      const input = request.postDataJSON() as {
        sourceGoalId: string;
        targetGoalId: string;
        note: string;
      };
      goalLinkSequence += 1;
      const id = `acceptance-goal-link-${goalLinkSequence}`;
      const link: ConstellationGoalLink = {
        id,
        ownerId: 'acceptance-owner',
        sourceGoalId: input.sourceGoalId,
        targetGoalId: input.targetGoalId,
        note: input.note,
        createdAt: FIXED_TIME,
        updatedAt: FIXED_TIME,
      };
      goalLinks.set(id, link);
      await json(route, { ok: true, data: link }, 201);
      return;
    }

    const goalLinkMatch = path.match(
      /^\/api\/constellation\/goal-links\/([^/]+)$/,
    );
    if (goalLinkMatch && method === 'PATCH') {
      const id = decodeURIComponent(goalLinkMatch[1]);
      const current = goalLinks.get(id);
      if (!current) {
        await json(route, {
          ok: false,
          error: { code: 'NOT_FOUND', message: 'Goal link not found.' },
        }, 404);
        return;
      }
      const input = request.postDataJSON() as { note: string };
      const updated = {
        ...current,
        note: input.note,
        updatedAt: FIXED_TIME,
      };
      goalLinks.set(id, updated);
      await json(route, { ok: true, data: updated });
      return;
    }

    if (goalLinkMatch && method === 'DELETE') {
      const id = decodeURIComponent(goalLinkMatch[1]);
      goalLinks.delete(id);
      await json(route, { ok: true, data: { id } });
      return;
    }

    const archiveMatch = path.match(
      /^\/api\/constellation\/annotations\/([^/]+)\/archive$/,
    );
    if (archiveMatch && method === 'POST') {
      const id = decodeURIComponent(archiveMatch[1]);
      const current = annotations.get(id);
      if (!current) {
        await json(route, {
          ok: false,
          error: { code: 'NOT_FOUND', message: 'Annotation not found.' },
        }, 404);
        return;
      }
      const archived: ConstellationAnnotationDTO = {
        ...current,
        status: 'archived',
        updatedAt: FIXED_TIME,
        archivedAt: FIXED_TIME,
      };
      annotations.set(id, archived);
      graph = {
        ...graph,
        annotations: graph.annotations.filter(
          (annotation) => annotation.id !== id,
        ),
      };
      await json(route, { ok: true, data: archived });
      return;
    }

    const annotationMatch = path.match(
      /^\/api\/constellation\/annotations\/([^/]+)$/,
    );
    if (annotationMatch && method === 'PATCH') {
      const id = decodeURIComponent(annotationMatch[1]);
      const current = annotations.get(id);
      if (!current) {
        await json(route, {
          ok: false,
          error: { code: 'NOT_FOUND', message: 'Annotation not found.' },
        }, 404);
        return;
      }
      const input = request.postDataJSON() as Partial<
        Pick<
          ConstellationAnnotationDTO,
          'anchorEarnedNodeId' | 'body' | 'kind' | 'label'
        >
      >;
      const annotation: ConstellationAnnotationDTO = {
        ...current,
        ...input,
        updatedAt: FIXED_TIME,
      };
      annotations.set(id, annotation);
      graph = {
        ...graph,
        annotations: graph.annotations.map((item) => (
          item.id === id ? annotation : item
        )),
      };
      await json(route, { ok: true, data: annotation });
      return;
    }

    if (
      path === '/api/constellation/evidence-references'
      && method === 'POST'
    ) {
      const input = request.postDataJSON() as {
        echoEntryId: string;
        goalId: string;
        note?: string | null;
      };
      evidenceSequence += 1;
      const link: ConstellationEvidenceLink = {
        id: `acceptance-evidence-${evidenceSequence}`,
        ownerId: 'acceptance-owner',
        echoEntryId: input.echoEntryId,
        goalId: input.goalId,
        note: input.note ?? null,
        createdAt: FIXED_TIME,
        updatedAt: FIXED_TIME,
      };
      const option = input.echoEntryId === acceptanceEchoOption.id
        ? acceptanceEchoOption
        : null;
      if (option) {
        goalEvidence = {
          ...goalEvidence,
          items: [
            ...goalEvidence.items,
            {
              ...link,
              // The real flow now writes brtCategory via a separate PATCH
              // /api/entries/:id call this mock router doesn't simulate (out
              // of scope here — see features/constellation/server.test.ts).
              brtCategory: entryCategories.get(option.id) ?? null,
              echo: {
                id: option.id,
                title: option.title,
                excerpt: option.excerpt,
                excerptTruncated: option.excerptTruncated,
                createdAt: option.createdAt,
              },
            },
          ],
        };
      }
      await json(route, { ok: true, data: link }, 201);
      return;
    }

    const evidenceMatch = path.match(
      /^\/api\/constellation\/evidence-references\/([^/]+)$/,
    );
    if (evidenceMatch && method === 'PATCH') {
      const id = decodeURIComponent(evidenceMatch[1]);
      const input = request.postDataJSON() as {
        note?: string | null;
      };
      const current = goalEvidence.items.find((item) => item.id === id);
      if (!current) {
        await json(route, {
          ok: false,
          error: { code: 'NOT_FOUND', message: 'Reference not found.' },
        }, 404);
        return;
      }
      const updated = {
        ...current,
        ...input,
        updatedAt: FIXED_TIME,
      };
      goalEvidence = {
        ...goalEvidence,
        items: goalEvidence.items.map((item) => (
          item.id === id ? updated : item
        )),
      };
      const { echo: _echo, ...link } = updated;
      await json(route, { ok: true, data: link });
      return;
    }

    if (evidenceMatch && method === 'DELETE') {
      const id = decodeURIComponent(evidenceMatch[1]);
      goalEvidence = {
        ...goalEvidence,
        items: goalEvidence.items.filter((item) => item.id !== id),
      };
      await json(route, { ok: true, data: { id } });
      return;
    }

    await json(route, {
      ok: false,
      error: {
        code: 'UNHANDLED_ACCEPTANCE_ROUTE',
        message: `${method} ${path} has no acceptance fixture.`,
      },
    }, 500);
  });
}
