import 'server-only';

import {
  ApiResponse,
  DocumentContentResponse,
  EditorDocumentInfo,
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
