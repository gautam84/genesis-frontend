import 'server-only';

import {
  ApiResponse,
  ClusterDto,
  CreateClusterRequest,
  CreateMentionRequest,
  MentionDto,
} from '@/lib/api';
import { serverFetch } from './api';

// ==================== Mentions ====================

export async function getMentionsByWorkspace(
  workspaceId: string,
): Promise<MentionDto[]> {
  const res = await serverFetch<ApiResponse<MentionDto[]>>(
    `/api/workspaces/${workspaceId}/mentions`,
  );
  return res.data;
}

export async function createMention(
  workspaceId: string,
  data: CreateMentionRequest,
): Promise<MentionDto> {
  const res = await serverFetch<ApiResponse<MentionDto>>(
    `/api/workspaces/${workspaceId}/mentions`,
    { method: 'POST', body: JSON.stringify(data) },
  );
  return res.data;
}

export async function assignToCluster(
  mentionId: string,
  clusterId: string,
): Promise<MentionDto> {
  const res = await serverFetch<ApiResponse<MentionDto>>(
    `/api/mentions/${mentionId}/cluster/${clusterId}`,
    { method: 'PUT' },
  );
  return res.data;
}

export async function deleteMention(mentionId: string): Promise<void> {
  await serverFetch<void>(`/api/mentions/${mentionId}`, { method: 'DELETE' });
}

// ==================== Clusters ====================

export async function getClusters(workspaceId: string): Promise<ClusterDto[]> {
  const res = await serverFetch<ApiResponse<ClusterDto[]>>(
    `/api/workspaces/${workspaceId}/clusters`,
  );
  return res.data;
}

export async function createCluster(
  workspaceId: string,
  request?: CreateClusterRequest,
): Promise<ClusterDto> {
  const res = await serverFetch<ApiResponse<ClusterDto>>(
    `/api/workspaces/${workspaceId}/clusters`,
    {
      method: 'POST',
      body: request ? JSON.stringify(request) : undefined,
    },
  );
  return res.data;
}

export async function deleteCluster(clusterId: string): Promise<void> {
  await serverFetch<void>(`/api/clusters/${clusterId}`, { method: 'DELETE' });
}

export async function mergeClusters(
  workspaceId: string,
  sourceClusterIds: string[],
  targetClusterId: string,
): Promise<ClusterDto> {
  const res = await serverFetch<ApiResponse<ClusterDto>>(
    `/api/workspaces/${workspaceId}/clusters/merge`,
    {
      method: 'POST',
      body: JSON.stringify({ sourceClusterIds, targetClusterId }),
    },
  );
  return res.data;
}
