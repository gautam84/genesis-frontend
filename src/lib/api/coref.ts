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
