import 'server-only';

import { ApiResponse, Recommendation, ShareTokenResponse } from '@/lib/api';
import { serverFetch } from './api';

export async function listRecommendations(
  workspaceId: string,
): Promise<Recommendation[]> {
  const res = await serverFetch<ApiResponse<Recommendation[]>>(
    `/api/workspaces/${workspaceId}/recommendations`,
  );
  return res.data;
}

export async function dismissRecommendation(
  workspaceId: string,
  hash: string,
  accepted: boolean,
): Promise<void> {
  await serverFetch<ApiResponse<void>>(
    `/api/workspaces/${workspaceId}/recommendations/dismissals`,
    { method: 'POST', body: JSON.stringify({ hash, accepted }) },
  );
}

export async function issueShareToken(
  workspaceId: string,
): Promise<ShareTokenResponse> {
  const res = await serverFetch<ApiResponse<ShareTokenResponse>>(
    `/api/workspaces/${workspaceId}/export/share`,
    { method: 'POST' },
  );
  return res.data;
}
