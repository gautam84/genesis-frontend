'use server';

import type { ActionResult } from '@/server/contracts/common';
import { SessionExpiredError } from '@/server/errors';
import type {
  CreateNerAnnotationRequest,
  CreateNerTagRequest,
  NerAnnotation,
  NerTagDefinition,
} from './ner.contracts';
import {
  createAnnotation,
  createTag,
  deleteAnnotation,
  listAnnotations,
  listTags,
} from './ner.gateway';

function toError(err: unknown, fallback: string): { ok: false; error: string } {
  if (err instanceof SessionExpiredError) {
    return { ok: false, error: 'Session expired. Please log in again.' };
  }
  return { ok: false, error: err instanceof Error ? err.message : fallback };
}

export async function listNerTagsAction(
  workspaceId?: string,
): Promise<ActionResult<NerTagDefinition[]>> {
  try {
    const data = await listTags(workspaceId);
    return { ok: true, data };
  } catch (err) {
    return toError(err, 'Failed to load NER tags.');
  }
}

export async function createNerTagAction(
  request: CreateNerTagRequest,
): Promise<ActionResult<NerTagDefinition>> {
  try {
    const data = await createTag(request);
    return { ok: true, data };
  } catch (err) {
    return toError(err, 'Failed to create NER tag.');
  }
}

export async function listNerAnnotationsAction(
  documentId: string,
  annotatorId?: string,
): Promise<ActionResult<NerAnnotation[]>> {
  try {
    const data = await listAnnotations(documentId, annotatorId);
    return { ok: true, data };
  } catch (err) {
    return toError(err, 'Failed to load NER annotations.');
  }
}

export async function createNerAnnotationAction(
  request: CreateNerAnnotationRequest,
): Promise<ActionResult<NerAnnotation>> {
  try {
    const data = await createAnnotation(request);
    return { ok: true, data };
  } catch (err) {
    return toError(err, 'Failed to create NER span.');
  }
}

export async function deleteNerAnnotationAction(
  annotationId: string,
): Promise<ActionResult<void>> {
  try {
    await deleteAnnotation(annotationId);
    return { ok: true, data: undefined };
  } catch (err) {
    return toError(err, 'Failed to delete NER span.');
  }
}
