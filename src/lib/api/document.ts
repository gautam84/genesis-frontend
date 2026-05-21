import { API_BASE_URL, ApiResponse, fetchWithAuth, tokenStorage } from './client';

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

export const documentApi = {
    /**
     * Upload a document to a workspace
     */
    upload: async (workspaceId: string, file: File): Promise<ApiResponse<DocumentResponse>> => {
        const formData = new FormData();
        formData.append('file', file);

        const accessToken = tokenStorage.getAccessToken();
        const headers: HeadersInit = {};
        if (accessToken) {
            (headers as Record<string, string>)['Authorization'] = `Bearer ${accessToken}`;
        }

        const response = await fetch(`${API_BASE_URL}/api/workspaces/${workspaceId}/documents`, {
            method: 'POST',
            headers,
            body: formData,
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ message: 'Upload failed' }));
            throw new Error(error.message || 'Upload failed');
        }

        return response.json();
    },

    /**
     * List documents in a workspace
     */
    list: async (workspaceId: string): Promise<ApiResponse<DocumentResponse[]>> => {
        return fetchWithAuth<ApiResponse<DocumentResponse[]>>(`/api/workspaces/${workspaceId}/documents`);
    },

    /**
     * Get document by ID
     */
    getById: async (id: string): Promise<ApiResponse<DocumentResponse>> => {
        return fetchWithAuth<ApiResponse<DocumentResponse>>(`/api/documents/${id}`);
    },

    /**
     * Update document status
     */
    updateStatus: async (id: string, status: string): Promise<ApiResponse<DocumentResponse>> => {
        return fetchWithAuth<ApiResponse<DocumentResponse>>(`/api/documents/${id}/status?status=${status}`, {
            method: 'PUT',
        });
    },

    /**
     * Delete a document
     */
    delete: async (id: string): Promise<ApiResponse<void>> => {
        return fetchWithAuth<ApiResponse<void>>(`/api/documents/${id}`, {
            method: 'DELETE',
        });
    },
};
