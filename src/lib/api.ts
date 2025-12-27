/**
 * API client for Genesis backend
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3003';

// Types matching backend DTOs
export interface SignupRequest {
    username: string;
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    organizationName?: string;
}

export interface LoginRequest {
    usernameOrEmail: string;
    password: string;
}

export interface TokenResponse {
    accessToken: string;
    refreshToken: string;
    tokenType: string;
    expiresIn: number;
}

export interface UserResponse {
    id: string;
    username: string;
    email: string;
    firstName: string;
    lastName: string;
    organizationName?: string;
    role: string;
}

export interface ApiResponse<T> {
    success: boolean;
    data: T;
    message?: string;
    timestamp?: string;
}

export interface ApiError {
    success: boolean;
    message: string;
    errors?: Record<string, string>;
}

// Token storage keys
const ACCESS_TOKEN_KEY = 'genesis_access_token';
const REFRESH_TOKEN_KEY = 'genesis_refresh_token';

// Token management functions
export const tokenStorage = {
    getAccessToken: (): string | null => {
        if (typeof window === 'undefined') return null;
        return localStorage.getItem(ACCESS_TOKEN_KEY);
    },

    getRefreshToken: (): string | null => {
        if (typeof window === 'undefined') return null;
        return localStorage.getItem(REFRESH_TOKEN_KEY);
    },

    setTokens: (accessToken: string, refreshToken: string): void => {
        if (typeof window === 'undefined') return;
        localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
        localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    },

    clearTokens: (): void => {
        if (typeof window === 'undefined') return;
        localStorage.removeItem(ACCESS_TOKEN_KEY);
        localStorage.removeItem(REFRESH_TOKEN_KEY);
    },

    hasTokens: (): boolean => {
        return !!tokenStorage.getAccessToken();
    },
};

// Base fetch wrapper with auth headers
async function fetchWithAuth<T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<T> {
    const accessToken = tokenStorage.getAccessToken();

    const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    if (accessToken) {
        (headers as Record<string, string>)['Authorization'] = `Bearer ${accessToken}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
    });

    // Handle 401 - try to refresh token
    if (response.status === 401 && tokenStorage.getRefreshToken()) {
        const refreshed = await tryRefreshToken();
        if (refreshed) {
            // Retry the original request with new token
            const newAccessToken = tokenStorage.getAccessToken();
            (headers as Record<string, string>)['Authorization'] = `Bearer ${newAccessToken}`;
            const retryResponse = await fetch(`${API_BASE_URL}${endpoint}`, {
                ...options,
                headers,
            });
            if (!retryResponse.ok) {
                const error = await retryResponse.json();
                throw new Error(error.message || 'Request failed');
            }
            return retryResponse.json();
        } else {
            // Refresh failed, clear tokens
            tokenStorage.clearTokens();
            throw new Error('Session expired. Please login again.');
        }
    }

    if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Request failed' }));
        throw new Error(error.message || `Request failed with status ${response.status}`);
    }

    return response.json();
}

// Try to refresh the access token
async function tryRefreshToken(): Promise<boolean> {
    const refreshToken = tokenStorage.getRefreshToken();
    if (!refreshToken) return false;

    try {
        const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken }),
        });

        if (!response.ok) return false;

        const result: ApiResponse<TokenResponse> = await response.json();
        tokenStorage.setTokens(result.data.accessToken, result.data.refreshToken);
        return true;
    } catch {
        return false;
    }
}

// Auth API functions
export const authApi = {
    /**
     * Register a new user
     */
    signup: async (data: SignupRequest): Promise<ApiResponse<UserResponse>> => {
        const response = await fetch(`${API_BASE_URL}/api/auth/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ message: 'Signup failed' }));
            throw new Error(error.message || 'Signup failed');
        }

        return response.json();
    },

    /**
     * Login user and store tokens
     */
    login: async (data: LoginRequest): Promise<ApiResponse<TokenResponse>> => {
        const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ message: 'Login failed' }));
            throw new Error(error.message || 'Invalid credentials');
        }

        const result: ApiResponse<TokenResponse> = await response.json();
        tokenStorage.setTokens(result.data.accessToken, result.data.refreshToken);
        return result;
    },

    /**
     * Logout user and revoke tokens
     */
    logout: async (): Promise<void> => {
        const refreshToken = tokenStorage.getRefreshToken();
        if (refreshToken) {
            try {
                await fetch(`${API_BASE_URL}/api/auth/logout`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ refreshToken }),
                });
            } catch {
                // Ignore logout API errors, clear tokens anyway
            }
        }
        tokenStorage.clearTokens();
    },

    /**
     * Get current authenticated user info
     */
    getMe: async (): Promise<ApiResponse<UserResponse>> => {
        return fetchWithAuth<ApiResponse<UserResponse>>('/api/auth/me');
    },
};

// Workspace and Document types
export interface WorkspaceResponse {
    id: string;
    name: string;
    description?: string;
    annotationType: string;
    status: string;
    ownerId: string;
    createdAt: string;
    updatedAt: string;
}

// Annotation type enum matching backend
export type AnnotationType = 'COREF' | 'NER' | 'POS';

export interface CreateWorkspaceRequest {
    name: string;
    description?: string;
    annotationType: AnnotationType;
}

export interface DocumentResponse {
    id: string;
    name: string;
    orderIndex: number;
    status: string;
    workspaceId: string;
    tokenStartIndex?: number;
    tokenEndIndex?: number;
    storedFileUrl?: string;
    createdAt: string;
    updatedAt: string;
}

// Coreference annotation types
export interface ClusterResponse {
    id: string;
    workspaceId: string;
    clusterIndex: number;
    createdAt: string;
    updatedAt: string;
}

export interface MentionResponse {
    id: string;
    clusterId: string;
    tokenStartIndex: number;
    tokenEndIndex: number;
    text: string;
    createdAt: string;
    updatedAt: string;
}

export interface CreateMentionRequest {
    tokenStartIndex: number;
    tokenEndIndex: number;
}

export interface TokenInfo {
    tokenIndex: number;
    text: string;
    startOffset: number;
    endOffset: number;
}

// Workspace API functions
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
     * Delete a workspace
     */
    delete: async (id: string): Promise<ApiResponse<void>> => {
        return fetchWithAuth<ApiResponse<void>>(`/api/workspaces/${id}`, {
            method: 'DELETE',
        });
    },
};

// Document API functions
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

// Tokenization API functions
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

// Coreference annotation API functions
export const corefApi = {
    /**
     * Create a new cluster in a workspace
     */
    createCluster: async (workspaceId: string): Promise<ApiResponse<ClusterResponse>> => {
        return fetchWithAuth<ApiResponse<ClusterResponse>>(`/api/coref/workspaces/${workspaceId}/clusters`, {
            method: 'POST',
        });
    },

    /**
     * Get all clusters for a workspace
     */
    getClusters: async (workspaceId: string): Promise<ApiResponse<ClusterResponse[]>> => {
        return fetchWithAuth<ApiResponse<ClusterResponse[]>>(`/api/coref/workspaces/${workspaceId}/clusters`);
    },

    /**
     * Add a mention to a cluster
     */
    addMention: async (clusterId: string, data: CreateMentionRequest): Promise<ApiResponse<MentionResponse>> => {
        return fetchWithAuth<ApiResponse<MentionResponse>>(`/api/coref/clusters/${clusterId}/mentions`, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    /**
     * Get all mentions for a cluster
     */
    getMentions: async (clusterId: string): Promise<ApiResponse<MentionResponse[]>> => {
        return fetchWithAuth<ApiResponse<MentionResponse[]>>(`/api/coref/clusters/${clusterId}/mentions`);
    },

    /**
     * Delete a mention
     */
    deleteMention: async (mentionId: string): Promise<ApiResponse<void>> => {
        return fetchWithAuth<ApiResponse<void>>(`/api/coref/mentions/${mentionId}`, {
            method: 'DELETE',
        });
    },

    /**
     * Delete a cluster and all its mentions
     */
    deleteCluster: async (clusterId: string): Promise<ApiResponse<void>> => {
        return fetchWithAuth<ApiResponse<void>>(`/api/coref/clusters/${clusterId}`, {
            method: 'DELETE',
        });
    },

    /**
     * Delete all annotations for a workspace
     */
    deleteAllAnnotations: async (workspaceId: string): Promise<ApiResponse<void>> => {
        return fetchWithAuth<ApiResponse<void>>(`/api/coref/workspaces/${workspaceId}/annotations`, {
            method: 'DELETE',
        });
    },
};

// Import/Export API functions
export const importExportApi = {
    /**
     * Import CoNLL-2012 file
     */
    importCoNLL: async (workspaceId: string, documentId: string, file: File): Promise<ApiResponse<Record<string, number>>> => {
        const formData = new FormData();
        formData.append('file', file);

        const accessToken = tokenStorage.getAccessToken();
        const headers: HeadersInit = {};
        if (accessToken) {
            (headers as Record<string, string>)['Authorization'] = `Bearer ${accessToken}`;
        }

        const response = await fetch(`${API_BASE_URL}/api/import-export/workspaces/${workspaceId}/documents/${documentId}/conll`, {
            method: 'POST',
            headers,
            body: formData,
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ message: 'Import failed' }));
            throw new Error(error.message || 'Import failed');
        }

        return response.json();
    },

    /**
     * Export document to CoNLL-2012 format
     */
    exportDocumentToCoNLL: async (documentId: string): Promise<Blob> => {
        const accessToken = tokenStorage.getAccessToken();
        const headers: HeadersInit = {};
        if (accessToken) {
            (headers as Record<string, string>)['Authorization'] = `Bearer ${accessToken}`;
        }

        const response = await fetch(`${API_BASE_URL}/api/import-export/documents/${documentId}/conll`, {
            headers,
        });

        if (!response.ok) {
            throw new Error('Export failed');
        }

        return response.blob();
    },

    /**
     * Export workspace to CoNLL-2012 format
     */
    exportWorkspaceToCoNLL: async (workspaceId: string): Promise<Blob> => {
        const accessToken = tokenStorage.getAccessToken();
        const headers: HeadersInit = {};
        if (accessToken) {
            (headers as Record<string, string>)['Authorization'] = `Bearer ${accessToken}`;
        }

        const response = await fetch(`${API_BASE_URL}/api/import-export/workspaces/${workspaceId}/conll`, {
            headers,
        });

        if (!response.ok) {
            throw new Error('Export failed');
        }

        return response.blob();
    },
};

export default authApi;
