import type { GoalDbStatus } from '@/lib/goals/schema';
import type { BrtCategory } from '@/lib/utils/resolveBrt';

export type ConstellationEarnedNodeKind =
  | 'season'
  | 'ambition'
  | 'goal'
  | 'reflection'
  | 'trait'
  | 'tension';

export type ConstellationAnnotationKind = 'note' | 'projection';
export type ConstellationAnnotationStatus = 'draft' | 'archived';
// Alias for the canonical BrtCategory union (lib/utils/resolveBrt.ts). Kept
// under this name since it's used pervasively throughout this feature.
export type ConstellationBrtCategory = BrtCategory;

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

// Access gate removed (DECISIONS.md §567 #1): Constellation has no minimum
// threshold. `season_only` is the zero-graph-data empty state; `graph` is shown
// once any graph entity (goal node, annotation, cluster, edge) exists.
export type ConstellationRenderState =
  | 'season_only'
  | 'graph';

export interface SeasonNodeSource {
  type: 'season';
  id: string | null;
}

export interface ProjectNodeSource {
  type: 'project';
  id: string;
}

export interface GoalNodeSource {
  type: 'goal';
  id: string;
  goalStatus: GoalDbStatus;
}

export interface CandidateNodeSource {
  type: 'candidate';
  id: string;
}

export interface CharacterProfileNodeSource {
  type: 'character_profile';
  id: string | null;
}

interface EarnedNodeBase<
  TKind extends ConstellationEarnedNodeKind,
  TSource,
> {
  id: string;
  selectionKey: `node:${string}`;
  kind: TKind;
  label: string;
  description: string | null;
  authorship: 'system';
  isEarned: true;
  source: TSource;
  visibilityScore: number | null;
  firstSeenAt: string | null;
  lastActivityAt: string | null;
}

export type ConstellationSeasonNodeDTO = EarnedNodeBase<'season', SeasonNodeSource>;
export type ConstellationAmbitionNodeDTO = EarnedNodeBase<'ambition', ProjectNodeSource>;
export type ConstellationGoalNodeDTO = EarnedNodeBase<'goal', GoalNodeSource>;
export type ConstellationReflectionNodeDTO = EarnedNodeBase<'reflection', CandidateNodeSource>;
export type ConstellationTraitNodeDTO = EarnedNodeBase<'trait', CharacterProfileNodeSource>;
export type ConstellationTensionNodeDTO = EarnedNodeBase<'tension', CandidateNodeSource>;

export type ConstellationEarnedNodeDTO =
  | ConstellationSeasonNodeDTO
  | ConstellationAmbitionNodeDTO
  | ConstellationGoalNodeDTO
  | ConstellationReflectionNodeDTO
  | ConstellationTraitNodeDTO
  | ConstellationTensionNodeDTO;

interface AnnotationNodeBase<TKind extends ConstellationAnnotationKind> {
  id: string;
  selectionKey: `annotation:${string}`;
  kind: TKind;
  status: ConstellationAnnotationStatus;
  authorship: 'user';
  isDraft: true;
  label: string;
  body: string | null;
  // An annotation anchors to at most one of an earned node (season/trait/…) or a
  // direct-read goal node (goals.id). Enforced by the DB single-anchor CHECK.
  anchorEarnedNodeId: string | null;
  anchorGoalId: string | null;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
}

export type ConstellationNoteAnnotationDTO = AnnotationNodeBase<'note'>;
export type ConstellationProjectionAnnotationDTO = AnnotationNodeBase<'projection'>;
export type ConstellationAnnotationDTO =
  | ConstellationNoteAnnotationDTO
  | ConstellationProjectionAnnotationDTO;

interface VirtualBrtClusterBase<TCategory extends ConstellationBrtCategory, TLabel extends string> {
  id: `brt:${string}:${TCategory}`;
  selectionKey: `brt:${string}:${TCategory}`;
  goalId: string;
  goalNodeId: string;
  brtCategory: TCategory;
  label: TLabel;
  evidenceLinkCount: number;
  latestEvidenceAt: string | null;
  isVirtual: true;
  isPersisted: false;
}

export type ConstellationBudClusterDTO = VirtualBrtClusterBase<'bud', 'Bud'>;
export type ConstellationRoseClusterDTO = VirtualBrtClusterBase<'rose', 'Rose'>;
export type ConstellationThornClusterDTO = VirtualBrtClusterBase<'thorn', 'Thorn'>;
export type ConstellationVirtualBrtClusterDTO =
  | ConstellationBudClusterDTO
  | ConstellationRoseClusterDTO
  | ConstellationThornClusterDTO;

