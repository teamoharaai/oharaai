# Constellation Decisions and Implementation Contract

**Status:** Canonical
**Date:** 2026-07-27
**Scope:** Constellation domain, graph read contract, and phase boundaries

This document is the source of truth for Constellation implementation decisions. It
supersedes conflicting Constellation details in older handoffs, prototypes, and the
April 2026 spec. `ohara_constellation_spec.md` remains the reference for extraction,
validation, scoring, and archival concepts where it does not conflict with this
document.

No application code or database migration was implemented as part of this decision
session.

## 1. Locked domain boundaries

### 1.1 Earned and system node taxonomy

The only earned or system node kinds are:

```ts
export type ConstellationEarnedNodeKind =
  | 'season'
  | 'ambition'
  | 'goal'
  | 'reflection'
  | 'trait'
  | 'tension';
```

- `season` is the current human/time anchor.
- `ambition` is derived from a project.
- `goal` is derived from a goal record.
- `reflection` is a validated pattern derived from Echo evidence.
- `trait` is a durable, cross-season promoted pattern.
- `tension` is a system-detected contradiction with sufficient evidence.

There is no earned `future`, `future_self`, `note`, `projection`, or BRT node kind.
Older designs that show a future-self node must model that content as a
user-authored `projection` annotation.

Earned nodes are system-owned representations. Users do not directly create, rename,
edit, or manually promote them.

### 1.2 User-authored content: `ConstellationAnnotation`

User-authored node-like content belongs to a separate domain:

The future persistence table is `constellation_annotations`.

```ts
export type ConstellationAnnotationKind = 'note' | 'projection';
export type ConstellationAnnotationStatus = 'draft' | 'archived';

export interface ConstellationAnnotation {
  id: string;
  ownerId: string;
  kind: ConstellationAnnotationKind;
  status: ConstellationAnnotationStatus;
  authorship: 'user';
  isDraft: true;
  label: string;
  body: string | null;
  anchorEarnedNodeId: string | null;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
}
```

`authorship` and `isDraft` are invariant provenance fields. An archived annotation
remains user-authored draft material; `status` describes its lifecycle, not whether
the system has validated or earned it.

An annotation:

- may optionally anchor to one earned node owned by the same user;
- may be edited and archived only by its owner;
- is never an input to candidate extraction or validation;
- never affects visibility scoring, Trait promotion, edge weights, or earned node
  counts;
- never becomes an earned node through editing, age, or repetition;
- is excluded from the initial read-only UI even though the versioned graph DTO
  reserves its contract.

Archival is the normal removal behavior. The initial annotation phase defines
`draft -> archived`; restoration and permanent deletion are not initial product
operations. Privacy/account erasure may hard-delete annotations.

### 1.3 Manual Echo organization: `ConstellationEvidenceLink`

Manual organization between Echo and goals belongs to another separate domain:

The future persistence table is `constellation_evidence_links`.

```ts
export type ConstellationBrtCategory = 'bud' | 'rose' | 'thorn';

export interface ConstellationEvidenceLink {
  id: string;
  ownerId: string;
  echoEntryId: string;
  goalId: string;
  brtCategory: ConstellationBrtCategory;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}
```

The persistence invariant is one current evidence link per owner/Echo/goal tuple.
`brtCategory` and `note` are editable fields on that relation. `note` is optional,
trimmed, and limited to 280 characters at both API and database boundaries.

The relationship is many-to-many:

- one Echo entry may provide evidence for several goals;
- one goal may collect evidence from several Echo entries.

An evidence link is not a container assignment. It is entirely separate from:

- the Echo entry's canonical goal/folder home represented by the single confirmed
  `echo_entry_links` container row;
- legacy `echo_entries.goal_id`;
- `echo_entries.brt_user`;
- AI-suggested or AI-auto Echo/goal links.

Creating, editing, or deleting an evidence link must never insert, update, confirm,
dismiss, or delete an `echo_entry_links` row. It must never write
`echo_entries.brt_user`.

The owner may unlink evidence. Unlinking is a hard delete of the organization row,
not deletion of either source record. There is no evidence-link archive state in the
initial contract.

### 1.4 Virtual BRT clusters

Each goal may expose up to three display clusters:

