import { API_BASE_URL, ApiResponse, fetchWithAuth } from './client';

export type RecommendationType =
    | 'UNFINISHED_MENTION'
    | 'DENSITY_GAP'
    | 'STRING_MATCH'
    | 'COREF_CHAIN_GAP';

export type RecommendationPriority = 'HIGH' | 'MEDIUM' | 'LOW';

export interface Recommendation {
    hash: string;
    type: RecommendationType;
    priority: RecommendationPriority;
    documentId: string | null;
    entityId: string | null;
    tokenStartIndex: number | null;
    tokenEndIndex: number | null;
    reason: string;
}

export interface ShareTokenResponse {
    token: string;
    expiresInSeconds: number;
}

export const recommendationsApi = {
    list: async (workspaceId: string): Promise<ApiResponse<Recommendation[]>> => {
        return fetchWithAuth<ApiResponse<Recommendation[]>>(
            `/api/workspaces/${workspaceId}/recommendations`,
        );
    },

    dismiss: async (
        workspaceId: string,
        hash: string,
        accepted: boolean,
    ): Promise<ApiResponse<void>> => {
        return fetchWithAuth<ApiResponse<void>>(
            `/api/workspaces/${workspaceId}/recommendations/dismissals`,
            { method: 'POST', body: JSON.stringify({ hash, accepted }) },
        );
    },

    /** Issue a 24h share token for the workspace. */
    issueShareToken: async (workspaceId: string): Promise<ApiResponse<ShareTokenResponse>> => {
        return fetchWithAuth<ApiResponse<ShareTokenResponse>>(
            `/api/workspaces/${workspaceId}/export/share`,
            { method: 'POST' },
        );
    },

    /** Build the public download URL for a previously-issued share token. */
    buildShareDownloadUrl: (workspaceId: string, token: string): string => {
        return `${API_BASE_URL}/api/public/export/conll/${workspaceId}?token=${encodeURIComponent(token)}`;
    },
};