export interface EarnedGraphEntityRef {
  entityType: 'earned_node';
  id: string;
}

export interface AnnotationGraphEntityRef {
  entityType: 'annotation';
  id: string;
}

export interface VirtualBrtClusterGraphEntityRef {
  entityType: 'virtual_brt_cluster';
  id: string;
}

export type GraphEntityRef =
  | EarnedGraphEntityRef
  | AnnotationGraphEntityRef
  | VirtualBrtClusterGraphEntityRef;

interface EarnedRelationshipEdgeBase<TKind extends Exclude<GraphEdgeKind, 'annotation_anchor' | 'goal_evidence_cluster'>> {
  id: string;
  from: EarnedGraphEntityRef;
  to: EarnedGraphEntityRef;
  kind: TKind;
  valence: GraphEdgeValence | null;
  weight: number | null;
  isPersisted: boolean;
}

export type SeasonMembershipGraphEdge = EarnedRelationshipEdgeBase<'season_membership'>;
export type AmbitionGoalGraphEdge = EarnedRelationshipEdgeBase<'ambition_goal'>;
export type GoalPatternGraphEdge = EarnedRelationshipEdgeBase<'goal_pattern'>;
export type PatternCooccurrenceGraphEdge = EarnedRelationshipEdgeBase<'pattern_cooccurrence'>;
export type TraitDerivationGraphEdge = EarnedRelationshipEdgeBase<'trait_derivation'>;
export type TensionCompositionGraphEdge = EarnedRelationshipEdgeBase<'tension_composition'>;

export interface AnnotationAnchorGraphEdge {
  id: string;
  from: AnnotationGraphEntityRef;
  to: EarnedGraphEntityRef;
  kind: 'annotation_anchor';
  valence: null;
  weight: null;
  isPersisted: false;
}

export interface GoalEvidenceClusterGraphEdge {
  id: string;
  from: EarnedGraphEntityRef;
  to: VirtualBrtClusterGraphEntityRef;
  kind: 'goal_evidence_cluster';
  valence: null;
  weight: null;
  isPersisted: false;
}

export type ConstellationGraphEdgeDTO =
  | SeasonMembershipGraphEdge
  | AmbitionGoalGraphEdge
  | GoalPatternGraphEdge
  | PatternCooccurrenceGraphEdge
  | TraitDerivationGraphEdge
  | TensionCompositionGraphEdge
  | AnnotationAnchorGraphEdge
  | GoalEvidenceClusterGraphEdge;