- Bud
- Rose
- Thorn

These are derived virtual graph entities computed from
`ConstellationEvidenceLink` rows grouped by `(goal_id, brt_category)`. They are not
earned nodes, annotations, candidate records, or persisted graph-node records.

A cluster exists only when its group has at least one visible evidence link. It
disappears when the final link in the group is removed. Its count is display
metadata; it never contributes to earned node counts, validation thresholds,
visibility scores, Trait promotion, or edge-weight calculations.

## 2. Edge semantics

Relationship meaning and emotional valence are orthogonal:

```ts
export type GraphEdgeKind =
  | 'season_membership'
  | 'ambition_goal'
  | 'goal_pattern'
  | 'pattern_cooccurrence'
  | 'trait_derivation'
  | 'tension_composition'
  | 'annotation_anchor'
  | 'goal_evidence_cluster';

export type GraphEdgeValence =
  | 'positive'
  | 'negative'
  | 'neutral'
  | 'mixed'
  | 'contradictory';
```

`GraphEdgeKind` states why two entities are related.
`GraphEdgeValence` describes the relationship's emotional/behavioral character.
Kinds such as `manual`, `season`, or `future` must not be encoded as valence values.

Structural edges may have `valence: null`. Derived
`goal_evidence_cluster` edges also have `valence: null` and `weight: null`; their BRT
category and evidence count live on the virtual cluster. Annotation anchor edges are
derived from `anchorEarnedNodeId` and have no graph weight.

Arbitrary user-authored node-to-node topology is deferred. Evidence links and
annotation anchors must not be generalized into a manual graph-edge table.

## 3. Goal lifecycle vocabulary

`lib/goals/schema.ts` is the canonical source:

```ts
export type GoalDbStatus =
  | 'active'
  | 'draft'
  | 'complete'
  | 'stagnant'
  | 'discovered'
  | 'archived';
```

Constellation contracts must not use `in_progress`, `completed`, or `paused` as goal
status values.

For the active graph:

- `active` goals may produce Goal nodes;
- `complete` goals remain eligible during the existing 14-day grace window;
- `draft`, `stagnant`, `discovered`, and `archived` goals are excluded from the
  active graph.

All six values remain valid in source counts and historical data. A goal's status
does not turn it into an annotation.

## 4. Access and graph-state semantics

`accessEligible` and `hasGraphData` answer different questions:

- `accessEligible`: the user is permitted to open Constellation under the current
  feature-flag, rollout, entitlement, and any retained activation-gate policy. It
  must not be inferred from the number of returned nodes.
- `hasGraphData`: the service found at least one renderable graph entity beyond the
  Season anchor: a non-Season earned node, active annotation, virtual BRT cluster,
  or edge.

The graph state is:

```ts
export type ConstellationRenderState =
  | 'locked'
  | 'season_only'
  | 'patterns_forming'
  | 'graph';
```

State rules:

| Condition | State |
|---|---|
| `accessEligible === false` | `locked` |
| Eligible, only the Season anchor exists, and no source activity exists | `season_only` |
| Eligible, source activity exists, but no non-Season graph entity qualifies | `patterns_forming` |
| Eligible and `hasGraphData === true` | `graph` |

`hasGraphData` is false for a Season-only DTO. Source activity can be present while
`hasGraphData` is false because unqualified candidates, draft goals, or Echo entries
are not graph entities.

Fetch failures are not empty states. The client must render an honest retry/error
state and must not translate an API failure into `season_only` or
`patterns_forming`.

## 5. Initial `ConstellationGraphDTO`

The graph endpoint returns a versioned, owner-scoped read model. Routes stay thin:
authentication and request parsing belong in the route; assembly belongs in the
Constellation feature service; persistence queries belong behind that service.

