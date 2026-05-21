import { ApiResponse, fetchWithAuth } from './client';

export interface WorkspaceResponse {
    id: string;
    name: string;
    description?: string;
    annotationType: string;
    status: string;
    ownerId: string;
    ownerUsername: string;
    documentCount: number;
    annotatedDocumentCount: number;
    progressPercentage: number;
    createdAt: string;
    updatedAt: string;
}

export interface UpdateWorkspaceRequest {
    name?: string;
    description?: string;
}

export type MemberRole = 'ADMIN' | 'ANNOTATOR' | 'CURATOR';

export interface AddMemberRequest {
    email: string;
    role: MemberRole;
}

export interface MemberResponse {
    userId: string;
    username: string;
    email: string;
    firstName: string;
    lastName: string;
    role: MemberRole;
}

// Annotation type enum matching backend
export type AnnotationType = 'COREF' | 'NER' | 'POS' | 'WSD';

export interface CreateWorkspaceRequest {
    name: string;
    description?: string;
    annotationType: AnnotationType;
}

export const workspaceApi = {
    /**
     * Create a new workspace
     */
    create: async (data: CreateWorkspaceRequest): Promise<ApiResponse<WorkspaceResponse>> => {
        return fetchWithAuth<ApiResponse<WorkspaceResponse>>('/api/workspaces', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    /**
     * Get workspace by ID
     */
    getById: async (id: string): Promise<ApiResponse<WorkspaceResponse>> => {
        return fetchWithAuth<ApiResponse<WorkspaceResponse>>(`/api/workspaces/${id}`);
    },

    /**
     * List all workspaces for current user
     */
    list: async (): Promise<ApiResponse<WorkspaceResponse[]>> => {
        return fetchWithAuth<ApiResponse<WorkspaceResponse[]>>('/api/workspaces');
    },

    /**
     * Update workspace status
     */
    updateStatus: async (id: string, status: string): Promise<ApiResponse<WorkspaceResponse>> => {
        return fetchWithAuth<ApiResponse<WorkspaceResponse>>(`/api/workspaces/${id}/status?status=${status}`, {
            method: 'PUT',
        });
    },

    /**
     * Update workspace details
     */
    update: async (id: string, data: UpdateWorkspaceRequest): Promise<ApiResponse<WorkspaceResponse>> => {
        return fetchWithAuth<ApiResponse<WorkspaceResponse>>(`/api/workspaces/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    },

    /**
     * Delete a workspace
     */
    delete: async (id: string): Promise<void> => {
        await fetchWithAuth(`/api/workspaces/${id}`, {
            method: 'DELETE',
        });
    },

    addMember: async (id: string, data: AddMemberRequest): Promise<void> => {
        await fetchWithAuth(`/api/workspaces/${id}/members`, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    removeMember: async (id: string, userId: string): Promise<void> => {
        await fetchWithAuth(`/api/workspaces/${id}/members/${userId}`, {
            method: 'DELETE',
        });
    },

    updateMemberRole: async (id: string, userId: string, role: MemberRole): Promise<void> => {
        await fetchWithAuth(`/api/workspaces/${id}/members/${userId}?role=${role}`, {
            method: 'PUT',
        });
    },

    /**
     * Get workspace members
     */
    getMembers: async (id: string): Promise<ApiResponse<MemberResponse[]>> => {
        return fetchWithAuth<ApiResponse<MemberResponse[]>>(`/api/workspaces/${id}/members`);
    },
};
