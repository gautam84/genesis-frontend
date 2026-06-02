export interface DocumentResponse {
    id: string;
    name: string;
    orderIndex: number;
    status: string;
    workspaceId: string;
    tokenStartIndex?: number;
    tokenEndIndex?: number;
    storedFileUrl?: string;
    fileSize?: number;
    progress?: number;
    createdAt: string;
    updatedAt: string;
}