```ts
export interface GraphEntityRef {
  entityType: 'earned_node' | 'annotation' | 'virtual_brt_cluster';
  id: string;
}

export interface ConstellationEarnedNodeDTO {
  id: string;
  selectionKey: `node:${string}`;
  kind: ConstellationEarnedNodeKind;
  label: string;
  description: string | null;
  authorship: 'system';
  isEarned: true;
  source:
    | { type: 'season'; id: string | null }
    | { type: 'project'; id: string }
    | { type: 'goal'; id: string; goalStatus: GoalDbStatus }
    | { type: 'candidate'; id: string }
    | { type: 'character_profile'; id: string | null };
  visibilityScore: number | null;
  firstSeenAt: string | null;
  lastActivityAt: string | null;
}

export interface ConstellationAnnotationDTO {
  id: string;
  selectionKey: `annotation:${string}`;
  kind: ConstellationAnnotationKind;
  status: ConstellationAnnotationStatus;
  authorship: 'user';
  isDraft: true;
  label: string;
  body: string | null;
  anchorEarnedNodeId: string | null;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
}

export interface ConstellationVirtualBrtClusterDTO {
  id: `brt:${string}:${ConstellationBrtCategory}`;
  selectionKey: `brt:${string}:${ConstellationBrtCategory}`;
  goalId: string;
  goalNodeId: string;
  brtCategory: ConstellationBrtCategory;
  label: 'Bud' | 'Rose' | 'Thorn';
  evidenceLinkCount: number;
  latestEvidenceAt: string | null;
  isVirtual: true;
  isPersisted: false;
}

export interface ConstellationGraphEdgeDTO {
  id: string;
  from: GraphEntityRef;
  to: GraphEntityRef;
  kind: GraphEdgeKind;
  valence: GraphEdgeValence | null;
  weight: number | null;
  isPersisted: boolean;
}

export interface ConstellationGraphCountsDTO {
  earnedNodes: {
    total: number;
    byKind: Record<ConstellationEarnedNodeKind, number>;
  };
  annotations: {
    draft: number;
    archived: number;
  };
  virtualBrtClusters: {
    total: number;
    bud: number;
    rose: number;
    thorn: number;
  };
  edges: number;
  evidenceLinks: number;
  source: {
    echoEntries: number;
    qualifiedCandidates: number;
    goalsByStatus: Record<GoalDbStatus, number>;
  };
}

export interface ConstellationGraphStateDTO {
  accessEligible: boolean;
  hasGraphData: boolean;
  renderState: ConstellationRenderState;
  phase: 'initial_read_only';
  dataOrigin: 'real';
  generatedAt: string;
  dataAsOf: string;
  seasonNodeId: string | null;
}

export interface ConstellationGraphDTO {
  version: '1.0';
  state: ConstellationGraphStateDTO;
  earnedNodes: ConstellationEarnedNodeDTO[];
  annotations: ConstellationAnnotationDTO[];
  virtualBrtClusters: ConstellationVirtualBrtClusterDTO[];
  edges: ConstellationGraphEdgeDTO[];
  counts: ConstellationGraphCountsDTO;
}
```

DTO invariants:

- `counts.earnedNodes` counts only earned/system nodes.
- Every eligible DTO contains exactly one Season node, and `seasonNodeId` points
  to it. `seasonNodeId` may be `null` only for a locked response.
- Earned-node IDs are stable and opaque for the lifetime of their source; they
  are never derived from mutable labels. Virtual BRT IDs are deterministic from
  the goal ID and category.
- Archived annotations may be counted but are omitted from the default render list.
- No raw Echo content or excerpt is included in this graph-root DTO.
- Virtual clusters and their presentation edges are derived on read.
- `dataOrigin` is always `real` in a production response.
- The initial phase returns `annotations: []` and
  `virtualBrtClusters: []` until their next-phase write/read paths ship; the fields
  remain present so the DTO does not need a breaking redesign.

## 6. Ownership, deletion, and archival

### Ownership and authorization

- Every annotation and evidence link has exactly one `ownerId`.
- An evidence link may reference only an Echo entry and goal owned by that same
  owner.
- An annotation may anchor only to an earned node in that owner's graph.
- All reads and writes require the authenticated owner; user IDs never come from a
  request body.
- RLS must be enabled on any future persistence tables, with ownership checks on
  all CRUD operations.
- Constellation is private by default. Friends, circle members, and public viewers
  receive no graph data until the sharing phase defines a separate consent model.

### Source deletion and archival

- Earned nodes follow their source lifecycle and cannot be deleted directly through
  Constellation.
