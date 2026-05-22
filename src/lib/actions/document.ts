'use server';

import { revalidatePath } from 'next/cache';
import { SessionExpiredError } from '@/lib/errors';
import { deleteDocument } from '@/lib/server/document';

type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export async function deleteDocumentAction(
  workspaceId: string,
  documentId: string,
): Promise<ActionResult<void>> {
  try {
    await deleteDocument(documentId);
    revalidatePath(`/workspace/${workspaceId}`);
    return { ok: true, data: undefined };
  } catch (err) {
    if (err instanceof SessionExpiredError) {
      return { ok: false, error: 'Session expired. Please log in again.' };
    }
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Failed to delete document',
    };
  }
}
