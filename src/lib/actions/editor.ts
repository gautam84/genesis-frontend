'use server';

import type { DocumentContentResponse, EditorDocumentInfo } from '@/lib/api';
import { SessionExpiredError } from '@/lib/errors';
import {
  getDocumentContent,
  getWorkspaceDocuments,
} from '@/lib/server/editor';

type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

function toError(err: unknown, fallback: string): { ok: false; error: string } {
  if (err instanceof SessionExpiredError) {
    return { ok: false, error: 'Session expired. Please log in again.' };
  }
  return { ok: false, error: err instanceof Error ? err.message : fallback };
}

export async function getEditorDocumentsAction(
  workspaceId: string,
): Promise<ActionResult<EditorDocumentInfo[]>> {
  try {
    const data = await getWorkspaceDocuments(workspaceId);
    return { ok: true, data };
  } catch (err) {
    return toError(err, 'Failed to load documents.');
  }
}

export async function getDocumentContentAction(
  workspaceId: string,
  documentId: string,
  page: number = 0,
  size: number = 50,
): Promise<ActionResult<DocumentContentResponse>> {
  try {
    const data = await getDocumentContent(workspaceId, documentId, page, size);
    return { ok: true, data };
  } catch (err) {
    return toError(err, 'Failed to load document content.');
  }
}
