'use server';

import type {
  CreatePosTagRequest,
  PosAnnotation,
  PosTagDefinition,
} from '@/lib/api';
import { SessionExpiredError } from '@/lib/errors';
import {
  createTag,
  getAnnotationsForDocument,
  listTags,
  updateTokenPos,
} from '@/lib/server/pos';

type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

function toError(err: unknown, fallback: string): { ok: false; error: string } {
  if (err instanceof SessionExpiredError) {
    return { ok: false, error: 'Session expired. Please log in again.' };
  }
  return { ok: false, error: err instanceof Error ? err.message : fallback };
}

export async function listPosTagsAction(
  workspaceId?: string,
): Promise<ActionResult<PosTagDefinition[]>> {
  try {
    const data = await listTags(workspaceId);
    return { ok: true, data };
  } catch (err) {
    return toError(err, 'Failed to load POS tags.');
  }
}

export async function createPosTagAction(
  request: CreatePosTagRequest,
): Promise<ActionResult<PosTagDefinition>> {
  try {
    const data = await createTag(request);
    return { ok: true, data };
  } catch (err) {
    return toError(err, 'Failed to create POS tag.');
  }
}

export async function listPosAnnotationsAction(
  documentId: string,
): Promise<ActionResult<PosAnnotation[]>> {
  try {
    const data = await getAnnotationsForDocument(documentId);
    return { ok: true, data };
  } catch (err) {
    return toError(err, 'Failed to load POS annotations.');
  }
}

export async function updateTokenPosAction(
  tokenId: string,
  pos: string | null,
): Promise<ActionResult<PosAnnotation | null>> {
  try {
    const data = await updateTokenPos(tokenId, pos);
    return { ok: true, data };
  } catch (err) {
    return toError(err, 'Failed to update token POS.');
  }
}