- Deleting an Echo entry deletes its evidence links and recomputes affected virtual
  clusters.
- Deleting a goal deletes its evidence links and recomputes affected clusters.
- Archiving a goal removes it from the active graph; historical Season Archive
  behavior remains deferred.
- If an annotation's anchor disappears from the active graph, the annotation
  survives and becomes unanchored. User-authored content must not be silently
  deleted with a derived node.
- Account erasure hard-deletes annotations and evidence links with the rest of the
  owner's data.

## 7. URL selection contract

The canonical route remains `/constellation`. Selection uses one query parameter:

```text
/constellation?selected=node:<earned-node-id>
/constellation?selected=annotation:<annotation-id>
/constellation?selected=brt:<goal-id>:<bud|rose|thorn>
```

- The URL is authoritative on initial load and browser back/forward navigation.
- Selecting an entity updates `selected`; dismissing the selection removes it.
- Only one entity may be selected.
- Invalid, malformed, archived-by-default, or unauthorized selections resolve to
  no selection and are removed with history replacement.
- Unknown IDs must not reveal whether another user's entity exists.
- Labels, annotation bodies, Echo excerpts, and other private text never appear in
  the URL.
- Edges are not selectable in the initial or next phase.

## 8. Echo excerpt privacy

The graph-root DTO never includes Echo excerpts. When inspectors ship in the next
phase, excerpts must be fetched on demand from an owner-authenticated endpoint.

That endpoint must:

- verify ownership through the requested Constellation entity and every contributing
  Echo entry;
- return a bounded excerpt, not the full Echo body (maximum 240 characters);
- truncate on the server and mark the result as truncated when applicable;
- omit private text from URLs, structured logs, analytics events, error reports,
  production fixtures, and persistent client caches;
- return only excerpts necessary for the open inspector;
- preserve the underlying Echo entry's privacy settings, with no friend/public
  access until Constellation sharing is explicitly designed.

`ConstellationEvidenceLink.note` is also private user content and follows the same
logging, analytics, and sharing restrictions.

## 9. Production data and fixtures

Mock or fixture graph data is allowed only in development and automated tests.

- Production code must not import a fixture as a fallback.
- A production fetch failure must not display sample people, goals, patterns, Echo
  excerpts, annotations, or edges.
- With no qualified data, production renders the real Season-only state or honest
  `patterns_forming` state.
- Test fixtures must be explicitly injected or guarded by the test/development
  environment and must never be selected by a user-data condition.

## 10. Phase boundaries

### Initial

- Honest empty/Season-only/`patterns_forming` states.
- Read-only graph backed by real owner data.
- Static layout is acceptable.
- No annotation or evidence-link writes.
- No inspectors or Echo excerpts.

### Next

- Annotation creation, editing, and archival.
- Evidence-link creation, editing, and unlinking.
- Derived virtual Bud/Rose/Thorn clusters.
- Owner-only inspectors with on-demand, bounded Echo excerpts.

### Deferred

- Force-directed layout.
- Pan and zoom.
- Timeline.
- Season Archive product surface and reactivation.
- Arbitrary node-to-node manual topology.
- Constellation sharing or public views.

Deferred items must not be pulled into the initial or next phase merely because a
prototype depicts them.

## 11. Migration sequencing

The repository currently contains migrations through
`032_constellation_persistence.sql`. As of 2026-07-27, the next available
migration number is `033`.

No migration number is permanently reserved by this document. The implementation
session must re-list `supabase/migrations/` immediately before creating a migration
and use the next available number. The old handoff's
`012_constellation_nodes_edges.sql` is invalid because migration 012 is already
`012_echo_entry_links.sql`.

## 12. Explicitly open implementation decisions

The following choices are not locked by this contract:

- the exact rollout, entitlement, or activity-threshold policy that computes
  `accessEligible`;
- whether earned nodes and system edges are persisted, materialized, or assembled
  from current source tables on read;
- how the current Season receives its stable ID before a Season persistence model
  exists;
- the concrete graph endpoint path and pagination strategy for future archive
  views.

Those choices may be resolved in the relevant implementation session without
changing the domain boundaries or `ConstellationGraphDTO` semantics above.

## 13. Release deployment and enablement prerequisites

