'use server';

import { revalidatePath } from 'next/cache';
import { type ActionResult, toActionError } from '@/server/contracts/common';
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
    return toActionError(err, 'Failed to record action');
  }
}

export async function issueShareTokenAction(
  workspaceId: string,
): Promise<ActionResult<ShareTokenResponse>> {
  try {
    const data = await issueShareToken(workspaceId);
    return { ok: true, data };
  } catch (err) {
    return toActionError(err, 'Failed to issue share token');
  }
}
