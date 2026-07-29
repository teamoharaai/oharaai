import type { SupabaseClient } from '@supabase/supabase-js';
import {
  createConstellationMutationRepository,
  loadConstellationGoalEvidence,
  loadConstellationBrtInspector,
  loadConstellationReflectionInspector,
  loadConstellationSnapshot,
  searchConstellationEchoOptions,
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
  ConstellationReflectionInspectorDTO,
  CreateConstellationAnnotationInput,
  CreateConstellationEvidenceReferenceInput,
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

export function getConstellationBrtInspector(
  ownerId: string,
  category: ConstellationBrtCategory,
  client: SupabaseClient,
): Promise<ConstellationBrtInspectorDTO> {
  return loadConstellationBrtInspector(ownerId, category, client);
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
