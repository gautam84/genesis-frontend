import { ApiResponse, fetchWithAuth } from './client';

// Token and Sentence types (matching backend DTOs)
export interface TokenDto {
    id: string;
    documentId: string;
    tokenIndex: number;
    sentenceIndex: number;
    globalIndex: number;
    form: string;  // The actual token text
    text?: string; // Legacy alias
    pos: string | null;
    lemma: string | null;
    nerTag: string | null;
    startOffset: number;
    endOffset: number;
}

export interface SentenceDto {
    sentenceIndex: number;
    startTokenIndex: number;
    endTokenIndex: number;
    tokens: TokenDto[];
}

// Editor response types
export interface DocumentContentResponse {
    documentId: string;
    documentName: string;
    orderIndex: number;
    sentences: SentenceDto[];
    tokens: TokenDto[];
    totalSentences: number;
    totalTokens: number;
    globalTokenOffset: number;
    currentPage?: number;
    totalPages?: number;
    pageSize?: number;
}

export interface EditorDocumentInfo {
    id: string;
    name: string;
    orderIndex: number;
    tokenCount: number;
    sentenceCount: number;
    status: string;
    isTokenized: boolean;
}

export interface EditorSessionResponse {
    id?: string;
    workspaceId: string;
    userId: string;
    lastDocumentIndex: number;  // Changed from currentDocumentIndex to match backend
    scrollPosition: number;
}

export interface WorkspaceEditorResponse {
    workspaceId: string;
    workspaceName: string;
    annotationType: string;
    documents: EditorDocumentInfo[];
    session: EditorSessionResponse | null;
    totalDocuments: number;
    totalTokens: number;
    totalSentences: number;
}

export interface SaveSessionRequest {
    workspaceId: string;
    lastDocumentIndex: number;  // Changed from documentIndex to match backend
    scrollPosition: number;
}

export const editorApi = {
    /**
     * Open a workspace in the editor
     */
    openWorkspace: async (workspaceId: string): Promise<ApiResponse<WorkspaceEditorResponse>> => {
        return fetchWithAuth<ApiResponse<WorkspaceEditorResponse>>(`/api/editor/workspaces/${workspaceId}/open`, {
            method: 'POST',
        });
    },

    /**
     * Get all documents for a workspace with token counts
     */
    getWorkspaceDocuments: async (workspaceId: string): Promise<ApiResponse<EditorDocumentInfo[]>> => {
        return fetchWithAuth<ApiResponse<EditorDocumentInfo[]>>(`/api/editor/workspaces/${workspaceId}/documents`);
    },

    /**
     * Get document content with tokens for display (paginated by sentences).
     */
    getDocumentContent: async (
        documentId: string,
        page: number = 0,
        size: number = 50,
    ): Promise<ApiResponse<DocumentContentResponse>> => {
        return fetchWithAuth<ApiResponse<DocumentContentResponse>>(
            `/api/editor/documents/${documentId}/content?page=${page}&size=${size}`,
        );
    },

    /**
     * Get document content with workspace-level token offset (paginated by sentences).
     */
    getDocumentContentWithOffset: async (
        workspaceId: string,
        documentId: string,
        page: number = 0,
        size: number = 50,
    ): Promise<ApiResponse<DocumentContentResponse>> => {
        return fetchWithAuth<ApiResponse<DocumentContentResponse>>(
            `/api/editor/workspaces/${workspaceId}/documents/${documentId}/content?page=${page}&size=${size}`,
        );
    },

    /**
     * Get current session state
     */
    getSession: async (workspaceId: string): Promise<ApiResponse<EditorSessionResponse>> => {
        return fetchWithAuth<ApiResponse<EditorSessionResponse>>(`/api/editor/workspaces/${workspaceId}/session`);
    },

    /**
     * Save session state
     */
    saveSession: async (request: SaveSessionRequest): Promise<ApiResponse<EditorSessionResponse>> => {
        return fetchWithAuth<ApiResponse<EditorSessionResponse>>('/api/editor/session', {
            method: 'POST',
            body: JSON.stringify(request),
            keepalive: true, // Ensure save completes on page navigation
        });
    },

    /**
     * Close/clear session
     */
    closeSession: async (workspaceId: string): Promise<void> => {
        await fetchWithAuth(`/api/editor/workspaces/${workspaceId}/session`, {
            method: 'DELETE',
        });
    },

    /**
     * Tokenize a document
     */
    tokenizeDocument: async (documentId: string): Promise<ApiResponse<{ documentId: string; sentenceCount: number; tokenCount: number; success: boolean }>> => {
        return fetchWithAuth(`/api/editor/documents/${documentId}/tokenize`, {
            method: 'POST',
        });
    },
};
