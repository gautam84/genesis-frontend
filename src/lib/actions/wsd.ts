'use server';

import { revalidatePath } from 'next/cache';
import type {
  CreateWsdSenseRequest,
  WsdAnnotation,
  WsdSense,
} from '@/lib/api';
import { SessionExpiredError } from '@/lib/errors';
import {
  createSense,
  deleteAnnotation,
  deleteSense,
  getAnnotationsForDocument,
  getAnnotationsForToken,
  listSenses,
  updateSense,
  upsertAnnotation,
} from '@/lib/server/wsd';

type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

function toError(
  err: unknown,
  fallback: string,
): { ok: false; error: string } {
  if (err instanceof SessionExpiredError) {
    return { ok: false, error: 'Session expired. Please log in again.' };
  }
  return { ok: false, error: err instanceof Error ? err.message : fallback };
}

export async function createSenseAction(
  workspaceId: string,
  request: CreateWsdSenseRequest,
): Promise<ActionResult<WsdSense>> {
  try {
    const sense = await createSense(workspaceId, request);
    revalidatePath(`/workspace/${workspaceId}/wsd-senses`);
    return { ok: true, data: sense };
  } catch (err) {
    return toError(err, 'Failed to create sense. Admin role is required.');
  }
}

export async function updateSenseAction(
  workspaceId: string,
  senseId: string,
  request: CreateWsdSenseRequest,
): Promise<ActionResult<WsdSense>> {
  try {
    const sense = await updateSense(workspaceId, senseId, request);
    revalidatePath(`/workspace/${workspaceId}/wsd-senses`);
    return { ok: true, data: sense };
  } catch (err) {
    return toError(err, 'Failed to update sense.');
  }
}

export async function deleteSenseAction(
  workspaceId: string,
  senseId: string,
): Promise<ActionResult<void>> {
  try {
    await deleteSense(workspaceId, senseId);
    revalidatePath(`/workspace/${workspaceId}/wsd-senses`);
    return { ok: true, data: undefined };
  } catch (err) {
    return toError(err, 'Failed to delete sense.');
  }
}

export async function listSensesAction(
  workspaceId: string,
  word?: string,
): Promise<ActionResult<WsdSense[]>> {
  try {
    const data = await listSenses(workspaceId, word);
    return { ok: true, data };
  } catch (err) {
    return toError(err, 'Failed to load senses.');
  }
}

export async function getAnnotationsForTokenAction(
  workspaceId: string,
  tokenId: string,
): Promise<ActionResult<WsdAnnotation[]>> {
  try {
    const data = await getAnnotationsForToken(workspaceId, tokenId);
    return { ok: true, data };
  } catch (err) {
    return toError(err, 'Failed to load token annotations.');
  }
}

export async function upsertAnnotationAction(
  workspaceId: string,
  tokenId: string,
  senseId: string,
): Promise<ActionResult<WsdAnnotation>> {
  try {
    const data = await upsertAnnotation(workspaceId, tokenId, senseId);
    return { ok: true, data };
  } catch (err) {
    return toError(err, 'Failed to tag token.');
  }
}

export async function listAnnotationsForDocumentAction(
  workspaceId: string,
  documentId: string,
): Promise<ActionResult<WsdAnnotation[]>> {
  try {
    const data = await getAnnotationsForDocument(workspaceId, documentId);
    return { ok: true, data };
  } catch (err) {
    return toError(err, 'Failed to load document annotations.');
  }
}

export async function deleteAnnotationAction(
  workspaceId: string,
  annotationId: string,
): Promise<ActionResult<void>> {
  try {
    await deleteAnnotation(workspaceId, annotationId);
    return { ok: true, data: undefined };
  } catch (err) {
    return toError(err, 'Failed to remove annotation.');
  }
}
