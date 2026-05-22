import 'server-only';

import { ApiResponse, EditorDocumentInfo } from '@/lib/api';
import { serverFetch } from './api';

export async function getWorkspaceDocuments(
  workspaceId: string,
): Promise<EditorDocumentInfo[]> {
  const res = await serverFetch<ApiResponse<EditorDocumentInfo[]>>(
    `/api/editor/workspaces/${workspaceId}/documents`,
  );
  return res.data;
}
