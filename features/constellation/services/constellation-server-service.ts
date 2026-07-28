import type { SupabaseClient } from '@supabase/supabase-js';
import {
  createConstellationMutationRepository,
  loadConstellationSnapshot,
} from '../../../lib/db/constellation.ts';
import {
  archiveConstellationAnnotation,
  assembleConstellationGraphDTO,
  createConstellationAnnotation,
  createOrUpdateConstellationEvidenceReference,
  deleteConstellationEvidenceReference,
  updateConstellationAnnotation,
  updateConstellationEvidenceReference,
} from './constellation-server-core.ts';
import type {
  ConstellationAnnotationDTO,
  ConstellationDeleteResult,
  ConstellationEvidenceLink,
  ConstellationEvidenceReferenceWriteResult,
  ConstellationGraphDTO,
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
