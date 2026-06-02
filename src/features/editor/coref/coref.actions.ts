'use server';

import { type ActionResult, toActionError } from '@/server/contracts/common';
import type {
  ClusterDto,
  CreateClusterRequest,
  CreateMentionRequest,
  MentionDto,
} from './coref.contracts';
import {
  assignToCluster,
  createCluster,
  createMention,
  deleteCluster,
  deleteMention,
  getClusters,
  getMentionsByWorkspace,
  mergeClusters,
} from './coref.gateway';

// ==================== Mentions ====================

export async function getMentionsByWorkspaceAction(
  workspaceId: string,
): Promise<ActionResult<MentionDto[]>> {
  try {
    const data = await getMentionsByWorkspace(workspaceId);
    return { ok: true, data };
  } catch (err) {
    return toActionError(err, 'Failed to load mentions.');
  }
}

export async function createMentionAction(
  workspaceId: string,
  data: CreateMentionRequest,
): Promise<ActionResult<MentionDto>> {
  try {
    const mention = await createMention(workspaceId, data);
    return { ok: true, data: mention };
  } catch (err) {
    return toActionError(err, 'Failed to create mention.');
  }
}

export async function assignToClusterAction(
  mentionId: string,
  clusterId: string,
): Promise<ActionResult<MentionDto>> {
  try {
    const data = await assignToCluster(mentionId, clusterId);
    return { ok: true, data };
  } catch (err) {
    return toActionError(err, 'Failed to assign mention to cluster.');
  }
}

export async function deleteMentionAction(
  mentionId: string,
): Promise<ActionResult<void>> {
  try {
    await deleteMention(mentionId);
    return { ok: true, data: undefined };
  } catch (err) {
    return toActionError(err, 'Failed to delete mention.');
  }
}

// ==================== Clusters ====================

export async function getClustersAction(
  workspaceId: string,
): Promise<ActionResult<ClusterDto[]>> {
  try {
    const data = await getClusters(workspaceId);
    return { ok: true, data };
  } catch (err) {
    return toActionError(err, 'Failed to load clusters.');
  }
}

export async function createClusterAction(
  workspaceId: string,
  request?: CreateClusterRequest,
): Promise<ActionResult<ClusterDto>> {
  try {
    const data = await createCluster(workspaceId, request);
    return { ok: true, data };
  } catch (err) {
    return toActionError(err, 'Failed to create cluster.');
  }
}

export async function deleteClusterAction(
  clusterId: string,
): Promise<ActionResult<void>> {
  try {
    await deleteCluster(clusterId);
    return { ok: true, data: undefined };
  } catch (err) {
    return toActionError(err, 'Failed to delete cluster.');
  }
}

export async function mergeClustersAction(
  workspaceId: string,
  sourceClusterIds: string[],
  targetClusterId: string,
): Promise<ActionResult<ClusterDto>> {
  try {
    const data = await mergeClusters(workspaceId, sourceClusterIds, targetClusterId);
    return { ok: true, data };
  } catch (err) {
    return toActionError(err, 'Failed to merge clusters.');
  }
}
