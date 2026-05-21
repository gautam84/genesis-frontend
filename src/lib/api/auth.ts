import { API_BASE_URL, ApiResponse, fetchWithAuth, tokenStorage } from './client';

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
