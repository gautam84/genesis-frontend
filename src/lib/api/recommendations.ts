import { API_BASE_URL } from './client';

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

// Pure URL builder for the share-link feature. Lives on the client because
// the URL is rendered into the UI for the user to copy; no auth needed
// (the token authenticates the public download).
export const recommendationsApi = {
    buildShareDownloadUrl: (workspaceId: string, token: string): string => {
        return `${API_BASE_URL}/api/public/export/conll/${workspaceId}?token=${encodeURIComponent(token)}`;
    },
};
