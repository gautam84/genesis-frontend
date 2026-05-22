'use server';

import { revalidatePath } from 'next/cache';
import type { CreateWsdSenseRequest, WsdSense } from '@/lib/api';
import { SessionExpiredError } from '@/lib/errors';
import {
  createSense,
  deleteSense,
  updateSense,
} from '@/lib/server/wsd';

type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

function toError(
  err: unknown,
  fallback: string,
): { ok: false; error: string } {
  if (err instanceof SessionExpiredError) {
    return { ok: false, error: 'Session expired. Please log in again.' };
  }
  return { ok: false, error: err instanceof Error ? err.message : fallback };
}

export async function createSenseAction(
  workspaceId: string,
  request: CreateWsdSenseRequest,
): Promise<ActionResult<WsdSense>> {
  try {
    const sense = await createSense(workspaceId, request);
    revalidatePath(`/workspace/${workspaceId}/wsd-senses`);
    return { ok: true, data: sense };
  } catch (err) {
    return toError(err, 'Failed to create sense. Admin role is required.');
  }
}

export async function updateSenseAction(
  workspaceId: string,
  senseId: string,
  request: CreateWsdSenseRequest,
): Promise<ActionResult<WsdSense>> {
  try {
    const sense = await updateSense(workspaceId, senseId, request);
    revalidatePath(`/workspace/${workspaceId}/wsd-senses`);
    return { ok: true, data: sense };
  } catch (err) {
    return toError(err, 'Failed to update sense.');
  }
}

export async function deleteSenseAction(
  workspaceId: string,
  senseId: string,
): Promise<ActionResult<void>> {
  try {
    await deleteSense(workspaceId, senseId);
    revalidatePath(`/workspace/${workspaceId}/wsd-senses`);
    return { ok: true, data: undefined };
  } catch (err) {
    return toError(err, 'Failed to delete sense.');
  }
}
