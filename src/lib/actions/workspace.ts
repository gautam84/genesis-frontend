'use server';

import { revalidatePath } from 'next/cache';
import type { CreateWorkspaceRequest, WorkspaceResponse } from '@/lib/api';
import { SessionExpiredError } from '@/lib/errors';
import { createWorkspace } from '@/lib/server/workspace';

type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export async function createWorkspaceAction(
  request: CreateWorkspaceRequest,
): Promise<ActionResult<WorkspaceResponse>> {
  try {
    const workspace = await createWorkspace(request);
    // The server component that lists workspaces caches its fetch — let it
    // re-render with the new entry.
    revalidatePath('/home');
    return { ok: true, data: workspace };
  } catch (err) {
    if (err instanceof SessionExpiredError) {
      return { ok: false, error: 'Session expired. Please log in again.' };
    }
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Failed to create workspace',
    };
  }
}
