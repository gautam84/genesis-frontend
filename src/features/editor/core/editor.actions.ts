'use server';

import { type ActionResult, toActionError } from '@/server/contracts/common';
import type {
  DocumentContentResponse,
  EditorDocumentInfo,
  EditorSessionResponse,
  SaveSessionRequest,
} from './editor.contracts';
import {
  getDocumentContent,
  getSession,
  getWorkspaceDocuments,
  saveSession,
} from './editor.gateway';

export async function getEditorDocumentsAction(
  workspaceId: string,
): Promise<ActionResult<EditorDocumentInfo[]>> {
  try {
    const data = await getWorkspaceDocuments(workspaceId);
    return { ok: true, data };
  } catch (err) {
    return toActionError(err, 'Failed to load documents.');
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
    return toActionError(err, 'Failed to load document content.');
  }
}

export async function getEditorSessionAction(
  workspaceId: string,
): Promise<ActionResult<EditorSessionResponse | null>> {
  try {
    const data = await getSession(workspaceId);
    return { ok: true, data };
  } catch (err) {
    return toActionError(err, 'Failed to load editor session.');
  }
}

export async function saveEditorSessionAction(
  request: SaveSessionRequest,
): Promise<ActionResult<EditorSessionResponse>> {
  try {
    const data = await saveSession(request);
    return { ok: true, data };
  } catch (err) {
    return toActionError(err, 'Failed to save editor session.');
  }
}
