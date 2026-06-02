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