`FEATURES.CONSTELLATION_ENABLED` remains `false` until all of the following are
recorded against the intended deployment environment:

1. Migration `032_constellation_persistence.sql` is applied and present in that
   project's migration history. The four Constellation tables and their RLS
   policies must exist; virtual BRT clusters must not be persisted.
2. The deployed Expo/Vercel artifact includes the owner-scoped Constellation API
   routes: graph read, annotation create/update/archive, Evidence Link
   create/update/delete, goal evidence/search, and Reflection inspection.
3. Authenticated owner smoke checks confirm the deployed graph returns only real
   owner data, no production fixture imports or fixture DTO origins, and failed
   graph, inspector, and evidence requests retain an explicit retry path.
4. Cross-user verification passes in the deployed environment: one account
   cannot read or mutate another account's nodes, annotations, Evidence Links,
   goal evidence, Echo options, or Reflection evidence.
5. Release validation passes from the deployable source state: strict
   TypeScript, the Constellation test suite, the isolated migration/RLS harness,
   `git diff --check`, and an Expo web export. Light mode, dark mode, and the
   narrow inspector replacement require a final authenticated browser smoke on
   the deployed artifact.

Only after those records exist may a separately authorized release change set
`FEATURES.CONSTELLATION_ENABLED` to `true`. A missing database migration, missing
API deployment, unavailable smoke environment, or failed validation keeps the
flag disabled; no fixture or mock-data fallback is permitted.

## 14. Historical concept-reference boundary

The five 1a–1e handoff PNGs from commit `5df3a3b` are retained only under the
commit-addressed, digest-pinned documentation tree described in
[`REFERENCE_CONCEPTS.md`](REFERENCE_CONCEPTS.md). Production source cannot import
that tree, and the images can never become runtime assets, empty-state samples, or
fetch-failure fallbacks.

That reference also records the locked prototype reconciliation: Note and
Projection are user-authored draft annotations rather than earned nodes, and
Bud/Rose/Thorn clusters are goal-specific virtual Evidence Link summaries rather
than Reflection classifications or persisted graph nodes. The deterministic
preview is the implementation comparison surface; the historical PNGs do not
override the domain, ownership, privacy, or responsive decisions in this document.

## Constellation — Vision Alignment (locked this session)

1. Access gate: REMOVED. Drop `patterns_forming`/`locked` render states and both 
   CONSTELLATION_GOAL_ACCESS_GATE / CONSTELLATION_ECHO_ACCESS_GATE constants. 
   No minimum threshold to use Constellation.

2. Goal nodes: DIRECT READ from `goals` table at DTO-assembly time. No writer, 
   no constellation_nodes row for kind='goal'. Source of truth = goals table only.

3. Season node: DIRECT READ / synthetic fallback (existing pattern), no change.

4. BRT: `echo_entries.brt_user` becomes single source of truth. 
   - `constellation_evidence_links.brt_category` column DROPPED.
   - Shared BRT picker component used in both entry settings and Constellation 
     evidence panel, writing to the same field.
   - Virtual BRT clusters read via join (evidence_links → echo_entries.brt_user) 
     instead of stored category.
   - Multi-goal linking (schema already supports via unique(echo_entry_id, goal_id)) 
     deferred to a later session — no schema work needed when that ships.

5. ai_suggested / system-guess-vs-user-correction training signal: DEFERRED, 
   undecided (unchanged from existing DECISIONS.md entry). Not addressed this session.

6. Trait/Tension/Ambition node kinds: OUT OF SCOPE this session, schema and CHECK 
   constraints RETAIN as-is (future pattern-detection pipeline: repeated thorns → 
   goal suggestion, repeated bud/rose → trait inference). Reflection node kind: 
   dormant, undecided, no vision tie identified yet.

7. Cleanup (bundle, low-risk):
   - Delete orphaned components/constellation/ConstellationSample.tsx + .web.tsx
   - Remove stale ConstellationPreview.tsx reference from components/CLAUDE.md
   - Sync docs/constellation/CHANGELOG.md to reflect CONSTELLATION_ENABLED: true 
     as intentional, not drift
   - gate.ts: remove now-dead access-gate constants + dashboard-summary residue 
     (tied to decision #1)