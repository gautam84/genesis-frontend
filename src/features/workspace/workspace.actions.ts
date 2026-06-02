'use server';

import { revalidatePath } from 'next/cache';
import type { ActionResult } from '@/server/contracts/common';
import { SessionExpiredError } from '@/server/errors';
import type {
  AddMemberRequest,
  CreateWorkspaceRequest,
  MemberRole,
  UpdateWorkspaceRequest,
  WorkspaceResponse,
} from './workspace.contracts';
import {
  addMember,
  createWorkspace,
  deleteWorkspace,
  removeMember,
  updateMemberRole,
  updateWorkspace,
} from './workspace.gateway';

function toError(err: unknown, fallback: string): { ok: false; error: string } {
  if (err instanceof SessionExpiredError) {
    return { ok: false, error: 'Session expired. Please log in again.' };
  }
  return { ok: false, error: err instanceof Error ? err.message : fallback };
}

export async function createWorkspaceAction(
  request: CreateWorkspaceRequest,
): Promise<ActionResult<WorkspaceResponse>> {
  try {
    const workspace = await createWorkspace(request);
    revalidatePath('/home');
    return { ok: true, data: workspace };
  } catch (err) {
    return toError(err, 'Failed to create workspace');
  }
}

export async function updateWorkspaceAction(
  id: string,
  request: UpdateWorkspaceRequest,
): Promise<ActionResult<WorkspaceResponse>> {
  try {
    const workspace = await updateWorkspace(id, request);
    revalidatePath(`/workspace/${id}`);
    return { ok: true, data: workspace };
  } catch (err) {
    return toError(err, 'Failed to update workspace');
  }
}

export async function deleteWorkspaceAction(id: string): Promise<ActionResult<void>> {
  try {
    await deleteWorkspace(id);
    revalidatePath('/home');
    return { ok: true, data: undefined };
  } catch (err) {
    return toError(err, 'Failed to delete workspace');
  }
}

export async function addMemberAction(
  id: string,
  request: AddMemberRequest,
): Promise<ActionResult<void>> {
  try {
    await addMember(id, request);
    revalidatePath(`/workspace/${id}`);
    return { ok: true, data: undefined };
  } catch (err) {
    return toError(err, 'Failed to add member');
  }
}

export async function removeMemberAction(
  id: string,
  userId: string,
): Promise<ActionResult<void>> {
  try {
    await removeMember(id, userId);
    revalidatePath(`/workspace/${id}`);
    return { ok: true, data: undefined };
  } catch (err) {
    return toError(err, 'Failed to remove member');
  }
}

export async function updateMemberRoleAction(
  id: string,
  userId: string,
  role: MemberRole,
): Promise<ActionResult<void>> {
  try {
    await updateMemberRole(id, userId, role);
    revalidatePath(`/workspace/${id}`);
    return { ok: true, data: undefined };
  } catch (err) {
    return toError(err, 'Failed to update role');
  }
}
