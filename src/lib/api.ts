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

export default authApi;
