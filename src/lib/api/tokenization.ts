import { ApiResponse, fetchWithAuth } from './client';

export const tokenizationApi = {
    /**
     * Tokenize a document
     */
    tokenizeDocument: async (documentId: string): Promise<ApiResponse<number>> => {
        return fetchWithAuth<ApiResponse<number>>(`/api/tokenization/documents/${documentId}`, {
            method: 'POST',
        });
    },

    /**
     * Tokenize all documents in a workspace
     */
    tokenizeWorkspace: async (workspaceId: string): Promise<ApiResponse<number>> => {
        return fetchWithAuth<ApiResponse<number>>(`/api/tokenization/workspaces/${workspaceId}`, {
            method: 'POST',
        });
    },

    /**
     * Get token count for a document
     */
    getTokenCount: async (documentId: string): Promise<ApiResponse<number>> => {
        return fetchWithAuth<ApiResponse<number>>(`/api/tokenization/documents/${documentId}/count`);
    },
};
