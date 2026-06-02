import 'server-only';

import { ApiResponse, CursorPage } from '@/server/contracts/common';
import { serverFetch } from '@/server/http';
import {
  ClusterDto,
  CreateClusterRequest,
  CreateMentionRequest,
  MentionDto,
} from './coref.contracts';

/** Page size when draining a cursor-paginated endpoint (backend caps at 500). */
const DRAIN_PAGE_SIZE = 200;

/**
 * Normalise a list endpoint's payload into a {@link CursorPage}. Tolerates a
 * backend that still returns a bare array (pre-cursor-pagination) so a
 * frontend/backend version skew degrades gracefully instead of throwing on
 * `data.items`. A nullish/garbage payload yields an empty terminal page.
 */
function asCursorPage<T>(data: CursorPage<T> | T[] | null | undefined): CursorPage<T> {
  if (Array.isArray(data)) {
    return { items: data, nextCursor: null, pageSize: data.length, hasMore: false };
  }
  if (data && Array.isArray(data.items)) return data;
  return { items: [], nextCursor: null, pageSize: 0, hasMore: false };
}

// ==================== Mentions ====================

/**
 * Return every mention in a workspace by draining the backend's cursor-paginated
 * endpoint. The editor renders highlights from the full set, so we reassemble it
 * here; the win is on the server, which now loads at most one page into heap per
 * query instead of the entire workspace at once.
 */
export async function getMentionsByWorkspace(
  workspaceId: string,
): Promise<MentionDto[]> {
  const all: MentionDto[] = [];
  let cursor: string | null = null;
  do {
    const params = new URLSearchParams({ limit: String(DRAIN_PAGE_SIZE) });
    if (cursor) params.set('cursor', cursor);
    const res = await serverFetch<ApiResponse<CursorPage<MentionDto> | MentionDto[]>>(
      `/api/workspaces/${workspaceId}/mentions?${params.toString()}`,
    );
    const page = asCursorPage<MentionDto>(res.data);
    all.push(...page.items);
    const next = page.hasMore ? page.nextCursor : null;
    cursor = next === cursor ? null : next; // guard against a non-advancing cursor
  } while (cursor);
  return all;
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

/**
 * Return every cluster in a workspace by draining the backend's cursor-paginated
 * endpoint. Clusters come back in cluster-number order (the cursor is the last
 * cluster number), so the reassembled list preserves the ordering the UI relies
 * on.
 */
export async function getClusters(workspaceId: string): Promise<ClusterDto[]> {
  const all: ClusterDto[] = [];
  let cursor: string | null = null;
  do {
    const params = new URLSearchParams({ limit: String(DRAIN_PAGE_SIZE) });
    if (cursor) params.set('cursor', cursor);
    const res = await serverFetch<ApiResponse<CursorPage<ClusterDto> | ClusterDto[]>>(
      `/api/workspaces/${workspaceId}/clusters?${params.toString()}`,
    );
    const page = asCursorPage<ClusterDto>(res.data);
    all.push(...page.items);
    const next = page.hasMore ? page.nextCursor : null;
    cursor = next === cursor ? null : next; // guard against a non-advancing cursor
  } while (cursor);
  return all;
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
