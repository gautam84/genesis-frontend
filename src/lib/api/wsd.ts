import { ApiResponse, fetchWithAuth } from './client';

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

export const wsdApi = {
    listSenses: async (workspaceId: string, word?: string): Promise<ApiResponse<WsdSense[]>> => {
        const qs = word ? `?word=${encodeURIComponent(word)}` : '';
        return fetchWithAuth<ApiResponse<WsdSense[]>>(`/api/workspaces/${workspaceId}/wsd/senses${qs}`);
    },

    createSense: async (workspaceId: string, request: CreateWsdSenseRequest): Promise<ApiResponse<WsdSense>> => {
        return fetchWithAuth<ApiResponse<WsdSense>>(`/api/workspaces/${workspaceId}/wsd/senses`, {
            method: 'POST',
            body: JSON.stringify(request),
        });
    },

    updateSense: async (workspaceId: string, senseId: string, request: CreateWsdSenseRequest): Promise<ApiResponse<WsdSense>> => {
        return fetchWithAuth<ApiResponse<WsdSense>>(`/api/workspaces/${workspaceId}/wsd/senses/${senseId}`, {
            method: 'PUT',
            body: JSON.stringify(request),
        });
    },

    deleteSense: async (workspaceId: string, senseId: string): Promise<ApiResponse<void>> => {
        return fetchWithAuth<ApiResponse<void>>(`/api/workspaces/${workspaceId}/wsd/senses/${senseId}`, {
            method: 'DELETE',
        });
    },

    upsertAnnotation: async (workspaceId: string, tokenId: string, senseId: string): Promise<ApiResponse<WsdAnnotation>> => {
        return fetchWithAuth<ApiResponse<WsdAnnotation>>(`/api/workspaces/${workspaceId}/wsd/annotations`, {
            method: 'POST',
            body: JSON.stringify({ tokenId, senseId }),
        });
    },

    getAnnotationsForToken: async (workspaceId: string, tokenId: string): Promise<ApiResponse<WsdAnnotation[]>> => {
        return fetchWithAuth<ApiResponse<WsdAnnotation[]>>(`/api/workspaces/${workspaceId}/wsd/tokens/${tokenId}/annotations`);
    },

    deleteAnnotation: async (workspaceId: string, annotationId: string): Promise<ApiResponse<void>> => {
        return fetchWithAuth<ApiResponse<void>>(`/api/workspaces/${workspaceId}/wsd/annotations/${annotationId}`, {
            method: 'DELETE',
        });
    },
};
