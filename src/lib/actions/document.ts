'use server';

import { revalidatePath } from 'next/cache';
import type { DocumentResponse } from '@/lib/api';
import { SessionExpiredError } from '@/lib/errors';
import { deleteDocument, updateDocumentStatus } from '@/lib/server/document';

type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

function toError(err: unknown, fallback: string): { ok: false; error: string } {
  if (err instanceof SessionExpiredError) {
    return { ok: false, error: 'Session expired. Please log in again.' };
  }
  return { ok: false, error: err instanceof Error ? err.message : fallback };
}

export async function deleteDocumentAction(
  workspaceId: string,
  documentId: string,
): Promise<ActionResult<void>> {
  try {
    await deleteDocument(documentId);
    revalidatePath(`/workspace/${workspaceId}`);
    return { ok: true, data: undefined };
  } catch (err) {
    return toError(err, 'Failed to delete document');
  }
}

export async function updateDocumentStatusAction(
  documentId: string,
  status: string,
): Promise<ActionResult<DocumentResponse>> {
  try {
    const data = await updateDocumentStatus(documentId, status);
    return { ok: true, data };
  } catch (err) {
    return toError(err, 'Failed to update document status');
  }
}
