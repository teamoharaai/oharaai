import type { GoalDbStatus } from '@/lib/goals/schema';

export type ConstellationEarnedNodeKind =
  | 'season'
  | 'ambition'
  | 'goal'
  | 'reflection'
  | 'trait'
  | 'tension';

export type ConstellationAnnotationKind = 'note' | 'projection';
export type ConstellationAnnotationStatus = 'draft' | 'archived';
export type ConstellationBrtCategory = 'bud' | 'rose' | 'thorn';

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

export type ConstellationRenderState =
  | 'locked'
  | 'season_only'
  | 'patterns_forming'
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
  anchorEarnedNodeId: string | null;
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

export interface CreateConstellationAnnotationInput {
  kind: ConstellationAnnotationKind;
  label: string;
  body: string | null;
  anchorEarnedNodeId: string | null;
}

export interface UpdateConstellationAnnotationInput {
  kind?: ConstellationAnnotationKind;
  label?: string;
  body?: string | null;
  anchorEarnedNodeId?: string | null;
}

export interface CreateConstellationEvidenceReferenceInput {
  echoEntryId: string;
  goalId: string;
  brtCategory: ConstellationBrtCategory;
  note?: string | null;
}

export interface UpdateConstellationEvidenceReferenceInput {
  brtCategory?: ConstellationBrtCategory;
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
