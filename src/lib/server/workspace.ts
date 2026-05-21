import 'server-only';

import {
  ApiResponse,
  CreateWorkspaceRequest,
  WorkspaceResponse,
} from '@/lib/api';
import { serverFetch } from './api';

/**
 * Server-side wrappers around the workspace endpoints. Same shapes as
 * `workspaceApi` in `@/lib/api`, but they read auth from cookies via
 * `serverFetch` and are safe to call from Server Components / Actions.
 */

export async function listWorkspaces(): Promise<WorkspaceResponse[]> {
  const res = await serverFetch<ApiResponse<WorkspaceResponse[]>>('/api/workspaces');
  return res.data;
}

export async function createWorkspace(
  request: CreateWorkspaceRequest,
): Promise<WorkspaceResponse> {
  const res = await serverFetch<ApiResponse<WorkspaceResponse>>('/api/workspaces', {
    method: 'POST',
    body: JSON.stringify(request),
  });
  return res.data;
}
