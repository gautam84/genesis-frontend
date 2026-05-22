import 'server-only';

import {
  ApiResponse,
  DocumentContentResponse,
  EditorDocumentInfo,
  EditorSessionResponse,
  SaveSessionRequest,
} from '@/lib/api';
import { serverFetch } from './api';

export async function getWorkspaceDocuments(
  workspaceId: string,
): Promise<EditorDocumentInfo[]> {
  const res = await serverFetch<ApiResponse<EditorDocumentInfo[]>>(
    `/api/editor/workspaces/${workspaceId}/documents`,
  );
  return res.data;
}

export async function getDocumentContent(
  workspaceId: string,
  documentId: string,
  page: number = 0,
  size: number = 50,
): Promise<DocumentContentResponse> {
  const res = await serverFetch<ApiResponse<DocumentContentResponse>>(
    `/api/editor/workspaces/${workspaceId}/documents/${documentId}/content?page=${page}&size=${size}`,
  );
  return res.data;
}

export async function getSession(
  workspaceId: string,
): Promise<EditorSessionResponse | null> {
  const res = await serverFetch<ApiResponse<EditorSessionResponse>>(
    `/api/editor/workspaces/${workspaceId}/session`,
  );
  return res.data;
}

export async function saveSession(
  request: SaveSessionRequest,
): Promise<EditorSessionResponse> {
  const res = await serverFetch<ApiResponse<EditorSessionResponse>>(
    `/api/editor/session`,
    { method: 'POST', body: JSON.stringify(request) },
  );
  return res.data;
}