// A pure (echo_entry, goal, note) relation — BRT category is no longer stored
// per link (migration 033 dropped constellation_evidence_links.brt_category).
// It's derived from echo_entries.brt_category and only appears on the
// composed ConstellationGoalEvidenceItem below.
export interface ConstellationEvidenceLink {
  id: string;
  ownerId: string;
  echoEntryId: string;
  goalId: string;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ConstellationEvidenceEchoSummary {
  id: string;
  title: string | null;
  excerpt: string;
  excerptTruncated: boolean;
  createdAt: string;
}

export interface ConstellationGoalEvidenceItem
  extends ConstellationEvidenceLink {
  // Derived at read time by joining the linked echo entry's brt_category —
  // the single write target is PATCH /api/entries/:id (components/ui/BrtPicker.tsx).
  brtCategory: ConstellationBrtCategory | null;
  echo: ConstellationEvidenceEchoSummary;
}

export interface ConstellationGoalEvidenceDTO {
  goal: {
    id: string;
    title: string;
    description: string | null;
    status: GoalDbStatus;
    deadline: string | null;
    project: {
      id: string;
      title: string;
    } | null;
    vaultId: string | null;
  };
  items: readonly ConstellationGoalEvidenceItem[];
}

export type ConstellationReflectionValence =
  | 'positive'
  | 'negative'
  | 'neutral'
  | 'mixed';

export interface ConstellationReflectionValenceEvent {
  valence: ConstellationReflectionValence;
  echoEntryId: string;
  timestamp: string;
}

export interface ConstellationReflectionEvidenceItem
  extends ConstellationEvidenceEchoSummary {
  valence: ConstellationReflectionValence | null;
}

export interface ConstellationBrtInspectorEntry
  extends ConstellationEvidenceEchoSummary {
  brtCategory: ConstellationBrtCategory;
}

export interface ConstellationBrtInspectorDTO {
  category: ConstellationBrtCategory;
  entries: readonly ConstellationBrtInspectorEntry[];
}

export interface ConstellationReflectionInspectorDTO {
  nodeId: string;
  label: string;
  description: string | null;
  candidateKey: string;
  candidateType: 'theme' | 'trait' | 'tension' | 'insight';
  occurrences: number;
  aggregatedScore: number | null;
  firstSeenAt: string | null;
  lastSeenAt: string | null;
  dominantValence: ConstellationReflectionValence | null;
  valenceHistory: readonly ConstellationReflectionValenceEvent[];
  evidence: readonly ConstellationReflectionEvidenceItem[];
}

export interface ConstellationEchoSearchOption
  extends ConstellationEvidenceEchoSummary {
  existingReference: {
    id: string;
    brtCategory: ConstellationBrtCategory | null;
  } | null;
}

export interface ConstellationEchoSearchDTO {
  goalId: string;
  query: string;
  options: readonly ConstellationEchoSearchOption[];
}

export interface CreateConstellationAnnotationInput {
  kind: ConstellationAnnotationKind;
  label: string;
  body: string | null;
  anchorEarnedNodeId: string | null;
  anchorGoalId?: string | null;
}

export interface UpdateConstellationAnnotationInput {
  kind?: ConstellationAnnotationKind;
  label?: string;
  body?: string | null;
  anchorEarnedNodeId?: string | null;
  anchorGoalId?: string | null;
}

// echoEntryId's BRT category is written separately, via PATCH /api/entries/:id
// (see lib/api/echo-entries.ts) — this input only creates/updates the relation.
export interface CreateConstellationEvidenceReferenceInput {
  echoEntryId: string;
  goalId: string;
  note?: string | null;
}

export interface UpdateConstellationEvidenceReferenceInput {
  note?: string | null;
}

export interface ConstellationEvidenceReferenceWriteResult {
  evidenceReference: ConstellationEvidenceLink;
  created: boolean;
}

export interface ConstellationDeleteResult {
  id: string;
}

export interface ConstellationEarnedNodeCounts {
  total: number;
  byKind: {
    season: number;
    ambition: number;
    goal: number;
    reflection: number;
    trait: number;
    tension: number;
  };
}

export interface ConstellationGraphCountsDTO {
  earnedNodes: ConstellationEarnedNodeCounts;
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
    goalsByStatus: {
      active: number;
      draft: number;
      complete: number;
      stagnant: number;
      discovered: number;
      archived: number;
    };
  };
}

export interface ConstellationGraphStateDTO {
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
  earnedNodes: readonly ConstellationEarnedNodeDTO[];
  annotations: readonly ConstellationAnnotationDTO[];
  virtualBrtClusters: readonly ConstellationVirtualBrtClusterDTO[];
  edges: readonly ConstellationGraphEdgeDTO[];
  counts: ConstellationGraphCountsDTO;
}

export interface EarnedGraphViewNode {
  entityType: 'earned_node';
  id: string;
  selectionKey: string;
  node: ConstellationEarnedNodeDTO;
}

export interface AnnotationGraphViewNode {
  entityType: 'annotation';
  id: string;
  selectionKey: string;
  node: ConstellationAnnotationDTO;
}

export interface VirtualBrtClusterGraphViewNode {
  entityType: 'virtual_brt_cluster';
  id: string;
  selectionKey: string;
  node: ConstellationVirtualBrtClusterDTO;
}

export type ConstellationGraphViewNode =
  | EarnedGraphViewNode
  | AnnotationGraphViewNode
  | VirtualBrtClusterGraphViewNode;

export interface ConstellationGraphViewModel {
  state: ConstellationGraphStateDTO;
  nodes: readonly ConstellationGraphViewNode[];
  edges: readonly ConstellationGraphEdgeDTO[];
  counts: ConstellationGraphCountsDTO;
}

export interface ConstellationGraphFilters {
  earnedNodeKinds?: readonly ConstellationEarnedNodeKind[];
  annotationKinds?: readonly ConstellationAnnotationKind[];
  brtCategories?: readonly ConstellationBrtCategory[];
  includeArchivedAnnotations?: boolean;
}
