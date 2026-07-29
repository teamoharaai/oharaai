import type { SupabaseClient } from '@supabase/supabase-js';
import {
  createConstellationMutationRepository,
  deleteConstellationLayout,
  loadConstellationGoalEvidence,
  loadConstellationLayout,
  loadConstellationBrtInspector,
  loadConstellationReflectionInspector,
  loadConstellationSnapshot,
  searchConstellationEchoOptions,
  upsertConstellationLayoutPosition,
} from '../../../lib/db/constellation.ts';
import {
  archiveConstellationAnnotation,
  assembleConstellationGraphDTO,
  ConstellationDataError,
  createConstellationAnnotation,
  createOrUpdateConstellationEvidenceReference,
  deleteConstellationEvidenceReference,
  updateConstellationAnnotation,
  updateConstellationEvidenceReference,
  validateConstellationLayoutPosition,
} from './constellation-server-core.ts';
import type {
  ConstellationAnnotationDTO,
  ConstellationBrtCategory,
  ConstellationBrtInspectorDTO,
  ConstellationDeleteResult,
  ConstellationEchoSearchDTO,
  ConstellationEvidenceLink,
  ConstellationEvidenceReferenceWriteResult,
  ConstellationGraphDTO,
  ConstellationGoalEvidenceDTO,
  ConstellationLayoutDTO,
  ConstellationLayoutPositionDTO,
  ConstellationReflectionInspectorDTO,
  CreateConstellationAnnotationInput,
  CreateConstellationEvidenceReferenceInput,
  SaveConstellationLayoutPositionInput,
  UpdateConstellationAnnotationInput,
  UpdateConstellationEvidenceReferenceInput,
} from '../types.ts';

export async function getConstellationGraph(
  ownerId: string,
  client: SupabaseClient,
  generatedAt?: string,
): Promise<ConstellationGraphDTO> {
  const snapshot = await loadConstellationSnapshot(ownerId, client);
  return assembleConstellationGraphDTO(
    ownerId,
    snapshot,
    generatedAt ?? new Date().toISOString(),
  );
}

export function getConstellationLayout(
  ownerId: string,
  client: SupabaseClient,
): Promise<ConstellationLayoutDTO> {
  return loadConstellationLayout(ownerId, client);
}

export async function saveConstellationLayoutPosition(
  ownerId: string,
  input: SaveConstellationLayoutPositionInput,
  client: SupabaseClient,
): Promise<ConstellationLayoutPositionDTO> {
  const graph = await getConstellationGraph(ownerId, client);
  return upsertConstellationLayoutPosition(
    ownerId,
    validateConstellationLayoutPosition(graph, input),
    client,
  );
}

export function resetConstellationLayout(
  ownerId: string,
  client: SupabaseClient,
): Promise<void> {
  return deleteConstellationLayout(ownerId, client);
}

export async function getConstellationGoalEvidence(
  ownerId: string,
  goalId: string,
  client: SupabaseClient,
): Promise<ConstellationGoalEvidenceDTO> {
  const result = await loadConstellationGoalEvidence(
    ownerId,
    goalId,
    client,
  );
  if (!result) {
    throw new ConstellationDataError('NOT_FOUND', 'Goal not found.');
  }
  return result;
}

export async function getConstellationReflectionInspector(
  ownerId: string,
  nodeId: string,
  client: SupabaseClient,
): Promise<ConstellationReflectionInspectorDTO> {
  const result = await loadConstellationReflectionInspector(
    ownerId,
    nodeId,
    client,
  );
  if (!result) {
    throw new ConstellationDataError('NOT_FOUND', 'Reflection not found.');
  }
  return result;
}

export async function getConstellationBrtInspector(
  ownerId: string,
  goalId: string,
  category: ConstellationBrtCategory,
  client: SupabaseClient,
): Promise<ConstellationBrtInspectorDTO> {
  const result = await loadConstellationBrtInspector(
    ownerId,
    goalId,
    category,
    client,
  );
  if (!result) {
    throw new ConstellationDataError('NOT_FOUND', 'Goal not found.');
  }
  return result;
}

export async function getConstellationEchoOptions(
  ownerId: string,
  goalId: string,
  query: string,
  client: SupabaseClient,
): Promise<ConstellationEchoSearchDTO> {
  const result = await searchConstellationEchoOptions(
    ownerId,
    goalId,
    query,
    client,
  );
  if (!result) {
    throw new ConstellationDataError('NOT_FOUND', 'Goal not found.');
  }
  return result;
}

export function addConstellationAnnotation(
  ownerId: string,
  input: CreateConstellationAnnotationInput,
  client: SupabaseClient,
): Promise<ConstellationAnnotationDTO> {
  return createConstellationAnnotation(
    ownerId,
    input,
    createConstellationMutationRepository(client),
  );
}

export function editConstellationAnnotation(
  ownerId: string,
  annotationId: string,
  input: UpdateConstellationAnnotationInput,
  client: SupabaseClient,
): Promise<ConstellationAnnotationDTO> {
  return updateConstellationAnnotation(
    ownerId,
    annotationId,
    input,
    createConstellationMutationRepository(client),
  );
}

export function archiveAnnotation(
  ownerId: string,
  annotationId: string,
  client: SupabaseClient,
): Promise<ConstellationAnnotationDTO> {
  return archiveConstellationAnnotation(
    ownerId,
    annotationId,
    createConstellationMutationRepository(client),
  );
}

export function addOrUpdateConstellationEvidenceReference(
  ownerId: string,
  input: CreateConstellationEvidenceReferenceInput,
  client: SupabaseClient,
): Promise<ConstellationEvidenceReferenceWriteResult> {
  return createOrUpdateConstellationEvidenceReference(
    ownerId,
    input,
    createConstellationMutationRepository(client),
  );
}

export function editConstellationEvidenceReference(
  ownerId: string,
  evidenceReferenceId: string,
  input: UpdateConstellationEvidenceReferenceInput,
  client: SupabaseClient,
): Promise<ConstellationEvidenceLink> {
  return updateConstellationEvidenceReference(
    ownerId,
    evidenceReferenceId,
    input,
    createConstellationMutationRepository(client),
  );
}

export function removeConstellationEvidenceReference(
  ownerId: string,
  evidenceReferenceId: string,
  client: SupabaseClient,
): Promise<ConstellationDeleteResult> {
  return deleteConstellationEvidenceReference(
    ownerId,
    evidenceReferenceId,
    createConstellationMutationRepository(client),
  );
}
