export interface WsdSense {
    id: string;
    workspaceId: string;
    word: string;
    senseLabel: string;
    description: string | null;
}

export interface CreateWsdSenseRequest {
    word: string;
    senseLabel: string;
    description?: string | null;
}

export interface WsdAnnotation {
    id: string;
    tokenId: string;
    senseId: string;
    annotatorId: string;
    workspaceId: string;
    timestamp: string;
}
