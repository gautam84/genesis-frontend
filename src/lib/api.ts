/**
 * API client for Genesis backend
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

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
    fieldErrors?: Record<string, string[]>;
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

    let response: Response;
    try {
        response = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            headers,
        });
    } catch (networkError: unknown) {
        // Network error - server might not be running
        console.error(`Network error calling ${endpoint}:`, networkError);
        throw new Error(`Cannot connect to server. Make sure the backend is running on ${API_BASE_URL}`);
    }

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
        const error = await response.json().catch(() => ({ message: `Request to ${endpoint} failed with status ${response.status}` }));

        if (error.fieldErrors) {
            const fieldErrorMessages = Object.entries(error.fieldErrors)
                .map(([field, msgs]) => `${field}: ${(msgs as string[]).join(', ')}`)
                .join('; ');
            throw new Error(`${error.message || 'Validation failed'}: ${fieldErrorMessages}`);
        }

        throw new Error(error.message || `Request to ${endpoint} failed with status ${response.status}`);
    }

    // Handle 204 No Content responses (e.g., DELETE operations)
    if (response.status === 204) {
        return undefined as T;
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
    fileSize?: number;
    progress?: number;
    createdAt: string;
    updatedAt: string;
}

// ==================== Editor Types ====================

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

// ==================== Coreference Types ====================

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

// ==================== Editor API ====================

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

// ==================== Coreference API ====================

export const corefApi = {
    // ==================== Mention Endpoints ====================

    /**
     * Create a new mention
     */
    createMention: async (workspaceId: string, data: CreateMentionRequest): Promise<ApiResponse<MentionDto>> => {
        return fetchWithAuth<ApiResponse<MentionDto>>(`/api/workspaces/${workspaceId}/mentions`, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    /**
     * Get all mentions for a workspace
     */
    getMentionsByWorkspace: async (workspaceId: string): Promise<ApiResponse<MentionDto[]>> => {
        return fetchWithAuth<ApiResponse<MentionDto[]>>(`/api/workspaces/${workspaceId}/mentions`);
    },

    /**
     * Get all mentions for a document
     */
    getMentionsByDocument: async (documentId: string): Promise<ApiResponse<MentionDto[]>> => {
        return fetchWithAuth<ApiResponse<MentionDto[]>>(`/api/documents/${documentId}/mentions`);
    },

    /**
     * Get unassigned mentions for a workspace
     */
    getUnassignedMentions: async (workspaceId: string): Promise<ApiResponse<MentionDto[]>> => {
        return fetchWithAuth<ApiResponse<MentionDto[]>>(`/api/workspaces/${workspaceId}/mentions/unassigned`);
    },

    /**
     * Get mention by ID
     */
    getMention: async (mentionId: string): Promise<ApiResponse<MentionDto>> => {
        return fetchWithAuth<ApiResponse<MentionDto>>(`/api/mentions/${mentionId}`);
    },

    /**
     * Assign mention to cluster
     */
    assignToCluster: async (mentionId: string, clusterId: string): Promise<ApiResponse<MentionDto>> => {
        return fetchWithAuth<ApiResponse<MentionDto>>(`/api/mentions/${mentionId}/cluster/${clusterId}`, {
            method: 'PUT',
        });
    },

    /**
     * Unassign mention from cluster
     */
    unassignFromCluster: async (mentionId: string): Promise<ApiResponse<MentionDto>> => {
        return fetchWithAuth<ApiResponse<MentionDto>>(`/api/mentions/${mentionId}/cluster`, {
            method: 'DELETE',
        });
    },

    /**
     * Delete mention
     */
    deleteMention: async (mentionId: string): Promise<void> => {
        await fetchWithAuth(`/api/mentions/${mentionId}`, {
            method: 'DELETE',
        });
    },

    // ==================== Cluster Endpoints ====================

    /**
     * Create a new cluster
     */
    createCluster: async (workspaceId: string, request?: CreateClusterRequest): Promise<ApiResponse<ClusterDto>> => {
        return fetchWithAuth<ApiResponse<ClusterDto>>(`/api/workspaces/${workspaceId}/clusters`, {
            method: 'POST',
            body: request ? JSON.stringify(request) : undefined,
        });
    },

    /**
     * Get all clusters for a workspace
     */
    getClusters: async (workspaceId: string): Promise<ApiResponse<ClusterDto[]>> => {
        return fetchWithAuth<ApiResponse<ClusterDto[]>>(`/api/workspaces/${workspaceId}/clusters`);
    },

    /**
     * Get cluster by ID
     */
    getCluster: async (clusterId: string): Promise<ApiResponse<ClusterDto>> => {
        return fetchWithAuth<ApiResponse<ClusterDto>>(`/api/clusters/${clusterId}`);
    },

    /**
     * Get mentions in a cluster
     */
    getMentionsByCluster: async (clusterId: string): Promise<ApiResponse<MentionDto[]>> => {
        return fetchWithAuth<ApiResponse<MentionDto[]>>(`/api/clusters/${clusterId}/mentions`);
    },

    /**
     * Update cluster
     */
    updateCluster: async (clusterId: string, request: CreateClusterRequest): Promise<ApiResponse<ClusterDto>> => {
        return fetchWithAuth<ApiResponse<ClusterDto>>(`/api/clusters/${clusterId}`, {
            method: 'PUT',
            body: JSON.stringify(request),
        });
    },

    /**
     * Delete cluster (mentions are unassigned)
     */
    deleteCluster: async (clusterId: string): Promise<void> => {
        await fetchWithAuth(`/api/clusters/${clusterId}`, {
            method: 'DELETE',
        });
    },

    /**
     * Merge multiple source clusters into a target cluster.
     * Backend reassigns all mentions from sources to target, deletes sources,
     * then compacts cluster numbers across the workspace.
     */
    mergeClusters: async (
        workspaceId: string,
        sourceClusterIds: string[],
        targetClusterId: string,
    ): Promise<ApiResponse<ClusterDto>> => {
        return fetchWithAuth<ApiResponse<ClusterDto>>(
            `/api/workspaces/${workspaceId}/clusters/merge`,
            {
                method: 'POST',
                body: JSON.stringify({ sourceClusterIds, targetClusterId }),
            },
        );
    },

    /**
     * Get annotation statistics for a workspace
     */
    getStats: async (workspaceId: string): Promise<ApiResponse<{ totalMentions: number; assignedMentions: number; unassignedMentions: number; clusterCount: number }>> => {
        return fetchWithAuth(`/api/workspaces/${workspaceId}/coref/stats`);
    },
};

// ==================== POS Tagging API ====================

export interface UpdateTokenPosRequest {
    pos: string | null;
}

export interface BatchUpdateTokenPosRequest {
    updates: { tokenId: string; pos: string | null }[];
}

export interface PosAnnotation {
    id: string;
    tokenId: string;
    annotatorId: string;
    posTag: string;
    timestamp: string;
}

export const posApi = {
    updateTokenPos: async (tokenId: string, pos: string | null): Promise<ApiResponse<PosAnnotation | null>> => {
        return fetchWithAuth<ApiResponse<PosAnnotation | null>>(`/api/tokens/${tokenId}/pos`, {
            method: 'PUT',
            body: JSON.stringify({ pos }),
        });
    },

    batchUpdateTokenPos: async (updates: { tokenId: string; pos: string | null }[]): Promise<ApiResponse<PosAnnotation[]>> => {
        return fetchWithAuth<ApiResponse<PosAnnotation[]>>('/api/tokens/pos/batch', {
            method: 'PUT',
            body: JSON.stringify({ updates }),
        });
    },

    getAnnotationsForToken: async (tokenId: string): Promise<ApiResponse<PosAnnotation[]>> => {
        return fetchWithAuth<ApiResponse<PosAnnotation[]>>(`/api/tokens/${tokenId}/pos`);
    },

    getAnnotationsForDocument: async (documentId: string): Promise<ApiResponse<PosAnnotation[]>> => {
        return fetchWithAuth<ApiResponse<PosAnnotation[]>>(`/api/documents/${documentId}/pos`);
    },

    getMajorityPosForDocument: async (documentId: string): Promise<ApiResponse<Record<string, string>>> => {
        return fetchWithAuth<ApiResponse<Record<string, string>>>(`/api/documents/${documentId}/pos/majority`);
    },
};

// ==================== POS Tagset (Universal Dependencies) ====================

export interface PosTag {
    tag: string;
    label: string;
    description: string;
    color: string;
    shortcut?: string;
}

export const UNIVERSAL_POS_TAGS: PosTag[] = [
    { tag: 'NOUN', label: 'Noun', description: 'Common noun', color: '#3b82f6', shortcut: 'n' },
    { tag: 'PROPN', label: 'Proper Noun', description: 'Proper noun', color: '#2563eb', shortcut: 'p' },
    { tag: 'VERB', label: 'Verb', description: 'Verb', color: '#ef4444', shortcut: 'v' },
    { tag: 'ADJ', label: 'Adjective', description: 'Adjective', color: '#f59e0b', shortcut: 'j' },
    { tag: 'ADV', label: 'Adverb', description: 'Adverb', color: '#f97316', shortcut: 'r' },
    { tag: 'PRON', label: 'Pronoun', description: 'Pronoun', color: '#8b5cf6', shortcut: 'o' },
    { tag: 'DET', label: 'Determiner', description: 'Determiner', color: '#a855f7', shortcut: 'd' },
    { tag: 'ADP', label: 'Adposition', description: 'Preposition/postposition', color: '#14b8a6', shortcut: 'a' },
    { tag: 'CONJ', label: 'Conjunction', description: 'Coordinating conjunction', color: '#06b6d4', shortcut: 'c' },
    { tag: 'SCONJ', label: 'Sub. Conjunction', description: 'Subordinating conjunction', color: '#0891b2' },
    { tag: 'AUX', label: 'Auxiliary', description: 'Auxiliary verb', color: '#ec4899', shortcut: 'x' },
    { tag: 'NUM', label: 'Numeral', description: 'Numeral', color: '#84cc16', shortcut: 'm' },
    { tag: 'PART', label: 'Particle', description: 'Particle', color: '#10b981' },
    { tag: 'INTJ', label: 'Interjection', description: 'Interjection', color: '#e11d48' },
    { tag: 'SYM', label: 'Symbol', description: 'Symbol', color: '#6b7280' },
    { tag: 'PUNCT', label: 'Punctuation', description: 'Punctuation', color: '#9ca3af', shortcut: '.' },
    { tag: 'X', label: 'Other', description: 'Other/unknown', color: '#d1d5db' },
];

// Export Options
export enum Column2Mode {
    PART_NUMBER = 'PART_NUMBER',
    SENTENCE_NUMBER = 'SENTENCE_NUMBER'
}

// ==================== Notification Types ====================

export enum NotificationType {
    INFO = 'INFO',
    SUCCESS = 'SUCCESS',
    WARNING = 'WARNING',
    ERROR = 'ERROR'
}

export interface Notification {
    id: string;
    type: NotificationType;
    title: string;
    message: string;
    workspaceId?: string;
    actorId?: string;
    link?: string;
    read: boolean;
    createdAt: string;
}

export const notificationApi = {
    /**
     * Get all notifications for current user
     */
    getAll: async (): Promise<ApiResponse<Notification[]>> => {
        return fetchWithAuth<ApiResponse<Notification[]>>('/api/notifications');
    },

    /**
     * Get unread notifications
     */
    getUnread: async (): Promise<ApiResponse<Notification[]>> => {
        return fetchWithAuth<ApiResponse<Notification[]>>('/api/notifications/unread');
    },

    /**
     * Mark notification as read
     */
    markAsRead: async (id: string): Promise<ApiResponse<void>> => {
        return fetchWithAuth<ApiResponse<void>>(`/api/notifications/${id}/read`, {
            method: 'PUT',
        });
    },

    /**
     * Mark all as read
     */
    markAllAsRead: async (): Promise<ApiResponse<void>> => {
        return fetchWithAuth<ApiResponse<void>>('/api/notifications/read-all', {
            method: 'PUT',
        });
    },

    /**
     * Delete notification
     */
    delete: async (id: string): Promise<ApiResponse<void>> => {
        return fetchWithAuth<ApiResponse<void>>(`/api/notifications/${id}`, {
            method: 'DELETE',
        });
    },
};

export enum ExportFormat {
    MERGED_SINGLE_FILE = 'MERGED_SINGLE_FILE',
    SEPARATE_FILES_ZIP = 'SEPARATE_FILES_ZIP',
    SEPARATE_FILES_ZIP_WITH_MERGED = 'SEPARATE_FILES_ZIP_WITH_MERGED'
}

export interface ExportOptions {
    column2Mode: Column2Mode;
    exportFormat: ExportFormat;
    continueSentenceNumbers: boolean;
    defaultPartNumber: number;
}

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
     * Export document
     */
    exportDocument: async (documentId: string, options?: ExportOptions): Promise<{ blob: Blob; filename: string }> => {
        const accessToken = tokenStorage.getAccessToken();
        const headers: HeadersInit = {
            'Content-Type': 'application/json'
        };
        if (accessToken) {
            (headers as Record<string, string>)['Authorization'] = `Bearer ${accessToken}`;
        }

        const response = await fetch(`${API_BASE_URL}/api/export/documents/${documentId}`, {
            method: 'POST',
            headers,
            body: JSON.stringify(options || {}),
        });

        if (!response.ok) {
            throw new Error('Export failed');
        }

        const contentDisposition = response.headers.get('Content-Disposition');
        let filename = 'export.conll';
        if (contentDisposition) {
            const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
            if (filenameMatch && filenameMatch[1]) {
                filename = filenameMatch[1];
            }
        }

        return { blob: await response.blob(), filename };
    },

    /**
     * Export workspace
     */
    exportWorkspace: async (workspaceId: string, options?: ExportOptions): Promise<{ blob: Blob; filename: string }> => {
        const accessToken = tokenStorage.getAccessToken();
        const headers: HeadersInit = {
            'Content-Type': 'application/json'
        };
        if (accessToken) {
            (headers as Record<string, string>)['Authorization'] = `Bearer ${accessToken}`;
        }

        const response = await fetch(`${API_BASE_URL}/api/export/workspaces/${workspaceId}`, {
            method: 'POST',
            headers,
            body: JSON.stringify(options || {}),
        });

        if (!response.ok) {
            throw new Error('Export failed');
        }

        const contentDisposition = response.headers.get('Content-Disposition');
        let filename = 'export.zip';
        if (contentDisposition) {
            const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
            if (filenameMatch && filenameMatch[1]) {
                filename = filenameMatch[1];
            }
        }

        return { blob: await response.blob(), filename };
    },

    /**
     * Export document to CoNLL-2012 format (Legacy)
     */
    exportDocumentToCoNLL: async (documentId: string): Promise<Blob> => {
        const result = await importExportApi.exportDocument(documentId);
        return result.blob;
    },

    /**
     * Export workspace to CoNLL-2012 format (Legacy)
     */
    exportWorkspaceToCoNLL: async (workspaceId: string): Promise<Blob> => {
        const result = await importExportApi.exportWorkspace(workspaceId);
        return result.blob;
    },
};

export default authApi;
