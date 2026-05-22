import 'server-only';

import { ApiResponse, CreateWsdSenseRequest, WsdSense } from '@/lib/api';
import { serverFetch } from './api';

export async function listSenses(workspaceId: string): Promise<WsdSense[]> {
  const res = await serverFetch<ApiResponse<WsdSense[]>>(
    `/api/workspaces/${workspaceId}/wsd/senses`,
  );
  return res.data;
}

export async function createSense(
  workspaceId: string,
  request: CreateWsdSenseRequest,
): Promise<WsdSense> {
  const res = await serverFetch<ApiResponse<WsdSense>>(
    `/api/workspaces/${workspaceId}/wsd/senses`,
    { method: 'POST', body: JSON.stringify(request) },
  );
  return res.data;
}

export async function updateSense(
  workspaceId: string,
  senseId: string,
  request: CreateWsdSenseRequest,
): Promise<WsdSense> {
  const res = await serverFetch<ApiResponse<WsdSense>>(
    `/api/workspaces/${workspaceId}/wsd/senses/${senseId}`,
    { method: 'PUT', body: JSON.stringify(request) },
  );
  return res.data;
}

export async function deleteSense(
  workspaceId: string,
  senseId: string,
): Promise<void> {
  await serverFetch<ApiResponse<void>>(
    `/api/workspaces/${workspaceId}/wsd/senses/${senseId}`,
    { method: 'DELETE' },
  );
}
