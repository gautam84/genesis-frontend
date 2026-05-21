import { ApiResponse, fetchWithAuth } from './client';

export interface ClusterDto {
    id: string;
    workspaceId: string;
    clusterNumber: number;
    label: string | null;
    representativeText: string | null;
    color: string;
    mentionCount: number;
}

export interface MentionDto {
    id: string;
    workspaceId: string;
    documentId: string;
    clusterId: string | null;
    clusterNumber: number | null;
    sentenceIndex: number;
    startTokenIndex: number;
    endTokenIndex: number;
    globalStartIndex: number;
    globalEndIndex: number;
    text: string;
    mentionType: string | null;
    clusterColor: string | null;
}

export interface CreateMentionRequest {
    documentId: string;
    sentenceIndex: number;
    startTokenIndex: number;
    endTokenIndex: number;
    text: string;
}

export interface CreateClusterRequest {
    label?: string;
    color?: string;
}

// Legacy types for backwards compatibility
export type ClusterResponse = ClusterDto;
export type MentionResponse = MentionDto;

export const corefApi = {
    // ==================== Mention Endpoints ====================

    /**
     * Create a new mention
     */
    createMention: async (workspaceId: string, data: CreateMentionRequest): Promise<ApiResponse<MentionDto>> => {
        return fetchWithAuth<ApiResponse<MentionDto>>(`/api/workspaces/${workspaceId}/mentions`, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    /**
     * Get all mentions for a workspace
     */
    getMentionsByWorkspace: async (workspaceId: string): Promise<ApiResponse<MentionDto[]>> => {
        return fetchWithAuth<ApiResponse<MentionDto[]>>(`/api/workspaces/${workspaceId}/mentions`);
    },

    /**
     * Get all mentions for a document
     */
    getMentionsByDocument: async (documentId: string): Promise<ApiResponse<MentionDto[]>> => {
        return fetchWithAuth<ApiResponse<MentionDto[]>>(`/api/documents/${documentId}/mentions`);
    },

    /**
     * Get unassigned mentions for a workspace
     */
    getUnassignedMentions: async (workspaceId: string): Promise<ApiResponse<MentionDto[]>> => {
        return fetchWithAuth<ApiResponse<MentionDto[]>>(`/api/workspaces/${workspaceId}/mentions/unassigned`);
    },

    /**
     * Get mention by ID
     */
    getMention: async (mentionId: string): Promise<ApiResponse<MentionDto>> => {
        return fetchWithAuth<ApiResponse<MentionDto>>(`/api/mentions/${mentionId}`);
    },

    /**
     * Assign mention to cluster
     */
    assignToCluster: async (mentionId: string, clusterId: string): Promise<ApiResponse<MentionDto>> => {
        return fetchWithAuth<ApiResponse<MentionDto>>(`/api/mentions/${mentionId}/cluster/${clusterId}`, {
            method: 'PUT',
        });
    },

    /**
     * Unassign mention from cluster
     */
    unassignFromCluster: async (mentionId: string): Promise<ApiResponse<MentionDto>> => {
        return fetchWithAuth<ApiResponse<MentionDto>>(`/api/mentions/${mentionId}/cluster`, {
            method: 'DELETE',
        });
    },

    /**
     * Delete mention
     */
    deleteMention: async (mentionId: string): Promise<void> => {
        await fetchWithAuth(`/api/mentions/${mentionId}`, {
            method: 'DELETE',
        });
    },

    // ==================== Cluster Endpoints ====================

    /**
     * Create a new cluster
     */
    createCluster: async (workspaceId: string, request?: CreateClusterRequest): Promise<ApiResponse<ClusterDto>> => {
        return fetchWithAuth<ApiResponse<ClusterDto>>(`/api/workspaces/${workspaceId}/clusters`, {
            method: 'POST',
            body: request ? JSON.stringify(request) : undefined,
        });
    },

    /**
     * Get all clusters for a workspace
     */
    getClusters: async (workspaceId: string): Promise<ApiResponse<ClusterDto[]>> => {
        return fetchWithAuth<ApiResponse<ClusterDto[]>>(`/api/workspaces/${workspaceId}/clusters`);
    },

    /**
     * Get cluster by ID
     */
    getCluster: async (clusterId: string): Promise<ApiResponse<ClusterDto>> => {
        return fetchWithAuth<ApiResponse<ClusterDto>>(`/api/clusters/${clusterId}`);
    },

    /**
     * Get mentions in a cluster
     */
    getMentionsByCluster: async (clusterId: string): Promise<ApiResponse<MentionDto[]>> => {
        return fetchWithAuth<ApiResponse<MentionDto[]>>(`/api/clusters/${clusterId}/mentions`);
    },

    /**
     * Update cluster
     */
    updateCluster: async (clusterId: string, request: CreateClusterRequest): Promise<ApiResponse<ClusterDto>> => {
        return fetchWithAuth<ApiResponse<ClusterDto>>(`/api/clusters/${clusterId}`, {
            method: 'PUT',
            body: JSON.stringify(request),
        });
    },

    /**
     * Delete cluster (mentions are unassigned)
     */
    deleteCluster: async (clusterId: string): Promise<void> => {
        await fetchWithAuth(`/api/clusters/${clusterId}`, {
            method: 'DELETE',
        });
    },

    /**
     * Merge multiple source clusters into a target cluster.
     * Backend reassigns all mentions from sources to target, deletes sources,
     * then compacts cluster numbers across the workspace.
     */
    mergeClusters: async (
        workspaceId: string,
        sourceClusterIds: string[],
        targetClusterId: string,
    ): Promise<ApiResponse<ClusterDto>> => {
        return fetchWithAuth<ApiResponse<ClusterDto>>(
            `/api/workspaces/${workspaceId}/clusters/merge`,
            {
                method: 'POST',
                body: JSON.stringify({ sourceClusterIds, targetClusterId }),
            },
        );
    },

    /**
     * Get annotation statistics for a workspace
     */
    getStats: async (workspaceId: string): Promise<ApiResponse<{ totalMentions: number; assignedMentions: number; unassignedMentions: number; clusterCount: number }>> => {
        return fetchWithAuth(`/api/workspaces/${workspaceId}/coref/stats`);
    },
};
