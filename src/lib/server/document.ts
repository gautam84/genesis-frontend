import 'server-only';

import { ApiResponse, DocumentResponse } from '@/lib/api';
import { serverFetch } from './api';

export async function listDocuments(workspaceId: string): Promise<DocumentResponse[]> {
  const res = await serverFetch<ApiResponse<DocumentResponse[]>>(
    `/api/workspaces/${workspaceId}/documents`,
  );
  return res.data;
}

export async function deleteDocument(id: string): Promise<void> {
  await serverFetch<void>(`/api/documents/${id}`, { method: 'DELETE' });
}
