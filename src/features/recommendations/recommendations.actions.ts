'use server';

import { revalidatePath } from 'next/cache';
import type { ActionResult } from '@/server/contracts/common';
import { SessionExpiredError } from '@/server/errors';
import type { ShareTokenResponse } from './recommendations.contracts';
import {
  dismissRecommendation,
  issueShareToken,
} from './recommendations.gateway';

export async function dismissRecommendationAction(
  workspaceId: string,
  hash: string,
  accepted: boolean,
): Promise<ActionResult<void>> {
  try {
    await dismissRecommendation(workspaceId, hash, accepted);
    revalidatePath(`/workspace/${workspaceId}/recommendations`);
    return { ok: true, data: undefined };
  } catch (err) {
    if (err instanceof SessionExpiredError) {
      return { ok: false, error: 'Session expired. Please log in again.' };
    }
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Failed to record action',
    };
  }
}

export async function issueShareTokenAction(
  workspaceId: string,
): Promise<ActionResult<ShareTokenResponse>> {
  try {
    const data = await issueShareToken(workspaceId);
    return { ok: true, data };
  } catch (err) {
    if (err instanceof SessionExpiredError) {
      return { ok: false, error: 'Session expired. Please log in again.' };
    }
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Failed to issue share token',
    };
  }
}
